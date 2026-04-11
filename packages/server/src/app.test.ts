import { describe, it, expect } from "vitest";
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
