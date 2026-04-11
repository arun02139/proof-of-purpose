import type { Category, ConstitutionRule, Submission } from "shared";
import { Shield, Eye, Scale, Lightbulb, CheckCircle2, XCircle, Circle, Anchor, Clock, ExternalLink } from "lucide-react";

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
}

export function QuestionsView({ category, rules, submissions }: QuestionsViewProps) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;

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
        {rules.map((rule) => (
          <div key={rule.id} className="space-y-3">
            <div>
              <p className="text-xs font-mono text-muted-foreground">{rule.id}</p>
              <p className="text-sm font-medium">{rule.principle}</p>
            </div>

            {rule.prompts.map((prompt) => {
              const submission = submissions.get(prompt.question_id);
              const hasSubmission = !!submission;
              const passed = submission?.verdict === "pass";

              return (
                <div
                  key={prompt.question_id}
                  className="rounded-lg border bg-muted/20 p-3 space-y-2"
                >
                  {/* Prompt text */}
                  <div className="flex items-start gap-2">
                    {hasSubmission ? (
                      passed ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                      )
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                    )}
                    <p className="text-sm">{prompt.text}</p>
                  </div>

                  {/* Disabled answer field with expected answer as placeholder */}
                  <textarea
                    disabled
                    className="w-full rounded border bg-background px-2 py-1.5 text-sm font-mono resize-none text-muted-foreground placeholder:text-muted-foreground/60 cursor-not-allowed"
                    rows={2}
                    placeholder={prompt.expected_answer}
                  />

                  {/* Disabled submit button */}
                  <button
                    className="inline-flex items-center rounded-md bg-primary/50 px-3 py-1.5 text-xs font-medium text-primary-foreground/70 pointer-events-none select-none"
                  >
                    Submit &amp; Anchor on Bitcoin
                  </button>

                  {/* Existing submission verdict + anchor status */}
                  {submission && (
                    <div className="space-y-1 border-t pt-2">
                      <div className="flex gap-4 text-xs">
                        <span>
                          Expected: <strong>{prompt.expected_answer}</strong>
                        </span>
                        <span>
                          Verdict:{" "}
                          <strong
                            className={
                              passed ? "text-emerald-600" : "text-red-600"
                            }
                          >
                            {submission.verdict}
                          </strong>
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {submission.answer.slice(0, 200)}
                        {submission.answer.length > 200 && "..."}
                      </p>
                      {/* Anchor status */}
                      {submission.anchor ? (
                        submission.anchor.status === "anchored" ? (
                          <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <Anchor className="h-3 w-3" />
                            <span>Anchored on Bitcoin</span>
                            {submission.anchor.block_height && (
                              <a
                                href={`https://mempool.space/block/${submission.anchor.block_height}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 underline hover:text-emerald-700"
                              >
                                Block {submission.anchor.block_height}
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
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
