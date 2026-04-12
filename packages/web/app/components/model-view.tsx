import type { Category } from "shared";
import { Shield, Eye, Scale, Lightbulb, ExternalLink } from "lucide-react";

interface ModelViewProps {
  providerName: string;
  modelName: string;
  onCategoryClick: (category: Category) => void;
}

const categories: {
  category: Category;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  side: "left" | "right";
}[] = [
  { category: "safety", label: "Safety", color: "bg-rose-200", icon: Shield, side: "left" },
  { category: "honesty", label: "Honesty", color: "bg-sky-200", icon: Eye, side: "right" },
  { category: "bias", label: "Bias", color: "bg-amber-200", icon: Scale, side: "left" },
  {
    category: "transparency",
    label: "Transparency",
    color: "bg-emerald-200",
    icon: Lightbulb,
    side: "right",
  },
];

export function ModelView({
  providerName,
  modelName,
  onCategoryClick,
}: ModelViewProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <h2 className="text-2xl font-bold">{providerName}</h2>
      <p className="text-sm font-mono text-muted-foreground">{modelName}</p>
      <a
        href="https://www.anthropic.com/constitution"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        anthropic.com/constitution
        <ExternalLink className="h-3 w-3" />
      </a>

      {/* Tree — zigzag layout with angled branches */}
      <div className="mt-6 w-full max-w-md relative" style={{ height: "380px" }}>
        <svg
          viewBox="0 0 400 380"
          className="absolute inset-0 w-full h-full"
          aria-hidden="true"
        >
          {/* Vertical trunk */}
          <line
            x1="200"
            y1="20"
            x2="200"
            y2="360"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border"
          />

          {/* Angled branches — each angles upward from trunk to leaf node */}
          {[
            { tx: 200, ty: 80, nx: 80, ny: 45 },
            { tx: 200, ty: 160, nx: 320, ny: 125 },
            { tx: 200, ty: 240, nx: 80, ny: 205 },
            { tx: 200, ty: 320, nx: 320, ny: 285 },
          ].map(({ tx, ty, nx, ny }, i) => (
            <line
              key={i}
              x1={tx}
              y1={ty}
              x2={nx}
              y2={ny}
              stroke="currentColor"
              strokeWidth="2"
              className="text-border"
            />
          ))}
        </svg>

        {/* Category nodes positioned as leaves at branch endpoints */}
        {categories.map(({ category, label, color, icon: Icon, side }, i) => {
          const topPercents = ["11.8%", "32.9%", "53.9%", "75%"];
          const leftPercent = side === "left" ? "20%" : "80%";
          return (
            <button
              key={category}
              onClick={() => onCategoryClick(category)}
              className="absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
              style={{
                left: leftPercent,
                top: topPercents[i],
              }}
            >
              <div
                className={`${color} flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-110`}
              >
                <Icon className="h-6 w-6 text-foreground/70" />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
