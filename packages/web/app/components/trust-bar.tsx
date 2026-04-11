import type { CategorySummary } from "shared";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "~/data/providers";
import { cn } from "~/lib/utils";

interface TrustBarProps {
  summary: CategorySummary;
}

export function TrustBar({ summary }: TrustBarProps) {
  const pct = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
  const label = CATEGORY_LABELS[summary.category];
  const color = CATEGORY_COLORS[summary.category];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {summary.passed}/{summary.total}
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
