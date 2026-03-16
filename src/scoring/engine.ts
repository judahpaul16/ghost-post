import type { Signal, GhostScore, ScoreRange, JobPosting } from "@/types";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

function parseRelativeDate(text: string): Date | null {
  const now = Date.now();
  const lower = text.toLowerCase().trim();

  const match = lower.match(/(\d+)\s*(day|week|month|hour|minute)s?\s*ago/);
  if (match) {
    const num = parseInt(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
    };
    return new Date(now - num * (multipliers[unit] ?? 0));
  }

  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function computeDateSignals(posting: JobPosting): Signal[] {
  const signals: Signal[] = [];

  if (posting.datePosted) {
    const postDate = parseRelativeDate(posting.datePosted);
    if (postDate) {
      const age = Date.now() - postDate.getTime();
      const days = Math.floor(age / (24 * 60 * 60 * 1000));
      if (age > SIXTY_DAYS_MS) {
        signals.push({
          id: "post-age",
          label: "Stale Posting",
          description: `Listed ${days} days ago — most real openings are filled within 30–60 days`,
          level: "red",
          points: 25,
          source: "Page Data",
          available: true,
        });
      } else if (age > THIRTY_DAYS_MS) {
        signals.push({
          id: "post-age",
          label: "Aging Posting",
          description: `Listed ${days} days ago — getting old for an active opening`,
          level: "yellow",
          points: 15,
          source: "Page Data",
          available: true,
        });
      } else if (age <= FOURTEEN_DAYS_MS) {
        signals.push({
          id: "post-age",
          label: "Fresh Posting",
          description: `Listed ${days} days ago`,
          level: "green",
          points: -5,
          source: "Page Data",
          available: true,
        });
      } else {
        signals.push({
          id: "post-age",
          label: "Recently Posted",
          description: `Listed ${days} days ago`,
          level: "green",
          points: 0,
          source: "Page Data",
          available: true,
        });
      }
    }
  }

  if (!posting.validThrough) {
    signals.push({
      id: "no-expiry",
      label: "No Closing Date",
      description: "No application deadline listed — real openings usually have one",
      level: "yellow",
      points: 10,
      source: "Page Data",
      available: true,
    });
  }

  if (!posting.hasStructuredData) {
    signals.push({
      id: "no-structured-data",
      label: "Missing Job Metadata",
      description: "Page lacks standard job posting data that search engines use to verify real listings",
      level: "yellow",
      points: 5,
      source: "Page Data",
      available: true,
    });
  }

  return signals;
}

function scoreRange(score: number): ScoreRange {
  if (score <= 25) return "green";
  if (score <= 50) return "yellow";
  return "red";
}

function deduplicateSignals(signals: Signal[]): Signal[] {
  const seen = new Map<string, Signal>();
  for (const signal of signals) {
    seen.set(signal.id, signal);
  }
  return Array.from(seen.values());
}

const AGE_SIGNAL_IDS = new Set(["post-age", "wayback-age"]);

function adjustAgeDoubleCount(signals: Signal[]): Signal[] {
  const ageSignals = signals.filter((s) => AGE_SIGNAL_IDS.has(s.id) && s.points > 0);
  if (ageSignals.length < 2) return signals;

  const maxPoints = Math.max(...ageSignals.map((s) => s.points));
  return signals.map((s) => {
    if (AGE_SIGNAL_IDS.has(s.id) && s.points > 0 && s.points < maxPoints) {
      return { ...s, points: 0 };
    }
    return s;
  });
}

export function computeScore(
  posting: JobPosting,
  dataSourceSignals: Signal[]
): GhostScore {
  const dateSignals = computeDateSignals(posting);
  const deduped = deduplicateSignals([...dateSignals, ...dataSourceSignals]);
  const allSignals = adjustAgeDoubleCount(deduped);
  const score = Math.max(
    0,
    Math.min(100, allSignals.reduce((sum, s) => sum + s.points, 0))
  );

  return {
    score,
    range: scoreRange(score),
    signals: allSignals,
  };
}

export function computeBatchScore(
  company: string,
  datePosted: string | undefined,
  dataSourceSignals: Signal[]
): GhostScore {
  const posting: JobPosting = {
    company,
    title: "",
    url: "",
    datePosted,
    hasStructuredData: true,
  };
  return computeScore(posting, dataSourceSignals);
}
