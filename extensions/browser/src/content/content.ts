// Content script — runs isolated per provider, loads the correct adapter, wires bridge client via messaging.
// All page mutations are reversible and fail closed; no eval, no inline script.

import { createChatGptAdapter } from "../adapters/chatgpt/index.js";
import { createClaudeAdapter } from "../adapters/claude/index.js";
import { createGeminiAdapter } from "../adapters/gemini/index.js";
import { createGithubAdapter } from "../adapters/github/index.js";
import type { SiteAdapter } from "../adapters/types.js";
import { getPinnedMap, isSiteDisabled, setPinned } from "../lib/storage.js";

let activeAdapter: SiteAdapter | null = null;
let disabledForHost = false;
let currentHost = location.hostname;

function resolveAdapter(): SiteAdapter | null {
  const candidates: SiteAdapter[] = [
    createChatGptAdapter(),
    createClaudeAdapter(),
    createGeminiAdapter(),
    createGithubAdapter(),
  ];
  for (const a of candidates) {
    try {
      if (a.detect()) return a;
    } catch {
      // fail closed
    }
  }
  return null;
}

async function applyPinnedState(): Promise<void> {
  if (!activeAdapter) return;
  try {
    const pinned = await getPinnedMap(currentHost);
    const turns = activeAdapter.enumerateTurns();
    for (const t of turns) {
      if (pinned[t.id] === true) {
        t.element.setAttribute("data-ackit-pinned", "true");
        // Visual marker for pinned
        t.element.style.outline = "2px dashed #4a8";
        t.element.style.outlineOffset = "2px";
      } else {
        if (t.element.getAttribute("data-ackit-pinned") === "true") {
          t.element.removeAttribute("data-ackit-pinned");
          t.element.style.outline = "";
          t.element.style.outlineOffset = "";
        }
      }
    }
  } catch {}
}

async function init(): Promise<void> {
  const disabled = await isSiteDisabled(currentHost).catch(() => false);
  disabledForHost = disabled;
  if (disabledForHost) return;

  const adapter = resolveAdapter();
  if (!adapter) return;
  const health = adapter.healthCheck();
  if (!health.ok) {
    // Fail closed — do not mutate, report via console for debugging
    console.warn(`[ACKit] adapter ${adapter.id} healthCheck failed: ${health.reason}`);
    // Optionally notify side panel via messaging (circuit breaker)
    return;
  }
  activeAdapter = adapter;
  setupListeners();
  setupSpaObserver();
  await applyPinnedState();
}

function setupListeners(): void {
  chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
    (async () => {
      const m = msg as {
        type?: string;
        text?: string;
        host?: string;
        id?: string;
        pinned?: boolean;
      };
      if (m.type === "ackit:insert") {
        const text = m.text ?? "";
        if (!activeAdapter) {
          sendResponse({ ok: false, error: "no adapter" });
          return;
        }
        if (disabledForHost) {
          sendResponse({ ok: false, error: "site disabled" });
          return;
        }
        const ok = activeAdapter.insertText(text);
        sendResponse({ ok, error: ok ? undefined : "composer not found" });
        return;
      }
      if (m.type === "ackit:compact") {
        if (!activeAdapter) {
          sendResponse({ ok: false, error: "no adapter" });
          return;
        }
        // Ensure pinned state is current before compact
        await applyPinnedState();
        const keepRecent =
          typeof (m as { keepRecent?: number }).keepRecent === "number"
            ? (m as { keepRecent: number }).keepRecent
            : 10;
        const result = activeAdapter.compact({ keepRecent });
        sendResponse({ ok: true, result });
        return;
      }
      if (
        m.type === "ackit:restore" ||
        m.type === "ackit:emergency-disconnect" ||
        m.type === "ackit:site-disabled"
      ) {
        try {
          activeAdapter?.restore();
          // Emergency should also clear pending pinned visuals but keep storage for next init?
          // For emergency, we clear pinned outlines visually but storage remains until explicit clear.
          // Restore keeps pinned attributes (user wants them after restore) — so we re-apply pinned after restore.
          if (m.type === "ackit:restore") {
            await applyPinnedState();
          } else {
            // Emergency/site-disabled: remove pinned outlines as part of cleanup
            for (const el of document.querySelectorAll<HTMLElement>("[data-ackit-pinned='true']")) {
              el.removeAttribute("data-ackit-pinned");
              el.style.outline = "";
              el.style.outlineOffset = "";
            }
          }
          if (m.type !== "ackit:restore") activeAdapter?.disconnect();
        } catch {}
        if (m.type === "ackit:emergency-disconnect" || m.type === "ackit:site-disabled") {
          disabledForHost = true;
        }
        sendResponse({ ok: true });
        return;
      }
      if (m.type === "ackit:pin") {
        const id = m.id ?? "";
        const pinned = m.pinned ?? false;
        if (!id || !activeAdapter) {
          sendResponse({ ok: false, error: "missing id or adapter" });
          return;
        }
        try {
          await setPinned(currentHost, id, pinned);
          await applyPinnedState();
          sendResponse({ ok: true });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          sendResponse({ ok: false, error: msg });
        }
        return;
      }
      if (m.type === "ackit:get-pinned") {
        try {
          const map = await getPinnedMap(currentHost);
          sendResponse({ ok: true, pinned: map });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          sendResponse({ ok: false, error: msg });
        }
        return;
      }
      if (m.type === "ackit:health") {
        const health = activeAdapter?.healthCheck() ?? { ok: false, reason: "no adapter" };
        sendResponse(health);
        return;
      }
      if (m.type === "ackit:navigate") {
        const items = activeAdapter?.navigator() ?? [];
        // Enrich with pinned state
        let pinned: Record<string, boolean> = {};
        try {
          pinned = await getPinnedMap(currentHost);
        } catch {}
        const enriched = items.map((it) => ({ ...it, pinned: pinned[it.id] === true }));
        sendResponse({ ok: true, items: enriched });
        return;
      }
      sendResponse({ ok: false, error: "unknown content message" });
    })();
    return true;
  });
}

function setupSpaObserver(): void {
  // SPA lifecycle: conversation change → disconnect old, re-init
  let lastHref = location.href;
  let debounce: number | undefined;
  const check = async () => {
    if (location.href === lastHref) return;
    lastHref = location.href;
    currentHost = location.hostname;
    const disabled = await isSiteDisabled(currentHost).catch(() => false);
    disabledForHost = disabled;
    try {
      activeAdapter?.disconnect();
      activeAdapter?.restore();
    } catch {}
    activeAdapter = null;
    if (disabledForHost) return;
    const next = resolveAdapter();
    if (!next) return;
    const health = next.healthCheck();
    if (!health.ok) return;
    activeAdapter = next;
    await applyPinnedState();
  };

  // patch pushState/replaceState
  const origPush = history.pushState;
  const origReplace = history.replaceState;
  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    const ret = origPush.apply(this, args);
    window.dispatchEvent(new Event("ackit:locationchange"));
    return ret;
  };
  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    const ret = origReplace.apply(this, args);
    window.dispatchEvent(new Event("ackit:locationchange"));
    return ret;
  };

  window.addEventListener("ackit:locationchange", () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => void check(), 300);
  });
  window.addEventListener("popstate", () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => void check(), 300);
  });
  window.addEventListener("hashchange", () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => void check(), 300);
  });
}

// Initialize immediately; also on SPA delayed root appearance
void init();
let retry = 0;
const retryTimer = window.setInterval(() => {
  if (activeAdapter || retry >= 10) {
    window.clearInterval(retryTimer);
    return;
  }
  retry++;
  void init().then(() => {
    if (activeAdapter) window.clearInterval(retryTimer);
  });
}, 1000);
