import { ParserFactory } from "./parsers/factory";
import { BadgeInjector } from "./badge/injector";
import type { SiteParser } from "./parsers/types";
import type { ScoreJobMessage, GhostScore, CustomPageConfig } from "@/types";

if ((window as unknown as Record<string, boolean>).__ghostPostLoaded) {
  throw new Error("already loaded");
}
(window as unknown as Record<string, boolean>).__ghostPostLoaded = true;

const injector = new BadgeInjector();
const cardElements = new Map<string, Element>();

let parser: SiteParser;
let lastPostingUrl: string | null = null;
let foundPosting = false;
let observer: MutationObserver | null = null;

function contextValid(): boolean {
  return !!chrome.runtime?.id;
}

function normalizeJobUrl(url: string): string {
  try {
    const parsed = new URL(url, window.location.origin);

    const viewMatch = parsed.pathname.match(/\/jobs\/view\/(\d+)/);
    if (viewMatch) return `/jobs/view/${viewMatch[1]}`;

    const jobIdParam = parsed.searchParams.get("currentJobId");
    if (jobIdParam) return `/jobs/view/${jobIdParam}`;

    return parsed.pathname;
  } catch {
    return url;
  }
}

function sendMessage(message: unknown, callback?: (response: unknown) => void) {
  if (!contextValid()) {
    observer?.disconnect();
    return;
  }
  try {
    chrome.runtime.sendMessage(message as Parameters<typeof chrome.runtime.sendMessage>[0], (response) => {
      if (chrome.runtime.lastError) return;
      callback?.(response);
    });
  } catch {
    observer?.disconnect();
  }
}

function scoreAndBadgePosting() {
  if (!contextValid()) return;
  const currentUrl = new URL(window.location.href);
  const posting = parser.parseJobPosting(document, currentUrl);
  if (!posting) return;

  foundPosting = true;
  if (posting.url === lastPostingUrl) return;
  lastPostingUrl = posting.url;

  const postingEl = parser.getPostingElement(document);
  if (postingEl) {
    injector.injectLoading(postingEl);
  }

  const cardEl = cardElements.get(normalizeJobUrl(posting.url));
  if (cardEl) {
    injector.injectLoading(cardEl);
  }

  const message: ScoreJobMessage = {
    type: "SCORE_JOB",
    payload: posting,
  };
  sendMessage(message, (response) => {
    if ((response as Record<string, unknown>)?.type === "SCORE_JOB_RESULT") {
      const score = (response as Record<string, unknown>).payload as GhostScore;
      const el = parser.getPostingElement(document);
      if (el) {
        injector.inject(el, score);
      }
      const card = cardElements.get(normalizeJobUrl(posting.url));
      if (card) {
        injector.inject(card, score);
      }
    }
  });
}

function trackCards(cards: Array<import("@/types").JobCardData>) {
  for (const card of cards) {
    cardElements.set(normalizeJobUrl(card.url), card.element);
  }
}

function init(customPages: CustomPageConfig[]) {
  const url = new URL(window.location.href);
  parser = ParserFactory.create(url, customPages);

  const posting = parser.parseJobPosting(document, url);
  const cards = parser.parseJobCards(document);

  foundPosting = !!posting || cards.length > 0;

  if (!foundPosting) {
    setTimeout(() => {
      if (!foundPosting) {
        sendMessage({ type: "NO_POSTING" });
      }
    }, 8000);
  }

  if (cards.length > 0) {
    trackCards(cards);
  }

  if (posting) {
    lastPostingUrl = posting.url;
    const postingEl = parser.getPostingElement(document);
    if (postingEl) {
      injector.injectLoading(postingEl);
    }

    const cardEl = cardElements.get(normalizeJobUrl(posting.url));
    if (cardEl) {
      injector.injectLoading(cardEl);
    }

    const message: ScoreJobMessage = {
      type: "SCORE_JOB",
      payload: posting,
    };
    sendMessage(message, (response) => {
      if ((response as Record<string, unknown>)?.type === "SCORE_JOB_RESULT") {
        const score = (response as Record<string, unknown>).payload as GhostScore;
        const el = parser.getPostingElement(document);
        if (el) {
          injector.inject(el, score);
        }
        const card = cardElements.get(normalizeJobUrl(posting.url));
        if (card) {
          injector.inject(card, score);
        }
      }
    });
  }

  observer = new MutationObserver((mutations) => {
    if (!contextValid()) {
      observer?.disconnect();
      return;
    }

    let hasNewNodes = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        hasNewNodes = true;
        break;
      }
    }
    if (!hasNewNodes) return;

    scoreAndBadgePosting();

    const newCards = parser.parseJobCards(document);
    const untracked = newCards.filter(
      (card) => !cardElements.has(normalizeJobUrl(card.url))
    );

    if (untracked.length > 0) {
      trackCards(untracked);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (contextValid()) {
  chrome.storage.sync.get({ customPages: [] }, (result) => {
    if (!contextValid()) return;
    init(result.customPages as CustomPageConfig[]);
  });
}
