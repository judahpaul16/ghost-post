import type { DataSource, DataSourceContext } from "./types";
import type { Signal } from "@/types";
import { getSettings } from "@/storage/settings";
import {
  fetchTickers,
  resolveCIK,
  fetchLatestTenKs,
  fetchTenKSnippet,
  extractCount,
  resolveParentCompany,
} from "./sec-utils";

export const secHeadcountSource: DataSource = {
  id: "sec-headcount",
  requiresApiKey: false,
  scope: "company",

  async check(context: DataSourceContext): Promise<Signal> {
    const base: Omit<Signal, "level" | "points" | "description" | "available"> = {
      id: "sec-headcount",
      label: "Headcount Trend",
      source: "SEC EDGAR",
    };

    const settings = await getSettings();

    if (!context.company.trim()) {
      return { ...base, level: "neutral", points: 0, description: "No company name available", available: false };
    }

    try {
      const tickers = await fetchTickers();
      let cik = resolveCIK(tickers, context.company);
      let parentLabel = "";

      if (!cik) {
        const parent = await resolveParentCompany(context.company, tickers);
        if (!parent) {
          return { ...base, level: "neutral", points: 0, description: "Company not found in SEC filings — may be private or non-US", available: true };
        }
        cik = parent.cik;
        parentLabel = ` (${parent.parentName})`;
      }

      const filings = await fetchLatestTenKs(cik);
      if (filings.length === 0) {
        return { ...base, level: "neutral", points: 0, description: "No 10-K filings found", available: true };
      }

      const chartUrl = chrome.runtime.getURL(
        `src/headcount/index.html?company=${encodeURIComponent(context.company)}&cik=${cik}${parentLabel ? `&parent=${encodeURIComponent(parentLabel.slice(2, -1))}` : ""}`,
      );

      const snippets = await Promise.all(filings.map((f) => fetchTenKSnippet(cik!, f)));

      const counts: Array<{ year: string; count: number }> = [];
      for (let i = 0; i < filings.length; i++) {
        const snippet = snippets[i];
        if (!snippet) continue;

        const count = await extractCount(snippet, settings);
        if (count !== null) {
          counts.push({ year: filings[i].filingDate.slice(0, 4), count });
        }
      }

      if (counts.length === 0) {
        return { ...base, level: "neutral", points: 0, description: "Could not extract employee count from filings", available: true, url: chartUrl };
      }

      if (counts.length === 1) {
        return {
          ...base,
          level: "green",
          points: 0,
          description: `${counts[0].count.toLocaleString()} employees${parentLabel} (${counts[0].year} 10-K) — only one filing available for trend`,
          available: true,
          url: chartUrl,
        };
      }

      const current = counts[0].count;
      const previous = counts[1].count;
      const change = (current - previous) / previous;
      const pct = Math.round(change * 100);
      const arrow = pct >= 0 ? "+" : "";

      if (change <= -0.15) {
        return {
          ...base,
          level: "red",
          points: 15,
          description: `Headcount${parentLabel} dropped ${Math.abs(pct)}% YoY (${previous.toLocaleString()} → ${current.toLocaleString()}) — major workforce reduction`,
          available: true,
          url: chartUrl,
        };
      }

      if (change <= -0.05) {
        return {
          ...base,
          level: "yellow",
          points: 10,
          description: `Headcount${parentLabel} declined ${Math.abs(pct)}% YoY (${previous.toLocaleString()} → ${current.toLocaleString()})`,
          available: true,
          url: chartUrl,
        };
      }

      if (change >= 0.10) {
        return {
          ...base,
          level: "green",
          points: -5,
          description: `Headcount${parentLabel} grew ${arrow}${pct}% YoY (${previous.toLocaleString()} → ${current.toLocaleString()}) — actively expanding`,
          available: true,
          url: chartUrl,
        };
      }

      return {
        ...base,
        level: "green",
        points: 0,
        description: `Headcount${parentLabel} ${arrow}${pct}% YoY (${previous.toLocaleString()} → ${current.toLocaleString()}) — stable workforce`,
        available: true,
        url: chartUrl,
      };
    } catch {
      return { ...base, level: "neutral", points: 0, description: "Could not check SEC filings", available: false };
    }
  },
};
