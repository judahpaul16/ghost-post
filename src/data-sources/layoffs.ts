import type { DataSource, DataSourceContext } from "./types";
import type { Signal } from "@/types";

interface LayoffRecord {
  company: string;
  date: string;
  count?: number;
}

interface CachedLayoffs {
  records: LayoffRecord[];
  fetchedAt: number;
}

const SPREADSHEET_ID = "1S8LHKLzoP8iRDg1zW8WTV0J-XlEUd5FLtgVyuxG9Fhk";
const CACHE_KEY = "layoffs_cache";
const CACHE_TTL = 24 * 60 * 60 * 1000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

async function getCachedLayoffs(): Promise<LayoffRecord[] | null> {
  try {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const cached = result[CACHE_KEY] as CachedLayoffs | undefined;
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      return cached.records;
    }
  } catch {}
  return null;
}

function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCount(raw: string): number | undefined {
  const cleaned = raw.replace(/,/g, "").trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? undefined : num;
}

async function fetchLayoffsCSV(): Promise<LayoffRecord[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`CSV fetch failed: ${response.status}`);

  const text = await response.text();
  const lines = text.split("\n");
  if (lines.length < 2) throw new Error("Empty spreadsheet");

  const header = parseCSVRow(lines[0]);
  const colIndex = new Map<string, number>();
  header.forEach((name, i) => colIndex.set(name.trim().toLowerCase(), i));

  function findCol(...prefixes: string[]): number | undefined {
    for (const [name, idx] of colIndex) {
      for (const prefix of prefixes) {
        if (name.startsWith(prefix)) return idx;
      }
    }
    return undefined;
  }

  const companyIdx = findCol("company");
  const dateIdx = findCol("announced", "date");
  const countIdx = findCol("no. of reported", "reported layoffs");

  if (companyIdx === undefined) throw new Error("Company column not found");

  const records: LayoffRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVRow(line);
    const company = fields[companyIdx]?.trim() ?? "";
    if (!company) continue;

    const date = dateIdx !== undefined ? (fields[dateIdx]?.trim() ?? "") : "";
    const count = countIdx !== undefined ? parseCount(fields[countIdx] ?? "") : undefined;

    records.push({ company, date, count });
  }

  return records;
}

async function getLayoffRecords(): Promise<LayoffRecord[]> {
  const cached = await getCachedLayoffs();
  if (cached) return cached;

  const records = await fetchLayoffsCSV();

  try {
    const data: CachedLayoffs = { records, fetchedAt: Date.now() };
    await chrome.storage.local.set({ [CACHE_KEY]: data });
  } catch {}

  return records;
}

function findLayoffs(records: LayoffRecord[], company: string): LayoffRecord[] {
  const lower = company.toLowerCase();
  return records
    .filter((r) => {
      const rLower = r.company.toLowerCase();
      return rLower.includes(lower) || lower.includes(rLower);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const layoffsSource: DataSource = {
  id: "layoffs",
  requiresApiKey: false,
  scope: "company",

  async check(context: DataSourceContext): Promise<Signal> {
    const base: Omit<Signal, "level" | "points" | "description" | "available"> = {
      id: "layoffs",
      label: "Layoff History",
      source: "layoffs.fyi",
    };

    if (!context.company.trim()) {
      return { ...base, level: "neutral", points: 0, description: "No company name available", available: false };
    }

    try {
      const allRecords = await getLayoffRecords();
      const matches = findLayoffs(allRecords, context.company);

      const layoffsUrl = "https://layoffs.fyi/";

      if (matches.length === 0) {
        return {
          ...base,
          level: "green",
          points: 0,
          description: "No reported layoffs at this company",
          available: true,
          url: layoffsUrl,
        };
      }

      const mostRecent = matches[0];
      const layoffDate = mostRecent.date ? new Date(mostRecent.date) : null;
      const isRecent = layoffDate && Date.now() - layoffDate.getTime() < NINETY_DAYS_MS;
      const count = mostRecent.count;

      if (isRecent) {
        const countStr = count ? ` — ${count.toLocaleString()} people affected` : "";
        return {
          ...base,
          level: "red",
          points: 25,
          description: `Recent layoffs on ${layoffDate!.toLocaleDateString()}${countStr}`,
          available: true,
          url: layoffsUrl,
        };
      }

      return {
        ...base,
        level: "yellow",
        points: 5,
        description: `Company had layoffs (${layoffDate?.toLocaleDateString() ?? "date unknown"}) — may still be in hiring freeze`,
        available: true,
        url: layoffsUrl,
      };
    } catch {
      return { ...base, level: "neutral", points: 0, description: "Could not fetch layoff data", available: false };
    }
  },
};
