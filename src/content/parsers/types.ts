import type { JobPosting, JobCardData } from "@/types";

export interface SiteParser {
  canParse(url: URL): boolean;
  parseJobPosting(document: Document, url: URL): JobPosting | null;
  parseJobCards(document: Document): JobCardData[];
  getPostingElement(document: Document): Element | null;
}
