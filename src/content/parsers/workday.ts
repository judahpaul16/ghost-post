import type { SiteParser } from "./types";
import type { JobPosting, JobCardData } from "@/types";
import { extractJsonLd, extractCompanyFromJsonLd } from "./generic";

export const workdayParser: SiteParser = {
  canParse(url: URL): boolean {
    return url.hostname.endsWith(".myworkdayjobs.com");
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

    const titleEl = doc.querySelector(
      "[data-automation-id='jobPostingHeader'], h2[data-automation-id='headerTitle']"
    );
    const companySubdomain = url.hostname.split(".")[0];
    const company = companySubdomain
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const title = titleEl?.textContent?.trim();
    if (!title) return null;

    const dateEl = doc.querySelector(
      "[data-automation-id='postedOn'], .css-cygeeu"
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
      "[data-automation-id='jobPostingPage'], " +
      "[data-automation-id='jobPostingHeader'], " +
      ".css-1q2dra3"
    );
  },

  parseJobCards(doc: Document): JobCardData[] {
    const cards: JobCardData[] = [];
    const cardEls = doc.querySelectorAll(
      "[data-automation-id='jobResults'] > ul > li, .css-1q2dra3"
    );
    const companySubdomain = window.location.hostname.split(".")[0];
    const companyName = companySubdomain
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    for (const el of cardEls) {
      const linkEl = el.querySelector("a[href*='/job/']");
      const url = linkEl?.getAttribute("href");
      if (!url) continue;

      const dateEl = el.querySelector(
        "[data-automation-id='postedOn'], dd.css-129m7dg"
      );

      cards.push({
        company: companyName,
        url: url.startsWith("http")
          ? url
          : `https://${window.location.hostname}${url}`,
        datePosted: dateEl?.textContent?.trim(),
        element: el,
      });
    }
    return cards;
  },
};
