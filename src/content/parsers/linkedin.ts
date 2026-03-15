import type { SiteParser } from "./types";
import type { JobPosting, JobCardData } from "@/types";
import { extractJsonLd, extractCompanyFromJsonLd } from "./generic";

export const linkedinParser: SiteParser = {
  canParse(url: URL): boolean {
    return url.hostname === "www.linkedin.com" && url.pathname.startsWith("/jobs");
  },

  parseJobPosting(doc: Document, url: URL): JobPosting | null {
    const jsonLd = extractJsonLd(doc);
    if (jsonLd) {
      const company = extractCompanyFromJsonLd(jsonLd);
      if (company) {
        return {
          company,
          title: (jsonLd.title as string) ?? "",
          url: url.href,
          datePosted: jsonLd.datePosted as string | undefined,
          validThrough: jsonLd.validThrough as string | undefined,
          hasStructuredData: true,
        };
      }
    }

    const companyEl = doc.querySelector(
      ".job-details-jobs-unified-top-card__company-name a, " +
      ".topcard__org-name-link, " +
      ".jobs-unified-top-card__company-name a"
    );
    const titleEl = doc.querySelector(
      ".job-details-jobs-unified-top-card__job-title h1, " +
      ".topcard__title, " +
      ".jobs-unified-top-card__job-title"
    );

    const company = companyEl?.textContent?.trim();
    const title = titleEl?.textContent?.trim();
    if (!company || !title) return null;

    const timeEl = doc.querySelector(
      ".jobs-unified-top-card__posted-date, " +
      ".posted-time-ago__text"
    );

    return {
      company,
      title,
      url: url.href,
      datePosted: timeEl?.textContent?.trim(),
      hasStructuredData: false,
    };
  },

  getPostingElement(doc: Document): Element | null {
    return doc.querySelector(
      ".jobs-search__job-details, " +
      ".job-view-layout, " +
      ".jobs-details, " +
      ".jobs-unified-top-card"
    );
  },

  parseJobCards(doc: Document): JobCardData[] {
    const cards: JobCardData[] = [];
    const cardEls = doc.querySelectorAll(
      ".jobs-search-results__list-item, " +
      ".job-card-container, " +
      ".jobs-search-results-list__list-item"
    );

    for (const el of cardEls) {
      const companyEl = el.querySelector(
        ".job-card-container__primary-description, " +
        ".artdeco-entity-lockup__subtitle, " +
        ".job-card-container__company-name"
      );
      const linkEl = el.querySelector("a[href*='/jobs/view/']");
      const timeEl = el.querySelector(
        ".job-card-container__listed-time, time"
      );

      const company = companyEl?.textContent?.trim();
      const url = linkEl?.getAttribute("href");
      if (!company || !url) continue;

      cards.push({
        company,
        url: url.startsWith("http") ? url : `https://www.linkedin.com${url}`,
        datePosted: timeEl?.getAttribute("datetime") ?? timeEl?.textContent?.trim(),
        element: el,
      });
    }
    return cards;
  },
};
