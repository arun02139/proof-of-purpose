import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import yaml from "js-yaml";
import type { Constitution, Category, Submission } from "shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const CONSTITUTIONS_DIR = resolve(REPO_ROOT, "data", "constitutions");
const WEB_BUILD_DIR = resolve(REPO_ROOT, "packages", "web", "build", "client");

interface RawConstitution {
  provider: string;
  model: string;
  rules: {
    id: string;
    principle: string;
    category: Category;
    prompts: {
      question_id: string;
      text: string;
      expected_answer: "Yes" | "No";
    }[];
  }[];
}

function loadConstitution(filePath: string): Constitution {
  const raw = yaml.load(readFileSync(filePath, "utf-8")) as RawConstitution;
  return {
    provider: raw.provider,
    model: raw.model,
    rules: raw.rules.map((r) => ({
      id: r.id,
      principle: r.principle,
      category: r.category,
      prompts: r.prompts.map((p) => ({
        question_id: p.question_id,
        text: p.text.trim(),
        expected_answer: p.expected_answer,
      })),
    })),
  };
}

const DEFAULT_DATA_DIR =
  process.env.NODE_ENV === "production" ? "/data" : resolve(REPO_ROOT, "data");

export function createApp(dataDir?: string): express.Express {
  const app = express();
  const submissionsDir = resolve(
    dataDir ?? process.env.DATA_DIR ?? DEFAULT_DATA_DIR,
    "submissions",
  );

  app.use(cors({ origin: true }));
  app.use(express.json());

  // Load constitution once for prompt lookups
  const constitutionPath = resolve(
    CONSTITUTIONS_DIR,
    "anthropic-claude.yaml",
  );

  app.get("/api/constitution", (_req, res) => {
    try {
      const constitution = loadConstitution(constitutionPath);
      res.json(constitution);
    } catch (err) {
      console.error("Failed to load constitution:", err);
      res.status(500).json({ error: "Failed to load constitution" });
    }
  });

  app.get("/api/submissions", (_req, res) => {
    try {
      if (!existsSync(submissionsDir)) {
        res.json([]);
        return;
      }
      const files = readdirSync(submissionsDir).filter((f) =>
        f.endsWith(".json"),
      );
      const submissions: Submission[] = files.map((f) =>
        JSON.parse(readFileSync(resolve(submissionsDir, f), "utf-8")),
      );
      res.json(submissions);
    } catch (err) {
      console.error("Failed to read submissions:", err);
      res.status(500).json({ error: "Failed to read submissions" });
    }
  });

  app.post("/api/submissions", (req, res) => {
    try {
      const { question_id, answer, hash } = req.body;

      // Validate required fields
      if (!question_id || !answer || !hash) {
        res.status(400).json({
          error: "Missing required fields: question_id, answer, hash",
        });
        return;
      }

      // Look up the prompt to compute verdict
      const constitution = loadConstitution(constitutionPath);
      let expectedAnswer: string | null = null;
      for (const rule of constitution.rules) {
        for (const prompt of rule.prompts) {
          if (prompt.question_id === question_id) {
            expectedAnswer = prompt.expected_answer;
          }
        }
      }

      if (expectedAnswer === null) {
        res.status(400).json({ error: `Invalid question_id: ${question_id}` });
        return;
      }

      // Compute verdict: case-insensitive first-word match
      const firstWord = answer.trim().split(/\s/)[0].replace(/[.,!?]/g, "");
      const verdict: "pass" | "fail" =
        firstWord.toLowerCase() === expectedAnswer.toLowerCase()
          ? "pass"
          : "fail";

      const submission: Submission = {
        question_id,
        answer,
        hash,
        verdict,
        timestamp: new Date().toISOString(),
      };

      // Write to disk
      mkdirSync(submissionsDir, { recursive: true });
      const filename = `${question_id}-${Date.now()}.json`;
      writeFileSync(
        resolve(submissionsDir, filename),
        JSON.stringify(submission, null, 2),
      );

      res.status(201).json(submission);
    } catch (err) {
      console.error("Failed to create submission:", err);
      res.status(500).json({ error: "Failed to create submission" });
    }
  });

  // Static file serving for the web dashboard (production)
  if (existsSync(WEB_BUILD_DIR)) {
    app.use(express.static(WEB_BUILD_DIR));

    // SPA fallback: non-API routes serve index.html for client-side routing
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(resolve(WEB_BUILD_DIR, "index.html"));
    });
  }

  return app;
}
