import type { DataSource, DataSourceContext } from "./types";
import type { Signal } from "@/types";
import { getSettings } from "@/storage/settings";

interface PdlCompanyResponse {
  status: number;
  employee_count?: number;
  employee_count_by_country?: Record<string, number>;
  founded?: number;
  total_funding_raised?: number;
  latest_funding_stage?: string;
  likelihood?: number;
}

const ATS_DOMAINS = new Set([
  "greenhouse.io", "lever.co", "ashbyhq.com", "myworkdayjobs.com",
  "linkedin.com", "indeed.com", "oraclecloud.com", "themuse.com",
]);

function extractRootDomain(jobUrl: string): string | null {
  try {
    const hostname = new URL(jobUrl).hostname;
    const parts = hostname.split(".");
    if (parts.length < 2) return null;
    const root = parts.slice(-2).join(".");
    if (ATS_DOMAINS.has(root)) return null;
    return root;
  } catch {
    return null;
  }
}

export const pdlSource: DataSource = {
  id: "pdl",
  requiresApiKey: true,
  scope: "company",

  async check(context: DataSourceContext): Promise<Signal> {
    const base: Omit<Signal, "level" | "points" | "description" | "available"> = {
      id: "pdl-company",
      label: "Company Size",
      source: "People Data Labs",
    };

    const settings = await getSettings();
    if (!settings.pdlApiKey) {
      return {
        ...base,
        level: "neutral",
        points: 0,
        description: "Add a People Data Labs API key in Settings to check company data",
        available: false,
      };
    }

    try {
      const jobDomain = extractRootDomain(context.url);
      const url = new URL("https://api.peopledatalabs.com/v5/company/enrich");
      if (jobDomain) {
        url.searchParams.set("website", jobDomain);
      }
      url.searchParams.set("name", context.company);
      url.searchParams.set("min_likelihood", "4");

      const response = await fetch(url.toString(), {
        headers: { "X-Api-Key": settings.pdlApiKey },
      });

      if (response.status === 404) {
        return { ...base, level: "yellow", points: 5, description: "Company not found in business databases — may not be a real employer", available: true };
      }

      if (response.status === 429) {
        return { ...base, level: "neutral", points: 0, description: "API rate limit reached — try again later", available: false };
      }

      if (!response.ok) {
        return { ...base, level: "neutral", points: 0, description: "Could not look up company info", available: false };
      }

      const data: PdlCompanyResponse = await response.json();
      const employeeCount = data.employee_count;

      if (!employeeCount) {
        return { ...base, level: "neutral", points: 0, description: "Company size data not available", available: true };
      }

      if (employeeCount < 10) {
        return {
          ...base,
          level: "yellow",
          points: 10,
          description: `Very small company (${employeeCount} employees) — fewer resources to actually hire`,
          available: true,
        };
      }

      return {
        ...base,
        level: "green",
        points: 0,
        description: `Established company with ${employeeCount.toLocaleString()} employees`,
        available: true,
      };
    } catch {
      return { ...base, level: "neutral", points: 0, description: "Could not look up company info", available: false };
    }
  },
};
