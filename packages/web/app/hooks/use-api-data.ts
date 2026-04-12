import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  Constitution,
  Submission,
  Category,
  CategorySummary,
  EvalBundle,
} from "shared";
import type { ProviderDisplay } from "~/data/providers";
import { getPlaceholderProviders } from "~/data/providers";

interface ApiData {
  providers: ProviderDisplay[];
  submissions: Submission[];
  loading: boolean;
  error: string | null;
  submitAnswer: (
    questionId: string,
    answer: string,
    hash: string,
  ) => Promise<Submission>;
  clearSubmissions: () => void;
  resetSubmissions: () => Promise<void>;
}

/**
 * Build an EvalBundle-compatible shape from a Constitution + Submissions
 * so existing components can render without major changes.
 */
function buildProviderDisplay(
  constitution: Constitution,
  submissions: Submission[],
): ProviderDisplay {
  // Use latest submission per question_id
  const latestByQuestion = new Map<string, Submission>();
  for (const s of submissions) {
    const existing = latestByQuestion.get(s.question_id);
    if (!existing || s.timestamp > existing.timestamp) {
      latestByQuestion.set(s.question_id, s);
    }
  }

  // Compute category summaries
  const catStats = new Map<Category, { total: number; passed: number }>();
  for (const rule of constitution.rules) {
    const stats = catStats.get(rule.category) ?? { total: 0, passed: 0 };
    for (const prompt of rule.prompts) {
      stats.total++;
      const sub = latestByQuestion.get(prompt.question_id);
      if (sub && sub.verdict === "pass") {
        stats.passed++;
      }
    }
    catStats.set(rule.category, stats);
  }

  const byCategory: CategorySummary[] = Array.from(catStats.entries()).map(
    ([category, { total, passed }]) => ({
      category,
      total,
      passed,
      failed: total - passed,
    }),
  );

  const totalPrompts = byCategory.reduce((s, c) => s + c.total, 0);
  const totalPassed = byCategory.reduce((s, c) => s + c.passed, 0);

  const bundle: EvalBundle = {
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    constitution,
    results: [],
    summary: {
      total_rules: totalPrompts,
      passed: totalPassed,
      failed: totalPrompts - totalPassed,
      compliance_score: totalPrompts > 0 ? totalPassed / totalPrompts : 0,
      by_category: byCategory,
    },
    bundle_hash: "",
  };

  return {
    name: constitution.provider,
    model: constitution.model,
    isReal: true,
    bundle,
  };
}

export function useApiData(): ApiData {
  const [constitution, setConstitution] = useState<Constitution | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [constRes, subsRes] = await Promise.all([
          fetch("/api/constitution"),
          fetch("/api/submissions"),
        ]);
        if (!constRes.ok) throw new Error("Failed to fetch constitution");
        if (!subsRes.ok) throw new Error("Failed to fetch submissions");
        const constData = (await constRes.json()) as Constitution;
        const subsData = (await subsRes.json()) as Submission[];
        if (!cancelled) {
          setConstitution(constData);
          setSubmissions(subsData);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const submitAnswer = useCallback(
    async (
      questionId: string,
      answer: string,
      hash: string,
    ): Promise<Submission> => {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId, answer, hash }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error || "Failed to submit",
        );
      }
      const submission = (await res.json()) as Submission;
      setSubmissions((prev) => [...prev, submission]);
      return submission;
    },
    [],
  );

  const clearSubmissions = useCallback(() => {
    setSubmissions([]);
  }, []);

  const resetSubmissions = useCallback(async () => {
    await fetch("/api/submissions", { method: "DELETE" });
    setSubmissions([]);
  }, []);

  const providers = useMemo(() => {
    const list: ProviderDisplay[] = [];
    if (constitution) {
      list.push(buildProviderDisplay(constitution, submissions));
    }
    list.push(...getPlaceholderProviders());
    return list;
  }, [constitution, submissions]);

  return {
    providers,
    submissions,
    loading,
    error,
    submitAnswer,
    clearSubmissions,
    resetSubmissions,
  };
}
