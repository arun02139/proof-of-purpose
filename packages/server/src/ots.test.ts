import { describe, it, expect } from "vitest";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  APRIL_DIGEST_HEX,
  APRIL_PROOF_HEX,
  APRIL_UPGRADES,
  STAMP_BODY,
  STAMP_NONCE,
  STAMP_RESPONSES,
} from "../test/fixtures";
import {
  HEADER_MAGIC,
  buildStamp,
  fromHex,
  spliceUpgrade,
  toHex,
  walkProof,
} from "./ots";

const aprilProof = () => fromHex(APRIL_PROOF_HEX);

function upgradeAll(proof: Uint8Array): Uint8Array {
  const pending = walkProof(proof).pending.sort((a, b) => b.start - a.start);
  for (const p of pending) {
    proof = spliceUpgrade(proof, p, fromHex(APRIL_UPGRADES[p.uri]));
  }
  return proof;
}

describe("walkProof", () => {
  it("reads the file digest of the April mainnet proof", () => {
    expect(toHex(walkProof(aprilProof()).digest)).toBe(APRIL_DIGEST_HEX);
  });

  it("finds the four pending calendar attestations with their commitments", () => {
    const { pending, bitcoinHeights } = walkProof(aprilProof());
    expect(bitcoinHeights).toEqual([]);
    expect(pending.map((p) => p.uri).sort()).toEqual([
      "https://alice.btc.calendar.opentimestamps.org",
      "https://bob.btc.calendar.opentimestamps.org",
      "https://btc.calendar.catallaxy.com",
      "https://finney.calendar.eternitywall.com",
    ]);
    for (const p of pending) expect(p.msg).not.toBeNull();
  });

  it("rejects a bad header", () => {
    const bad = aprilProof();
    bad[1] ^= 0xff;
    expect(() => walkProof(bad)).toThrow(/header/);
  });

  it("rejects truncated and trailing bytes", () => {
    const proof = aprilProof();
    expect(() => walkProof(proof.subarray(0, proof.length - 1))).toThrow();
    const extra = new Uint8Array(proof.length + 1);
    extra.set(proof);
    expect(() => walkProof(extra)).toThrow(/trailing/);
  });
});

describe("spliceUpgrade", () => {
  it("turns every pending attestation into a Bitcoin block attestation", () => {
    const { pending, bitcoinHeights } = walkProof(upgradeAll(aprilProof()));
    expect(pending).toEqual([]);
    // Blocks mined on 2026-04-11, cross-checked against mempool.space.
    expect(bitcoinHeights.sort()).toEqual([944547, 944549, 944580, 944652]);
  });

  it("keeps the file digest when splicing", () => {
    const upgraded = upgradeAll(aprilProof());
    expect(toHex(walkProof(upgraded).digest)).toBe(APRIL_DIGEST_HEX);
  });

  it("rejects a truncated upgrade response", () => {
    const proof = aprilProof();
    const [first] = walkProof(proof).pending;
    const reply = fromHex(APRIL_UPGRADES[first.uri]);
    expect(() =>
      spliceUpgrade(proof, first, reply.subarray(0, reply.length - 1)),
    ).toThrow();
  });
});

describe("buildStamp", () => {
  const digest = sha256(new TextEncoder().encode(STAMP_BODY));
  const responses = Object.values(STAMP_RESPONSES).map(fromHex);

  it("builds a proof that starts with the OTS header and commits to the digest", () => {
    const proof = buildStamp(digest, STAMP_NONCE, responses);
    expect(proof.subarray(0, HEADER_MAGIC.length)).toEqual(HEADER_MAGIC);
    expect(toHex(walkProof(proof).digest)).toBe(toHex(digest));
  });

  it("merges one pending attestation per calendar, each with a commitment", () => {
    const { pending } = walkProof(buildStamp(digest, STAMP_NONCE, responses));
    expect(pending).toHaveLength(responses.length);
    for (const p of pending) expect(p.msg).not.toBeNull();
  });

  it("works with a single calendar", () => {
    const { pending } = walkProof(buildStamp(digest, STAMP_NONCE, responses.slice(0, 1)));
    expect(pending).toHaveLength(1);
  });

  it("rejects garbage calendar responses", () => {
    expect(() =>
      buildStamp(digest, STAMP_NONCE, [new Uint8Array([0x42, 0x42])]),
    ).toThrow();
  });
});
