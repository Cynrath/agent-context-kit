import { CircuitBreaker, LifecycleTracker } from "../../lib/emergency.js";
import type { AdapterHealth, CompactResult, NavItem, SiteAdapter, TurnInfo } from "../types.js";

// ChatGPT adapter — re-discovers DOM on each call, fails closed, never removes React nodes in balanced mode.
// Selector hints from PoC are verified at runtime: #thread, [data-turn-id-container], section[data-testid^="conversation-turn-"], [data-message-author-role]
// No hashed class names are used.

const ACKIT_COLLAPSED_ATTR = "data-ackit-collapsed";
const ACKIT_PINNED_ATTR = "data-ackit-pinned";
const ACKIT_PLACEHOLDER_CLASS = "ackit-placeholder";

export function createChatGptAdapter(): SiteAdapter {
  const tracker = new LifecycleTracker();
  const breaker = new CircuitBreaker(5, 30_000);
  let observer: MutationObserver | null = null;
  let isPaused = false;

  function findRoot(): HTMLElement | null {
    // Prefer semantic, stable selectors; never Tailwind hashed classes.
    // Current ChatGPT (2026) uses ol[data-conversation-transcript] → li._wdUoQG_messageTurn
    const thread = document.querySelector<HTMLElement>("#thread");
    if (thread) return thread;
    const byTurnContainer = document.querySelector<HTMLElement>("[data-turn-id-container]");
    if (byTurnContainer) return byTurnContainer.parentElement as HTMLElement | null;
    const olTranscript = document.querySelector<HTMLElement>("ol[data-conversation-transcript]");
    if (olTranscript) return olTranscript;
    const wmContent = document.querySelector<HTMLElement>("div.wm-app-threadContent");
    if (wmContent) {
      // Prefer the ol inside, but return wrapper if ol not yet present
      const innerOl = wmContent.querySelector<HTMLElement>("ol[data-conversation-transcript]");
      if (innerOl) return innerOl;
      return wmContent;
    }
    const newLi = document.querySelector<HTMLElement>("li._wdUoQG_messageTurn");
    if (newLi) return (newLi.parentElement as HTMLElement | null) ?? newLi;
    // Fallback: old section with conversation-turn test id
    const section = document.querySelector<HTMLElement>(
      'section[data-testid^="conversation-turn-"]',
    );
    if (section) return section.parentElement as HTMLElement | null;
    return null;
  }

  function findTurns(): TurnInfo[] {
    // New ChatGPT DOM (2026): li._wdUoQG_messageTurn with data-message-role + id
    const newLis = document.querySelectorAll<HTMLElement>("li._wdUoQG_messageTurn");
    if (newLis.length > 0) {
      return [...newLis].map((el, idx) => ({
        id: el.id || el.getAttribute("data-message-id") || String(idx),
        index: idx,
        element: el,
        role: el.getAttribute("data-message-role") ?? null,
      }));
    }
    const nodes = document.querySelectorAll<HTMLElement>(
      'section[data-testid^="conversation-turn-"][data-turn]',
    );
    if (nodes.length > 0) {
      return [...nodes].map((el, idx) => ({
        id: el.getAttribute("data-turn") ?? String(idx),
        index: idx,
        element: el,
        role:
          el
            .querySelector<HTMLElement>("[data-message-author-role]")
            ?.getAttribute("data-message-author-role") ?? null,
      }));
    }
    // Fallback: [data-message-author-role] containers (old) — also try closest li for new
    const roles = document.querySelectorAll<HTMLElement>("[data-message-author-role]");
    return [...roles].map((el, idx) => ({
      id: String(idx),
      index: idx,
      element:
        (el.closest("section") as HTMLElement) ??
        (el.closest("li._wdUoQG_messageTurn") as HTMLElement) ??
        el,
      role: el.getAttribute("data-message-author-role"),
    }));
  }

  function findScroller(): HTMLElement | null {
    // PoC-derived: dynamically discover the actual ChatGPT scrollable ancestor.
    // ChatGPT's conversation scroller is not always documentElement — it is often a div with overflow-y-auto.
    const root = findRoot();
    let el: HTMLElement | null = root;
    // Walk up from root to find scrollable ancestor
    while (el) {
      try {
        const style = getComputedStyle(el);
        const overflowY = style.overflowY;
        const isScrollableStyle = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
        // scrollHeight > clientHeight indicates scrollable content (with small tolerance)
        if (isScrollableStyle && el.scrollHeight > el.clientHeight + 20) {
          return el;
        }
        // Also consider elements that are scrollable even without explicit overflow (ChatGPT sometimes uses flex)
        // Check if element can scroll: scrollHeight > clientHeight and element is not body
        if (el.scrollHeight > el.clientHeight + 40 && el !== document.body) {
          // Ensure it has a defined height and can actually scroll
          if (el.clientHeight < window.innerHeight * 0.95) {
            return el;
          }
        }
      } catch {}
      el = el.parentElement;
    }
    // Fallback: try main element or document scrolling element
    const main = document.querySelector<HTMLElement>("main");
    if (main) {
      try {
        if (main.scrollHeight > main.clientHeight + 20) return main;
        const style = getComputedStyle(main);
        if ((style.overflowY === "auto" || style.overflowY === "scroll") && main.scrollHeight > main.clientHeight) {
          return main;
        }
      } catch {}
    }
    // Final fallback: documentElement (window scrolling)
    return document.documentElement as unknown as HTMLElement;
  }

  function getScroller(): HTMLElement {
    return findScroller() ?? (document.documentElement as unknown as HTMLElement);
  }

  function isNearBottom(): boolean {
    const scroller = getScroller();
    // If scroller is documentElement, use window metrics (more reliable for window scrolling)
    if (scroller === document.documentElement) {
      const distance = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      return distance < 400;
    }
    const distance = scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight);
    return distance < 400;
  }

  function getBottomDistance(): number {
    const scroller = getScroller();
    if (scroller === document.documentElement) {
      return document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    }
    return scroller.scrollHeight - (scroller.scrollTop + scroller.clientHeight);
  }

  function scrollByDelta(delta: number): void {
    const scroller = getScroller();
    if (scroller === document.documentElement) {
      window.scrollBy(0, delta);
    } else {
      scroller.scrollTop += delta;
    }
  }

  function hasFocusedControlInside(element: HTMLElement): boolean {
    const active = document.activeElement;
    if (!active || active === document.body) return false;
    return element.contains(active);
  }

  // Narrow MutationObserver (childList:true, subtree:false) on the conversation wrapper only, debounced.
  let debounceTimer: number | undefined;
  function ensureObserver(): void {
    if (observer !== null) return;
    const wrapper = findRoot();
    if (!wrapper) return;
    // Do not observe every token streaming mutation; only wrapper childList
    observer = new MutationObserver(() => {
      if (isPaused) return;
      if (observer === null) return;
      // Debounce & coalesce (150ms)
      window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        // Incremental index is maintained via findTurns() lazily; no full rescan on every mutation here.
        // We just ensure breaker doesn't trip on observer itself.
        tracker.trackObserver(observer as MutationObserver);
      }, 150);
    });
    try {
      observer.observe(wrapper, { childList: true, subtree: false });
      tracker.trackObserver(observer);
    } catch {
      try {
        observer.disconnect();
      } catch {}
      observer = null;
      breaker.recordError();
    }
  }

  return {
    id: "chatgpt",
    detect(): boolean {
      return (
        location.hostname.includes("chat.openai.com") ||
        location.hostname.includes("chatgpt.com") ||
        document.querySelector("#thread") !== null ||
        document.querySelector('[data-testid^="conversation-turn-"]') !== null ||
        document.querySelector("li._wdUoQG_messageTurn") !== null ||
        document.querySelector("ol[data-conversation-transcript]") !== null ||
        document.querySelector("div.wm-app-threadContent") !== null
      );
    },
    healthCheck(): AdapterHealth {
      const r = findRoot();
      if (!r) return { ok: false, reason: "chatgpt root not found (#thread / data-turn)" };
      const turns = findTurns();
      if (turns.length === 0) return { ok: false, reason: "no conversation turns detected" };
      // If breaker tripped, fail closed
      if (breaker.shouldTrip())
        return { ok: false, reason: "circuit breaker tripped (repeated adapter errors)" };
      return { ok: true };
    },
    findComposer(): HTMLElement | null {
      // ChatGPT composer is contenteditable div with id prompt-textarea or similar, plus fallback textarea
      const byId = document.getElementById("prompt-textarea");
      if (byId) return byId as HTMLElement;
      const byRole = document.querySelector<HTMLElement>(
        'div[contenteditable="true"][data-testid="composer"]',
      );
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
      if (last?.element.querySelector('.result-streaming, [data-streaming="true"]')) return true;
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
      if (turns.length <= opts.keepRecent)
        return { compacted: 0, alreadyCompacted: 0, skippedFocused: 0 };

      // Anchor scroll distance before mutation (scroll anchoring, PoC lesson 8) — uses real scroller
      const bottomDistance = getBottomDistance();
      let compacted = 0;
      let already = 0;
      let skippedFocused = 0;

      // Narrow observer safety: ensure observer is set up lazily with correct scope
      ensureObserver();

      // Never touch React nodes via remove(); use content-visibility + reversible collapse
      for (let i = 0; i < turns.length - opts.keepRecent; i++) {
        const turn = turns[i];
        if (!turn) continue;
        // Pinned turns survive auto-compaction until explicitly unpinned
        if (turn.element.getAttribute(ACKIT_PINNED_ATTR) === "true") {
          already++;
          continue;
        }
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

      // Code block / media compact for still-visible recent turns (balanced, reversible)
      // Large code blocks (>30 lines) are collapsed via content-visibility + placeholder, not detached.
      for (let i = turns.length - opts.keepRecent; i < turns.length; i++) {
        const turn = turns[i];
        if (!turn) continue;
        if (hasFocusedControlInside(turn.element)) continue;
        // Code blocks: pre (optionally with code inside)
        const pres = turn.element.querySelectorAll<HTMLElement>("pre");
        for (const pre of pres) {
          if (pre.getAttribute(ACKIT_COLLAPSED_ATTR) === "true") continue;
          const lines = (pre.textContent ?? "").split("\n").length;
          if (lines < 30) continue;
          // Skip if already compacted or contains focused control
          if (hasFocusedControlInside(pre)) continue;
          pre.setAttribute(ACKIT_COLLAPSED_ATTR, "true");
          pre.style.contentVisibility = "auto";
          pre.style.containIntrinsicSize = "auto 120px";
          const ph = document.createElement("div");
          ph.className = `${ACKIT_PLACEHOLDER_CLASS}-code`;
          ph.textContent = `— ACKit collapsed code block (${lines} lines) — click Restore all —`;
          ph.dataset["ackitCode"] = "1";
          ph.style.cssText =
            "padding:6px 10px;margin:6px 0;border:1px dashed #8aa;border-radius:6px;font-size:11px;opacity:0.7";
          pre.style.display = "none";
          pre.parentElement?.insertBefore(ph, pre.nextSibling);
          compacted++;
        }
        // Media: img, video, iframe, canvas (old embeds) — collapse if large or many
        const media = turn.element.querySelectorAll<HTMLElement>(
          "img, video, iframe, canvas, embed",
        );
        for (const m of media) {
          if (m.getAttribute(ACKIT_COLLAPSED_ATTR) === "true") continue;
          // Heuristic: collapse media in recent turns only if it is large (>300px) or there are >3 media items in the turn
          const rect = m.getBoundingClientRect();
          const isLarge = rect.width > 400 || rect.height > 300;
          const many = media.length > 3;
          if (!isLarge && !many) continue;
          if (hasFocusedControlInside(m)) continue;
          m.setAttribute(ACKIT_COLLAPSED_ATTR, "true");
          (m as HTMLElement).style.display = "none";
          const ph = document.createElement("div");
          ph.className = `${ACKIT_PLACEHOLDER_CLASS}-media`;
          ph.textContent = "— ACKit collapsed media —";
          ph.style.cssText =
            "padding:6px 10px;margin:6px 0;border:1px dashed #a8a;border-radius:6px;font-size:11px;opacity:0.7";
          m.parentElement?.insertBefore(ph, m.nextSibling);
          compacted++;
        }
      }

      // Restore scroll anchoring — against real scroller
      try {
        const newBottom = getBottomDistance();
        const delta = newBottom - bottomDistance;
        if (Math.abs(delta) > 20) {
          scrollByDelta(delta);
        }
      } catch {
        // no-op
      }

      if (compacted > 0) breaker.recordSuccess();
      return { compacted, alreadyCompacted: already, skippedFocused };
    },
    restore(): void {
      const placeholders = document.querySelectorAll<HTMLElement>(
        `.${ACKIT_PLACEHOLDER_CLASS}, .${ACKIT_PLACEHOLDER_CLASS}-code, .${ACKIT_PLACEHOLDER_CLASS}-media`,
      );
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
      if (debounceTimer !== undefined) {
        window.clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }
      tracker.disconnect();
    },
    destroy(): void {
      this.restore();
      this.disconnect();
      breaker.reset();
      // Remove any injected style leftovers
      document.querySelectorAll<HTMLElement>("[data-ackit-style]").forEach((el) => {
        el.remove();
      });
    },
  };
}
