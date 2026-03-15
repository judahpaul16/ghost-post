import type { DataSource, DataSourceContext } from "./types";
import type { Signal } from "@/types";

const THREE_MONTHS_SEC = 90 * 24 * 60 * 60;

interface HnHit {
  objectID: string;
  story_id?: number;
  comment_text?: string;
  parent_id?: number;
  created_at_i?: number;
}

interface HnSearchResponse {
  nbHits: number;
  hits: HnHit[];
}

async function findHiringThreadIds(): Promise<string[]> {
  const threeMonthsAgo = Math.floor(Date.now() / 1000) - THREE_MONTHS_SEC;
  const url = new URL("https://hn.algolia.com/api/v1/search");
  url.searchParams.set("query", "Ask HN: Who is hiring?");
  url.searchParams.set("tags", "story,author_whoishiring");
  url.searchParams.set("numericFilters", `created_at_i>${threeMonthsAgo}`);
  url.searchParams.set("hitsPerPage", "6");

  const response = await fetch(url.toString());
  if (!response.ok) return [];

  const data: HnSearchResponse = await response.json();
  return data.hits.map((h) => h.objectID);
}

function isCompanyPost(hit: HnHit, company: string, threadIds: string[]): boolean {
  if (!company.trim()) return false;
  const isTopLevel = hit.parent_id !== undefined && threadIds.includes(hit.parent_id.toString());
  if (!isTopLevel) return false;

  if (!hit.comment_text) return false;

  const firstLine = hit.comment_text.split(/<p>/i)[0].replace(/<[^>]*>/g, "").toLowerCase();
  return firstLine.includes(company.toLowerCase());
}

export const hnAlgoliaSource: DataSource = {
  id: "hn-algolia",
  requiresApiKey: false,

  async check(context: DataSourceContext): Promise<Signal> {
    const base: Omit<Signal, "level" | "points" | "description" | "available"> = {
      id: "hn-hiring",
      label: "HN Who is Hiring",
      source: "Hacker News",
    };

    if (!context.company.trim()) {
      return { ...base, level: "neutral", points: 0, description: "No company name available", available: false };
    }

    try {
      const threadIds = await findHiringThreadIds();

      if (threadIds.length === 0) {
        return { ...base, level: "neutral", points: 0, description: "Could not find recent hiring threads", available: false };
      }

      const storyFilter = threadIds.map((id) => `story_${id}`).join(",");
      const searchUrl = new URL("https://hn.algolia.com/api/v1/search");
      searchUrl.searchParams.set("query", `"${context.company}"`);
      searchUrl.searchParams.set("tags", `comment,(${storyFilter})`);
      searchUrl.searchParams.set("hitsPerPage", "20");

      const response = await fetch(searchUrl.toString());
      if (!response.ok) {
        return { ...base, level: "neutral", points: 0, description: "Could not check hiring activity", available: false };
      }

      const data: HnSearchResponse = await response.json();
      const companyPosts = data.hits.filter((h) => isCompanyPost(h, context.company, threadIds));

      if (companyPosts.length > 0) {
        const threadSet = new Set(companyPosts.map((h) => h.story_id ?? h.objectID));
        const threadCount = threadSet.size;
        const threadWord = threadCount === 1 ? "thread" : "threads";
        const posts = companyPosts.map((h) => ({
          id: h.objectID,
          headline: (h.comment_text?.split(/<p>/i)[0]?.replace(/<[^>]*>/g, "") ?? "").trim(),
          ts: h.created_at_i ?? 0,
        }));
        const hitUrl = posts.length === 1
          ? `https://news.ycombinator.com/item?id=${posts[0].id}`
          : chrome.runtime.getURL(`src/hn-results/index.html?company=${encodeURIComponent(context.company)}#${encodeURIComponent(JSON.stringify(posts))}`);
        return {
          ...base,
          level: "green",
          points: -5,
          description: `Company posted in ${threadCount} recent "Who is Hiring?" ${threadWord}`,
          available: true,
          url: hitUrl,
        };
      }

      return {
        ...base,
        level: "neutral",
        points: 0,
        description: "Not found in recent \"Who is Hiring?\" threads on Hacker News",
        available: false,
      };
    } catch {
      return { ...base, level: "neutral", points: 0, description: "Could not check hiring activity", available: false };
    }
  },
};
