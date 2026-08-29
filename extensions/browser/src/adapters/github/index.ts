import type { AdapterHealth, CompactResult, NavItem, SiteAdapter, TurnInfo } from "../types.js";

export function createGithubAdapter(): SiteAdapter {
  const ATTR = "data-ackit-collapsed";
  const PH = "ackit-placeholder";
  let paused = false;

  function findTurns(): TurnInfo[] {
    // GitHub: PR timeline items, issue comments, code blocks — not a chat, so turns are timeline entries
    const nodes = document.querySelectorAll<HTMLElement>(
      ".js-timeline-item, .TimelineItem, [data-testid='timeline-comment']",
    );
    return [...nodes].map((el, idx) => ({ id: String(idx), index: idx, element: el, role: null }));
  }

  return {
    id: "github",
    detect(): boolean {
      return location.hostname.includes("github.com");
    },
    healthCheck(): AdapterHealth {
      if (!this.detect()) return { ok: false, reason: "not on github.com" };
      // GitHub performance help is optional — fail closed is ok
      return { ok: true };
    },
    findComposer(): HTMLElement | null {
      const ta = document.querySelector<HTMLElement>(
        "textarea[name='comment[body]'], textarea.js-comment-field",
      );
      if (ta) return ta;
      const ce = document.querySelector<HTMLElement>("div[contenteditable='true']");
      return ce;
    },
    insertText(text: string): boolean {
      const c = this.findComposer();
      if (!c) return false;
      try {
        c.focus();
        if (c instanceof HTMLTextAreaElement) {
          const start = c.selectionStart ?? c.value.length;
          c.value = c.value.slice(0, start) + text + c.value.slice(start);
          c.selectionStart = c.selectionEnd = start + text.length;
          c.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        }
        if (c.getAttribute("contenteditable") === "true") {
          document.execCommand("insertText", false, text);
          c.dispatchEvent(new InputEvent("input", { bubbles: true }));
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    isStreaming(): boolean {
      return false;
    },
    enumerateTurns(): TurnInfo[] {
      return findTurns();
    },
    compact(opts: { keepRecent: number }): CompactResult {
      if (paused) return { compacted: 0, alreadyCompacted: 0, skippedFocused: 0 };
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
        ph.textContent = `— ACKit collapsed GitHub #${t.index + 1} —`;
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
        label: `Item ${t.index + 1}`,
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
