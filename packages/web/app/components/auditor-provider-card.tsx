import type { ProviderDisplay } from "~/data/providers";
import type { Submission } from "shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { TrustBar } from "~/components/trust-bar";
import { cn } from "~/lib/utils";

interface AuditorProviderCardProps {
  provider: ProviderDisplay;
  submissions: Submission[];
  onSubmit: (questionId: string, answer: string, hash: string) => Promise<Submission>;
  onClick?: () => void;
}

export function AuditorProviderCard({
  provider,
  submissions,
  onSubmit,
  onClick,
}: AuditorProviderCardProps) {
  const { bundle, isReal } = provider;
  const score = Math.round(bundle.summary.compliance_score * 100);
  return (
    <Card
      className={cn(isReal ? "" : "opacity-75", onClick && "cursor-pointer")}
      onClick={onClick}
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

        {!isReal && bundle.constitution.rules.length === 0 && (
          <p className="text-xs text-muted-foreground italic pt-1">
            Simulated data — live eval coming soon
          </p>
        )}
      </CardContent>
    </Card>
  );
}
