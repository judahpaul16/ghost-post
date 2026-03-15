import type { SiteParser } from "./types";
import type { JobPosting, JobCardData } from "@/types";
import { extractJsonLd, extractCompanyFromJsonLd } from "./generic";

export const leverParser: SiteParser = {
  canParse(url: URL): boolean {
    return url.hostname.endsWith(".lever.co");
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

    const titleEl = doc.querySelector(".posting-headline h2");
    const companySegment = url.pathname.split("/")[1];
    const company = companySegment
      ? companySegment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : null;
    const title = titleEl?.textContent?.trim();
    if (!company || !title) return null;

    return {
      company,
      title,
      url: url.href,
      hasStructuredData: false,
    };
  },

  getPostingElement(doc: Document): Element | null {
    return doc.querySelector(".posting-page, .content, .posting-header");
  },

  parseJobCards(doc: Document): JobCardData[] {
    const cards: JobCardData[] = [];
    const cardEls = doc.querySelectorAll(".posting");
    const companySegment = window.location.pathname.split("/")[1];
    const companyName = companySegment
      ? companySegment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "";

    for (const el of cardEls) {
      const linkEl = el.querySelector("a.posting-title");
      const url = linkEl?.getAttribute("href");
      if (!url) continue;

      cards.push({
        company: companyName,
        url,
        element: el,
      });
    }
    return cards;
  },
};
