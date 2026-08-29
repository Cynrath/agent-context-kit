import type { AdapterHealth, CompactResult, NavItem, SiteAdapter, TurnInfo } from "../types.js";

export function createGeminiAdapter(): SiteAdapter {
  const ATTR = "data-ackit-collapsed";
  const PH = "ackit-placeholder";
  let paused = false;

  function findTurns(): TurnInfo[] {
    const nodes = document.querySelectorAll<HTMLElement>(
      "[data-message-id], .conversation-turn, .response-container",
    );
    if (nodes.length === 0) return [];
    return [...nodes].map((el, idx) => ({ id: String(idx), index: idx, element: el, role: null }));
  }

  return {
    id: "gemini",
    detect(): boolean {
      return location.hostname.includes("gemini.google.com");
    },
    healthCheck(): AdapterHealth {
      if (!this.detect()) return { ok: false, reason: "not on gemini.google.com" };
      if (findTurns().length === 0) return { ok: false, reason: "no turns detected — fail closed" };
      return { ok: true };
    },
    findComposer(): HTMLElement | null {
      const ce = document.querySelector<HTMLElement>('div[contenteditable="true"]');
      if (ce) return ce;
      return document.querySelector<HTMLElement>("textarea");
    },
    insertText(text: string): boolean {
      const c = this.findComposer();
      if (!c) return false;
      try {
        c.focus();
        if (c.getAttribute("contenteditable") === "true") {
          document.execCommand("insertText", false, text);
          c.dispatchEvent(new InputEvent("input", { bubbles: true }));
          return true;
        }
        if (c instanceof HTMLTextAreaElement) {
          c.value += text;
          c.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    isStreaming(): boolean {
      return document.querySelector<HTMLElement>("[data-streaming='true'], .is-streaming") !== null;
    },
    enumerateTurns(): TurnInfo[] {
      return findTurns();
    },
    compact(opts: { keepRecent: number }): CompactResult {
      if (paused || this.isStreaming())
        return { compacted: 0, alreadyCompacted: 0, skippedFocused: 0 };
      const turns = findTurns();
      if (turns.length <= opts.keepRecent)
        return { compacted: 0, alreadyCompacted: 0, skippedFocused: 0 };
      let compacted = 0;
      for (let i = 0; i < turns.length - opts.keepRecent; i++) {
        const t = turns[i];
        if (!t) continue;
        if (t.element.getAttribute(ATTR) === "true") continue;
        if (t.element.contains(document.activeElement)) continue;
        t.element.setAttribute(ATTR, "true");
        t.element.style.display = "none";
        const ph = document.createElement("div");
        ph.className = PH;
        ph.textContent = `— ACKit collapsed Gemini #${t.index + 1} —`;
        ph.style.cssText =
          "padding:8px;border:1px dashed #999;margin:4px 0;font-size:12px;opacity:0.7";
        t.element.parentElement?.insertBefore(ph, t.element.nextSibling);
        compacted++;
      }
      return { compacted, alreadyCompacted: 0, skippedFocused: 0 };
    },
    restore(): void {
      for (const ph of document.querySelectorAll(`.${PH}`)) ph.remove();
      for (const el of document.querySelectorAll<HTMLElement>(`[${ATTR}="true"]`)) {
        el.removeAttribute(ATTR);
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
      paused = true;
    },
    disconnect(): void {
      paused = true;
    },
    destroy(): void {
      this.restore();
    },
  };
}
