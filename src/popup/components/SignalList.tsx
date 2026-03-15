import type { Signal } from "@/types";

const levelStyles = {
  green: { dot: "bg-emerald-400", badge: "text-emerald-400/70" },
  yellow: { dot: "bg-amber-400", badge: "text-amber-400/70" },
  red: { dot: "bg-red-400", badge: "text-red-400/70" },
  neutral: { dot: "bg-zinc-600", badge: "text-zinc-600" },
} as const;

interface Props {
  signals: Signal[];
}

export function SignalList({ signals }: Props) {
  const visible = signals.filter((s) => s.available);
  if (visible.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
          Signals
        </span>
        <span className="text-[10px] text-zinc-600 tabular-nums">
          {signals.reduce((s, sig) => s + sig.points, 0)} pts total
        </span>
      </div>

      <div className="space-y-0.5">
        {visible.map((signal) => {
          const style = levelStyles[signal.level];
          const Wrapper = signal.url ? "a" : "div";
          const linkProps = signal.url
            ? { href: signal.url, target: "_blank", rel: "noopener noreferrer" }
            : {};
          return (
            <Wrapper
              key={signal.id}
              {...linkProps}
              className={`group flex items-start gap-3 py-2 px-2.5 -mx-2.5 rounded-lg hover:bg-zinc-800/40 transition-colors no-underline ${signal.url ? "cursor-pointer" : ""}`}
            >
              <div className={`w-2 h-2 rounded-full mt-[5px] flex-shrink-0 ${style.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] text-zinc-200 font-medium">
                    {signal.label}
                    {signal.url && (
                      <svg className="inline-block w-3 h-3 ml-1 opacity-0 group-hover:opacity-60 transition-opacity text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M6.5 3.5H3a1 1 0 00-1 1V13a1 1 0 001 1h8.5a1 1 0 001-1V9.5M9.5 2H14v4.5M14 2L7 9" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  {signal.points !== 0 && (
                    <span className={`text-[11px] font-mono font-medium flex-shrink-0 ${style.badge}`}>
                      {signal.points > 0 ? `+${signal.points}` : signal.points}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5">
                  {signal.description}
                </p>
                {signal.url && (
                  <span className="text-[10px] text-zinc-600 group-hover:text-zinc-500 transition-colors mt-0.5 block truncate">
                    {signal.source}
                  </span>
                )}
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
