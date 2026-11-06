/**
 * Bitcoin anchoring through public OpenTimestamps calendars, over fetch.
 * Stamping runs after each submission; upgrading runs on a Cron Trigger.
 */
import { sha256 } from "@noble/hashes/sha2.js";
import {
  MAX_CALENDAR_RESPONSE,
  buildStamp,
  concat,
  fromHex,
  spliceUpgrade,
  toHex,
  walkProof,
} from "./ots.js";

export const CALENDARS = [
  "https://a.pool.opentimestamps.org",
  "https://b.pool.opentimestamps.org",
  "https://a.pool.eternitywall.com",
];

const CALENDAR_TIMEOUT_MS = 5000;
/** Calendars aggregate into a Bitcoin transaction every few hours. */
export const UPGRADE_MIN_AGE_MS = 3 * 60 * 60 * 1000;
/** Rows per cron run: each needs up to one GET per calendar, under the 50-subrequest cap. */
const UPGRADE_BATCH = 10;

type Fetch = typeof fetch;

/** Read the body, giving up (null) as soon as it passes the cap. */
async function readCapped(res: Response): Promise<Uint8Array | null> {
  if (!res.body) return new Uint8Array(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_CALENDAR_RESPONSE) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return concat(...chunks);
}

/**
 * Stamp `body` on every calendar that answers. Returns the hex .ots proof,
 * or null if none did (the submission still stands, just unanchored).
 */
export async function stamp(
  body: string,
  fetchFn: Fetch = fetch,
): Promise<string | null> {
  const digest = sha256(new TextEncoder().encode(body));
  const nonce = crypto.getRandomValues(new Uint8Array(16));
  const tip = sha256(concat(digest, nonce));

  const results = await Promise.allSettled(
    CALENDARS.map(async (calendar) => {
      const res = await fetchFn(`${calendar}/digest`, {
        method: "POST",
        body: tip,
        headers: {
          Accept: "application/vnd.opentimestamps.v1",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: AbortSignal.timeout(CALENDAR_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`${calendar}: HTTP ${res.status}`);
      const bytes = await readCapped(res);
      if (!bytes) throw new Error(`${calendar}: response too large`);
      // Validate before merging: a bad reply must not poison the proof.
      buildStamp(digest, nonce, [bytes]);
      return bytes;
    }),
  );

  const responses: Uint8Array[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") responses.push(r.value);
    else console.error("OTS stamp failed:", r.reason);
  }
  if (responses.length === 0) return null;
  return toHex(buildStamp(digest, nonce, responses));
}

export interface UpgradeResult {
  ots: string;
  anchored: boolean;
  blockHeight: number | null;
}

/**
 * Ask each pending attestation's own calendar for its completed path and
 * splice it in. Calendars answer 404 until their Bitcoin tx confirms.
 */
export async function upgrade(
  otsHex: string,
  fetchFn: Fetch = fetch,
): Promise<UpgradeResult> {
  let proof: Uint8Array = fromHex(otsHex);
  const walked = walkProof(proof);

  // Splice from the end so earlier byte offsets stay valid.
  const pending = walked.pending
    .filter((p) => p.msg && p.uri.startsWith("https://"))
    .sort((a, b) => b.start - a.start);

  const fetched = await Promise.allSettled(
    pending.map(async (p) => {
      const res = await fetchFn(`${p.uri}/timestamp/${toHex(p.msg!)}`, {
        headers: { Accept: "application/vnd.opentimestamps.v1" },
        signal: AbortSignal.timeout(CALENDAR_TIMEOUT_MS),
      });
      return res.ok ? readCapped(res) : null;
    }),
  );

  fetched.forEach((r, i) => {
    if (r.status !== "fulfilled" || !r.value) return;
    try {
      proof = spliceUpgrade(proof, pending[i], r.value);
    } catch (err) {
      console.error(`OTS upgrade from ${pending[i].uri} rejected:`, err);
    }
  });

  const heights = walkProof(proof).bitcoinHeights;
  return {
    ots: toHex(proof),
    anchored: heights.length > 0,
    blockHeight: heights.length > 0 ? Math.min(...heights) : null,
  };
}

/**
 * Cron entry point: upgrade the least recently checked pending proofs that
 * are old enough. Returns how many became anchored.
 */
export async function upgradePending(
  db: D1Database,
  now: number,
  fetchFn: Fetch = fetch,
): Promise<number> {
  const { results } = await db
    .prepare(
      `SELECT id, ots FROM submissions
       WHERE anchor_status = 'pending' AND created_at <= ?1
       ORDER BY COALESCE(checked_at, 0), created_at LIMIT ?2`,
    )
    .bind(now - UPGRADE_MIN_AGE_MS, UPGRADE_BATCH)
    .all<{ id: string; ots: string }>();

  let anchored = 0;
  const updates: D1PreparedStatement[] = [];
  for (const row of results) {
    let up: UpgradeResult = { ots: row.ots, anchored: false, blockHeight: null };
    try {
      up = await upgrade(row.ots, fetchFn);
    } catch (err) {
      console.error(`OTS upgrade failed for ${row.id}:`, err);
    }
    if (up.anchored) anchored++;
    updates.push(
      db
        .prepare(
          `UPDATE submissions
           SET ots = ?1, anchor_status = ?2, block_height = ?3, checked_at = ?4
           WHERE id = ?5`,
        )
        .bind(up.ots, up.anchored ? "anchored" : "pending", up.blockHeight, now, row.id),
    );
  }
  if (updates.length > 0) await db.batch(updates);
  return anchored;
}
