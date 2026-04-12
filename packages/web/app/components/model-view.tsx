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

      {/* Tree — zigzag layout */}
      <div className="mt-8 w-full max-w-md">
        <svg viewBox="0 0 400 480" className="w-full" aria-hidden="true">
          {/* Vertical trunk */}
          <line
            x1="200"
            y1="0"
            x2="200"
            y2="480"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border"
          />

          {/* Horizontal branches to each node */}
          {[
            { x: 120, y: 80 },   /* Safety — left */
            { x: 280, y: 170 },  /* Honesty — right */
            { x: 120, y: 280 },  /* Bias — left */
            { x: 280, y: 370 },  /* Transparency — right */
          ].map(({ x, y }, i) => (
            <line
              key={i}
              x1="200"
              y1={y}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeWidth="2"
              className="text-border"
            />
          ))}
        </svg>

        {/* Category nodes positioned over the SVG */}
        <div className="relative -mt-[100%] pointer-events-none" style={{ aspectRatio: "400/480" }}>
          <div className="pointer-events-auto w-full h-full relative">
            {categories.map(({ category, label, color, icon: Icon, side }, i) => {
              const yPositions = [
                "16.7%",  /* 80/480 */
                "35.4%",  /* 170/480 */
                "58.3%",  /* 280/480 */
                "77.1%",  /* 370/480 */
              ];
              const xPos = side === "left" ? "30%" : "70%";
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
