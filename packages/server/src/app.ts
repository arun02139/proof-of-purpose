import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import yaml from "js-yaml";
import type { Constitution, Category } from "shared";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const CONSTITUTIONS_DIR = resolve(REPO_ROOT, "data", "constitutions");

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

export function createApp(): express.Express {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.get("/api/constitution", (_req, res) => {
    try {
      const constitutionPath = resolve(
        CONSTITUTIONS_DIR,
        "anthropic-claude.yaml",
      );
      const constitution = loadConstitution(constitutionPath);
      res.json(constitution);
    } catch (err) {
      console.error("Failed to load constitution:", err);
      res.status(500).json({ error: "Failed to load constitution" });
    }
  });

  return app;
}
