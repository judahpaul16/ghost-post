import type { DataSource, DataSourceContext } from "./types";
import type { Signal } from "@/types";
import { getSettings } from "@/storage/settings";

interface AirtableRecord {
  fields: {
    Company?: string;
    Date?: string;
    "# Laid Off"?: number;
    Industry?: string;
  };
}

interface AirtableResponse {
  records: AirtableRecord[];
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const airtableLayoffsSource: DataSource = {
  id: "airtable-layoffs",
  requiresApiKey: true,

  async check(context: DataSourceContext): Promise<Signal> {
    const base: Omit<Signal, "level" | "points" | "description" | "available"> = {
      id: "layoffs",
      label: "Layoff History",
      source: "layoffs.fyi",
    };

    const settings = await getSettings();
    if (!settings.airtableApiKey || !settings.airtableBaseId) {
      return {
        ...base,
        level: "neutral",
        points: 0,
        description: "Add an Airtable API key in Settings to check for recent layoffs",
        available: false,
      };
    }

    try {
      const url = new URL(
        `https://api.airtable.com/v0/${settings.airtableBaseId}/Layoffs`
      );
      url.searchParams.set(
        "filterByFormula",
        `SEARCH(LOWER("${context.company}"), LOWER({Company}))`
      );
      url.searchParams.set("maxRecords", "5");
      url.searchParams.set("sort[0][field]", "Date");
      url.searchParams.set("sort[0][direction]", "desc");

      const response = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${settings.airtableApiKey}` },
      });

      if (response.status === 429) {
        return { ...base, level: "neutral", points: 0, description: "API rate limit reached — try again later", available: false };
      }

      if (!response.ok) {
        return { ...base, level: "neutral", points: 0, description: "Could not check layoff records", available: false };
      }

      const data: AirtableResponse = await response.json();

      const layoffsUrl = "https://layoffs.fyi/";

      if (data.records.length === 0) {
        return {
          ...base,
          level: "green",
          points: 0,
          description: "No reported layoffs at this company",
          available: true,
          url: layoffsUrl,
        };
      }

      const mostRecent = data.records[0];
      const layoffDate = mostRecent.fields.Date
        ? new Date(mostRecent.fields.Date)
        : null;
      const isRecent =
        layoffDate && Date.now() - layoffDate.getTime() < NINETY_DAYS_MS;
      const count = mostRecent.fields["# Laid Off"];

      if (isRecent) {
        const countStr = count ? ` — ${count.toLocaleString()} people affected` : "";
        return {
          ...base,
          level: "red",
          points: 25,
          description: `Recent layoffs on ${layoffDate!.toLocaleDateString()}${countStr}`,
          available: true,
          url: layoffsUrl,
        };
      }

      return {
        ...base,
        level: "yellow",
        points: 5,
        description: `Company had layoffs (${layoffDate?.toLocaleDateString() ?? "date unknown"}) — may still be in hiring freeze`,
        available: true,
        url: layoffsUrl,
      };
    } catch {
      return { ...base, level: "neutral", points: 0, description: "Could not check layoff records", available: false };
    }
  },
};
