import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import Anthropic from "@anthropic-ai/sdk";
import type {
  Constitution,
  ConstitutionRule,
  EvalResult,
  EvalBundle,
  CategorySummary,
  Category,
} from "shared";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const CONSTITUTIONS_DIR = resolve(REPO_ROOT, "data", "constitutions");
const RESULTS_DIR = resolve(REPO_ROOT, "data", "results");

// ---------------------------------------------------------------------------
// 1. Parse constitution YAML
// ---------------------------------------------------------------------------

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

export function loadConstitution(filePath: string): Constitution {
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

// ---------------------------------------------------------------------------
// 2. Call Claude API for each rule
// ---------------------------------------------------------------------------

async function queryModel(
  client: Anthropic,
  model: string,
  prompt: string,
): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error(`Unexpected content block type: ${block.type}`);
  }
  return block.text;
}

// ---------------------------------------------------------------------------
// 3. Fake signature (demonstrates the signing protocol requirement)
// ---------------------------------------------------------------------------

function fakeSig(): string {
  return `fake-sig-${randomBytes(32).toString("hex")}`;
}

// ---------------------------------------------------------------------------
// 4. Deterministic pass/fail via string matching
// ---------------------------------------------------------------------------

export function judge(response: string, expected: "Yes" | "No"): boolean {
  const firstWord = response.trim().split(/[\s,.:;!]+/)[0].toLowerCase();
  return firstWord === expected.toLowerCase();
}

// ---------------------------------------------------------------------------
// 5. Build eval bundle with SHA-256 hash
// ---------------------------------------------------------------------------

export function buildBundle(
  constitution: Constitution,
  results: EvalResult[],
): EvalBundle {
  const categories = [...new Set(constitution.rules.map((r) => r.category))];
  const byCategory: CategorySummary[] = categories.map((cat) => {
    const catResults = results.filter(
      (r) =>
        constitution.rules.find((rule) => rule.id === r.rule_id)?.category ===
        cat,
    );
    return {
      category: cat,
      total: catResults.length,
      passed: catResults.filter((r) => r.pass).length,
      failed: catResults.filter((r) => !r.pass).length,
    };
  });

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  // Build bundle without hash first, then compute hash over the JSON
  const bundle: EvalBundle = {
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    constitution,
    results,
    summary: {
      total_rules: results.length,
      passed,
      failed,
      compliance_score: results.length > 0 ? passed / results.length : 0,
      by_category: byCategory,
    },
    bundle_hash: "", // placeholder
  };

  // Hash everything except the hash field itself
  const hashInput = JSON.stringify({ ...bundle, bundle_hash: undefined });
  bundle.bundle_hash = createHash("sha256").update(hashInput).digest("hex");

  return bundle;
}

// ---------------------------------------------------------------------------
// 6. Write bundle and stamp with OpenTimestamps
// ---------------------------------------------------------------------------

function writeAndStamp(bundle: EvalBundle): string {
  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const slug = bundle.constitution.provider.toLowerCase().replace(/\s+/g, "-");
  const bundlePath = resolve(RESULTS_DIR, `${slug}-eval-bundle.json`);
  writeFileSync(bundlePath, JSON.stringify(bundle, null, 2));
  console.log(`  Bundle written → ${bundlePath}`);

  // Stamp with OpenTimestamps (best-effort — skip if ots not available)
  try {
    execSync(`ots stamp ${bundlePath}`, { stdio: "pipe" });
    console.log(`  OTS proof created → ${bundlePath}.ots`);
  } catch {
    console.warn(
      "  ⚠ ots stamp skipped (OpenTimestamps CLI not found or failed)",
    );
  }

  return bundlePath;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const constitutionFile =
    process.argv[2] ?? resolve(CONSTITUTIONS_DIR, "anthropic-claude.yaml");

  console.log("Proof of Purpose — CLI Eval Pipeline");
  console.log("====================================\n");

  // 1. Load constitution
  console.log(`Loading constitution: ${constitutionFile}`);
  const constitution = loadConstitution(constitutionFile);
  console.log(
    `  Provider: ${constitution.provider}, Model: ${constitution.model}`,
  );
  const totalPrompts = constitution.rules.reduce((n, r) => n + r.prompts.length, 0);
  console.log(`  Rules: ${constitution.rules.length}, Prompts: ${totalPrompts}\n`);

  // 2. Initialize Anthropic client
  const client = new Anthropic();

  // 3. Evaluate each prompt within each rule
  console.log("Running evaluations...\n");
  const results: EvalResult[] = [];

  for (const rule of constitution.rules) {
    console.log(`  [${rule.id}] ${rule.principle}`);
    for (const prompt of rule.prompts) {
      process.stdout.write(`    ${prompt.question_id} ... `);
      const response = await queryModel(client, constitution.model, prompt.text);
      const pass = judge(response, prompt.expected_answer);
      const sig = fakeSig();

      results.push({
        rule_id: rule.id,
        question_id: prompt.question_id,
        prompt: prompt.text,
        expected_answer: prompt.expected_answer,
        model_response: response,
        fake_signature: sig,
        pass,
      });

      console.log(pass ? "PASS ✓" : "FAIL ✗");
    }
  }

  // 4. Build bundle
  console.log("\nBuilding eval bundle...");
  const bundle = buildBundle(constitution, results);
  console.log(`  SHA-256: ${bundle.bundle_hash}`);
  console.log(
    `  Compliance: ${bundle.summary.passed}/${bundle.summary.total_rules} (${(bundle.summary.compliance_score * 100).toFixed(0)}%)`,
  );

  // 5. Write and stamp
  console.log("\nWriting results...");
  const bundlePath = writeAndStamp(bundle);

  console.log("\n✓ Done.");
  return bundlePath;
}

// Only run when executed directly (not when imported by tests)
const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith("index.ts") ||
    process.argv[1].endsWith("index.js"));

if (isDirectRun) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
