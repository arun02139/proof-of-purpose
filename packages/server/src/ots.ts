/**
 * Minimal OpenTimestamps (.ots) support: build a proof from calendar
 * responses, walk a proof to find pending and Bitcoin attestations, and
 * splice a calendar's upgrade into a pending leaf.
 *
 * Wire format follows python-opentimestamps (opentimestamps/core/timestamp.py,
 * op.py, notary.py, serialize.py). No serializer: every operation works on
 * the original bytes, so proofs stay byte-identical to what calendars sent.
 */
import { sha256 } from "@noble/hashes/sha2.js";

export const HEADER_MAGIC = new Uint8Array([
  0x00, ...new TextEncoder().encode("OpenTimestamps"), 0x00, 0x00,
  ...new TextEncoder().encode("Proof"), 0x00,
  0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
]);
const MAJOR_VERSION = 1;

const TAG_ATTESTATION = 0x00;
const TAG_FORK = 0xff;
const OP_SHA256 = 0x08;
const OP_APPEND = 0xf0;
const OP_PREPEND = 0xf1;
/** Unary ops we parse but do not evaluate; their subtree's msg is unknown. */
const UNARY_UNEVALUATED = new Set([0x02, 0x03, 0x67, 0xf2, 0xf3]);
const BINARY_OPS = new Set([OP_APPEND, OP_PREPEND]);

const PENDING_TAG = "83dfe30d2ef90c8e";
const BITCOIN_TAG = "0588960d73d71901";

const MAX_OP_ARG = 4096;
const MAX_ATTESTATION_PAYLOAD = 8192;
const MAX_URI_LENGTH = 1000;
const URI_CHARS = /^[A-Za-z0-9._/:-]+$/;
const RECURSION_LIMIT = 256;

/** Calendar responses larger than this are rejected (mirrors the python client). */
export const MAX_CALENDAR_RESPONSE = 10_000;

export interface PendingAttestation {
  /** Byte range of the attestation element, including a leading 0xff if present. */
  start: number;
  end: number;
  /** True if the element was prefixed by 0xff (more siblings follow). */
  forked: boolean;
  uri: string;
  /** Commitment at this node, or null if an unevaluated op is on the path. */
  msg: Uint8Array | null;
}

export interface WalkResult {
  pending: PendingAttestation[];
  bitcoinHeights: number[];
  /** Byte ranges of the top-level elements (each excluding its 0xff prefix). */
  topLevel: { start: number; end: number }[];
  end: number;
}

class Reader {
  constructor(
    readonly buf: Uint8Array,
    public pos = 0,
  ) {}

  byte(): number {
    if (this.pos >= this.buf.length) throw new Error("OTS: truncated");
    return this.buf[this.pos++];
  }

  bytes(n: number): Uint8Array {
    if (this.pos + n > this.buf.length) throw new Error("OTS: truncated");
    const out = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return out;
  }

  varuint(): number {
    let value = 0;
    let shift = 0;
    for (;;) {
      const b = this.byte();
      value += (b & 0x7f) * 2 ** shift;
      if (!(b & 0x80)) return value;
      shift += 7;
      if (shift > 49) throw new Error("OTS: varuint too large");
    }
  }

  varbytes(max: number, min = 0): Uint8Array {
    const len = this.varuint();
    if (len > max || len < min) throw new Error("OTS: varbytes out of range");
    return this.bytes(len);
  }
}

export function encodeVaruint(n: number): Uint8Array {
  const out: number[] = [];
  do {
    let b = n & 0x7f;
    n = Math.floor(n / 128);
    if (n > 0) b |= 0x80;
    out.push(b);
  } while (n > 0);
  return new Uint8Array(out);
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
    throw new Error("Invalid hex");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function walkTimestamp(
  r: Reader,
  msg: Uint8Array | null,
  out: Omit<WalkResult, "topLevel" | "end">,
  depth: number,
  topLevel?: { start: number; end: number }[],
): void {
  if (depth > RECURSION_LIMIT) throw new Error("OTS: recursion limit");

  const element = (tag: number, start: number, forked: boolean) => {
    if (tag === TAG_ATTESTATION) {
      const attTag = toHex(r.bytes(8));
      const payload = r.varbytes(MAX_ATTESTATION_PAYLOAD);
      const p = new Reader(payload);
      if (attTag === PENDING_TAG) {
        const uri = new TextDecoder().decode(p.varbytes(MAX_URI_LENGTH));
        if (!URI_CHARS.test(uri)) throw new Error("OTS: invalid calendar URI");
        out.pending.push({ start, end: r.pos, forked, uri, msg });
      } else if (attTag === BITCOIN_TAG) {
        out.bitcoinHeights.push(p.varuint());
      }
      // Other attestation types are kept as opaque bytes.
      return;
    }

    let child: Uint8Array | null = null;
    if (tag === OP_SHA256) {
      child = msg && sha256(msg);
    } else if (BINARY_OPS.has(tag)) {
      const arg = r.varbytes(MAX_OP_ARG, 1);
      if (msg) child = tag === OP_APPEND ? concat(msg, arg) : concat(arg, msg);
    } else if (!UNARY_UNEVALUATED.has(tag)) {
      throw new Error(`OTS: unknown op tag 0x${tag.toString(16)}`);
    }
    walkTimestamp(r, child, out, depth + 1);
  };

  for (;;) {
    const prefixStart = r.pos;
    const tag = r.byte();
    if (tag === TAG_FORK) {
      const start = r.pos;
      element(r.byte(), prefixStart, true);
      topLevel?.push({ start, end: r.pos });
      continue;
    }
    element(tag, prefixStart, false);
    topLevel?.push({ start: prefixStart, end: r.pos });
    return;
  }
}

/**
 * Walk a serialized Timestamp (no file header) whose root commits to `msg`.
 * Throws on malformed input, so it doubles as a validator for calendar replies.
 */
export function walkTimestampBytes(
  bytes: Uint8Array,
  msg: Uint8Array | null,
  offset = 0,
): WalkResult {
  const r = new Reader(bytes, offset);
  const result: WalkResult = { pending: [], bitcoinHeights: [], topLevel: [], end: 0 };
  walkTimestamp(r, msg, result, 0, result.topLevel);
  result.end = r.pos;
  return result;
}

/** Walk a complete .ots file whose file-hash op is SHA-256. */
export function walkProof(proof: Uint8Array): WalkResult & { digest: Uint8Array } {
  const r = new Reader(proof);
  const magic = r.bytes(HEADER_MAGIC.length);
  if (!magic.every((b, i) => b === HEADER_MAGIC[i])) {
    throw new Error("OTS: bad header");
  }
  if (r.varuint() !== MAJOR_VERSION) throw new Error("OTS: unsupported version");
  if (r.byte() !== OP_SHA256) throw new Error("OTS: file hash op must be sha256");
  const digest = r.bytes(32);
  const result = walkTimestampBytes(proof, digest, r.pos);
  if (result.end !== proof.length) throw new Error("OTS: trailing bytes");
  return { ...result, digest };
}

/** Join elements as siblings of one Timestamp: 0xff before all but the last. */
function joinSiblings(elements: Uint8Array[]): Uint8Array {
  return concat(
    ...elements.flatMap((e, i) =>
      i < elements.length - 1 ? [new Uint8Array([TAG_FORK]), e] : [e],
    ),
  );
}

function topLevelElements(bytes: Uint8Array, msg: Uint8Array): Uint8Array[] {
  const walked = walkTimestampBytes(bytes, msg);
  if (walked.end !== bytes.length) throw new Error("OTS: trailing bytes");
  return walked.topLevel.map(({ start, end }) => bytes.subarray(start, end));
}

/**
 * Build a .ots file for `digest` (sha256 of the stamped bytes):
 * append(nonce) -> sha256 -> merge of every calendar's Timestamp on that tip.
 * Each response must be a Timestamp committing to sha256(digest || nonce).
 */
export function buildStamp(
  digest: Uint8Array,
  nonce: Uint8Array,
  calendarResponses: Uint8Array[],
): Uint8Array {
  if (calendarResponses.length === 0) throw new Error("OTS: no calendar responses");
  const tip = sha256(concat(digest, nonce));
  const merged = joinSiblings(
    calendarResponses.flatMap((resp) => topLevelElements(resp, tip)),
  );
  return concat(
    HEADER_MAGIC,
    encodeVaruint(MAJOR_VERSION),
    new Uint8Array([OP_SHA256]),
    digest,
    new Uint8Array([OP_APPEND]),
    encodeVaruint(nonce.length),
    nonce,
    new Uint8Array([OP_SHA256]),
    merged,
  );
}

/**
 * Replace a pending attestation with a calendar's upgrade response, a
 * Timestamp committing to the pending node's msg. Returns the new proof.
 */
export function spliceUpgrade(
  proof: Uint8Array,
  pending: PendingAttestation,
  response: Uint8Array,
): Uint8Array {
  if (!pending.msg) throw new Error("OTS: pending commitment unknown");
  const elements = topLevelElements(response, pending.msg);
  // A forked element had siblings after it, so every replacement keeps a 0xff.
  const replacement = pending.forked
    ? concat(...elements.flatMap((e) => [new Uint8Array([TAG_FORK]), e]))
    : joinSiblings(elements);
  return concat(
    proof.subarray(0, pending.start),
    replacement,
    proof.subarray(pending.end),
  );
}
