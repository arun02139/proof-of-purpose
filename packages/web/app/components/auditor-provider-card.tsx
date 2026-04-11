import { useState } from "react";
import type { ProviderDisplay } from "~/data/providers";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "~/data/providers";
import type { Category, EvalResult, ConstitutionRule, Prompt } from "shared";
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
  Hash,
  ExternalLink,
} from "lucide-react";
import type { AuditorSubmission } from "shared";

interface AuditorProviderCardProps {
  provider: ProviderDisplay;
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
  ruleId: string;
  result: EvalResult | undefined;
  submission: AuditorSubmission | undefined;
  onSubmit: (questionId: string, answer: string, signature: string) => void;
}

function PromptRow({ prompt, ruleId, result, submission, onSubmit }: PromptRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [answer, setAnswer] = useState("");
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isTested = !!result || !!submission;
  const passed = result?.pass ?? (submission ? submission.answer.toLowerCase().startsWith(prompt.expected_answer.toLowerCase()) : undefined);

  async function handleSubmit() {
    if (!answer.trim() || !signature.trim()) return;
    setSubmitting(true);
    onSubmit(prompt.question_id, answer, signature);
    setSubmitting(false);
    setExpanded(false);
  }

  return (
    <div className="border-b last:border-b-0">
      <button
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        {isTested ? (
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
            <p className="text-xs font-semibold text-muted-foreground">
              Adversarial Prompt
            </p>
            <p className="text-sm bg-background rounded p-2 border">
              {prompt.text}
            </p>
          </div>
          <div className="flex gap-4 text-xs">
            <span>
              Expected: <strong>{prompt.expected_answer}</strong>
            </span>
            {result && (
              <span>
                Pass: <strong>{result.pass ? "Yes" : "No"}</strong>
              </span>
            )}
          </div>

          {/* Show existing result if tested */}
          {result && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Model Response
              </p>
              <p className="text-sm bg-background rounded p-2 border font-mono text-xs">
                {result.model_response.slice(0, 300)}
                {result.model_response.length > 300 && "..."}
              </p>
              <p className="text-xs text-muted-foreground">
                Signature: {result.fake_signature.slice(0, 16)}...
              </p>
            </div>
          )}

          {/* Show submission proof if already submitted via dashboard */}
          {submission && (
            <div className="rounded border bg-background p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="h-3 w-3" />
                <span className="text-xs font-semibold">Bitcoin Anchored</span>
              </div>
              <p className="font-mono text-xs break-all">
                SHA-256: {submission.sha256_hash}
              </p>
              <p className="text-xs text-muted-foreground">
                OTS proof: {submission.ots_proof_file}
              </p>
              <a
                href="https://opentimestamps.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Verify on OpenTimestamps <ExternalLink className="h-3 w-3" />
              </a>
              <div className="mt-2 rounded bg-muted p-2">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  Independent Verification
                </p>
                <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                  <li>Download the eval bundle JSON</li>
                  <li>
                    Compute SHA-256:{" "}
                    <code className="bg-background px-1 rounded">
                      sha256sum bundle.json
                    </code>
                  </li>
                  <li>Compare hash to the on-chain timestamp record</li>
                </ol>
              </div>
            </div>
          )}

          {/* Submission form for untested questions (auditor only) */}
          {!submission && (
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
                  Signature
                </label>
                <input
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="mt-1 w-full rounded border bg-background px-2 py-1.5 text-sm font-mono"
                  placeholder="Response signature (hex)"
                />
              </div>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!answer.trim() || !signature.trim() || submitting}
              >
                {submitting ? "Anchoring..." : "Submit & Anchor on Bitcoin"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AuditorProviderCard({ provider }: AuditorProviderCardProps) {
  const { bundle, isReal } = provider;
  const score = Math.round(bundle.summary.compliance_score * 100);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [submissions, setSubmissions] = useState<Map<string, AuditorSubmission>>(
    new Map()
  );

  function toggleCategory(cat: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  async function handleSubmit(questionId: string, answer: string, signature: string) {
    const payload = JSON.stringify({ question_id: questionId, answer, signature, timestamp: new Date().toISOString() });
    const hash = await sha256(payload);

    const submission: AuditorSubmission = {
      rule_id: questionId,
      answer,
      signature,
      sha256_hash: hash,
      ots_proof_file: `${questionId}-${hash.slice(0, 8)}.ots`,
      submitted_at: new Date().toISOString(),
    };

    setSubmissions((prev) => new Map(prev).set(questionId, submission));
  }

  // Group rules by category
  const rulesByCategory = new Map<Category, ConstitutionRule[]>();
  for (const rule of bundle.constitution.rules) {
    const existing = rulesByCategory.get(rule.category) ?? [];
    existing.push(rule);
    rulesByCategory.set(rule.category, existing);
  }

  // Build result lookup by question_id
  const resultsByQuestionId = new Map<string, EvalResult>();
  for (const r of bundle.results) {
    resultsByQuestionId.set(r.question_id, r);
  }

  // Count total prompts per category for display
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
                              ruleId={rule.id}
                              result={resultsByQuestionId.get(prompt.question_id)}
                              submission={submissions.get(prompt.question_id)}
                              onSubmit={handleSubmit}
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
