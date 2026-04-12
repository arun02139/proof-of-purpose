import { useState, useMemo, useCallback } from "react";
import type { Category, ConstitutionRule, Submission } from "shared";
import { useApiData } from "~/hooks/use-api-data";
import { ProviderCard } from "~/components/provider-card";
import { AuditorProviderCard } from "~/components/auditor-provider-card";
import { Overlay } from "~/components/overlay";
import { ModelView } from "~/components/model-view";
import { QuestionsView } from "~/components/questions-view";
import { AuthProvider, useAuth } from "~/context/auth";
import { Button } from "~/components/ui/button";
import { Shield, Link, Bitcoin, Award, LogIn, LogOut, Loader2 } from "lucide-react";

export function meta() {
  return [
    { title: "Proof-of-Purpose — AI Accountability Dashboard" },
    {
      name: "description",
      content:
        "Verify that AI models follow their stated constitutions. Results anchored on Bitcoin.",
    },
  ];
}

type ViewState =
  | "dashboard"
  | { view: "model" }
  | { view: "questions"; category: Category };

function Dashboard() {
  const { providers, submissions, loading, error, submitAnswer, resetSubmissions } = useApiData();
  const { isAuditor, toggleLogin, logout } = useAuth();
  const [viewState, setViewState] = useState<ViewState>("dashboard");

  const handleShieldClick = useCallback(async () => {
    if (isAuditor) {
      logout();
      setViewState("dashboard");
    }
    try {
      await resetSubmissions();
    } catch {
      // Server may be unreachable; local state is already cleared by logout
    }
  }, [isAuditor, resetSubmissions, logout]);

  // Find the real (Anthropic) provider for the overlay
  const realProvider = providers.find((p) => p.isReal);

  // Build submission lookup by question_id (latest wins)
  const submissionsByQuestion = useMemo(() => {
    const map = new Map<string, Submission>();
    for (const s of submissions) {
      const existing = map.get(s.question_id);
      if (!existing || s.timestamp > existing.timestamp) {
        map.set(s.question_id, s);
      }
    }
    return map;
  }, [submissions]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Proof-of-Purpose logo" className="h-7 w-7 shrink-0" />
            <h1 className="text-xl font-bold tracking-tight">Proof-of-Purpose</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLogin}
          >
            {isAuditor ? (
              <>
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-1" />
                Login
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Do AI models keep their promises?
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            AI companies publish safety constitutions, but nobody can verify
            compliance. Proof of Purpose tests models against their own rules
            and anchors every result on Bitcoin — creating a permanent,
            tamper-proof accountability record.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="flex gap-3">
              <button type="button" onClick={handleShieldClick} className="mt-0.5 shrink-0" title="Reset submission data">
                <Shield className="h-5 w-5 text-primary hover:text-primary/70 transition-colors cursor-pointer" />
              </button>
              <div>
                <p className="font-semibold">Test</p>
                <p className="text-sm text-muted-foreground">
                  Adversarial prompts probe each constitutional rule with a
                  clear yes/no expected answer.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Anchor</p>
                <p className="text-sm text-muted-foreground">
                  Every eval result is SHA-256 hashed and timestamped on Bitcoin
                  via OpenTimestamps.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Award className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">Incentivize</p>
                <p className="text-sm text-muted-foreground">
                  Companies fund bounties on their own models — a clean record
                  becomes a competitive advantage.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Provider Grid */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h3 className="text-2xl font-bold">
              {isAuditor ? "Auditor Dashboard" : "Provider Trust Scores"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAuditor
                ? "Expand categories to inspect questions. Submit answers to anchor on Bitcoin."
                : "Constitutional compliance by category. Verified providers have real, audited eval data."}
            </p>
          </div>
          {/* Bounty narration */}
          <div className="hidden rounded-lg border bg-card p-3 text-right sm:block">
            <p className="text-xs text-muted-foreground">Total Bounty Pool</p>
            <p className="text-xl font-bold">0.25 BTC</p>
            <p className="text-xs text-muted-foreground">
              0.08 BTC paid out to auditors
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Failed to load data: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {providers.map((p) =>
              isAuditor ? (
                <AuditorProviderCard
                  key={p.name}
                  provider={p}
                  submissions={submissions}
                  onSubmit={submitAnswer}
                  onClick={
                    p.isReal ? () => setViewState({ view: "model" }) : undefined
                  }
                />
              ) : (
                <ProviderCard
                  key={p.name}
                  provider={p}
                  onClick={
                    p.isReal ? () => setViewState({ view: "model" }) : undefined
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      {/* Bitcoin permanence footer */}
      <section className="border-t bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-start gap-3">
            <Bitcoin className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Permanently on Bitcoin</p>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Every eval result is hashed and anchored to the Bitcoin
                blockchain via OpenTimestamps. Once confirmed, these records
                cannot be altered, deleted, or disputed by any party — including
                the AI company. Download any bundle, compute its SHA-256 hash,
                and verify it against the on-chain timestamp yourself.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Model View overlay */}
      {viewState !== "dashboard" && viewState.view === "model" && realProvider && (
        <Overlay onDismiss={() => setViewState("dashboard")}>
          <ModelView
            providerName={realProvider.name}
            modelName={realProvider.model}
            onCategoryClick={(category) =>
              setViewState({ view: "questions", category })
            }
          />
        </Overlay>
      )}

      {/* Questions View overlay */}
      {viewState !== "dashboard" && viewState.view === "questions" && realProvider && (
        <Overlay onDismiss={() => setViewState({ view: "model" })}>
          <QuestionsView
            category={viewState.category}
            rules={realProvider.bundle.constitution.rules.filter(
              (r) => r.category === viewState.category
            )}
            submissions={submissionsByQuestion}
            isAuditor={isAuditor}
            onSubmit={submitAnswer}
          />
        </Overlay>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
