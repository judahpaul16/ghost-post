import type { GhostScore, ScoreRange } from "@/types";

const rangeLabels: Record<ScoreRange, string> = {
  green: "Likely Real",
  yellow: "Caution",
  red: "Likely Ghost",
};

export function createTooltipHTML(score: GhostScore): string {
  const signalRows = score.signals
    .map(
      (signal) => {
        const pointsBadge = signal.points !== 0
          ? `<span class="signal-points ${signal.points < 0 ? "negative" : ""}">${signal.points > 0 ? "+" : ""}${signal.points}</span>`
          : "";
        const linkIcon = signal.url
          ? `<svg class="signal-link-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6.5 3.5H3a1 1 0 00-1 1V13a1 1 0 001 1h8.5a1 1 0 001-1V9.5M9.5 2H14v4.5M14 2L7 9" stroke-linecap="round" stroke-linejoin="round"/></svg>`
          : "";
        const tag = signal.url ? "a" : "div";
        const href = signal.url ? ` href="${signal.url}" target="_blank" rel="noopener noreferrer"` : "";
        const expandable = !signal.url && signal.available;
        return `
      <${tag}${href} class="tooltip-signal${signal.url ? " clickable" : ""}${expandable ? " expandable" : ""}">
        <div class="signal-dot ${signal.level}"></div>
        <div class="signal-content">
          <div class="signal-label-row">
            <span class="signal-label">${signal.label}${linkIcon}</span>
            ${pointsBadge}
          </div>
          <div class="signal-desc${expandable ? " collapsed" : ""}">${signal.description}</div>
          <div class="signal-source${expandable ? " collapsed" : ""}">${signal.source}</div>
        </div>
      </${tag}>`;
      }
    )
    .join("");

  return `
    <div class="tooltip-header">
      <span class="tooltip-title">Ghost Score</span>
      <span class="tooltip-score ${score.range}">${score.score}</span>
    </div>
    <div class="tooltip-range-label ${score.range}">${rangeLabels[score.range]}</div>
    ${signalRows}
    <div class="tooltip-legend">
      <div class="legend-row"><span class="signal-dot green"></span> 0–25 Likely Real</div>
      <div class="legend-row"><span class="signal-dot yellow"></span> 26–50 Caution</div>
      <div class="legend-row"><span class="signal-dot red"></span> 51–100 Likely Ghost</div>
    </div>
  `;
}
