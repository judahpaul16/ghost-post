import type { GhostScore } from "@/types";

const rangeConfig = {
  green: {
    label: "Likely Real",
    ring: "ring-emerald-500/30",
    scoreBg: "bg-emerald-500/10",
    scoreText: "text-emerald-400",
    labelBg: "bg-emerald-500/10",
    labelText: "text-emerald-400",
    arc: "#34d399",
  },
  yellow: {
    label: "Caution",
    ring: "ring-amber-500/30",
    scoreBg: "bg-amber-500/10",
    scoreText: "text-amber-400",
    labelBg: "bg-amber-500/10",
    labelText: "text-amber-400",
    arc: "#fbbf24",
  },
  red: {
    label: "Likely Ghost",
    ring: "ring-red-500/30",
    scoreBg: "bg-red-500/10",
    scoreText: "text-red-400",
    labelBg: "bg-red-500/10",
    labelText: "text-red-400",
    arc: "#f87171",
  },
} as const;

function ScoreArc({ score, color }: { score: number; color: string }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <svg width="96" height="96" viewBox="0 0 96 96" className="drop-shadow-lg">
      <circle
        cx="48"
        cy="48"
        r={radius}
        fill="none"
        stroke="#27272a"
        strokeWidth="6"
      />
      <circle
        cx="48"
        cy="48"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        transform="rotate(-90 48 48)"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

interface Props {
  score: GhostScore;
}

export function ScoreCard({ score }: Props) {
  const config = rangeConfig[score.range];
  const available = score.signals.filter((s) => s.available).length;

  return (
    <div className={`relative rounded-2xl bg-zinc-900/80 ring-1 ${config.ring} p-5`}>
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <ScoreArc score={score.score} color={config.arc} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold tabular-nums ${config.scoreText}`}>
              {score.score}
            </span>
            <span className="text-[10px] text-zinc-500 -mt-0.5">/ 100</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${config.labelBg} ${config.labelText}`}
          >
            {config.label}
          </span>
          <p className="text-[12px] text-zinc-500 mt-2 leading-relaxed">
            {available} signal{available !== 1 ? "s" : ""} analyzed
            {score.signals.length > available && (
              <span className="text-zinc-600">
                {" "}({score.signals.length - available} unavailable)
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
