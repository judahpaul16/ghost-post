import type {
  ExtensionMessage,
  GhostScore,
  JobPosting,
  Signal,
} from "@/types";
import type { DataSource, DataSourceContext } from "@/data-sources/types";
import { waybackSource } from "@/data-sources/wayback";
import { pdlSource } from "@/data-sources/pdl";
import { hnAlgoliaSource } from "@/data-sources/hn-algolia";
import { layoffsSource } from "@/data-sources/layoffs";
import { atsVerifySource } from "@/data-sources/ats-verify";
import { jsearchSource } from "@/data-sources/jsearch";
import { theMuseSource } from "@/data-sources/the-muse";
import { secHeadcountSource } from "@/data-sources/sec-headcount";
import { computeScore, computeBatchScore } from "@/scoring/engine";

const dataSources = [waybackSource, pdlSource, hnAlgoliaSource, layoffsSource, atsVerifySource, jsearchSource, theMuseSource, secHeadcountSource];
const companySources = dataSources.filter((s) => s.scope === "company");
const jobSources = dataSources.filter((s) => s.scope === "job");

const tabScores = new Map<number, GhostScore>();
const tabPostings = new Map<number, JobPosting>();
const tabNoPosting = new Set<number>();
const tabInFlight = new Map<number, Promise<GhostScore>>();
const inFlightCompany = new Map<string, Promise<Signal[]>>();
const inFlightJob = new Map<string, Promise<Signal[]>>();
const tabProgress = new Map<number, string[]>();

const SOURCE_LABELS: Record<string, string> = {
  wayback: "Checking Web Archive",
  pdl: "Checking Company Data",
  "hn-algolia": "Checking Hacker News",
  layoffs: "Checking Layoff History",
  "ats-verify": "Verifying Careers Page",
  jsearch: "Checking Job Listings",
  "the-muse": "Checking The Muse",
  "sec-headcount": "Checking Headcount Trend",
};

function companyKey(company: string): string {
  return company.toLowerCase().replace(/\s+/g, "_");
}

function jobKey(url: string): string {
  return url.replace(/[?#].*$/, "").toLowerCase();
}

function companyCacheKey(company: string): string {
  return `company_${companyKey(company)}`;
}

function jobCacheKey(url: string): string {
  return `job_${jobKey(url)}`;
}

async function getCached(key: string): Promise<Signal[] | null> {
  try {
    const result = await chrome.storage.session.get(key);
    return (result[key] as Signal[]) ?? null;
  } catch {
    return null;
  }
}

async function setCache(key: string, signals: Signal[]): Promise<void> {
  try {
    await chrome.storage.session.set({ [key]: signals });
  } catch {}
}

async function clearCache(key: string): Promise<void> {
  try {
    await chrome.storage.session.remove(key);
  } catch {}
}

function reportCachedProgress(signals: Signal[], tabId: number) {
  const progress = tabProgress.get(tabId) ?? [];
  for (const s of signals) {
    const label = SOURCE_LABELS[s.id] ?? s.id;
    if (!progress.includes(label)) progress.push(label);
  }
  tabProgress.set(tabId, progress);
}

async function fetchSignals(sources: DataSource[], context: DataSourceContext, tabId?: number): Promise<Signal[]> {
  const results = await Promise.allSettled(
    sources.map((source) =>
      source.check(context).then((result) => {
        if (tabId !== undefined) {
          const progress = tabProgress.get(tabId) ?? [];
          progress.push(SOURCE_LABELS[source.id] ?? source.id);
          tabProgress.set(tabId, progress);
        }
        return result;
      })
    )
  );
  return results
    .filter((r): r is PromiseFulfilledResult<Signal | Signal[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}

async function resolveCompanySignals(company: string, context: DataSourceContext, tabId?: number): Promise<Signal[]> {
  const key = companyCacheKey(company);
  const cached = await getCached(key);
  if (cached && cached.length > 0) {
    if (tabId !== undefined) reportCachedProgress(cached, tabId);
    return cached;
  }

  const signals = await fetchSignals(companySources, context, tabId);
  const usable = signals.filter((s) => s.available);
  if (usable.length > 0) await setCache(key, signals);
  return signals;
}

async function resolveJobSignals(url: string, context: DataSourceContext, tabId?: number): Promise<Signal[]> {
  const key = jobCacheKey(url);
  const cached = await getCached(key);
  if (cached && cached.length > 0) {
    if (tabId !== undefined) reportCachedProgress(cached, tabId);
    return cached;
  }

  const signals = await fetchSignals(jobSources, context, tabId);
  const usable = signals.filter((s) => s.available);
  if (usable.length > 0) await setCache(key, signals);
  return signals;
}

async function resolveAllSignals(company: string, url: string, context: DataSourceContext, tabId?: number): Promise<Signal[]> {
  const ck = companyKey(company);
  const jk = jobKey(url);

  let companyPromise = inFlightCompany.get(ck);
  if (!companyPromise) {
    companyPromise = resolveCompanySignals(company, context, tabId);
    inFlightCompany.set(ck, companyPromise);
    companyPromise.finally(() => inFlightCompany.delete(ck));
  }

  let jobPromise = inFlightJob.get(jk);
  if (!jobPromise) {
    jobPromise = resolveJobSignals(url, context, tabId);
    inFlightJob.set(jk, jobPromise);
    jobPromise.finally(() => inFlightJob.delete(jk));
  }

  const [companySignals, jobSignals] = await Promise.all([companyPromise, jobPromise]);
  return [...companySignals, ...jobSignals];
}

async function scoreJob(posting: JobPosting, tabId?: number): Promise<GhostScore> {
  const context: DataSourceContext = {
    company: posting.company,
    url: posting.url,
    datePosted: posting.datePosted,
    hasStructuredData: posting.hasStructuredData,
  };

  if (tabId !== undefined) tabProgress.set(tabId, []);
  const resolvedSignals = await resolveAllSignals(posting.company, posting.url, context, tabId);
  if (tabId !== undefined) tabProgress.delete(tabId);
  return computeScore(posting, resolvedSignals);
}

async function scoreJobFresh(posting: JobPosting): Promise<GhostScore> {
  await clearCache(companyCacheKey(posting.company));
  await clearCache(jobCacheKey(posting.url));
  inFlightCompany.delete(companyKey(posting.company));
  inFlightJob.delete(jobKey(posting.url));

  const context: DataSourceContext = {
    company: posting.company,
    url: posting.url,
    datePosted: posting.datePosted,
    hasStructuredData: posting.hasStructuredData,
  };

  const resolvedSignals = await fetchSignals(dataSources, context);

  const companySignals = resolvedSignals.filter((s) => companySources.some((cs) => cs.id === s.id));
  const jobSignals = resolvedSignals.filter((s) => jobSources.some((js) => js.id === s.id));

  if (companySignals.some((s) => s.available)) await setCache(companyCacheKey(posting.company), companySignals);
  if (jobSignals.some((s) => s.available)) await setCache(jobCacheKey(posting.url), jobSignals);

  return computeScore(posting, resolvedSignals);
}

async function scoreBatch(
  items: Array<{ company: string; datePosted?: string; url: string }>
): Promise<Array<{ url: string; score: GhostScore }>> {
  const signalsByItem = new Map<string, Promise<Signal[]>>();

  for (const item of items) {
    const context: DataSourceContext = {
      company: item.company,
      url: item.url,
      datePosted: item.datePosted,
      hasStructuredData: false,
    };
    signalsByItem.set(item.url, resolveAllSignals(item.company, item.url, context));
  }

  return Promise.all(
    items.map(async (item) => {
      const signals = await signalsByItem.get(item.url)!;
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

      case "CLEAR_ALL_CACHE": {
        chrome.storage.session.clear().then(() => {
          inFlightCompany.clear();
          inFlightJob.clear();
          tabScores.clear();
          tabPostings.clear();
          tabNoPosting.clear();
          tabInFlight.clear();
          tabProgress.clear();
          sendResponse({ success: true });
        });
        return true;
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
