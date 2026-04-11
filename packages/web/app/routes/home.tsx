import { getProviders } from "~/data/providers";
import { ProviderCard } from "~/components/provider-card";
import { Shield, Link, Bitcoin, Award } from "lucide-react";

export function meta() {
  return [
    { title: "Proof of Purpose — AI Accountability Dashboard" },
    {
      name: "description",
      content:
        "Verify that AI models follow their stated constitutions. Results anchored on Bitcoin.",
    },
  ];
}

export default function Home() {
  const providers = getProviders();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold tracking-tight">Proof of Purpose</h1>
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
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
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
            <h3 className="text-2xl font-bold">Provider Trust Scores</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Constitutional compliance by category. Verified providers have
              real, audited eval data.
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

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {providers.map((p) => (
            <ProviderCard key={p.name} provider={p} />
          ))}
        </div>
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
    </div>
  );
}
