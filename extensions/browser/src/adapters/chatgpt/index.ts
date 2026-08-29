import type { AdapterHealth, CompactResult, NavItem, SiteAdapter, TurnInfo } from "../types.js";
import { CircuitBreaker, LifecycleTracker } from "../../lib/emergency.js";

// ChatGPT adapter — re-discovers DOM on each call, fails closed, never removes React nodes in balanced mode.
// Selector hints from PoC are verified at runtime: #thread, [data-turn-id-container], section[data-testid^="conversation-turn-"], [data-message-author-role]
// No hashed class names are used.

const ACKIT_COLLAPSED_ATTR = "data-ackit-collapsed";
const ACKIT_PLACEHOLDER_CLASS = "ackit-placeholder";

export function createChatGptAdapter(): SiteAdapter {
  const tracker = new LifecycleTracker();
  const breaker = new CircuitBreaker(5, 30_000);
  let observer: MutationObserver | null = null;
  let root: HTMLElement | null = null;
  let isPaused = false;

  function findRoot(): HTMLElement | null {
    // Prefer semantic, stable selectors; never Tailwind hashed classes.
    const thread = document.querySelector<HTMLElement>("#thread");
    if (thread) return thread;
    const byTurnContainer = document.querySelector<HTMLElement>("[data-turn-id-container]");
    if (byTurnContainer) return byTurnContainer.parentElement as HTMLElement | null;
    // Fallback: first section with conversation-turn test id
    const section = document.querySelector<HTMLElement>('section[data-testid^="conversation-turn-"]');
    if (section) return section.parentElement as HTMLElement | null;
    return null;
  }

  function findTurns(): TurnInfo[] {
    const nodes = document.querySelectorAll<HTMLElement>('section[data-testid^="conversation-turn-"][data-turn]');
    if (nodes.length > 0) {
      return [...nodes].map((el, idx) => ({
        id: el.getAttribute("data-turn") ?? String(idx),
        index: idx,
        element: el,
        role: el.querySelector<HTMLElement>("[data-message-author-role]")?.getAttribute("data-message-author-role") ?? null,
      }));
    }
    // Fallback: [data-message-author-role] containers
    const roles = document.querySelectorAll<HTMLElement>("[data-message-author-role]");
    return [...roles].map((el, idx) => ({
      id: String(idx),
      index: idx,
      element: el.closest("section") as HTMLElement ?? el,
      role: el.getAttribute("data-message-author-role"),
    }));
  }

  function isNearBottom(): boolean {
    const distance = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    return distance < 400;
  }

  function hasFocusedControlInside(element: HTMLElement): boolean {
    const active = document.activeElement;
    if (!active || active === document.body) return false;
    return element.contains(active);
  }

  return {
    id: "chatgpt",
    detect(): boolean {
      return (
        location.hostname.includes("chat.openai.com") ||
        location.hostname.includes("chatgpt.com") ||
        document.querySelector("#thread") !== null ||
        document.querySelector('[data-testid^="conversation-turn-"]') !== null
      );
    },
    healthCheck(): AdapterHealth {
      const r = findRoot();
      if (!r) return { ok: false, reason: "chatgpt root not found (#thread / data-turn)" };
      const turns = findTurns();
      if (turns.length === 0) return { ok: false, reason: "no conversation turns detected" };
      // If breaker tripped, fail closed
      if (breaker.shouldTrip()) return { ok: false, reason: "circuit breaker tripped (repeated adapter errors)" };
      return { ok: true };
    },
    findComposer(): HTMLElement | null {
      // ChatGPT composer is contenteditable div with id prompt-textarea or similar, plus fallback textarea
      const byId = document.getElementById("prompt-textarea");
      if (byId) return byId as HTMLElement;
      const byRole = document.querySelector<HTMLElement>('div[contenteditable="true"][data-testid="composer"]');
      if (byRole) return byRole;
      const generic = document.querySelector<HTMLElement>('div[contenteditable="true"]');
      if (generic) return generic;
      const textarea = document.querySelector<HTMLElement>("textarea");
      return textarea;
    },
    insertText(text: string): boolean {
      const composer = this.findComposer();
      if (!composer) return false;
      // Never auto-submit. Insert and focus only.
      try {
        composer.focus();
        if (composer.getAttribute("contenteditable") === "true") {
          // Use execCommand for broad compatibility + beforeinput simulation
          const success = document.execCommand("insertText", false, text);
          if (!success) {
            // Fallback: direct textContent manipulation (still no submit)
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              range.deleteContents();
              range.insertNode(document.createTextNode(text));
            } else {
              composer.textContent = (composer.textContent ?? "") + text;
            }
          }
          composer.dispatchEvent(new InputEvent("input", { bubbles: true }));
          composer.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        if (composer instanceof HTMLTextAreaElement) {
          const start = composer.selectionStart ?? composer.value.length;
          const end = composer.selectionEnd ?? composer.value.length;
          composer.value = composer.value.slice(0, start) + text + composer.value.slice(end);
          composer.selectionStart = composer.selectionEnd = start + text.length;
          composer.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        }
        return false;
      } catch {
        breaker.recordError();
        return false;
      }
    },
    isStreaming(): boolean {
      // Heuristic: presence of generating indicator or stop button
      const stop = document.querySelector<HTMLElement>('button[data-testid="stop-button"]');
      if (stop) return true;
      const generating = document.querySelector<HTMLElement>('[data-testid="generating"]');
      if (generating) return true;
      // If last turn contains a streaming cursor
      const last = findTurns().at(-1);
      if (last && last.element.querySelector('.result-streaming, [data-streaming="true"]')) return true;
      return false;
    },
    enumerateTurns(): TurnInfo[] {
      return findTurns();
    },
    compact(opts: { keepRecent: number }): CompactResult {
      if (isPaused) return { compacted: 0, alreadyCompacted: 0, skippedFocused: 0 };
      const health = this.healthCheck();
      if (!health.ok) return { compacted: 0, alreadyCompacted: 0, skippedFocused: 0 };
      if (this.isStreaming()) return { compacted: 0, alreadyCompacted: 0, skippedFocused: 0 };
      if (!isNearBottom()) return { compacted: 0, alreadyCompacted: 0, skippedFocused: 0 };

      const turns = findTurns();
      if (turns.length <= opts.keepRecent) return { compacted: 0, alreadyCompacted: 0, skippedFocused: 0 };

      // Anchor scroll distance before mutation
      const bottomDistance = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      let compacted = 0;
      let already = 0;
      let skippedFocused = 0;

      // Never touch React nodes via remove(); use content-visibility + reversible collapse
      for (let i = 0; i < turns.length - opts.keepRecent; i++) {
        const turn = turns[i];
        if (!turn) continue;
        if (turn.element.getAttribute(ACKIT_COLLAPSED_ATTR) === "true") {
          already++;
          continue;
        }
        if (hasFocusedControlInside(turn.element)) {
          skippedFocused++;
          continue;
        }
        // Safe balanced mode: collapse via CSS class + content-visibility, keep node in DOM
        turn.element.setAttribute(ACKIT_COLLAPSED_ATTR, "true");
        turn.element.style.contentVisibility = "auto";
        turn.element.style.containIntrinsicSize = "auto 200px";
        // Add placeholder adjacent (reversible) without removing original
        const placeholder = document.createElement("div");
        placeholder.className = ACKIT_PLACEHOLDER_CLASS;
        placeholder.textContent = `— ACKit collapsed #${turn.index + 1} — click Restore all to show`;
        placeholder.dataset["ackitTurn"] = String(turn.index);
        placeholder.style.cssText =
          "padding:8px 12px;margin:4px 0;border:1px dashed #bbb;border-radius:8px;font-size:12px;opacity:0.7";
        turn.element.style.display = "none";
        turn.element.parentElement?.insertBefore(placeholder, turn.element.nextSibling);
        compacted++;
      }

      // Restore scroll anchoring
      try {
        const newBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
        const delta = newBottom - bottomDistance;
        if (Math.abs(delta) > 20) {
          window.scrollBy(0, delta);
        }
      } catch {
        // no-op
      }

      if (compacted > 0) breaker.recordSuccess();
      return { compacted, alreadyCompacted: already, skippedFocused };
    },
    restore(): void {
      const placeholders = document.querySelectorAll<HTMLElement>(`.${ACKIT_PLACEHOLDER_CLASS}`);
      for (const ph of placeholders) ph.remove();
      const collapsed = document.querySelectorAll<HTMLElement>(`[${ACKIT_COLLAPSED_ATTR}="true"]`);
      for (const el of collapsed) {
        el.removeAttribute(ACKIT_COLLAPSED_ATTR);
        el.style.contentVisibility = "";
        el.style.containIntrinsicSize = "";
        el.style.display = "";
      }
    },
    navigator(): NavItem[] {
      return findTurns().map((t) => ({
        id: t.id,
        index: t.index,
        label: `Turn ${t.index + 1}${t.role ? ` — ${t.role}` : ""}`,
        role: t.role,
      }));
    },
    pause(): void {
      isPaused = true;
    },
    disconnect(): void {
      isPaused = true;
      try {
        observer?.disconnect();
      } catch {}
      observer = null;
      tracker.disconnect();
    },
    destroy(): void {
      this.restore();
      this.disconnect();
      root = null;
      breaker.reset();
      // Remove any injected style leftovers
      document.querySelectorAll<HTMLElement>("[data-ackit-style]").forEach((el) => el.remove());
    },
  };
}
