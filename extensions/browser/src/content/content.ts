// Content script — runs isolated per provider, loads the correct adapter, wires bridge client via messaging.
// Lifecycle: DETECTED → WAITING_FOR_DOM → HEALTHY → ACTIVE, with persistent SPA/health watchers.
// All page mutations are reversible and fail closed; no eval, no inline script.

import { createChatGptAdapter } from "../adapters/chatgpt/index.js";
import { createClaudeAdapter } from "../adapters/claude/index.js";
import { createGeminiAdapter } from "../adapters/gemini/index.js";
import { createGithubAdapter } from "../adapters/github/index.js";
import type { SiteAdapter } from "../adapters/types.js";
import { getPinnedMap, isSiteDisabled, setPinned } from "../lib/storage.js";

let candidateAdapter: SiteAdapter | null = null;
let activeAdapter: SiteAdapter | null = null;
let disabledForHost = false;
let currentHost = location.hostname;
let healthInterval: number | undefined;
let domObserver: MutationObserver | null = null;
let spaInstalled = false;
let listenersInstalled = false;

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

function evaluateHealth(): void {
  if (disabledForHost) {
    if (activeAdapter) {
      try {
        activeAdapter.disconnect();
      } catch {}
      activeAdapter = null;
    }
    return;
  }
  if (!candidateAdapter) {
    const next = resolveAdapter();
    if (!next) {
      if (activeAdapter) {
        try {
          activeAdapter.disconnect();
        } catch {}
        activeAdapter = null;
      }
      return;
    }
    candidateAdapter = next;
    // Candidate found but health not yet known — will be evaluated below
  }
  const health = candidateAdapter.healthCheck();
  if (!health.ok) {
    // WAITING_FOR_DOM — keep candidate, clear active, keep watchers alive
    if (activeAdapter) {
      try {
        activeAdapter.disconnect();
      } catch {}
      activeAdapter = null;
    }
    // Do not clear candidate; keep waiting
    return;
  }
  // HEALTHY → ACTIVE
  if (activeAdapter !== candidateAdapter) {
    if (activeAdapter) {
      try {
        activeAdapter.disconnect();
      } catch {}
    }
    activeAdapter = candidateAdapter;
    void applyPinnedState();
  }
}

function startHealthWatcher(): void {
  if (healthInterval !== undefined) return;
  // Poll health every 800ms — covers delayed conversation DOM without fixed 10s window
  healthInterval = window.setInterval(() => {
    evaluateHealth();
  }, 800);

  // Also watch DOM for changes — any childList mutation in body may indicate conversation loaded
  if (domObserver) {
    try {
      domObserver.disconnect();
    } catch {}
    domObserver = null;
  }
  try {
    domObserver = new MutationObserver(() => {
      // Debounce: evaluate on next tick
      window.setTimeout(() => evaluateHealth(), 150);
    });
    // Observe body for subtree childList — covers SPA-added #thread and turns
    // Use document.documentElement as fallback if body not yet present
    const target = document.body ?? document.documentElement;
    domObserver.observe(target as Node, { childList: true, subtree: true });
  } catch {
    domObserver = null;
  }
}

function stopHealthWatcher(): void {
  if (healthInterval !== undefined) {
    window.clearInterval(healthInterval);
    healthInterval = undefined;
  }
  if (domObserver) {
    try {
      domObserver.disconnect();
    } catch {}
    domObserver = null;
  }
}

async function init(): Promise<void> {
  const disabled = await isSiteDisabled(currentHost).catch(() => false);
  disabledForHost = disabled;
  if (disabledForHost) {
    // Still install listeners/SPA so user can re-enable without reload
    ensureListenersAndSpa();
    startHealthWatcher();
    return;
  }

  const adapter = resolveAdapter();
  if (adapter) {
    candidateAdapter = adapter;
  }
  ensureListenersAndSpa();
  startHealthWatcher();
  // Immediate health evaluation
  evaluateHealth();
  if (activeAdapter) {
    await applyPinnedState();
  } else if (candidateAdapter) {
    const h = candidateAdapter.healthCheck();
    if (!h.ok) {
      console.warn(`[ACKit] adapter ${candidateAdapter.id} healthCheck failed: ${h.reason} — waiting for DOM`);
    }
  }
}

function ensureListenersAndSpa(): void {
  if (!listenersInstalled) {
    setupListeners();
    listenersInstalled = true;
  }
  if (!spaInstalled) {
    setupSpaObserver();
    spaInstalled = true;
  }
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
        // Insert needs active (healthy) adapter; candidate not enough
        if (!activeAdapter) {
          // Try to evaluate health once more before failing — user may have just loaded conversation
          evaluateHealth();
          if (!activeAdapter) {
            sendResponse({ ok: false, error: "no adapter" });
            return;
          }
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
        // Compact requires active; if only candidate exists, try health eval first
        if (!activeAdapter) {
          evaluateHealth();
          if (!activeAdapter) {
            // Return health reason for diagnostics
            const health = candidateAdapter?.healthCheck() ?? { ok: false, reason: "no adapter" };
            sendResponse({ ok: false, error: health.reason ?? "no adapter", health });
            return;
          }
        }
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
          // Restore should work even if only candidate exists — try active first, then candidate
          const target = activeAdapter ?? candidateAdapter;
          target?.restore();
          if (m.type === "ackit:restore") {
            await applyPinnedState();
          } else {
            for (const el of document.querySelectorAll<HTMLElement>("[data-ackit-pinned='true']")) {
              el.removeAttribute("data-ackit-pinned");
              el.style.outline = "";
              el.style.outlineOffset = "";
            }
          }
          if (m.type !== "ackit:restore") {
            activeAdapter?.disconnect();
            // Keep candidate for potential re-enable, but clear active
            if (m.type === "ackit:emergency-disconnect" || m.type === "ackit:site-disabled") {
              activeAdapter = null;
            }
          }
        } catch {}
        if (m.type === "ackit:emergency-disconnect" || m.type === "ackit:site-disabled") {
          disabledForHost = true;
        }
        if (m.type === "ackit:site-disabled" && (m as { host?: string }).host) {
          // Allow re-enable flow to re-evaluate
          evaluateHealth();
        }
        sendResponse({ ok: true });
        return;
      }
      if (m.type === "ackit:pin") {
        const id = m.id ?? "";
        const pinned = m.pinned ?? false;
        if (!id) {
          sendResponse({ ok: false, error: "missing id" });
          return;
        }
        // Pin needs at least candidate to know turn ids, but we store per-host regardless
        try {
          await setPinned(currentHost, id, pinned);
          // If active, apply visual; if only candidate/waiting, still store for next health
          if (activeAdapter) await applyPinnedState();
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
        // Always evaluate fresh health for diagnostics
        evaluateHealth();
        const health = activeAdapter?.healthCheck() ??
          candidateAdapter?.healthCheck() ?? { ok: false, reason: "no adapter" };
        const state = disabledForHost
          ? "disabled"
          : activeAdapter
            ? "active"
            : candidateAdapter
              ? "waiting_for_dom"
              : "no_adapter";
        sendResponse({ ...health, state, candidate: candidateAdapter?.id ?? null, active: activeAdapter?.id ?? null });
        return;
      }
      if (m.type === "ackit:navigate") {
        evaluateHealth();
        const items = activeAdapter?.navigator() ?? candidateAdapter?.navigator() ?? [];
        let pinned: Record<string, boolean> = {};
        try {
          pinned = await getPinnedMap(currentHost);
        } catch {}
        const enriched = items.map((it) => ({ ...it, pinned: pinned[it.id] === true }));
        sendResponse({ ok: true, items: enriched, state: activeAdapter ? "active" : candidateAdapter ? "waiting_for_dom" : "no_adapter" });
        return;
      }
      sendResponse({ ok: false, error: "unknown content message" });
    })();
    return true;
  });
}

function setupSpaObserver(): void {
  // SPA lifecycle: conversation change → re-evaluate health, keep candidate
  let lastHref = location.href;
  let debounce: number | undefined;
  const check = async () => {
    if (location.href === lastHref && document.hasFocus() && candidateAdapter) {
      // Still same href but DOM may have changed (ChatGPT SPA without href change) — still re-evaluate
    }
    const hrefChanged = location.href !== lastHref;
    if (hrefChanged) {
      lastHref = location.href;
      currentHost = location.hostname;
      const disabled = await isSiteDisabled(currentHost).catch(() => false);
      disabledForHost = disabled;
      if (disabledForHost) {
        try {
          activeAdapter?.disconnect();
        } catch {}
        activeAdapter = null;
        return;
      }
    }
    // Re-resolve candidate on every SPA navigation — ChatGPT may switch conversation without full reload
    const next = resolveAdapter();
    if (next) {
      if (!candidateAdapter || candidateAdapter.id !== next.id) {
        // New provider or same but fresh instance
        try {
          activeAdapter?.disconnect();
        } catch {}
        activeAdapter = null;
        candidateAdapter = next;
      }
    } else {
      // No adapter detected — keep previous candidate? Clear to allow re-detect
      // For ChatGPT, detect is hostname-based, so it should still be candidate; only clear if truly no candidate
      if (!next) {
        // Keep candidate for waiting, but active must be cleared
        if (activeAdapter) {
          try {
            activeAdapter.disconnect();
          } catch {}
          activeAdapter = null;
        }
      }
    }
    evaluateHealth();
    if (activeAdapter) {
      await applyPinnedState();
    }
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

  // Also observe DOM for SPA that doesn't change href (ChatGPT sometimes)
  // The health watcher's domObserver already covers this, but keep explicit
}

// Initialize immediately
void init();

// No fixed 10s window — health watcher runs indefinitely via interval + MutationObserver
// Also handle visibility change — when tab becomes visible, re-evaluate
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    evaluateHealth();
  }
});
window.addEventListener("focus", () => evaluateHealth());
