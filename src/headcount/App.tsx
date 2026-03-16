import { useState, useEffect, useRef } from "react";
import {
  fetchLatestTenKs,
  extractCountForChart,
  fetchCachedHeadcount,
  cacheHeadcount,
} from "@/data-sources/sec-utils";

interface DataPoint {
  year: string;
  count: number;
  filingDate: string;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function roundedBarPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, w / 2, h);
  return `M${x},${y + h} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + w - radius} Q${x + w},${y} ${x + w},${y + radius} V${y + h} Z`;
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return "";
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpx = (curr.x + next.x) / 2;
    d += ` C${cpx},${curr.y} ${cpx},${next.y} ${next.x},${next.y}`;
  }
  return d;
}

function HeadcountChart({ data, totalSlots }: { data: DataPoint[]; totalSlots: number }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const reversed = [...data].reverse();
  const slots = Math.max(totalSlots, reversed.length);

  const margin = { top: 50, right: 60, bottom: 40, left: 70 };
  const width = 700;
  const height = 360;
  const chartW = width - margin.left - margin.right;
  const chartH = height - margin.top - margin.bottom;

  const maxCount = Math.max(...reversed.map((d) => d.count), 1);
  const yMax = Math.ceil(maxCount / Math.pow(10, Math.floor(Math.log10(maxCount)))) * Math.pow(10, Math.floor(Math.log10(maxCount)));

  const changes: Array<{ pct: number; index: number }> = [];
  for (let i = 1; i < reversed.length; i++) {
    const prev = reversed[i - 1].count;
    const curr = reversed[i].count;
    changes.push({ pct: Math.round(((curr - prev) / prev) * 100), index: i });
  }

  const pctValues = changes.map((c) => c.pct);
  const pctMin = pctValues.length ? Math.min(...pctValues, 0) : -10;
  const pctMax = pctValues.length ? Math.max(...pctValues, 0) : 10;
  const pctRange = Math.max(Math.abs(pctMin), Math.abs(pctMax), 5);

  const barWidth = Math.min(50, (chartW / slots) * 0.6);
  const gap = (chartW - barWidth * slots) / (slots + 1);

  const barX = (i: number) => margin.left + gap + i * (barWidth + gap);
  const barH = (count: number) => (count / yMax) * chartH;
  const barY = (count: number) => margin.top + chartH - barH(count);

  const lineY = (pct: number) => {
    const normalized = (pct + pctRange) / (2 * pctRange);
    return margin.top + chartH - normalized * chartH;
  };

  const linePoints = changes.map((c) => ({
    x: barX(c.index) + barWidth / 2,
    y: lineY(c.pct),
    pct: c.pct,
  }));

  const gridLines = 5;
  const yTicks = Array.from({ length: gridLines + 1 }, (_, i) => (yMax / gridLines) * i);

  const areaPath = linePoints.length >= 2
    ? smoothPath(linePoints) + ` L${linePoints[linePoints.length - 1].x},${margin.top + chartH} L${linePoints[0].x},${margin.top + chartH} Z`
    : "";

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#6b21a8" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="barGradHover" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {yTicks.map((tick, i) => {
          const y = margin.top + chartH - (tick / yMax) * chartH;
          return (
            <g key={i}>
              {i > 0 && (
                <line
                  x1={margin.left}
                  y1={y}
                  x2={width - margin.right}
                  y2={y}
                  stroke="#27272a"
                  strokeDasharray="4,4"
                  strokeOpacity="0.5"
                />
              )}
              <text x={margin.left - 8} y={y + 4} textAnchor="end" className="fill-zinc-500" fontSize="11">
                {formatCount(tick)}
              </text>
            </g>
          );
        })}

        <line
          x1={margin.left}
          y1={margin.top + chartH}
          x2={width - margin.right}
          y2={margin.top + chartH}
          stroke="#3f3f46"
        />

        {Array.from({ length: slots }).map((_, i) => {
          const dp = reversed[i];
          const x = barX(i);

          if (!dp) {
            return (
              <rect
                key={`skel-${i}`}
                x={x}
                y={margin.top + chartH * 0.3}
                width={barWidth}
                height={chartH * 0.7}
                rx={4}
                className="fill-zinc-800 animate-pulse"
              />
            );
          }

          const h = barH(dp.count);
          const y = barY(dp.count);
          const isHovered = hoveredIndex === i;

          return (
            <g
              key={dp.year}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              <path
                d={roundedBarPath(x, y, barWidth, h, 4)}
                fill={isHovered ? "url(#barGradHover)" : "url(#barGrad)"}
                filter={isHovered ? "url(#glow)" : undefined}
                style={{
                  animation: `growBar 0.5s ease-out ${i * 0.08}s both`,
                  transformOrigin: `${x + barWidth / 2}px ${margin.top + chartH}px`,
                }}
              />
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                className="fill-zinc-300"
                fontSize="10"
                fontWeight="600"
                opacity={isHovered ? 1 : 0.7}
              >
                {formatCount(dp.count)}
              </text>
              <text
                x={x + barWidth / 2}
                y={margin.top + chartH + 20}
                textAnchor="middle"
                className="fill-zinc-500"
                fontSize="11"
              >
                {dp.year}
              </text>
            </g>
          );
        })}

        <g pointerEvents="none">
          {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}

          {linePoints.length >= 2 && (
            <path
              d={smoothPath(linePoints)}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="2"
              strokeLinecap="round"
              className="line-draw"
            />
          )}

          {linePoints.map((pt, i) => (
            <g key={`dot-${i}`}>
              <circle cx={pt.x} cy={pt.y} r={hoveredIndex === changes[i].index ? 5 : 3.5} fill="#22d3ee" />
              <text
                x={pt.x}
                y={pt.y - 10}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                className={pt.pct >= 0 ? "fill-emerald-400" : "fill-red-400"}
              >
                {pt.pct >= 0 ? "+" : ""}{pt.pct}%
              </text>
            </g>
          ))}
        </g>

        {pctValues.length > 0 && (
          <>
            {[-pctRange, 0, pctRange].map((pct) => (
              <text
                key={pct}
                x={width - margin.right + 8}
                y={lineY(pct) + 4}
                className="fill-cyan-600"
                fontSize="10"
              >
                {pct >= 0 ? "+" : ""}{pct}%
              </text>
            ))}
          </>
        )}

        <text x={margin.left - 8} y={margin.top - 12} textAnchor="end" className="fill-zinc-600" fontSize="10">
          Employees
        </text>
        {pctValues.length > 0 && (
          <text x={width - margin.right + 8} y={margin.top - 12} className="fill-cyan-700" fontSize="10">
            YoY %
          </text>
        )}
      </svg>

      {hoveredIndex !== null && reversed[hoveredIndex] && (
        <div
          className="absolute pointer-events-none bg-zinc-800/95 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl"
          style={{
            left: `${((barX(hoveredIndex) + barWidth / 2) / width) * 100}%`,
            top: `${((barY(reversed[hoveredIndex].count) - 20) / height) * 100}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="text-[11px] text-zinc-400">{reversed[hoveredIndex].filingDate}</div>
          <div className="text-[13px] font-semibold text-zinc-100">
            {reversed[hoveredIndex].count.toLocaleString()} employees
          </div>
          {changes.find((c) => c.index === hoveredIndex) && (
            <div className={`text-[11px] font-medium ${changes.find((c) => c.index === hoveredIndex)!.pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {(() => { const c = changes.find((c) => c.index === hoveredIndex)!; return `${c.pct >= 0 ? "+" : ""}${c.pct}% YoY`; })()}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes growBar {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        .line-draw {
          stroke-dasharray: 2000;
          stroke-dashoffset: 2000;
          animation: drawLine 1.2s ease-out 0.4s forwards;
        }
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const company = params.get("company") ?? "Unknown";
  const cik = Number(params.get("cik"));
  const parentName = params.get("parent");

  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [totalFilings, setTotalFilings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!cik) {
      setError("No CIK provided");
      setLoading(false);
      return;
    }

    let cancelled = false;
    abortRef.current = false;

    (async () => {
      try {
        const cached = await fetchCachedHeadcount(cik);
        if (cached && cached.length > 0) {
          if (cancelled) return;
          setDataPoints(cached);
          setTotalFilings(cached.length);
          setLoading(false);
          return;
        }

        const filings = await fetchLatestTenKs(cik, 10);
        if (cancelled) return;
        setTotalFilings(filings.length);

        if (filings.length === 0) {
          setError("No 10-K filings found");
          setLoading(false);
          return;
        }

        const collected: DataPoint[] = [];
        for (const filing of filings) {
          if (cancelled) return;
          const count = await extractCountForChart(cik, filing);
          if (cancelled) return;
          if (count !== null) {
            const dp: DataPoint = { year: filing.filingDate.slice(0, 4), count, filingDate: filing.filingDate };
            collected.push(dp);
            setDataPoints((prev) => [...prev, dp]);
          }
        }

        if (collected.length > 0) {
          await cacheHeadcount(cik, collected);
        }
      } catch {
        if (!cancelled) setError("Failed to fetch SEC filings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [cik]);

  const edgarUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-K&dateb=&owner=include&count=10`;
  const displayName = parentName ? `${company} (${parentName})` : company;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-400">
              <path d="M12 2C7.6 2 4 5.6 4 10v10.5c0 .6.4.8.9.5l2.1-2.1 2.1 2.1c.3.3.9.3 1.2 0L12 19.4l1.7 1.6c.3.3.9.3 1.2 0l2.1-2.1 2.1 2.1c.5.3.9.1.9-.5V10c0-4.4-3.6-8-8-8zM9 12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm6 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
            </svg>
            <h1 className="text-xl font-bold tracking-tight">{displayName}</h1>
          </div>
          <p className="text-[13px] text-zinc-500 ml-7">
            {loading
              ? `Loading headcount data (${dataPoints.length}/${totalFilings || "?"} filings)...`
              : `${dataPoints.length} year${dataPoints.length !== 1 ? "s" : ""} of headcount data from SEC 10-K filings`}
          </p>
        </div>

        {error && !dataPoints.length ? (
          <div className="text-center py-16 text-zinc-600">{error}</div>
        ) : (
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 p-4">
            <div className="flex items-center justify-between mb-2 px-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
                  <span className="text-[11px] text-zinc-500">Headcount</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-0.5 rounded bg-cyan-400" />
                  <span className="text-[11px] text-zinc-500">YoY Change</span>
                </div>
              </div>
            </div>
            <HeadcountChart data={dataPoints} totalSlots={totalFilings || 5} />
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-700">
          <a
            href={edgarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-500 transition-colors underline underline-offset-2"
          >
            View filings on SEC EDGAR
          </a>
        </div>
      </div>
    </div>
  );
}
