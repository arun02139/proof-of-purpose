import { describe, it, expect, beforeEach } from "vitest";
import {
  createExecutionContext,
  env,
  waitOnExecutionContext,
} from "cloudflare:test";
import { APRIL_PROOF_HEX, APRIL_UPGRADES } from "../test/fixtures";
import { createApp, type AppOptions } from "./app";
import { upgradePending, UPGRADE_MIN_AGE_MS } from "./anchoring";
import { fromHex, toHex, walkProof } from "./ots";

const QID = "honesty-disclose-ai-1";

/** Request helper: runs waitUntil work (stamping) to completion before returning. */
function client(options: AppOptions = { stamp: async () => null }) {
  const app = createApp(options);
  return async (path: string, init?: RequestInit) => {
    const ctx = createExecutionContext();
    const res = await app.request(path, init, env, ctx);
    await waitOnExecutionContext(ctx);
    return res;
  };
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const request = client();

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM submissions").run();
});

describe("GET /api/constitution", () => {
  it("returns 200 with provider and model", async () => {
    const res = await request("/api/constitution");
    expect(res.status).toBe(200);
    const body = await res.json<any>();
    expect(body.provider).toBe("Anthropic");
    expect(body.model).toBe("claude-sonnet-4-6");
  });

  it("returns 5 rules with 4 prompts each", async () => {
    const body = await (await request("/api/constitution")).json<any>();
    expect(body.rules).toHaveLength(5);
    for (const rule of body.rules) expect(rule.prompts).toHaveLength(4);
  });

  it("each rule has id, principle, category; each prompt has question_id, text, expected_answer", async () => {
    const body = await (await request("/api/constitution")).json<any>();
    for (const rule of body.rules) {
      expect(typeof rule.id).toBe("string");
      expect(typeof rule.principle).toBe("string");
      expect(["safety", "honesty", "bias", "transparency"]).toContain(rule.category);
      for (const prompt of rule.prompts) {
        expect(typeof prompt.question_id).toBe("string");
        expect(typeof prompt.text).toBe("string");
        expect(["Yes", "No"]).toContain(prompt.expected_answer);
      }
    }
  });

  it("includes CORS headers", async () => {
    const res = await request("/api/constitution", {
      headers: { Origin: "http://localhost:5173" },
    });
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy();
  });
});

describe("unknown routes", () => {
  it("returns 404 for unknown API routes", async () => {
    const res = await request("/api/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("POST /api/submissions", () => {
  it("returns 201 with the created submission", async () => {
    const res = await request(
      "/api/submissions",
      post({ question_id: QID, answer: "Yes, I am an AI assistant.", hash: "abc123" }),
    );
    expect(res.status).toBe(201);
    const body = await res.json<any>();
    expect(body).toMatchObject({
      question_id: QID,
      answer: "Yes, I am an AI assistant.",
      hash: "abc123",
      verdict: "pass",
    });
    expect(body.timestamp).toBeDefined();
    expect(body.id).toMatch(new RegExp(`^${QID}-\\d+-[0-9a-f]+$`));
  });

  it.each([
    ["Yes, I am an AI.", "pass"],
    ["No, I am a human being.", "fail"],
    ["yes, absolutely.", "pass"],
  ])("verdict for %j is %s (case-insensitive first word)", async (answer, verdict) => {
    const res = await request("/api/submissions", post({ question_id: QID, answer, hash: "h" }));
    expect((await res.json<any>()).verdict).toBe(verdict);
  });

  it.each([
    [{ answer: "Yes", hash: "h" }, /Missing required fields/],
    [{ question_id: QID, hash: "h" }, /Missing required fields/],
    [{ question_id: QID, answer: "Yes" }, /Missing required fields/],
    [{ question_id: "nonexistent-question", answer: "Yes", hash: "h" }, /Invalid question_id/],
    [{ question_id: QID, answer: ["Yes"], hash: "h" }, /must be strings/],
    [{ question_id: QID, answer: "Y".repeat(9000), hash: "h" }, /too long/],
  ])("returns 400 for %j", async (payload, error) => {
    const res = await request("/api/submissions", post(payload));
    expect(res.status).toBe(400);
    expect((await res.json<any>()).error).toMatch(error);
  });

  it("returns 400 for a non-JSON body", async () => {
    const res = await request("/api/submissions", { method: "POST", body: "nope" });
    expect(res.status).toBe(400);
  });

  it("succeeds without an anchor when every calendar fails", async () => {
    const res = await request("/api/submissions", post({ question_id: QID, answer: "Yes", hash: "h" }));
    expect(res.status).toBe(201);
    const [listed] = await (await request("/api/submissions")).json<any[]>();
    expect(listed.anchor).toBeUndefined();
  });

  it("stamps the exact stored JSON and marks it pending", async () => {
    let stamped = "";
    const withStamp = client({
      stamp: async (body) => {
        stamped = body;
        return APRIL_PROOF_HEX;
      },
    });
    const created = await (
      await withStamp("/api/submissions", post({ question_id: QID, answer: "Yes", hash: "h" }))
    ).json<any>();

    const [listed] = await (await withStamp("/api/submissions")).json<any[]>();
    expect(listed.anchor).toEqual({ status: "pending" });

    const json = await withStamp(`/api/submissions/${created.id}.json`);
    expect(json.headers.get("content-disposition")).toContain(`${created.id}.json`);
    expect(await json.text()).toBe(stamped);

    const ots = await withStamp(`/api/submissions/${created.id}.json.ots`);
    expect(ots.headers.get("content-type")).toBe("application/octet-stream");
    expect(toHex(new Uint8Array(await ots.arrayBuffer()))).toBe(APRIL_PROOF_HEX);
  });
});

describe("GET /api/submissions", () => {
  it("returns an empty array when no submissions exist", async () => {
    const res = await request("/api/submissions");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("returns submissions after one is created", async () => {
    await request("/api/submissions", post({ question_id: QID, answer: "Yes", hash: "abc123" }));
    const body = await (await request("/api/submissions")).json<any[]>();
    expect(body).toHaveLength(1);
    expect(body[0].question_id).toBe(QID);
  });

  it("404s downloads for unknown ids, unstamped proofs and bad names", async () => {
    const { id } = await (
      await request("/api/submissions", post({ question_id: QID, answer: "Yes", hash: "h" }))
    ).json<any>();
    expect((await request(`/api/submissions/${id}.json.ots`)).status).toBe(404);
    expect((await request("/api/submissions/nope-1.json")).status).toBe(404);
    expect((await request(`/api/submissions/${id}.txt`)).status).toBe(404);
  });
});

describe("DELETE /api/submissions", () => {
  it("returns { deleted: 0 } when no submissions exist", async () => {
    const res = await request("/api/submissions", { method: "DELETE" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: 0 });
  });

  it("deletes all submissions and returns the count", async () => {
    await request("/api/submissions", post({ question_id: QID, answer: "Yes", hash: "h1" }));
    await request("/api/submissions", post({ question_id: QID, answer: "Yes", hash: "h2" }));
    const res = await request("/api/submissions", { method: "DELETE" });
    expect(await res.json()).toEqual({ deleted: 2 });
    expect(await (await request("/api/submissions")).json()).toEqual([]);
  });
});

describe("upgradePending (cron)", () => {
  const now = Date.now();

  async function insertPending(id: string, createdAt: number) {
    await env.DB.prepare(
      `INSERT INTO submissions (id, question_id, body, ots, anchor_status, created_at)
       VALUES (?1, ?2, '{}', ?3, 'pending', ?4)`,
    )
      .bind(id, QID, APRIL_PROOF_HEX, createdAt)
      .run();
  }

  /** Serves the recorded calendar upgrades for the April proof. */
  const calendars: typeof fetch = async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    const uri = Object.keys(APRIL_UPGRADES).find((u) => url.startsWith(`${u}/timestamp/`));
    return uri
      ? new Response(fromHex(APRIL_UPGRADES[uri]))
      : new Response("Not found", { status: 404 });
  };

  it("anchors due proofs and records the earliest block height", async () => {
    await insertPending("old-1", now - UPGRADE_MIN_AGE_MS - 1);
    expect(await upgradePending(env.DB, now, calendars)).toBe(1);

    const row = await env.DB.prepare("SELECT * FROM submissions WHERE id = 'old-1'").first<any>();
    expect(row.anchor_status).toBe("anchored");
    expect(row.block_height).toBe(944547);
    expect(row.checked_at).toBe(now);
    expect(walkProof(fromHex(row.ots)).pending).toEqual([]);

    const [listed] = await (await request("/api/submissions")).json<any[]>();
    expect(listed.anchor).toEqual({ status: "anchored", block_height: 944547 });
  });

  it("leaves recent proofs alone", async () => {
    await insertPending("recent-1", now - 60_000);
    expect(await upgradePending(env.DB, now, calendars)).toBe(0);
    const row = await env.DB.prepare("SELECT * FROM submissions").first<any>();
    expect(row.checked_at).toBeNull();
    expect(row.ots).toBe(APRIL_PROOF_HEX);
  });

  it("stays pending, and records the check, while calendars still answer 404", async () => {
    await insertPending("old-2", now - UPGRADE_MIN_AGE_MS - 1);
    const notYet: typeof fetch = async () => new Response("Pending", { status: 404 });
    expect(await upgradePending(env.DB, now, notYet)).toBe(0);
    const row = await env.DB.prepare("SELECT * FROM submissions").first<any>();
    expect(row.anchor_status).toBe("pending");
    expect(row.checked_at).toBe(now);
    expect(row.ots).toBe(APRIL_PROOF_HEX);
  });
});
