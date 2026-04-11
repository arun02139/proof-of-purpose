import { useState } from "react";
import type { ProviderDisplay } from "~/data/providers";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "~/data/providers";
import type { Category, ConstitutionRule, Prompt, Submission } from "shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { TrustBar } from "~/components/trust-bar";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Circle,
  Copy,
  Check,
} from "lucide-react";

interface AuditorProviderCardProps {
  provider: ProviderDisplay;
  submissions: Submission[];
  onSubmit: (questionId: string, answer: string, hash: string) => Promise<Submission>;
}

/** SHA-256 hash a string and return hex */
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface PromptRowProps {
  prompt: Prompt;
  submission: Submission | undefined;
  onSubmit: (questionId: string, answer: string, hash: string) => Promise<Submission>;
}

function PromptRow({ prompt, submission, onSubmit }: PromptRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [answer, setAnswer] = useState("");
  const [hash, setHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasSubmission = !!submission;
  const passed = submission?.verdict === "pass";

  async function handleSubmit() {
    if (!answer.trim() || !hash.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(prompt.question_id, answer, hash);
      setAnswer("");
      setHash("");
      setExpanded(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-b last:border-b-0">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {hasSubmission ? (
          passed ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-red-500" />
          )
        ) : (
          <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="flex-1 font-mono text-xs">{prompt.question_id}</span>
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="bg-muted/30 px-3 py-3 space-y-3">
          {/* Question details */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">
                Adversarial Prompt
              </p>
              <button
                className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                onClick={async () => {
                  await navigator.clipboard.writeText(prompt.text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-sm bg-background rounded p-2 border">
              {prompt.text}
            </p>
          </div>
          <div className="flex gap-4 text-xs">
            <span>
              Expected: <strong>{prompt.expected_answer}</strong>
            </span>
            {submission && (
              <span>
                Verdict: <strong className={passed ? "text-emerald-600" : "text-red-600"}>{submission.verdict}</strong>
              </span>
            )}
          </div>

          {/* Show existing submission */}
          {submission && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Model Response
              </p>
              <p className="text-sm bg-background rounded p-2 border font-mono text-xs">
                {submission.answer.slice(0, 300)}
                {submission.answer.length > 300 && "..."}
              </p>
              <p className="text-xs text-muted-foreground">
                Hash: {submission.hash.slice(0, 16)}...
              </p>
            </div>
          )}

          {/* Submission form for unanswered prompts */}
          {!hasSubmission && (
            <div className="space-y-2 border-t pt-3">
              <p className="text-xs font-semibold">Submit Eval Result</p>
              <div>
                <label className="text-xs text-muted-foreground">
                  Model Answer
                </label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="mt-1 w-full rounded border bg-background px-2 py-1.5 text-sm font-mono resize-none"
                  rows={3}
                  placeholder="Paste the model's response..."
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  Hash (SHA-256)
                </label>
                <input
                  value={hash}
                  onChange={(e) => setHash(e.target.value)}
                  className="mt-1 w-full rounded border bg-background px-2 py-1.5 text-sm font-mono"
                  placeholder="Response hash (hex)"
                />
              </div>
              {submitError && (
                <p className="text-xs text-red-600">{submitError}</p>
              )}
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!answer.trim() || !hash.trim() || submitting}
              >
                {submitting ? "Submitting..." : "Submit & Anchor on Bitcoin"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditorProviderCard({
  provider,
  submissions,
  onSubmit,
}: AuditorProviderCardProps) {
  const { bundle, isReal } = provider;
  const score = Math.round(bundle.summary.compliance_score * 100);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // Build submission lookup by question_id (latest wins)
  const submissionsByQuestion = new Map<string, Submission>();
  for (const s of submissions) {
    const existing = submissionsByQuestion.get(s.question_id);
    if (!existing || s.timestamp > existing.timestamp) {
      submissionsByQuestion.set(s.question_id, s);
    }
  }

  function toggleCategory(cat: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  // Group rules by category
  const rulesByCategory = new Map<Category, ConstitutionRule[]>();
  for (const rule of bundle.constitution.rules) {
    const existing = rulesByCategory.get(rule.category) ?? [];
    existing.push(rule);
    rulesByCategory.set(rule.category, existing);
  }

  function categoryPromptCount(rules: ConstitutionRule[]): number {
    return rules.reduce((n, r) => n + r.prompts.length, 0);
  }

  return (
    <Card
      className={
        isReal
          ? "border-2 border-primary ring-1 ring-primary/20"
          : "opacity-75"
      }
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{provider.name}</CardTitle>
            <CardDescription className="text-xs font-mono">
              {provider.model}
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-2xl font-bold">{score}%</span>
            {isReal ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                VERIFIED
              </span>
            ) : (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                PLACEHOLDER
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Trust bars */}
        {bundle.summary.by_category.map((cat) => (
          <TrustBar key={cat.category} summary={cat} />
        ))}

        {/* Category drill-down */}
        {bundle.constitution.rules.length > 0 && (
          <div className="mt-4 border rounded-lg overflow-hidden">
            {Array.from(rulesByCategory.entries()).map(([category, rules]) => {
              const promptCount = categoryPromptCount(rules);
              return (
                <div key={category} className="border-b last:border-b-0">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted/50"
                    onClick={() => toggleCategory(category)}
                  >
                    {expandedCats.has(category) ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        CATEGORY_COLORS[category]
                      )}
                    />
                    <span>{CATEGORY_LABELS[category]}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {promptCount} prompt{promptCount !== 1 ? "s" : ""}
                    </span>
                  </button>
                  {expandedCats.has(category) && (
                    <div>
                      {rules.map((rule) => (
                        <div key={rule.id}>
                          <div className="px-3 py-1.5 bg-muted/20 text-xs font-medium text-muted-foreground border-t">
                            {rule.id}: {rule.principle}
                          </div>
                          {rule.prompts.map((prompt) => (
                            <PromptRow
                              key={prompt.question_id}
                              prompt={prompt}
                              submission={submissionsByQuestion.get(prompt.question_id)}
                              onSubmit={onSubmit}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {bundle.constitution.rules.length === 0 && (
          <p className="text-xs text-muted-foreground italic pt-1">
            {isReal
              ? "No constitution rules loaded"
              : "Simulated data — live eval coming soon"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
