import type { SiteParser } from "./types";
import type { JobPosting, JobCardData } from "@/types";
import { extractJsonLd, extractCompanyFromJsonLd } from "./generic";

export const oracleParser: SiteParser = {
  canParse(url: URL): boolean {
    return (
      url.hostname.endsWith(".oraclecloud.com") &&
      url.pathname.includes("/hcmUI/CandidateExperience")
    );
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

    const titleEl =
      doc.querySelector("h1.job-title") ??
      doc.querySelector("h1[class*='job']") ??
      doc.querySelector("h1");

    const companyEl =
      doc.querySelector("[class*='company-name']") ??
      doc.querySelector("[class*='employer']") ??
      doc.querySelector("img[alt][class*='logo']");

    const company =
      companyEl?.tagName === "IMG"
        ? (companyEl as HTMLImageElement).alt?.trim()
        : companyEl?.textContent?.trim();

    const title = titleEl?.textContent?.trim();
    if (!company || !title) {
      if (title) {
        const metaCompany =
          doc.querySelector("meta[property='og:site_name']")?.getAttribute("content") ??
          doc.querySelector("meta[name='author']")?.getAttribute("content");
        if (metaCompany) {
          return {
            company: metaCompany,
            title,
            url: url.href,
            hasStructuredData: false,
          };
        }
      }
      return null;
    }

    return {
      company,
      title,
      url: url.href,
      hasStructuredData: false,
    };
  },

  getPostingElement(doc: Document): Element | null {
    return (
      doc.querySelector("[class*='job-detail']") ??
      doc.querySelector("[class*='job-description']") ??
      doc.querySelector("main") ??
      doc.querySelector("[role='main']")
    );
  },

  parseJobCards(doc: Document): JobCardData[] {
    const cards: JobCardData[] = [];
    const cardEls = doc.querySelectorAll(
      "[class*='job-list-item'], [class*='search-result'] a[href*='/job/']"
    );

    for (const el of cardEls) {
      const linkEl =
        el.tagName === "A" ? el : el.querySelector("a[href*='/job/']");
      const href = linkEl?.getAttribute("href");
      if (!href) continue;

      const companyEl = el.querySelector("[class*='company'], [class*='employer']");

      cards.push({
        company: companyEl?.textContent?.trim() ?? "",
        url: href.startsWith("http")
          ? href
          : `https://${window.location.hostname}${href}`,
        element: el,
      });
    }
    return cards;
  },
};
