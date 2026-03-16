import { ParserFactory } from "./parsers/factory";
import { BadgeInjector } from "./badge/injector";
import type { SiteParser } from "./parsers/types";
import type { ScoreJobMessage, ScoreBatchMessage, GhostScore, CustomPageConfig } from "@/types";

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
      const cardEl = cardElements.get(posting.url);
      if (cardEl) {
        injector.inject(cardEl, score);
      }
    }
  });
}

function scoreCards(cards: Array<import("@/types").JobCardData>) {
  if (!contextValid()) return;
  for (const card of cards) {
    cardElements.set(card.url, card.element);
    injector.injectLoading(card.element);
  }

  const batchPayload = cards.map((card) => ({
    company: card.company,
    datePosted: card.datePosted,
    url: card.url,
  }));

  const message: ScoreBatchMessage = {
    type: "SCORE_BATCH",
    payload: batchPayload,
  };

  sendMessage(message, (response) => {
    if ((response as Record<string, unknown>)?.type === "SCORE_BATCH_RESULT") {
      for (const result of (response as Record<string, unknown>).payload as Array<{ url: string; score: GhostScore }>) {
        const el = cardElements.get(result.url);
        if (el) {
          injector.inject(el, result.score);
        }
      }
    }
  });
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

  if (posting) {
    lastPostingUrl = posting.url;
    const postingEl = parser.getPostingElement(document);
    if (postingEl) {
      injector.injectLoading(postingEl);
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
        const cardEl = cardElements.get(posting.url);
        if (cardEl) {
          injector.inject(cardEl, score);
        }
      }
    });
  }

  if (cards.length > 0) {
    scoreCards(cards);
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
    const unprocessed = newCards.filter(
      (card) => !card.element.querySelector("[data-ghost-post-badge]")
    );

    if (unprocessed.length > 0) {
      scoreCards(unprocessed);
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
