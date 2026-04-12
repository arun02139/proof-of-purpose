import { useState, useMemo } from "react";
import type { Category, ConstitutionRule, Prompt, Submission } from "shared";
import { Shield, Eye, Scale, Lightbulb, CheckCircle2, XCircle, Anchor, Clock, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "~/components/ui/button";

const CATEGORY_META: Record<
  Category,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  safety: { label: "Safety", color: "bg-rose-200", icon: Shield },
  honesty: { label: "Honesty", color: "bg-sky-200", icon: Eye },
  bias: { label: "Bias", color: "bg-amber-200", icon: Scale },
  transparency: { label: "Transparency", color: "bg-emerald-200", icon: Lightbulb },
};

interface QuestionsViewProps {
  category: Category;
  rules: ConstitutionRule[];
  submissions: Map<string, Submission>;
  isAuditor?: boolean;
  onSubmit?: (questionId: string, answer: string, hash: string) => Promise<Submission>;
}

interface PromptCardProps {
  prompt: Prompt;
  submission: Submission | undefined;
  isAuditor: boolean;
  onSubmit?: (questionId: string, answer: string, hash: string) => Promise<Submission>;
}

function PromptCard({ prompt, submission, isAuditor, onSubmit }: PromptCardProps) {
  const [answer, setAnswer] = useState("");
  const [hash, setHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [localSubmission, setLocalSubmission] = useState<Submission | undefined>(undefined);

  const effectiveSubmission = localSubmission ?? submission;
  const hasSubmission = !!effectiveSubmission;
  const passed = effectiveSubmission?.verdict === "pass";

  async function handleSubmit() {
    if (!answer.trim() || !hash.trim() || !onSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await onSubmit(prompt.question_id, answer, hash);
      setLocalSubmission(result);
      setAnswer("");
      setHash("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
      {/* Prompt text with copy button */}
      <div className="flex items-start gap-2">
        {hasSubmission && (
          passed ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
          )
        )}
        <p className="text-sm flex-1">{prompt.text}</p>
        {isAuditor && (
          <button
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
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
        )}
      </div>

      {/* Auditor mode: editable form for unanswered prompts */}
      {isAuditor && !hasSubmission && (
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">Model Answer</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="mt-1 w-full rounded border bg-background px-2 py-1.5 text-sm font-mono resize-none"
              rows={3}
              placeholder="Paste the model's response..."
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Hash (SHA-256)</label>
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

      {/* Public mode: disabled answer field with expected answer as placeholder */}
      {!isAuditor && !hasSubmission && (
        <>
          <textarea
            disabled
            className="w-full rounded border bg-background px-2 py-1.5 text-sm font-mono resize-none text-muted-foreground placeholder:text-muted-foreground/60 cursor-not-allowed"
            rows={2}
            placeholder={prompt.expected_answer}
          />
          <button
            className="inline-flex items-center rounded-md bg-primary/50 px-3 py-1.5 text-xs font-medium text-primary-foreground/70 pointer-events-none select-none"
          >
            Submit &amp; Anchor on Bitcoin
          </button>
        </>
      )}

      {/* Existing submission verdict + anchor status */}
      {effectiveSubmission && (
        <div className="space-y-1 border-t pt-2">
          <div className="flex gap-4 text-xs">
            <span>
              Expected: <strong>{prompt.expected_answer}</strong>
            </span>
            <span className="inline-flex items-center gap-1">
              Verdict:{" "}
              <strong
                className={
                  passed ? "text-emerald-600" : "text-red-600"
                }
              >
                {effectiveSubmission.verdict}
              </strong>
              {effectiveSubmission.anchor && (
                <a
                  href={
                    effectiveSubmission.anchor.status === "anchored" && effectiveSubmission.anchor.block_height
                      ? `https://mempool.space/block/${effectiveSubmission.anchor.block_height}`
                      : `https://mempool.space`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-muted-foreground hover:text-foreground"
                  title={
                    effectiveSubmission.anchor.status === "anchored" && effectiveSubmission.anchor.block_height
                      ? `View on mempool.space (block ${effectiveSubmission.anchor.block_height})`
                      : "Pending — view mempool.space"
                  }
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            {effectiveSubmission.answer.slice(0, 200)}
            {effectiveSubmission.answer.length > 200 && "..."}
          </p>
          {/* Anchor status */}
          {effectiveSubmission.anchor ? (
            effectiveSubmission.anchor.status === "anchored" ? (
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <Anchor className="h-3 w-3" />
                <span>Anchored on Bitcoin</span>
                {effectiveSubmission.anchor.block_height && (
                  <a
                    href={`https://mempool.space/block/${effectiveSubmission.anchor.block_height}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 underline hover:text-emerald-700"
                  >
                    Block {effectiveSubmission.anchor.block_height}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Clock className="h-3 w-3" />
                <span>
                  Pending anchor — awaiting Bitcoin confirmation
                </span>
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuestionsView({ category, rules, submissions, isAuditor = false, onSubmit }: QuestionsViewProps) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

  const shuffledRules = useMemo(
    () => shuffle(rules).map((rule) => ({ ...rule, prompts: shuffle(rule.prompts) })),
    [category],
  );

  return (
    <div>
      {/* Category header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className={`${meta.color} flex h-10 w-10 items-center justify-center rounded-full`}
        >
          <Icon className="h-5 w-5 text-foreground/70" />
        </div>
        <h2 className="text-xl font-bold">{meta.label}</h2>
      </div>

      {/* Rules and prompts */}
      <div className="space-y-6">
        {shuffledRules.map((rule) => (
          <div key={rule.id} className="space-y-3">
            <div>
              <p className="text-xs font-mono text-muted-foreground">{rule.id}</p>
              <p className="text-sm font-medium">{rule.principle}</p>
            </div>

            {rule.prompts.map((prompt) => (
              <PromptCard
                key={prompt.question_id}
                prompt={prompt}
                submission={submissions.get(prompt.question_id)}
                isAuditor={isAuditor}
                onSubmit={onSubmit}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
