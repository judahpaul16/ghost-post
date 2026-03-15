import type { SiteParser } from "./types";
import type { JobPosting, JobCardData } from "@/types";
import { extractJsonLd, extractCompanyFromJsonLd } from "./generic";

function companyFromPath(url: URL): string | undefined {
  const slug = url.pathname.split("/")[1];
  if (!slug) return undefined;
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export const greenhouseParser: SiteParser = {
  canParse(url: URL): boolean {
    return url.hostname.endsWith(".greenhouse.io");
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
      ".company-name, [data-mapped='true'] .company-name"
    );
    const titleEl = doc.querySelector(
      ".app-title, .job-title, h1.heading, h1"
    );

    const company = companyEl?.textContent?.trim() || companyFromPath(url);
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
    return doc.querySelector("#app_body, #main, .job-post, .job__description");
  },

  parseJobCards(doc: Document): JobCardData[] {
    const cards: JobCardData[] = [];
    const cardEls = doc.querySelectorAll(
      ".opening, .job-post, [data-mapped='true'] .opening"
    );

    const companyEl = doc.querySelector(".company-name");
    const companyName = companyEl?.textContent?.trim() ?? "";
    if (!companyName) return cards;

    for (const el of cardEls) {
      const linkEl = el.querySelector("a[href]");
      const url = linkEl?.getAttribute("href");
      if (!url) continue;

      cards.push({
        company: companyName,
        url: url.startsWith("http")
          ? url
          : `https://${doc.location?.hostname ?? "boards.greenhouse.io"}${url}`,
        element: el,
      });
    }
    return cards;
  },
};
