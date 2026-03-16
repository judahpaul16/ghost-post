import type { DataSource, DataSourceContext } from "./types";
import type { Signal } from "@/types";

const ATS_SUFFIXES = [
  ".greenhouse.io",
  ".lever.co",
  ".ashbyhq.com",
  ".myworkdayjobs.com",
  ".oraclecloud.com",
] as const;

const ATS_PROBE_URLS: { label: string; urls: (slug: string) => string[] }[] = [
  {
    label: "greenhouse.io",
    urls: (slug) => [
      `https://boards.greenhouse.io/${slug}`,
      `https://jobs.greenhouse.io/${slug}`,
    ],
  },
  {
    label: "lever.co",
    urls: (slug) => [`https://jobs.lever.co/${slug}`],
  },
  {
    label: "ashbyhq.com",
    urls: (slug) => [`https://jobs.ashbyhq.com/${slug}`],
  },
];

const AGGREGATOR_HOSTS = new Set([
  "www.linkedin.com",
  "www.indeed.com",
  "www.glassdoor.com",
  "www.ziprecruiter.com",
  "www.monster.com",
]);

function isAggregatorUrl(url: string): boolean {
  try {
    return AGGREGATOR_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function isCompanyCareersUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split(".");
    return parts[0] === "careers" || parts[0] === "jobs";
  } catch {
    return false;
  }
}

function isAtsUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return ATS_SUFFIXES.some((s) => hostname.endsWith(s));
  } catch {
    return false;
  }
}

async function checkAtsPresence(
  probe: (typeof ATS_PROBE_URLS)[number],
  company: string
): Promise<string | null> {
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");

  for (const url of probe.urls(slug)) {
    try {
      const response = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (response.ok) return url;
    } catch {
      continue;
    }
  }
  return null;
}

export const atsVerifySource: DataSource = {
  id: "ats-verify",
  requiresApiKey: false,
  scope: "company",

  async check(context: DataSourceContext): Promise<Signal> {
    const base: Omit<Signal, "level" | "points" | "description" | "available"> = {
      id: "ats-verify",
      label: "Careers Page Check",
      source: "Direct Check",
    };

    if (isAtsUrl(context.url) || isCompanyCareersUrl(context.url)) {
      return {
        ...base,
        level: "green",
        points: -5,
        description: "Posted directly on the company's own careers page",
        available: true,
        url: context.url,
      };
    }

    if (!isAggregatorUrl(context.url)) {
      return {
        ...base,
        level: "neutral",
        points: 0,
        description: "Only checked on job aggregator sites like LinkedIn and Indeed",
        available: false,
      };
    }

    const results = await Promise.allSettled(
      ATS_PROBE_URLS.map((probe) => checkAtsPresence(probe, context.company))
    );

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled" && r.value) {
        return {
          ...base,
          level: "green",
          points: -5,
          description: `Verified — company has an active careers page on ${ATS_PROBE_URLS[i].label}`,
          available: true,
          url: r.value,
        };
      }
    }

    return {
      ...base,
      level: "red",
      points: 20,
      description: "Company has no careers page on Greenhouse, Lever, or Ashby — harder to verify this listing is real",
      available: true,
    };
  },
};
