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
      <div className="mt-8 w-full max-w-sm">
        <svg viewBox="0 0 400 300" className="w-full" aria-hidden="true">
          {/* Vertical trunk */}
          <line
            x1="200"
            y1="40"
            x2="200"
            y2="280"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border"
          />

          {/* Angled branches — each angles upward from trunk to node */}
          {[
            { tx: 200, ty: 80, nx: 80, ny: 30 },    /* Safety — up-left */
            { tx: 200, ty: 140, nx: 320, ny: 90 },   /* Honesty — up-right */
            { tx: 200, ty: 200, nx: 80, ny: 150 },   /* Bias — up-left */
            { tx: 200, ty: 260, nx: 320, ny: 210 },  /* Transparency — up-right */
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

        {/* Category nodes positioned over the SVG */}
        <div className="relative -mt-[100%] pointer-events-none" style={{ aspectRatio: "400/300" }}>
          <div className="pointer-events-auto w-full h-full relative">
            {categories.map(({ category, label, color, icon: Icon, side }, i) => {
              const yPositions = [
                "10%",    /* 30/300 */
                "30%",    /* 90/300 */
                "50%",    /* 150/300 */
                "70%",    /* 210/300 */
              ];
              const xPos = side === "left" ? "20%" : "80%";
              return (
                <button
                  key={category}
                  onClick={() => onCategoryClick(category)}
                  className="absolute flex flex-col items-center gap-1.5 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{ left: xPos, top: yPositions[i] }}
                >
                  <div
                    className={`${color} flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-110`}
                  >
                    <Icon className="h-7 w-7 text-foreground/70" />
                  </div>
                  <span className="text-xs font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
