import { useState } from "react";
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

function SignalRow({ signal }: { signal: Signal }) {
  const [expanded, setExpanded] = useState(false);
  const style = levelStyles[signal.level];
  const hasLink = !!signal.url;
  const Wrapper = hasLink ? "a" : "div";
  const linkProps = hasLink
    ? { href: signal.url, target: "_blank", rel: "noopener noreferrer" }
    : {};
  const dimmed = !signal.available;

  const handleClick = !hasLink && signal.available
    ? () => setExpanded((prev) => !prev)
    : undefined;

  return (
    <Wrapper
      key={signal.id}
      {...linkProps}
      onClick={handleClick}
      className={`group flex items-start gap-3 py-2 px-2.5 -mx-2.5 rounded-lg hover:bg-zinc-800/40 transition-colors no-underline ${hasLink || (!dimmed && signal.available) ? "cursor-pointer" : ""} ${dimmed ? "opacity-50" : ""}`}
    >
      <div className={`w-2 h-2 rounded-full mt-[5px] flex-shrink-0 ${style.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-[13px] font-medium ${dimmed ? "text-zinc-500" : "text-zinc-200"}`}>
            {signal.label}
            {hasLink && (
              <svg className="inline-block w-3 h-3 ml-1 opacity-0 group-hover:opacity-60 transition-opacity text-zinc-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6.5 3.5H3a1 1 0 00-1 1V13a1 1 0 001 1h8.5a1 1 0 001-1V9.5M9.5 2H14v4.5M14 2L7 9" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {!hasLink && signal.available && (
              <svg className={`inline-block w-2.5 h-2.5 ml-1 text-zinc-600 transition-transform ${expanded ? "rotate-180" : ""}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 4.5L6 7.5L9 4.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
          {signal.points !== 0 && (
            <span className={`text-[11px] font-mono font-medium flex-shrink-0 ${style.badge}`}>
              {signal.points > 0 ? `+${signal.points}` : signal.points}
            </span>
          )}
        </div>
        {(hasLink || expanded || dimmed) && (
          <p className={`text-[11px] leading-relaxed mt-0.5 ${dimmed ? "text-zinc-600" : "text-zinc-500"}`}>
            {signal.description}
          </p>
        )}
        {(hasLink || expanded) && (
          <span className="text-[10px] text-zinc-600 group-hover:text-zinc-500 transition-colors mt-0.5 block truncate">
            {signal.source}
          </span>
        )}
      </div>
    </Wrapper>
  );
}

export function SignalList({ signals }: Props) {
  const available = signals.filter((s) => s.available);
  const unavailable = signals.filter((s) => !s.available);
  if (available.length === 0 && unavailable.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
          Signals
        </span>
        <span className="text-[10px] text-zinc-600 tabular-nums">
          {available.reduce((s, sig) => s + sig.points, 0)} pts total
        </span>
      </div>

      <div className="space-y-0.5">
        {available.map((signal) => (
          <SignalRow key={signal.id} signal={signal} />
        ))}
      </div>

      {unavailable.length > 0 && (
        <div className="mt-3 pt-2 border-t border-zinc-800/40">
          <span className="text-[10px] text-zinc-600 uppercase tracking-widest">
            Unavailable
          </span>
          <div className="space-y-0.5 mt-1.5">
            {unavailable.map((signal) => (
              <SignalRow key={signal.id} signal={signal} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
