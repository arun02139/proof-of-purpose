import type { Category } from "shared";
import { Shield, Eye, Scale, Lightbulb } from "lucide-react";

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
}[] = [
  { category: "safety", label: "Safety", color: "bg-rose-200", icon: Shield },
  { category: "honesty", label: "Honesty", color: "bg-sky-200", icon: Eye },
  { category: "bias", label: "Bias", color: "bg-amber-200", icon: Scale },
  {
    category: "transparency",
    label: "Transparency",
    color: "bg-emerald-200",
    icon: Lightbulb,
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

      {/* Tree */}
      <div className="mt-8 w-full max-w-md">
        <svg viewBox="0 0 400 320" className="w-full" aria-hidden="true">
          {/* Trunk from top center */}
          <line
            x1="200"
            y1="0"
            x2="200"
            y2="40"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border"
          />

          {/* Branches to each node */}
          {[
            { cx: 80, cy: 100 },
            { cx: 320, cy: 100 },
            { cx: 80, cy: 240 },
            { cx: 320, cy: 240 },
          ].map(({ cx, cy }, i) => (
            <line
              key={i}
              x1="200"
              y1={cy < 150 ? 40 : 180}
              x2={cx}
              y2={cy - 40}
              stroke="currentColor"
              strokeWidth="2"
              className="text-border"
            />
          ))}

          {/* Vertical connector between rows */}
          <line
            x1="200"
            y1="40"
            x2="200"
            y2="180"
            stroke="currentColor"
            strokeWidth="2"
            className="text-border"
          />
        </svg>

        {/* Category nodes positioned over the SVG */}
        <div className="relative -mt-[calc(100%*280/320)] pointer-events-none">
          <div className="pointer-events-auto" style={{ aspectRatio: "400/320" }}>
            {categories.map(({ category, label, color, icon: Icon }, i) => {
              const positions = [
                { left: "20%", top: "20%" },
                { left: "80%", top: "20%" },
                { left: "20%", top: "64%" },
                { left: "80%", top: "64%" },
              ];
              const pos = positions[i];
              return (
                <button
                  key={category}
                  onClick={() => onCategoryClick(category)}
                  className={`absolute flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2 cursor-pointer group`}
                  style={{ left: pos.left, top: pos.top }}
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
      </div>
    </div>
  );
}
