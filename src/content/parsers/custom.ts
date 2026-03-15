import type { SiteParser } from "./types";
import type { JobPosting, JobCardData, CustomPageConfig } from "@/types";
import { extractJsonLd, extractCompanyFromJsonLd } from "./generic";

function matchesPattern(url: URL, pattern: string): boolean {
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*") +
      "$"
  );
  return regex.test(url.hostname + url.pathname);
}

export function createCustomParser(config: CustomPageConfig): SiteParser {
  return {
    canParse(url: URL): boolean {
      return matchesPattern(url, config.urlPattern);
    },

    parseJobPosting(doc: Document, url: URL): JobPosting | null {
      const { selectors } = config;

      let company = doc.querySelector(selectors.company)?.textContent?.trim() ?? null;
      let title = doc.querySelector(selectors.title)?.textContent?.trim() ?? null;
      let datePosted: string | undefined;
      let hasStructuredData = false;

      const jsonLd = extractJsonLd(doc);
      if (jsonLd) {
        hasStructuredData = true;
        company ??= extractCompanyFromJsonLd(jsonLd);
        title ??= typeof jsonLd.title === "string" ? jsonLd.title : null;
        if (typeof jsonLd.datePosted === "string") datePosted = jsonLd.datePosted;
      }

      if (selectors.datePosted) {
        const el = doc.querySelector(selectors.datePosted);
        if (el) {
          const dt = el.getAttribute("datetime") ?? el.textContent?.trim();
          if (dt) datePosted = dt;
        }
      }

      if (!company || !title) return null;

      return {
        company,
        title,
        url: url.href,
        datePosted,
        hasStructuredData,
      };
    },

    getPostingElement(doc: Document): Element | null {
      if (config.selectors.postingContainer) {
        return doc.querySelector(config.selectors.postingContainer);
      }
      return doc.querySelector("main, article, [role='main'], #content");
    },

    parseJobCards(doc: Document): JobCardData[] {
      const { selectors } = config;
      if (!selectors.jobCard) return [];

      const cards = doc.querySelectorAll(selectors.jobCard);
      const results: JobCardData[] = [];

      for (const card of cards) {
        const company = selectors.cardCompany
          ? card.querySelector(selectors.cardCompany)?.textContent?.trim()
          : null;
        if (!company) continue;

        let cardUrl: string | undefined;
        if (selectors.cardUrl) {
          const link = card.querySelector(selectors.cardUrl) as HTMLAnchorElement | null;
          cardUrl = link?.href;
        }
        if (!cardUrl) {
          const link = card.querySelector("a[href]") as HTMLAnchorElement | null;
          cardUrl = link?.href;
        }
        if (!cardUrl) continue;

        let datePosted: string | undefined;
        if (selectors.cardDate) {
          const dateEl = card.querySelector(selectors.cardDate);
          datePosted = dateEl?.getAttribute("datetime") ?? dateEl?.textContent?.trim();
        }

        results.push({ company, url: cardUrl, datePosted, element: card });
      }

      return results;
    },
  };
}
