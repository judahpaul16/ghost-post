export const BADGE_CSS = `
  :host {
    all: initial;
    display: inline-block;
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 9999;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }

  .ghost-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    line-height: 18px;
    letter-spacing: 0.01em;
    color: #fff;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    box-shadow:
      0 1px 3px rgba(0, 0, 0, 0.12),
      0 1px 2px rgba(0, 0, 0, 0.06);
    animation: ghostFadeIn 0.3s ease-out;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .ghost-badge:hover {
    transform: scale(1.05);
    box-shadow:
      0 4px 6px rgba(0, 0, 0, 0.15),
      0 2px 4px rgba(0, 0, 0, 0.08);
  }

  .ghost-badge.green {
    background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  }
  .ghost-badge.yellow {
    background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
  }
  .ghost-badge.red {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  }
  .ghost-badge.loading {
    background: linear-gradient(135deg, #71717a 0%, #52525b 100%);
    animation: ghostFadeIn 0.3s ease-out, ghostPulse 1.5s ease-in-out infinite;
  }

  .ghost-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
  }

  .ghost-score {
    font-variant-numeric: tabular-nums;
  }

  .ghost-tooltip {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 240px;
    max-width: 300px;
    padding: 12px;
    background: #1e1e2e;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    box-shadow:
      0 8px 24px rgba(0, 0, 0, 0.25),
      0 2px 8px rgba(0, 0, 0, 0.12);
    color: #e0e0e0;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    z-index: 10000;
    animation: ghostSlideIn 0.2s ease-out;
    pointer-events: auto;
  }

  .ghost-tooltip::before {
    content: '';
    position: absolute;
    top: -5px;
    right: 16px;
    width: 8px;
    height: 8px;
    background: #1e1e2e;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    transform: rotate(45deg);
  }

  .tooltip-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .tooltip-title {
    font-weight: 600;
    font-size: 13px;
    color: #fff;
  }

  .tooltip-score {
    font-weight: 700;
    font-size: 16px;
    font-variant-numeric: tabular-nums;
  }
  .tooltip-score.green { color: #4ade80; }
  .tooltip-score.yellow { color: #facc15; }
  .tooltip-score.red { color: #f87171; }

  .tooltip-range-label {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 999px;
    margin-bottom: 8px;
  }
  .tooltip-range-label.green { color: #4ade80; background: rgba(74, 222, 128, 0.1); }
  .tooltip-range-label.yellow { color: #facc15; background: rgba(250, 204, 21, 0.1); }
  .tooltip-range-label.red { color: #f87171; background: rgba(248, 113, 113, 0.1); }

  .tooltip-signal {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 4px 0;
    text-decoration: none;
    color: inherit;
  }

  .tooltip-signal.clickable {
    cursor: pointer;
    border-radius: 6px;
    margin: 0 -4px;
    padding: 4px;
    transition: background 0.15s ease;
  }

  .tooltip-signal.clickable:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .tooltip-signal.clickable:hover .signal-link-icon {
    opacity: 0.7;
  }

  .tooltip-signal.expandable {
    cursor: pointer;
    border-radius: 6px;
    margin: 0 -4px;
    padding: 4px;
    transition: background 0.15s ease;
  }

  .tooltip-signal.expandable:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .signal-source {
    color: #6b7280;
    font-size: 10px;
  }

  .signal-desc.collapsed,
  .signal-source.collapsed {
    display: none;
  }

  .tooltip-signal.expandable.expanded .signal-desc.collapsed,
  .tooltip-signal.expandable.expanded .signal-source.collapsed {
    display: block;
  }

  .signal-link-icon {
    width: 10px;
    height: 10px;
    display: inline-block;
    vertical-align: middle;
    margin-left: 3px;
    opacity: 0;
    transition: opacity 0.15s ease;
  }

  .signal-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-top: 6px;
    flex-shrink: 0;
  }
  .signal-dot.green { background: #4ade80; }
  .signal-dot.yellow { background: #facc15; }
  .signal-dot.red { background: #f87171; }
  .signal-dot.neutral { background: #6b7280; }

  .signal-content {
    flex: 1;
    min-width: 0;
  }

  .signal-label-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .signal-label {
    font-weight: 500;
    color: #d1d5db;
  }

  .signal-points {
    font-size: 10px;
    font-weight: 600;
    color: #f87171;
    background: rgba(248, 113, 113, 0.12);
    padding: 0 5px;
    border-radius: 4px;
    line-height: 16px;
  }

  .signal-points.negative {
    color: #4ade80;
    background: rgba(74, 222, 128, 0.12);
  }

  .signal-desc {
    color: #9ca3af;
    font-size: 11px;
  }

  .tooltip-legend {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 10px;
    color: #9ca3af;
  }

  .legend-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 2px 0;
  }

  .legend-row .signal-dot {
    margin-top: 0;
  }

  @keyframes ghostFadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes ghostSlideIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes ghostPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;

export const GHOST_SVG = `<svg viewBox="0 0 16 16" fill="currentColor" class="ghost-icon">
  <path d="M8 1C4.7 1 2 3.7 2 7v7c0 .4.3.5.6.3l1.4-1.4 1.4 1.4c.2.2.6.2.8 0L8 12.9l1.8 1.4c.2.2.6.2.8 0l1.4-1.4 1.4 1.4c.3.2.6.1.6-.3V7c0-3.3-2.7-6-6-6zM6 8a1 1 0 110-2 1 1 0 010 2zm4 0a1 1 0 110-2 1 1 0 010 2z"/>
</svg>`;
