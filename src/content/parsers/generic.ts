import type { SiteParser } from "./types";
import type { JobPosting, JobCardData } from "@/types";

function extractJsonLd(doc: Document): Record<string, unknown> | null {
  const scripts = doc.querySelectorAll(
    'script[type="application/ld+json"]'
  );
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? "");
      if (data["@type"] === "JobPosting") return data;
      if (Array.isArray(data)) {
        const job = data.find(
          (item: Record<string, unknown>) => item["@type"] === "JobPosting"
        );
        if (job) return job;
      }
      if (data["@graph"]) {
        const job = (data["@graph"] as Record<string, unknown>[]).find(
          (item) => item["@type"] === "JobPosting"
        );
        if (job) return job;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function extractCompanyFromJsonLd(
  data: Record<string, unknown>
): string | null {
  const org = data.hiringOrganization as Record<string, unknown> | undefined;
  if (org && typeof org.name === "string") return org.name;
  return null;
}

function extractTitleFromDom(doc: Document): string | null {
  const h1 = doc.querySelector("h1");
  const text = h1?.textContent?.trim();
  if (text && text.length > 3 && text.length < 200) return text;
  return null;
}

function extractCompanyFromDom(doc: Document, url: URL): string | null {
  const ogSiteName = doc.querySelector("meta[property='og:site_name']")?.getAttribute("content")?.trim();
  if (ogSiteName) return ogSiteName;

  const metaAuthor = doc.querySelector("meta[name='author']")?.getAttribute("content")?.trim();
  if (metaAuthor) return metaAuthor;

  const subdomain = url.hostname.split(".").slice(-2, -1)[0];
  if (subdomain && subdomain !== "www" && subdomain !== "com") {
    return subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
  }

  return null;
}

function extractDateFromDom(doc: Document): string | undefined {
  const timeEl = doc.querySelector("time[datetime]");
  if (timeEl) return timeEl.getAttribute("datetime") ?? undefined;

  const labels = doc.querySelectorAll("dt, label, span, div, th");
  for (const label of labels) {
    const text = label.textContent?.trim().toLowerCase() ?? "";
    if (text === "date posted" || text === "posted" || text === "posted on" || text === "post date") {
      const sibling =
        label.nextElementSibling ??
        (label.parentElement?.nextElementSibling);
      const dateText = sibling?.textContent?.trim();
      if (dateText && dateText.length < 50) return dateText;
    }
  }

  return undefined;
}

const APPLY_PATTERNS = /\bapply\b/i;
const JOB_FIELD_PATTERNS = /\b(salary|compensation|qualifications|requirements|responsibilities|experience|benefits|department|employment type|job type|location|remote|hybrid|on-site)\b/i;

function hasJobPostingSignals(doc: Document): boolean {
  const links = doc.querySelectorAll("a, button");
  for (const el of links) {
    const text = el.textContent?.trim() ?? "";
    if (text.length < 50 && APPLY_PATTERNS.test(text)) return true;
  }

  if (extractDateFromDom(doc)) return true;

  const bodyText = doc.body?.innerText ?? "";
  const fieldMatches = bodyText.match(new RegExp(JOB_FIELD_PATTERNS.source, "gi"));
  if (fieldMatches && fieldMatches.length >= 3) return true;

  return false;
}

export const genericParser: SiteParser = {
  canParse: () => true,

  parseJobPosting(doc: Document, url: URL): JobPosting | null {
    const jsonLd = extractJsonLd(doc);
    if (jsonLd) {
      const company = extractCompanyFromJsonLd(jsonLd);
      const title =
        typeof jsonLd.title === "string" ? jsonLd.title : null;

      if (company && title) {
        return {
          company,
          title,
          url: url.href,
          datePosted:
            typeof jsonLd.datePosted === "string"
              ? jsonLd.datePosted
              : undefined,
          validThrough:
            typeof jsonLd.validThrough === "string"
              ? jsonLd.validThrough
              : undefined,
          hasStructuredData: true,
        };
      }
    }

    if (!hasJobPostingSignals(doc)) return null;

    const title = extractTitleFromDom(doc);
    const company = extractCompanyFromDom(doc, url);
    if (!title || !company) return null;

    return {
      company,
      title,
      url: url.href,
      datePosted: extractDateFromDom(doc),
      hasStructuredData: false,
    };
  },

  getPostingElement(doc: Document): Element | null {
    return doc.querySelector("main, article, [role='main'], #content");
  },

  parseJobCards(): JobCardData[] {
    return [];
  },
};

export { extractJsonLd, extractCompanyFromJsonLd };
