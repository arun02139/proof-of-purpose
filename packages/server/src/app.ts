import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Submission } from "shared";
import { stamp as stampOnCalendars } from "./anchoring.js";
import { constitution, expectedAnswerFor } from "./constitution.js";
import { fromHex } from "./ots.js";

export interface Env {
  DB: D1Database;
  /** Worker secret for DELETE /api/submissions. Unset means DELETE is always refused. */
  ADMIN_TOKEN?: string;
}

export interface AppOptions {
  /** Stamps the stored JSON; returns a hex .ots proof or null. Injected in tests. */
  stamp?: (body: string) => Promise<string | null>;
}

const MAX_ANSWER_LENGTH = 8 * 1024;
const MAX_HASH_LENGTH = 256;

interface SubmissionRow {
  id: string;
  body: string;
  ots: string | null;
  anchor_status: "pending" | "anchored" | null;
  block_height: number | null;
}

/** Constant-time check of an `Authorization: Bearer <token>` header against the secret. */
async function isAdmin(header: string | undefined, secret: string | undefined): Promise<boolean> {
  // Trim the secret: a piped `secret put` easily stores a trailing newline.
  const expected = secret?.trim();
  const match = header?.match(/^Bearer +(.+)$/i);
  if (!expected || !match) return false;
  const digest = async (s: string) =>
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  const [a, b] = await Promise.all([digest(match[1].trim()), digest(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function toSubmission(row: SubmissionRow): Submission {
  const submission: Submission = { ...JSON.parse(row.body), id: row.id };
  if (row.ots && row.anchor_status) {
    submission.anchor = { status: row.anchor_status };
    if (row.block_height !== null) {
      submission.anchor.block_height = row.block_height;
    }
  }
  return submission;
}

export function createApp(options: AppOptions = {}) {
  const stamp = options.stamp ?? stampOnCalendars;
  const app = new Hono<{ Bindings: Env }>();

  // DELETE is left out: it is an admin call, never made from a browser.
  app.use("/api/*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

  app.get("/api/constitution", (c) => c.json(constitution));

  app.get("/api/submissions", async (c) => {
    const { results } = await c.env.DB.prepare(
      `SELECT id, body, ots, anchor_status, block_height
       FROM submissions ORDER BY created_at`,
    ).all<SubmissionRow>();
    return c.json(results.map(toSubmission));
  });

  // Verification downloads: `<id>.json` is the exact stamped bytes and
  // `<id>.json.ots` its proof, so `ots verify <id>.json.ots` works on the pair.
  app.get("/api/submissions/:file", async (c) => {
    const match = c.req.param("file").match(/^([A-Za-z0-9-]+)\.json(\.ots)?$/);
    if (!match) return c.json({ error: "Not found" }, 404);
    const [, id, isProof] = match;
    const row = await c.env.DB.prepare(
      "SELECT body, ots FROM submissions WHERE id = ?1",
    )
      .bind(id)
      .first<{ body: string; ots: string | null }>();
    if (!row || (isProof && !row.ots)) return c.json({ error: "Not found" }, 404);

    const filename = `${id}.json${isProof ? ".ots" : ""}`;
    const disposition = `attachment; filename="${filename}"`;
    if (isProof) {
      return c.body(fromHex(row.ots!), 200, {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": disposition,
      });
    }
    return c.body(row.body, 200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": disposition,
    });
  });

  app.delete("/api/submissions", async (c) => {
    if (!(await isAdmin(c.req.header("Authorization"), c.env.ADMIN_TOKEN))) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    const result = await c.env.DB.prepare("DELETE FROM submissions").run();
    return c.json({ deleted: result.meta.changes });
  });

  app.post("/api/submissions", async (c) => {
    const { question_id, answer, hash } = await c.req
      .json<Record<string, unknown>>()
      .catch(() => ({}) as Record<string, unknown>);

    if (!question_id || !answer || !hash) {
      return c.json(
        { error: "Missing required fields: question_id, answer, hash" },
        400,
      );
    }
    if (
      typeof question_id !== "string" ||
      typeof answer !== "string" ||
      typeof hash !== "string"
    ) {
      return c.json({ error: "question_id, answer and hash must be strings" }, 400);
    }
    if (answer.length > MAX_ANSWER_LENGTH || hash.length > MAX_HASH_LENGTH) {
      return c.json({ error: "answer or hash too long" }, 400);
    }

    const expectedAnswer = expectedAnswerFor(question_id);
    if (!expectedAnswer) {
      return c.json({ error: `Invalid question_id: ${question_id}` }, 400);
    }

    // Verdict: case-insensitive first-word match
    const firstWord = answer.trim().split(/\s/)[0].replace(/[.,!?]/g, "");
    const verdict: Submission["verdict"] =
      firstWord.toLowerCase() === expectedAnswer.toLowerCase() ? "pass" : "fail";

    const now = Date.now();
    const submission: Submission = {
      question_id,
      answer,
      hash,
      verdict,
      timestamp: new Date(now).toISOString(),
    };
    const body = JSON.stringify(submission, null, 2);
    const suffix = crypto.getRandomValues(new Uint32Array(1))[0].toString(16);
    const id = `${question_id}-${now}-${suffix}`;

    await c.env.DB.prepare(
      `INSERT INTO submissions (id, question_id, body, created_at)
       VALUES (?1, ?2, ?3, ?4)`,
    )
      .bind(id, question_id, body, now)
      .run();

    // Best-effort Bitcoin anchoring after the response is sent.
    c.executionCtx.waitUntil(
      stamp(body)
        .then(async (ots) => {
          if (!ots) return;
          await c.env.DB.prepare(
            "UPDATE submissions SET ots = ?1, anchor_status = 'pending' WHERE id = ?2",
          )
            .bind(ots, id)
            .run();
        })
        .catch((err) => console.error(`OTS stamp failed for ${id}:`, err)),
    );

    return c.json({ ...submission, id }, 201);
  });

  app.notFound((c) => c.json({ error: "Not found" }, 404));

  app.onError((err, c) => {
    console.error(`${c.req.method} ${c.req.path} failed:`, err);
    return c.json({ error: "Internal server error" }, 500);
  });

  return app;
}
