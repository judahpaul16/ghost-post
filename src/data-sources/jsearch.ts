import type { DataSource, DataSourceContext } from "./types";
import type { Signal } from "@/types";
import { getSettings } from "@/storage/settings";

interface JSearchJob {
  employer_name?: string;
  job_title?: string;
  job_apply_link?: string;
  job_posted_at_datetime_utc?: string;
}

interface JSearchResponse {
  status: string;
  data: JSearchJob[];
}

export const jsearchSource: DataSource = {
  id: "jsearch",
  requiresApiKey: true,
  scope: "job",

  async check(context: DataSourceContext): Promise<Signal> {
    const base: Omit<Signal, "level" | "points" | "description" | "available"> = {
      id: "jsearch",
      label: "Job Listings",
      source: "Google Jobs",
    };

    const settings = await getSettings();
    if (!settings.jsearchApiKey) {
      return {
        ...base,
        level: "neutral",
        points: 0,
        description: "Add a JSearch API key in Settings to cross-reference job listings",
        available: false,
      };
    }

    if (!context.company.trim()) {
      return { ...base, level: "neutral", points: 0, description: "No company name available", available: false };
    }

    try {
      const url = new URL("https://jsearch.p.rapidapi.com/search");
      url.searchParams.set("query", `${context.company} jobs`);
      url.searchParams.set("num_pages", "1");

      const response = await fetch(url.toString(), {
        headers: {
          "X-RapidAPI-Key": settings.jsearchApiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });

      if (response.status === 429) {
        return { ...base, level: "neutral", points: 0, description: "API rate limit reached — try again later", available: false };
      }

      if (response.status === 403 || response.status === 401) {
        return { ...base, level: "neutral", points: 0, description: "Invalid JSearch API key", available: false };
      }

      if (!response.ok) {
        return { ...base, level: "neutral", points: 0, description: "Could not check job listings", available: false };
      }

      const data: JSearchResponse = await response.json();
      const companyLower = context.company.toLowerCase();
      const matches = data.data?.filter(
        (job) => job.employer_name?.toLowerCase().includes(companyLower)
      ) ?? [];

      if (matches.length > 0) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(context.company + " jobs")}&ibp=htl;jobs`;
        return {
          ...base,
          level: "green",
          points: -5,
          description: `Found ${matches.length} active listing${matches.length === 1 ? "" : "s"} across job platforms`,
          available: true,
          url: searchUrl,
        };
      }

      return {
        ...base,
        level: "yellow",
        points: 10,
        description: "No active listings found for this company on major job platforms",
        available: true,
      };
    } catch {
      return { ...base, level: "neutral", points: 0, description: "Could not check job listings", available: false };
    }
  },
};
