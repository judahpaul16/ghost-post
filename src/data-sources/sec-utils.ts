import { getSettings } from "@/storage/settings";

export interface TickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

interface CachedTickers {
  entries: TickerEntry[];
  fetchedAt: number;
}

interface CachedHeadcount {
  dataPoints: Array<{ year: string; count: number; filingDate: string }>;
  fetchedAt: number;
}

export interface Filing {
  accessionNumber: string;
  filingDate: string;
  primaryDocument: string;
}

const TICKERS_CACHE_KEY = "sec_tickers_cache";
const TICKERS_TTL = 7 * 24 * 60 * 60 * 1000;
const HEADCOUNT_CACHE_PREFIX = "sec_headcount_";
const HEADCOUNT_TTL = 24 * 60 * 60 * 1000;
export const SEC_UA = "GhostPost Chrome Extension (ghost-post@github.com)";

const SEC_SUFFIXES = new Set([
  "inc", "corp", "co", "ltd", "llc", "lp", "plc", "sa", "nv", "se", "ag",
  "group", "holdings", "international", "enterprises",
]);

async function getCachedTickers(): Promise<TickerEntry[] | null> {
  try {
    const result = await chrome.storage.local.get(TICKERS_CACHE_KEY);
    const cached = result[TICKERS_CACHE_KEY] as CachedTickers | undefined;
    if (cached && Date.now() - cached.fetchedAt < TICKERS_TTL) {
      return cached.entries;
    }
  } catch {}
  return null;
}

export async function fetchTickers(): Promise<TickerEntry[]> {
  const cached = await getCachedTickers();
  if (cached) return cached;

  const response = await fetch("https://www.sec.gov/files/company_tickers.json", {
    headers: { "User-Agent": SEC_UA },
  });
  if (!response.ok) throw new Error(`Tickers fetch failed: ${response.status}`);

  const data: Record<string, TickerEntry> = await response.json();
  const entries = Object.values(data);

  try {
    await chrome.storage.local.set({
      [TICKERS_CACHE_KEY]: { entries, fetchedAt: Date.now() } as CachedTickers,
    });
  } catch {}

  return entries;
}

export function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

export function resolveCIK(entries: TickerEntry[], company: string): number | null {
  const target = normalize(company);
  const targetWords = target.split(" ");

  let bestMatch: TickerEntry | null = null;
  let bestScore = 0;

  for (const entry of entries) {
    const name = normalize(entry.title);
    if (name === target) return entry.cik_str;

    const nameWords = name.split(" ");
    const coreWords = nameWords.filter((w) => !SEC_SUFFIXES.has(w));

    let matched = 0;
    for (const word of targetWords) {
      if (coreWords.some((w) => w.startsWith(word) || word.startsWith(w))) matched++;
    }
    const score = matched / Math.max(targetWords.length, coreWords.length);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestMatch = entry;
    }
  }

  return bestMatch?.cik_str ?? null;
}

export async function fetchLatestTenKs(cik: number, limit: number = 2): Promise<Filing[]> {
  const padded = String(cik).padStart(10, "0");
  const response = await fetch(`https://data.sec.gov/submissions/CIK${padded}.json`, {
    headers: { "User-Agent": SEC_UA },
  });
  if (!response.ok) throw new Error(`Submissions fetch failed: ${response.status}`);

  const data = await response.json();
  const recent = data.filings?.recent;
  if (!recent) return [];

  const filings: Filing[] = [];
  for (let i = 0; i < recent.form.length && filings.length < limit; i++) {
    if (recent.form[i] === "10-K") {
      filings.push({
        accessionNumber: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        primaryDocument: recent.primaryDocument[i],
      });
    }
  }
  return filings;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ");
}

export function extractEmployeeSnippet(text: string): string | null {
  const pattern = /(\d{1,3}(?:,\d{3})+|\d{4,})\s+(?:full[- ]time\s+)?employees/gi;
  let bestSnippet: string | null = null;
  let bestCount = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const num = parseInt(match[1].replace(/,/g, ""), 10);
    if (num >= 100 && num <= 10_000_000 && num > bestCount) {
      bestCount = num;
      const start = Math.max(0, match.index - 500);
      const end = Math.min(text.length, match.index + 500);
      bestSnippet = text.slice(start, end);
    }
  }

  return bestSnippet;
}

export async function fetchTenKSnippet(cik: number, filing: Filing): Promise<string | null> {
  const accessionNoDashes = filing.accessionNumber.replace(/-/g, "");
  const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/${filing.primaryDocument}`;

  const response = await fetch(url, { headers: { "User-Agent": SEC_UA } });
  if (!response.ok) return null;

  const html = await response.text();
  const text = stripHtml(html);
  return extractEmployeeSnippet(text);
}

export function extractCountViaRegex(snippet: string): number | null {
  const patterns = [
    /(?:approximately|about|over|nearly|around|had|have|has|employ(?:s|ed|ing)?|total of|totaling|workforce of)\s+(\d{1,3}(?:,\d{3})+|\d{4,})\s+(?:full[- ]time\s+)?employees/i,
    /(\d{1,3}(?:,\d{3})+|\d{4,})\s+(?:full[- ]time\s+)?employees/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(snippet);
    if (match) {
      const num = parseInt(match[1].replace(/,/g, ""), 10);
      if (num >= 10 && num <= 10_000_000) return num;
    }
  }
  return null;
}

export async function extractCountViaLLM(
  snippet: string,
  settings: { llmApiKey: string; llmBaseUrl: string; llmModel: string },
): Promise<number | null> {
  try {
    const response = await fetch(`${settings.llmBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.llmApiKey}`,
      },
      body: JSON.stringify({
        model: settings.llmModel,
        messages: [
          {
            role: "user",
            content: `Extract the total number of employees from this SEC 10-K excerpt. Return ONLY the number with no commas, text, or explanation. If you cannot determine it, return "unknown".\n\n${snippet}`,
          },
        ],
        max_tokens: 20,
        temperature: 0,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || content.toLowerCase() === "unknown") return null;

    const num = parseInt(content.replace(/,/g, ""), 10);
    return isNaN(num) ? null : num;
  } catch {
    return null;
  }
}

export async function extractCount(
  snippet: string,
  settings: { llmApiKey: string; llmBaseUrl: string; llmModel: string },
): Promise<number | null> {
  const hasLLM = settings.llmApiKey && settings.llmBaseUrl;
  if (hasLLM) {
    const llmResult = await extractCountViaLLM(snippet, settings);
    if (llmResult !== null) return llmResult;
  }
  return extractCountViaRegex(snippet);
}

const PARENT_PATTERNS = [
  /owned by (.+?)(?:\.|,|$)/i,
  /(.+?)-owned/i,
  /subsidiary of (.+?)(?:\s+that|\s+\(|,|$)/i,
];

async function resolveParentViaWikidata(brand: string): Promise<string | null> {
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(brand)}&language=en&format=json&limit=1&origin=*`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const description: string = data.search?.[0]?.description ?? "";

    for (const pattern of PARENT_PATTERNS) {
      const match = pattern.exec(description);
      if (match) return match[1].trim();
    }
  } catch {}
  return null;
}

async function resolveParentViaEFTS(brand: string): Promise<string | null> {
  try {
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
    const startdt = twoYearsAgo.toISOString().slice(0, 10);
    const enddt = now.toISOString().slice(0, 10);

    const url = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(brand)}%22&forms=10-K&dateRange=custom&startdt=${startdt}&enddt=${enddt}`;
    const response = await fetch(url, { headers: { "User-Agent": SEC_UA } });
    if (!response.ok) return null;

    const data = await response.json();
    const hits = data.hits?.hits ?? [];
    if (hits.length === 0) return null;

    const nameCounts = new Map<string, number>();
    for (const hit of hits.slice(0, 10)) {
      const names: string[] = hit._source?.display_names ?? [];
      for (const name of names) {
        const clean = name.replace(/\s*\(.*?\)\s*/g, "").trim();
        if (clean.toLowerCase().includes(brand.toLowerCase())) continue;
        nameCounts.set(clean, (nameCounts.get(clean) ?? 0) + 1);
      }
    }

    let bestName: string | null = null;
    let bestCount = 0;
    for (const [name, count] of nameCounts) {
      if (count > bestCount) {
        bestCount = count;
        bestName = name;
      }
    }
    return bestName;
  } catch {}
  return null;
}

export interface ParentResolution {
  parentName: string;
  cik: number;
}

export async function resolveParentCompany(
  brand: string,
  tickers: TickerEntry[],
): Promise<ParentResolution | null> {
  const wikidataParent = await resolveParentViaWikidata(brand);
  if (wikidataParent) {
    let cik = resolveCIK(tickers, wikidataParent);
    if (cik) return { parentName: wikidataParent, cik };

    const grandparent = await resolveParentViaWikidata(wikidataParent);
    if (grandparent) {
      cik = resolveCIK(tickers, grandparent);
      if (cik) return { parentName: grandparent, cik };
    }
  }

  const eftsParent = await resolveParentViaEFTS(brand);
  if (eftsParent) {
    const cik = resolveCIK(tickers, eftsParent);
    if (cik) return { parentName: eftsParent, cik };
  }

  return null;
}

export async function extractCountForChart(
  cik: number,
  filing: Filing,
): Promise<number | null> {
  const snippet = await fetchTenKSnippet(cik, filing);
  if (!snippet) return null;
  const settings = await getSettings();
  return extractCount(snippet, settings);
}

export async function fetchCachedHeadcount(
  cik: number,
): Promise<CachedHeadcount["dataPoints"] | null> {
  try {
    const key = `${HEADCOUNT_CACHE_PREFIX}${cik}`;
    const result = await chrome.storage.local.get(key);
    const cached = result[key] as CachedHeadcount | undefined;
    if (cached && Date.now() - cached.fetchedAt < HEADCOUNT_TTL) {
      return cached.dataPoints;
    }
  } catch {}
  return null;
}

export async function cacheHeadcount(
  cik: number,
  dataPoints: CachedHeadcount["dataPoints"],
): Promise<void> {
  try {
    const key = `${HEADCOUNT_CACHE_PREFIX}${cik}`;
    await chrome.storage.local.set({
      [key]: { dataPoints, fetchedAt: Date.now() } as CachedHeadcount,
    });
  } catch {}
}
