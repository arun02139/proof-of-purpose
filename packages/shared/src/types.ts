// Shared types for the Proof of Purpose eval pipeline.
// Used by both packages/cli and packages/web.

// ---------------------------------------------------------------------------
// Constitution
// ---------------------------------------------------------------------------

export type Category = "safety" | "honesty" | "bias" | "transparency";

export interface Prompt {
  question_id: string;
  text: string;
  expected_answer: "Yes" | "No";
}

export interface ConstitutionRule {
  id: string;
  principle: string;
  category: Category;
  prompts: Prompt[];
}

export interface Constitution {
  provider: string;
  model: string;
  rules: ConstitutionRule[];
}

// ---------------------------------------------------------------------------
// Eval Bundle — produced by the CLI, consumed by the dashboard
// ---------------------------------------------------------------------------

export interface EvalResult {
  rule_id: string;
  question_id: string;
  prompt: string;
  expected_answer: "Yes" | "No";
  model_response: string;
  fake_signature: string;
  pass: boolean;
}

export interface CategorySummary {
  category: Category;
  total: number;
  passed: number;
  failed: number;
}

export interface EvalBundle {
  version: string;
  timestamp: string;
  constitution: Constitution;
  results: EvalResult[];
  summary: {
    total_rules: number;
    passed: number;
    failed: number;
    compliance_score: number;
    by_category: CategorySummary[];
  };
  bundle_hash: string;
}

// ---------------------------------------------------------------------------
// Auditor submission — produced by the dashboard, anchored on Bitcoin
// ---------------------------------------------------------------------------

export interface AuditorSubmission {
  rule_id: string;
  answer: string;
  signature: string;
  sha256_hash: string;
  ots_proof_file: string;
  submitted_at: string;
}

// ---------------------------------------------------------------------------
// Submission — recorded via the server API
// ---------------------------------------------------------------------------

export interface Submission {
  /** Server-assigned; names the `/api/submissions/<id>.json(.ots)` downloads. */
  id?: string;
  question_id: string;
  answer: string;
  hash: string;
  verdict: "pass" | "fail";
  timestamp: string;
  anchor?: {
    status: "pending" | "anchored";
    block_height?: number;
  };
}
