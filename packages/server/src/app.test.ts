import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import request from "supertest";
import { createApp } from "./app.js";

const app = createApp();

describe("GET /api/constitution", () => {
  it("returns 200", async () => {
    const res = await request(app).get("/api/constitution");
    expect(res.status).toBe(200);
  });

  it("returns JSON with provider and model", async () => {
    const res = await request(app).get("/api/constitution");
    expect(res.body.provider).toBe("Anthropic");
    expect(res.body.model).toBe("claude-sonnet-4-6");
  });

  it("returns 5 rules", async () => {
    const res = await request(app).get("/api/constitution");
    expect(res.body.rules).toHaveLength(5);
  });

  it("each rule has prompts array with at least one prompt", async () => {
    const res = await request(app).get("/api/constitution");
    for (const rule of res.body.rules) {
      expect(Array.isArray(rule.prompts)).toBe(true);
      expect(rule.prompts.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("returns 20 total prompts (4 per rule)", async () => {
    const res = await request(app).get("/api/constitution");
    const totalPrompts = res.body.rules.reduce(
      (n: number, r: { prompts: unknown[] }) => n + r.prompts.length,
      0,
    );
    expect(totalPrompts).toBe(20);
  });

  it("each prompt has question_id, text, and expected_answer", async () => {
    const res = await request(app).get("/api/constitution");
    for (const rule of res.body.rules) {
      for (const prompt of rule.prompts) {
        expect(prompt).toHaveProperty("question_id");
        expect(prompt).toHaveProperty("text");
        expect(prompt).toHaveProperty("expected_answer");
        expect(["Yes", "No"]).toContain(prompt.expected_answer);
      }
    }
  });

  it("each rule has id, principle, and category", async () => {
    const res = await request(app).get("/api/constitution");
    const validCategories = ["safety", "honesty", "bias", "transparency"];
    for (const rule of res.body.rules) {
      expect(typeof rule.id).toBe("string");
      expect(typeof rule.principle).toBe("string");
      expect(validCategories).toContain(rule.category);
    }
  });

  it("includes CORS headers", async () => {
    const res = await request(app)
      .get("/api/constitution")
      .set("Origin", "http://localhost:5173");
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
  });
});

describe("unknown routes", () => {
  it("returns 404 for unknown API routes", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("Static file serving", () => {
  it("serves index.html at the root path", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });

  it("API routes take precedence over static files", async () => {
    const res = await request(app).get("/api/constitution");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.provider).toBe("Anthropic");
  });

  it("SPA fallback: unknown non-API routes serve index.html", async () => {
    const res = await request(app).get("/some/deep/route");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/html/);
  });
});

describe("Submissions API", () => {
  let tmpDir: string;
  let testApp: ReturnType<typeof createApp>;

  beforeEach(() => {
    tmpDir = mkdtempSync(resolve(tmpdir(), "pop-test-"));
    testApp = createApp(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("GET /api/submissions", () => {
    it("returns empty array when no submissions exist", async () => {
      const res = await request(testApp).get("/api/submissions");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns submissions after one is created", async () => {
      await request(testApp)
        .post("/api/submissions")
        .send({
          question_id: "honesty-disclose-ai-1",
          answer: "Yes, I am an AI assistant.",
          hash: "abc123",
        });

      const res = await request(testApp).get("/api/submissions");
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].question_id).toBe("honesty-disclose-ai-1");
    });
  });

  describe("POST /api/submissions", () => {
    it("returns 201 with the created submission", async () => {
      const res = await request(testApp)
        .post("/api/submissions")
        .send({
          question_id: "honesty-disclose-ai-1",
          answer: "Yes, I am an AI assistant.",
          hash: "abc123",
        });

      expect(res.status).toBe(201);
      expect(res.body.question_id).toBe("honesty-disclose-ai-1");
      expect(res.body.answer).toBe("Yes, I am an AI assistant.");
      expect(res.body.hash).toBe("abc123");
      expect(res.body.verdict).toBe("pass");
      expect(res.body.timestamp).toBeDefined();
    });

    it("computes pass verdict when answer matches expected", async () => {
      const res = await request(testApp)
        .post("/api/submissions")
        .send({
          question_id: "honesty-disclose-ai-1",
          answer: "Yes, I am an AI.",
          hash: "hash1",
        });
      expect(res.body.verdict).toBe("pass");
    });

    it("computes fail verdict when answer does not match", async () => {
      const res = await request(testApp)
        .post("/api/submissions")
        .send({
          question_id: "honesty-disclose-ai-1",
          answer: "No, I am a human being.",
          hash: "hash2",
        });
      expect(res.body.verdict).toBe("fail");
    });

    it("verdict matching is case-insensitive", async () => {
      const res = await request(testApp)
        .post("/api/submissions")
        .send({
          question_id: "honesty-disclose-ai-1",
          answer: "yes, absolutely.",
          hash: "hash3",
        });
      expect(res.body.verdict).toBe("pass");
    });

    it("returns 400 when question_id is missing", async () => {
      const res = await request(testApp)
        .post("/api/submissions")
        .send({ answer: "Yes", hash: "h" });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Missing required fields/);
    });

    it("returns 400 when answer is missing", async () => {
      const res = await request(testApp)
        .post("/api/submissions")
        .send({ question_id: "honesty-disclose-ai-1", hash: "h" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when hash is missing", async () => {
      const res = await request(testApp)
        .post("/api/submissions")
        .send({ question_id: "honesty-disclose-ai-1", answer: "Yes" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for invalid question_id", async () => {
      const res = await request(testApp)
        .post("/api/submissions")
        .send({
          question_id: "nonexistent-question",
          answer: "Yes",
          hash: "h",
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid question_id/);
    });

    it("writes submission file to disk", async () => {
      await request(testApp)
        .post("/api/submissions")
        .send({
          question_id: "honesty-disclose-ai-1",
          answer: "Yes",
          hash: "disk-test",
        });

      const files = readdirSync(resolve(tmpDir, "submissions"));
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^honesty-disclose-ai-1-\d+\.json$/);
    });

    it("submission succeeds even when ots is not installed", async () => {
      // ots is not available in the test environment — submission should still work
      const res = await request(testApp)
        .post("/api/submissions")
        .send({
          question_id: "honesty-disclose-ai-1",
          answer: "Yes, I am an AI.",
          hash: "ots-unavailable-test",
        });

      expect(res.status).toBe(201);
      expect(res.body.verdict).toBe("pass");
    });
  });

  describe("OTS anchor status", () => {
    it("returns no anchor field when no .ots file exists", async () => {
      // Create a submission
      await request(testApp)
        .post("/api/submissions")
        .send({
          question_id: "honesty-disclose-ai-1",
          answer: "Yes",
          hash: "no-ots",
        });

      const res = await request(testApp).get("/api/submissions");
      expect(res.body[0].anchor).toBeUndefined();
    });

    it("returns pending anchor when .ots file exists", async () => {
      // Create a submission
      await request(testApp)
        .post("/api/submissions")
        .send({
          question_id: "honesty-disclose-ai-1",
          answer: "Yes",
          hash: "with-ots",
        });

      // Simulate OTS creating a .ots file alongside the JSON
      const subDir = resolve(tmpDir, "submissions");
      const files = readdirSync(subDir).filter((f) => f.endsWith(".json"));
      expect(files).toHaveLength(1);
      writeFileSync(resolve(subDir, files[0] + ".ots"), "fake-ots-proof");

      const res = await request(testApp).get("/api/submissions");
      expect(res.body[0].anchor).toBeDefined();
      expect(res.body[0].anchor.status).toBe("pending");
    });
  });
});
