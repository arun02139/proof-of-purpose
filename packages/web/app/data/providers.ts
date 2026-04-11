import type { EvalBundle, Category, CategorySummary } from "shared";

// ---------------------------------------------------------------------------
// Provider display metadata
// ---------------------------------------------------------------------------

export interface ProviderDisplay {
  name: string;
  model: string;
  isReal: boolean; // true = real eval data, false = placeholder
  bundle: EvalBundle;
}

// ---------------------------------------------------------------------------
// Placeholder bundles for providers not yet tested live
// ---------------------------------------------------------------------------

function placeholderSummary(
  byCategory: CategorySummary[],
): EvalBundle["summary"] {
  const total = byCategory.reduce((s, c) => s + c.total, 0);
  const passed = byCategory.reduce((s, c) => s + c.passed, 0);
  return {
    total_rules: total,
    passed,
    failed: total - passed,
    compliance_score: total > 0 ? passed / total : 0,
    by_category: byCategory,
  };
}

function makePlaceholder(
  provider: string,
  model: string,
  cats: CategorySummary[],
): EvalBundle {
  const summary = placeholderSummary(cats);
  return {
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    constitution: { provider, model, rules: [] },
    results: [],
    summary,
    bundle_hash: "placeholder",
  };
}

const openaiPlaceholder = makePlaceholder("OpenAI", "gpt-4o", [
  { category: "safety", total: 3, passed: 2, failed: 1 },
  { category: "honesty", total: 2, passed: 1, failed: 1 },
  { category: "bias", total: 2, passed: 2, failed: 0 },
  { category: "transparency", total: 2, passed: 1, failed: 1 },
]);

const googlePlaceholder = makePlaceholder("Google", "gemini-2.5-pro", [
  { category: "safety", total: 3, passed: 3, failed: 0 },
  { category: "honesty", total: 2, passed: 1, failed: 1 },
  { category: "bias", total: 2, passed: 1, failed: 1 },
  { category: "transparency", total: 2, passed: 0, failed: 2 },
]);

const metaPlaceholder = makePlaceholder("Meta", "llama-4-maverick", [
  { category: "safety", total: 3, passed: 2, failed: 1 },
  { category: "honesty", total: 2, passed: 2, failed: 0 },
  { category: "bias", total: 2, passed: 1, failed: 1 },
  { category: "transparency", total: 2, passed: 1, failed: 1 },
]);

// ---------------------------------------------------------------------------
// Placeholder providers (no API data available for these)
// ---------------------------------------------------------------------------

export function getPlaceholderProviders(): ProviderDisplay[] {
  return [
    {
      name: "OpenAI",
      model: "gpt-4o",
      isReal: false,
      bundle: openaiPlaceholder,
    },
    {
      name: "Google",
      model: "gemini-2.5-pro",
      isReal: false,
      bundle: googlePlaceholder,
    },
    {
      name: "Meta",
      model: "llama-4-maverick",
      isReal: false,
      bundle: metaPlaceholder,
    },
  ];
}

// Category display labels
export const CATEGORY_LABELS: Record<Category, string> = {
  safety: "Safety",
  honesty: "Honesty",
  bias: "Bias",
  transparency: "Transparency",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  safety: "bg-red-500",
  honesty: "bg-blue-500",
  bias: "bg-amber-500",
  transparency: "bg-emerald-500",
};
