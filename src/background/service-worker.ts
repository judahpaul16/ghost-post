import type {
  ExtensionMessage,
  GhostScore,
  JobPosting,
  Signal,
} from "@/types";
import type { DataSourceContext } from "@/data-sources/types";
import { waybackSource } from "@/data-sources/wayback";
import { pdlSource } from "@/data-sources/pdl";
import { hnAlgoliaSource } from "@/data-sources/hn-algolia";
import { airtableLayoffsSource } from "@/data-sources/airtable-layoffs";
import { atsVerifySource } from "@/data-sources/ats-verify";
import { jsearchSource } from "@/data-sources/jsearch";
import { theMuseSource } from "@/data-sources/the-muse";
import { computeScore, computeBatchScore } from "@/scoring/engine";

const dataSources = [waybackSource, pdlSource, hnAlgoliaSource, airtableLayoffsSource, atsVerifySource, jsearchSource, theMuseSource];
const cachedSources = dataSources.filter((s) => s.requiresApiKey);
const freshSources = dataSources.filter((s) => !s.requiresApiKey);

const tabScores = new Map<number, GhostScore>();
const tabPostings = new Map<number, JobPosting>();
const tabNoPosting = new Set<number>();
const tabInFlight = new Map<number, Promise<GhostScore>>();
const inFlightSignals = new Map<string, Promise<Signal[]>>();
const tabProgress = new Map<number, string[]>();

const SOURCE_LABELS: Record<string, string> = {
  wayback: "Checking Web Archive",
  pdl: "Checking Company Data",
  "hn-algolia": "Checking Hacker News",
  "airtable-layoffs": "Checking Layoff History",
  "ats-verify": "Verifying Careers Page",
  jsearch: "Checking Job Listings",
  "the-muse": "Checking The Muse",
};

function companyKey(company: string): string {
  return company.toLowerCase().replace(/\s+/g, "_");
}

function cacheKey(company: string): string {
  return `signals_${companyKey(company)}`;
}

function isUsableSignal(signal: Signal): boolean {
  return signal.available;
}

async function getCachedSignals(company: string): Promise<Signal[] | null> {
  try {
    const key = cacheKey(company);
    const result = await chrome.storage.session.get(key);
    return (result[key] as Signal[]) ?? null;
  } catch {
    return null;
  }
}

async function setCachedSignals(company: string, signals: Signal[]): Promise<void> {
  try {
    await chrome.storage.session.set({ [cacheKey(company)]: signals });
  } catch {}
}

async function clearCachedSignals(company: string): Promise<void> {
  try {
    await chrome.storage.session.remove(cacheKey(company));
  } catch {}
}

async function fetchSignals(sources: typeof dataSources, context: DataSourceContext, tabId?: number): Promise<Signal[]> {
  const results = await Promise.allSettled(
    sources.map((source) =>
      source.check(context).then((signal) => {
        if (tabId !== undefined) {
          const progress = tabProgress.get(tabId) ?? [];
          progress.push(SOURCE_LABELS[source.id] ?? source.id);
          tabProgress.set(tabId, progress);
        }
        return signal;
      })
    )
  );
  return results
    .filter((r): r is PromiseFulfilledResult<Signal> => r.status === "fulfilled")
    .map((r) => r.value);
}

const FREE_SIGNAL_IDS = new Set(["wayback-age", "hn-hiring", "ats-verify", "the-muse"]);

async function resolveAllSignals(company: string, context: DataSourceContext, tabId?: number): Promise<Signal[]> {
  const cached = await getCachedSignals(company);
  const cachedPaid = cached?.filter((s) => isUsableSignal(s) && !FREE_SIGNAL_IDS.has(s.id)) ?? [];

  if (tabId !== undefined && cachedPaid.length > 0) {
    const progress = tabProgress.get(tabId) ?? [];
    for (const s of cachedPaid) {
      const label = SOURCE_LABELS[s.id] ?? s.id;
      if (!progress.includes(label)) progress.push(label);
    }
    tabProgress.set(tabId, progress);
  }

  const [freshSignals, paidSignals] = await Promise.all([
    fetchSignals(freshSources, context, tabId),
    cachedPaid.length > 0
      ? Promise.resolve(cachedPaid)
      : fetchSignals(cachedSources, context, tabId),
  ]);

  if (cachedPaid.length === 0) {
    const toCache = paidSignals.filter(isUsableSignal);
    if (toCache.length > 0) {
      await setCachedSignals(company, toCache);
    }
  }

  return [...freshSignals, ...paidSignals];
}

async function scoreJob(posting: JobPosting, tabId?: number): Promise<GhostScore> {
  const key = companyKey(posting.company);
  const context: DataSourceContext = {
    company: posting.company,
    url: posting.url,
    datePosted: posting.datePosted,
    hasStructuredData: posting.hasStructuredData,
  };

  if (tabId !== undefined) tabProgress.set(tabId, []);

  let existing = inFlightSignals.get(key);
  if (!existing) {
    existing = resolveAllSignals(posting.company, context, tabId);
    inFlightSignals.set(key, existing);
    existing.finally(() => inFlightSignals.delete(key));
  }

  const resolvedSignals = await existing;
  if (tabId !== undefined) tabProgress.delete(tabId);
  return computeScore(posting, resolvedSignals);
}

async function scoreJobFresh(posting: JobPosting): Promise<GhostScore> {
  await clearCachedSignals(posting.company);
  inFlightSignals.delete(companyKey(posting.company));

  const context: DataSourceContext = {
    company: posting.company,
    url: posting.url,
    datePosted: posting.datePosted,
    hasStructuredData: posting.hasStructuredData,
  };

  const resolvedSignals = await fetchSignals(dataSources, context);
  const toCache = resolvedSignals.filter((s) => cachedSources.some((cs) => cs.id === s.id) && isUsableSignal(s));
  if (toCache.length > 0) {
    await setCachedSignals(posting.company, toCache);
  }
  return computeScore(posting, resolvedSignals);
}

async function resolveCompanySignals(
  company: string,
  url: string,
  datePosted?: string,
): Promise<Signal[]> {
  const context: DataSourceContext = {
    company,
    url,
    datePosted,
    hasStructuredData: false,
  };

  return resolveAllSignals(company, context);
}

async function scoreBatch(
  items: Array<{ company: string; datePosted?: string; url: string }>
): Promise<Array<{ url: string; score: GhostScore }>> {
  const signalsByCompany = new Map<string, Promise<Signal[]>>();

  for (const item of items) {
    const key = companyKey(item.company);
    if (!signalsByCompany.has(key)) {
      const existing = inFlightSignals.get(key);
      if (existing) {
        signalsByCompany.set(key, existing);
      } else {
        const promise = resolveCompanySignals(item.company, item.url, item.datePosted);
        signalsByCompany.set(key, promise);
        inFlightSignals.set(key, promise);
        promise.finally(() => inFlightSignals.delete(key));
      }
    }
  }

  return Promise.all(
    items.map(async (item) => {
      const signals = await signalsByCompany.get(companyKey(item.company))!;
      const score = computeBatchScore(item.company, item.datePosted, signals);
      return { url: item.url, score };
    })
  );
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    switch (message.type) {
      case "SCORE_JOB": {
        const posting: JobPosting = {
          ...message.payload,
        };
        const tabId = sender.tab?.id;
        const promise = scoreJob(posting, tabId).then((score) => {
          if (tabId) {
            tabScores.set(tabId, score);
            tabPostings.set(tabId, posting);
            tabNoPosting.delete(tabId);
            tabInFlight.delete(tabId);
          }
          sendResponse({ type: "SCORE_JOB_RESULT", payload: score });
          return score;
        });
        if (tabId) {
          tabInFlight.set(tabId, promise);
        }
        return true;
      }

      case "SCORE_BATCH": {
        const batchTabId = sender.tab?.id;
        scoreBatch(message.payload).then((results) => {
          if (batchTabId && results.length > 0 && !tabScores.has(batchTabId) && !tabInFlight.has(batchTabId)) {
            const first = message.payload[0];
            tabScores.set(batchTabId, results[0].score);
            tabPostings.set(batchTabId, {
              company: first.company,
              title: "",
              url: first.url,
              datePosted: first.datePosted,
              hasStructuredData: false,
            });
            tabNoPosting.delete(batchTabId);
          }
          sendResponse({ type: "SCORE_BATCH_RESULT", payload: results });
        });
        return true;
      }

      case "NO_POSTING": {
        if (sender.tab?.id) {
          tabNoPosting.add(sender.tab.id);
        }
        return false;
      }

      case "REFETCH_SCORE": {
        const posting = tabPostings.get(message.tabId);
        if (!posting) {
          sendResponse(null);
          return false;
        }
        scoreJobFresh(posting).then((score) => {
          tabScores.set(message.tabId, score);
          sendResponse(score);
        });
        return true;
      }

      case "GET_TAB_SCORE": {
        const cached = tabScores.get(message.tabId);
        if (cached) {
          sendResponse({ type: "score", score: cached });
          return false;
        }
        if (tabNoPosting.has(message.tabId)) {
          sendResponse({ type: "noPosting" });
          return false;
        }
        const inflight = tabInFlight.get(message.tabId);
        if (inflight) {
          inflight.then((score) => {
            sendResponse({ type: "score", score });
          });
          return true;
        }
        sendResponse({ type: "pending", progress: tabProgress.get(message.tabId) ?? [] });
        return false;
      }
    }
  }
);

chrome.tabs.onRemoved.addListener((tabId) => {
  tabScores.delete(tabId);
  tabPostings.delete(tabId);
  tabNoPosting.delete(tabId);
  tabInFlight.delete(tabId);
  tabProgress.delete(tabId);
});

function urlPatternToMatchPattern(pattern: string): string {
  const parts = pattern.split("/");
  const host = parts[0].replace(/\*/g, "*");
  const path = parts.slice(1).join("/") || "*";
  return `https://${host}/${path}`;
}

function getContentScriptPath(): string {
  const manifest = chrome.runtime.getManifest();
  return manifest.content_scripts?.[0]?.js?.[0] ?? "src/content/index.ts";
}

async function syncCustomContentScripts() {
  const { customPages = [] } = await chrome.storage.sync.get({ customPages: [] });

  try {
    await chrome.scripting.unregisterContentScripts({ ids: ["ghost-post-custom"] });
  } catch {}

  if (customPages.length === 0) return;

  const matches = (customPages as Array<{ urlPattern: string }>).map(
    (p) => urlPatternToMatchPattern(p.urlPattern)
  );

  try {
    await chrome.scripting.registerContentScripts([{
      id: "ghost-post-custom",
      matches,
      js: [getContentScriptPath()],
      runAt: "document_idle",
    }]);
  } catch {}
}

chrome.runtime.onInstalled.addListener(() => {
  syncCustomContentScripts();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.customPages) {
    syncCustomContentScripts();
  }
});
