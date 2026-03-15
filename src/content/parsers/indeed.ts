import type { SiteParser } from "./types";
import type { JobPosting, JobCardData } from "@/types";
import { extractJsonLd, extractCompanyFromJsonLd } from "./generic";

export const indeedParser: SiteParser = {
  canParse(url: URL): boolean {
    return url.hostname === "www.indeed.com";
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
      "[data-testid='inlineHeader-companyName'] a, " +
      ".jobsearch-InlineCompanyRating-companyHeader a"
    );
    const titleEl = doc.querySelector(
      ".jobsearch-JobInfoHeader-title, " +
      "h1.jobsearch-JobInfoHeader-title span"
    );

    const company = companyEl?.textContent?.trim();
    const title = titleEl?.textContent?.trim();
    if (!company || !title) return null;

    const dateEl = doc.querySelector(
      ".jobsearch-HiringInsights-entry--bullet, " +
      "[data-testid='job-age']"
    );

    return {
      company,
      title,
      url: url.href,
      datePosted: dateEl?.textContent?.trim(),
      hasStructuredData: false,
    };
  },

  getPostingElement(doc: Document): Element | null {
    return doc.querySelector(
      ".jobsearch-ViewJobLayout, " +
      ".jobsearch-JobComponent, " +
      "#viewJobSSRRoot"
    );
  },

  parseJobCards(doc: Document): JobCardData[] {
    const cards: JobCardData[] = [];
    const cardEls = doc.querySelectorAll(
      ".job_seen_beacon, .jobsearch-ResultsList .result, .tapItem"
    );

    for (const el of cardEls) {
      const companyEl = el.querySelector(
        "[data-testid='company-name'], .companyName, .company"
      );
      const linkEl = el.querySelector("a[href*='/viewjob'], a.jcs-JobTitle");
      const dateEl = el.querySelector(
        ".date, [data-testid='myJobsStateDate'], .new"
      );

      const company = companyEl?.textContent?.trim();
      const url = linkEl?.getAttribute("href");
      if (!company || !url) continue;

      cards.push({
        company,
        url: url.startsWith("http") ? url : `https://www.indeed.com${url}`,
        datePosted: dateEl?.textContent?.trim(),
        element: el,
      });
    }
    return cards;
  },
};
