import type { GhostScore } from "@/types";
import { BADGE_CSS, GHOST_SVG } from "./styles";
import { createTooltipHTML } from "./tooltip";

export class BadgeInjector {
  inject(element: Element, score: GhostScore): void {
    const existing = element.querySelector("[data-ghost-post-badge]");
    if (existing) {
      this.updateExisting(existing, score);
      return;
    }

    const host = document.createElement("div");
    host.setAttribute("data-ghost-post-badge", "true");
    const parentStyle = window.getComputedStyle(element as HTMLElement);
    if (parentStyle.position === "static") {
      (element as HTMLElement).style.position = "relative";
    }

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = BADGE_CSS;
    shadow.appendChild(style);

    const badge = this.createBadge(score);
    shadow.appendChild(badge);
    element.appendChild(host);
  }

  injectLoading(element: Element): void {
    const existing = element.querySelector("[data-ghost-post-badge]");
    if (existing) {
      const shadow = existing.shadowRoot;
      if (!shadow) return;
      const badge = shadow.querySelector(".ghost-badge");
      if (badge) {
        badge.className = "ghost-badge loading";
        badge.innerHTML = `${GHOST_SVG}<span class="ghost-score">...</span>`;
      }
      return;
    }

    const host = document.createElement("div");
    host.setAttribute("data-ghost-post-badge", "true");
    const parentStyle = window.getComputedStyle(element as HTMLElement);
    if (parentStyle.position === "static") {
      (element as HTMLElement).style.position = "relative";
    }

    const shadow = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = BADGE_CSS;
    shadow.appendChild(style);

    const badge = document.createElement("div");
    badge.className = "ghost-badge loading";
    badge.innerHTML = `${GHOST_SVG}<span class="ghost-score">...</span>`;
    shadow.appendChild(badge);
    element.appendChild(host);
  }

  private updateExisting(host: Element, score: GhostScore): void {
    const shadow = host.shadowRoot;
    if (!shadow) return;

    const oldBadge = shadow.querySelector(".ghost-badge");
    const oldTooltip = shadow.querySelector(".ghost-tooltip");
    oldTooltip?.remove();

    if (oldBadge) {
      oldBadge.remove();
    }

    const badge = this.createBadge(score);
    shadow.appendChild(badge);
  }

  private createBadge(score: GhostScore): HTMLDivElement {
    const badge = document.createElement("div");
    badge.className = `ghost-badge ${score.range}`;
    badge.innerHTML = `${GHOST_SVG}<span class="ghost-score">${score.score}</span>`;

    let tooltip: HTMLDivElement | null = null;

    badge.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (tooltip) {
        tooltip.remove();
        tooltip = null;
        return;
      }

      tooltip = document.createElement("div");
      tooltip.className = "ghost-tooltip";
      tooltip.innerHTML = createTooltipHTML(score);

      tooltip.addEventListener("click", (e) => {
        const target = (e.target as Element).closest?.(".expandable");
        if (target) {
          target.classList.toggle("expanded");
        }
        e.stopPropagation();
      });

      const shadow = badge.getRootNode() as ShadowRoot;
      shadow.appendChild(tooltip);

      const closeOnOutsideClick = (event: Event) => {
        if (!shadow.contains(event.target as Node)) {
          tooltip?.remove();
          tooltip = null;
          document.removeEventListener("click", closeOnOutsideClick);
        }
      };
      setTimeout(() => document.addEventListener("click", closeOnOutsideClick), 0);
    });

    return badge;
  }
}
