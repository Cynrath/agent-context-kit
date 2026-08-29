// ACKit Browser Companion — service worker (MV3, ephemeral)
// Stores state in chrome.storage (not variables), uses chrome.alarms, never eval.

import { clearBridgeSession, getBridgeSession, isSiteDisabled, setDisabledSite } from "../lib/storage.js";
import { postStop } from "../lib/bridge-client.js";

// Side Panel open on action click — mandatory per chrome-extensions skill rule #2
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(() => {
    // Fallback for Chrome < 114
  });

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.windowId) return;
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  } catch {
    // no-op
  }
});

// Keep host permission + side panel enabled for all providers
const HOSTS = ["https://chat.openai.com/*", "https://chatgpt.com/*", "https://claude.ai/*", "https://gemini.google.com/*", "https://github.com/*"];

chrome.runtime.onInstalled.addListener(async () => {
  // Health alarm every 30s
  await chrome.alarms.create("ackit:health", { periodInMinutes: 0.5 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "ackit:health") return;
  // Best-effort health check: if bridge token exists, probe /v1/health (not implemented here to keep SW lightweight)
  // Extension pages (side panel) do active probing; SW alarm just keeps service worker warm for panelBehavior.
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  (async () => {
    const msg = message as { type?: string; host?: string; token?: string; endpoint?: string };
    if (msg.type === "ackit:emergency-disconnect") {
      await handleEmergencyDisconnect(msg.host ?? null);
      sendResponse({ ok: true });
      return;
    }
    if (msg.type === "ackit:disable-site") {
      const host = msg.host ?? "";
      if (host) await setDisabledSite(host, true);
      // Notify content script to restore and disconnect
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "ackit:site-disabled", host });
      } catch {}
      sendResponse({ ok: true });
      return;
    }
    if (msg.type === "ackit:enable-site") {
      const host = msg.host ?? "";
      if (host) await setDisabledSite(host, false);
      sendResponse({ ok: true });
      return;
    }
    if (msg.type === "ackit:restore-page") {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "ackit:restore" });
      } catch {}
      sendResponse({ ok: true });
      return;
    }
    if (msg.type === "ackit:get-disabled") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const host = tab?.url ? safeHost(tab.url) : null;
      const disabled = host ? await isSiteDisabled(host) : false;
      sendResponse({ disabled, host });
      return;
    }
    if (msg.type === "ackit:bridge-connected") {
      // No-op: storage already set by side panel
      sendResponse({ ok: true });
      return;
    }
    sendResponse({ ok: false, error: "unknown message" });
  })();
  return true;
});

async function handleEmergencyDisconnect(host: string | null): Promise<void> {
  // 1. Clear session token (abort in-flight fetches via side panel's AbortController)
  await clearBridgeSession();
  // 2. Stop alarms
  try {
    await chrome.alarms.clearAll();
    await chrome.alarms.create("ackit:health", { periodInMinutes: 0.5 });
  } catch {}
  // 3. Best-effort bridge revoke if we have a session
  try {
    const session = await getBridgeSession();
    if (session) {
      await postStop(session);
    }
  } catch {}
  // 4. Disable current site and tell content to restore
  if (host) {
    try {
      await setDisabledSite(host, true);
    } catch {}
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "ackit:emergency-disconnect", host });
    } catch {}
  } else {
    // No host specified: broadcast to active tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "ackit:emergency-disconnect" });
    } catch {}
  }
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// Ensure sidePanel is available: on startup re-register panel behavior
chrome.runtime.onStartup?.addListener(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch {}
});

void HOSTS;
