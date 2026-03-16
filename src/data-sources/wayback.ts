import type { DataSource, DataSourceContext } from "./types";
import type { Signal } from "@/types";

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

export const waybackSource: DataSource = {
  id: "wayback",
  requiresApiKey: false,
  scope: "job",

  async check(context: DataSourceContext): Promise<Signal> {
    const base: Omit<Signal, "level" | "points" | "description" | "available"> = {
      id: "wayback-age",
      label: "Web Archive History",
      source: "Wayback Machine",
    };

    try {
      const cdxUrl = new URL("https://web.archive.org/cdx/search/cdx");
      cdxUrl.searchParams.set("url", context.url);
      cdxUrl.searchParams.set("output", "json");
      cdxUrl.searchParams.set("limit", "1");
      cdxUrl.searchParams.set("fl", "timestamp");
      cdxUrl.searchParams.set("filter", "statuscode:200");

      const response = await fetch(cdxUrl.toString());
      if (!response.ok) {
        return { ...base, level: "neutral", points: 0, description: "Could not check web archive", available: false };
      }

      const data: string[][] = await response.json();
      if (data.length < 2) {
        return { ...base, level: "neutral", points: 0, description: "No archived copies of this URL found", available: true };
      }

      const timestamp = data[1][0];
      const year = parseInt(timestamp.slice(0, 4));
      const month = parseInt(timestamp.slice(4, 6)) - 1;
      const day = parseInt(timestamp.slice(6, 8));
      const firstSeen = new Date(year, month, day);
      const age = Date.now() - firstSeen.getTime();

      const archiveUrl = `https://web.archive.org/web/*/${context.url}`;

      if (age > SIXTY_DAYS_MS) {
        const days = Math.floor(age / (24 * 60 * 60 * 1000));
        return {
          ...base,
          level: "red",
          points: 15,
          description: `This URL has been online for ${days} days — likely not a fresh opening`,
          available: true,
          url: archiveUrl,
        };
      }

      const days = Math.floor(age / (24 * 60 * 60 * 1000));
      return {
        ...base,
        level: "green",
        points: 0,
        description: `URL is ${days} days old — consistent with a recent posting`,
        available: true,
        url: archiveUrl,
      };
    } catch {
      return { ...base, level: "neutral", points: 0, description: "Could not check web archive", available: false };
    }
  },
};
