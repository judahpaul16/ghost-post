import type { DataSource, DataSourceContext } from "./types";
import type { Signal } from "@/types";

interface MuseResponse {
  total: number;
  results: Array<{ company: { name: string } }>;
}

export const theMuseSource: DataSource = {
  id: "the-muse",
  requiresApiKey: false,

  async check(context: DataSourceContext): Promise<Signal> {
    const base: Omit<Signal, "level" | "points" | "description" | "available"> = {
      id: "the-muse",
      label: "The Muse",
      source: "The Muse",
    };

    if (!context.company.trim()) {
      return { ...base, level: "neutral", points: 0, description: "No company name available", available: false };
    }

    try {
      const url = new URL("https://www.themuse.com/api/public/jobs");
      url.searchParams.set("company", context.company);
      url.searchParams.set("page", "1");

      const response = await fetch(url.toString());

      if (!response.ok) {
        return { ...base, level: "neutral", points: 0, description: "Could not check The Muse", available: false };
      }

      const data: MuseResponse = await response.json();

      if (data.total > 0) {
        const slug = context.company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
        const museUrl = `https://www.themuse.com/search/keyword/${slug}`;
        return {
          ...base,
          level: "green",
          points: -5,
          description: `${data.total} active listing${data.total === 1 ? "" : "s"} on The Muse — company actively promotes openings here`,
          available: true,
          url: museUrl,
        };
      }

      return { ...base, level: "neutral", points: 0, description: "Company is not a Muse partner", available: false };
    } catch {
      return { ...base, level: "neutral", points: 0, description: "Could not check The Muse", available: false };
    }
  },
};
