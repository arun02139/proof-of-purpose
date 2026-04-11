import type { ProviderDisplay } from "~/data/providers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { TrustBar } from "~/components/trust-bar";

interface ProviderCardProps {
  provider: ProviderDisplay;
}

export function ProviderCard({ provider }: ProviderCardProps) {
  const { bundle, isReal } = provider;
  const score = Math.round(bundle.summary.compliance_score * 100);

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
        {bundle.summary.by_category.map((cat) => (
          <TrustBar key={cat.category} summary={cat} />
        ))}
        {!isReal && (
          <p className="text-xs text-muted-foreground italic pt-1">
            Simulated data — live eval coming soon
          </p>
        )}
      </CardContent>
    </Card>
  );
}
