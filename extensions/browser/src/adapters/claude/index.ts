import type { AdapterHealth, CompactResult, NavItem, SiteAdapter, TurnInfo } from "../types.js";

export function createClaudeAdapter(): SiteAdapter {
  const ACKIT_COLLAPSED_ATTR = "data-ackit-collapsed";
  const ACKIT_PLACEHOLDER_CLASS = "ackit-placeholder";
  let isPaused = false;

  function findTurns(): TurnInfo[] {
    // Claude selector — discovered via DevTools, not assumed from ChatGPT
    const nodes = document.querySelectorAll<HTMLElement>(
      "[data-testid='chat-message'], .message, [data-is-streaming]",
    );
    // Fallback: elements with role article
    if (nodes.length === 0) {
      const fallback = document.querySelectorAll<HTMLElement>("div[data-test-render-count]");
      return [...fallback].map((el, idx) => ({
        id: String(idx),
        index: idx,
        element: el,
        role: null,
      }));
    }
    return [...nodes].map((el, idx) => ({ id: String(idx), index: idx, element: el, role: null }));
  }

  return {
    id: "claude",
    detect(): boolean {
      return location.hostname.includes("claude.ai");
    },
    healthCheck(): AdapterHealth {
      if (!this.detect()) return { ok: false, reason: "not on claude.ai" };
      const turns = findTurns();
      if (turns.length === 0)
        return { ok: false, reason: "no turns detected (DOM drift — fail closed)" };
      return { ok: true };
    },
    findComposer(): HTMLElement | null {
      const ce = document.querySelector<HTMLElement>('div[contenteditable="true"]');
      if (ce) return ce;
      return document.querySelector<HTMLElement>("textarea");
    },
    insertText(text: string): boolean {
      const composer = this.findComposer();
      if (!composer) return false;
      try {
        composer.focus();
        if (composer.getAttribute("contenteditable") === "true") {
          document.execCommand("insertText", false, text);
          composer.dispatchEvent(new InputEvent("input", { bubbles: true }));
          return true;
        }
        if (composer instanceof HTMLTextAreaElement) {
          composer.value += text;
          composer.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    isStreaming(): boolean {
      return document.querySelector<HTMLElement>("[data-is-streaming='true']") !== null;
    },
    enumerateTurns(): TurnInfo[] {
      return findTurns();
    },
    compact(opts: { keepRecent: number }): CompactResult {
      if (isPaused || this.isStreaming())
        return { compacted: 0, alreadyCompacted: 0, skippedFocused: 0 };
      const turns = findTurns();
      if (turns.length <= opts.keepRecent)
        return { compacted: 0, alreadyCompacted: 0, skippedFocused: 0 };
      let compacted = 0;
      for (let i = 0; i < turns.length - opts.keepRecent; i++) {
        const t = turns[i];
        if (!t) continue;
        if (t.element.getAttribute(ACKIT_COLLAPSED_ATTR) === "true") continue;
        if (t.element.contains(document.activeElement)) continue;
        t.element.setAttribute(ACKIT_COLLAPSED_ATTR, "true");
        t.element.style.display = "none";
        const ph = document.createElement("div");
        ph.className = ACKIT_PLACEHOLDER_CLASS;
        ph.textContent = `— ACKit collapsed Claude #${t.index + 1} —`;
        ph.style.cssText =
          "padding:8px;border:1px dashed #999;margin:4px 0;font-size:12px;opacity:0.7";
        t.element.parentElement?.insertBefore(ph, t.element.nextSibling);
        compacted++;
      }
      return { compacted, alreadyCompacted: 0, skippedFocused: 0 };
    },
    restore(): void {
      for (const ph of document.querySelectorAll(`.${ACKIT_PLACEHOLDER_CLASS}`)) ph.remove();
      for (const el of document.querySelectorAll<HTMLElement>(`[${ACKIT_COLLAPSED_ATTR}="true"]`)) {
        el.removeAttribute(ACKIT_COLLAPSED_ATTR);
        el.style.display = "";
      }
    },
    navigator(): NavItem[] {
      return findTurns().map((t) => ({
        id: t.id,
        index: t.index,
        label: `Turn ${t.index + 1}`,
        role: t.role,
      }));
    },
    pause(): void {
      isPaused = true;
    },
    disconnect(): void {
      isPaused = true;
    },
    destroy(): void {
      this.restore();
    },
  };
}
