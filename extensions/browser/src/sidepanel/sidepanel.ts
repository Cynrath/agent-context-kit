// Side Panel — primary UI for Browser Companion
// No auto-submit: Preview → Insert → user presses Send.

import {
  bridgeFetch,
  fetchActiveTask,
  fetchContext,
  fetchEvidence,
  fetchStatus,
  postStop,
} from "../lib/bridge-client.js";
import {
  clearBridgeSession,
  getBridgeSession,
  getDisabledSites,
  isSiteDisabled,
  setBridgeSession,
  setDisabledSite,
} from "../lib/storage.js";

let abortController: AbortController | null = null;
let previewContent = "";

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

function dot(ok: boolean | null): void {
  const d = $("status-dot");
  const t = $("status-text");
  if (ok === true) {
    d.className = "dot ok";
    t.textContent = "Connected";
  } else if (ok === false) {
    d.className = "dot bad";
    t.textContent = "Disconnected";
  } else {
    d.className = "dot";
    t.textContent = "Unknown";
  }
}

async function getActiveHost(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return null;
    return new URL(tab.url).hostname;
  } catch {
    return null;
  }
}

async function updateHealth(): Promise<void> {
  const healthEl = $("health") as HTMLPreElement;
  const diagEl = $("diag") as HTMLPreElement;
  const session = await getBridgeSession();
  if (!session) {
    healthEl.textContent = "Not connected. Start `ackit browser start` and paste endpoint + token.";
    diagEl.textContent = `Bridge: not connected\nHost: ${(await getActiveHost()) ?? "unknown"}`;
    dot(false);
    return;
  }
  abortController?.abort();
  abortController = new AbortController();
  const res = await fetchStatus(session, abortController.signal);
  if (res.ok) {
    const data = res.data as { version?: string; canonicalRoot?: string; uptimeMs?: number };
    healthEl.textContent = `OK — ${session.endpoint} — v${(data as { version?: string }).version ?? "?"}`;
    diagEl.textContent = `Bridge: connected\nEndpoint: ${session.endpoint}\nVersion: ${data.version ?? "?"}\nUptime: ${data.uptimeMs ?? "?"}ms`;
    dot(true);
  } else {
    healthEl.textContent = `Error ${res.error.status} ${res.error.code}: ${res.error.message}`;
    diagEl.textContent = `Bridge: error\n${res.error.code}: ${res.error.message}`;
    dot(false);
  }
  // Update disabled state hint
  const host = await getActiveHost();
  const disabled = host ? await isSiteDisabled(host).catch(() => false) : false;
  const disableBtn = $("btn-disable-site") as HTMLButtonElement;
  disableBtn.textContent = disabled
    ? "ACKit disabled on this site (click to enable)"
    : "Disable ACKit on this site";
}

async function doEmergencyDisconnect(): Promise<void> {
  abortController?.abort();
  const host = await getActiveHost();
  // Clear session storage token
  await clearBridgeSession();
  // Revoke via bridge if reachable (best-effort)
  try {
    const session = await getBridgeSession();
    if (session) await postStop(session);
  } catch {}
  // Tell service worker to handle site disable + content restore
  try {
    await chrome.runtime.sendMessage({ type: "ackit:emergency-disconnect", host });
  } catch {}
  // Also tell content directly
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id)
      await chrome.tabs.sendMessage(tab.id, { type: "ackit:emergency-disconnect", host });
  } catch {}
  await updateHealth();
  alert(
    "ACKit Emergency Disconnect: bridge cleared, page restore requested. Use Reconnect to re-enable.",
  );
}

async function doConnect(): Promise<void> {
  const endpointInput = ($("inp-endpoint") as HTMLInputElement).value.trim();
  const tokenInput = ($("inp-token") as HTMLInputElement).value.trim();
  if (!endpointInput || !tokenInput) {
    alert("Enter endpoint (e.g. http://127.0.0.1:58732) and token from `ackit browser start`.");
    return;
  }
  let host = "127.0.0.1";
  let port = 0;
  try {
    const url = new URL(endpointInput);
    host = url.hostname;
    port = Number.parseInt(url.port, 10);
  } catch {
    alert("Invalid endpoint URL");
    return;
  }
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    alert("Endpoint must be loopback (127.0.0.1 or localhost)");
    return;
  }
  const session = { endpoint: endpointInput, token: tokenInput, host, port };
  await setBridgeSession(session);
  await chrome.runtime.sendMessage({ type: "ackit:bridge-connected" }).catch(() => {});
  await updateHealth();
}

async function doDisconnect(): Promise<void> {
  abortController?.abort();
  const session = await getBridgeSession();
  if (session) {
    try {
      await postStop(session);
    } catch {}
  }
  await clearBridgeSession();
  await updateHealth();
}

async function insertToComposer(text: string): Promise<void> {
  if (!text) {
    alert("Preview is empty.");
    return;
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      alert("No active tab");
      return;
    }
    const host = tab.url ? new URL(tab.url).hostname : "";
    const disabled = await isSiteDisabled(host).catch(() => false);
    if (disabled) {
      alert("ACKit is disabled on this site. Click Reconnect / Enable.");
      return;
    }
    const res = (await chrome.tabs.sendMessage(tab.id, { type: "ackit:insert", text })) as {
      ok?: boolean;
      error?: string;
    };
    if (!res?.ok) alert(`Insert failed: ${res?.error ?? "unknown"}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    alert(`Insert failed: ${msg}`);
  }
}

async function fetchAndPreview(
  kind: "task" | "instructions" | "context" | "evidence",
): Promise<void> {
  const session = await getBridgeSession();
  if (!session) {
    alert("Connect to bridge first.");
    return;
  }
  abortController?.abort();
  abortController = new AbortController();
  const signal = abortController.signal;
  let text = "";
  if (kind === "task") {
    const res = await fetchActiveTask(session, signal);
    if (!res.ok) {
      alert(`Task fetch failed: ${res.error.message}`);
      return;
    }
    const data = res.data as {
      task?: { id?: string; title?: string; bodyPreview?: string } | null;
    };
    if (!data.task) text = "No active task.";
    else text = `# ${data.task.id} — ${data.task.title}\n\n${data.task.bodyPreview ?? ""}`;
  } else if (kind === "context") {
    const res = await fetchContext(session, { maxTokens: 40000 }, signal);
    if (!res.ok) {
      alert(`Context fetch failed: ${res.error.message}`);
      return;
    }
    const data = res.data as { pack?: { markdown?: string } };
    text = data.pack?.markdown ?? "No context.";
  } else if (kind === "evidence") {
    const res = await fetchEvidence(session, 20, signal);
    if (!res.ok) {
      alert(`Evidence fetch failed: ${res.error.message}`);
      return;
    }
    const data = res.data as {
      findings?: Array<{ ruleId?: string; message?: string; relativePath?: string }>;
    };
    const findings = data.findings ?? [];
    text =
      findings
        .map((f) => `- ${f.ruleId ?? "?"}: ${f.message ?? ""} (${f.relativePath ?? ""})`)
        .join("\n") || "No evidence.";
  } else if (kind === "instructions") {
    // Instructions effective via direct bridgeFetch
    const res = await bridgeFetch(session, "/v1/instructions/effective", { signal });
    if (!res.ok) {
      alert(`Instructions fetch failed: ${res.error.message}`);
      return;
    }
    const data = res.data as { effective?: { stack?: Array<{ path?: string }> } };
    const stack = (data.effective as { stack?: Array<{ relativePath?: string }> })?.stack ?? [];
    text =
      stack.map((s) => `- ${s.relativePath ?? String(s)}`).join("\n") ||
      "No effective instructions.";
  }
  previewContent = text;
  ($("inp-composer") as HTMLTextAreaElement).value = text;
  updateCounts();
}

async function restoreProjectContext(): Promise<void> {
  const session = await getBridgeSession();
  if (!session) {
    alert("Connect to bridge first.");
    return;
  }
  abortController?.abort();
  abortController = new AbortController();
  const signal = abortController.signal;
  // Compose deterministic handoff: repository + task + instructions + evidence + context + readiness
  const [statusRes, taskRes, instrRes, readinessRes, evidenceRes, contextRes, repoRes] =
    await Promise.all([
      fetchStatus(session, signal),
      fetchActiveTask(session, signal),
      bridgeFetch(session, "/v1/instructions/effective", { signal }),
      bridgeFetch(session, "/v1/readiness", { signal }),
      fetchEvidence(session, 10, signal),
      fetchContext(session, { maxTokens: 8000 }, signal),
      bridgeFetch(session, "/v1/repository", { signal }),
    ]);

  const parts: string[] = [];
  parts.push("# Restore Project Context — ACKit handoff");
  parts.push(
    `Generated: ${new Date().toISOString().slice(0, 10)} · ACKit Browser Companion v0.3 (deterministic)`,
  );
  if (repoRes.ok) {
    const r = repoRes.data as { root?: string; canonicalRoot?: string };
    const repoLine = (r.canonicalRoot ?? r.root ?? "?").split("/").pop() ?? "?";
    parts.push(`Repository: ${repoLine} · ${r.canonicalRoot ?? r.root ?? "?"}`);
  } else if (statusRes.ok) {
    const s = statusRes.data as { canonicalRoot?: string; version?: string };
    parts.push(`Repository: ${s.canonicalRoot ?? "?"}`);
    parts.push(`ACKit: ${s.version ?? "?"}`);
  }
  if (statusRes.ok) {
    const s = statusRes.data as { version?: string };
    parts.push(`Version: ${s.version ?? "?"}`);
  }
  if (taskRes.ok) {
    const t = (
      taskRes.data as {
        task?: { id?: string; title?: string; bodyPreview?: string; status?: string };
      }
    ).task;
    if (t) {
      parts.push(
        `\n## Active task\n- ${t.id} — ${t.title} (${t.status ?? "?"})\n${t.bodyPreview ?? ""}`,
      );
    } else {
      parts.push("\n## Active task\nNone — no pending/active task found.");
    }
  }
  if (instrRes.ok) {
    const e = (
      instrRes.data as { effective?: { stack?: Array<{ relativePath?: string; id?: string }> } }
    ).effective;
    const stack = e?.stack ?? [];
    // Deterministic: sort by relativePath already, but we emit in given order
    parts.push(`\n## Effective instructions (${stack.length} nodes)`);
    for (const n of stack.slice(0, 20)) {
      parts.push(`- ${n.relativePath ?? n.id ?? "?"}`);
    }
    if (stack.length > 20) parts.push(`- … and ${stack.length - 20} more`);
  }
  if (evidenceRes.ok) {
    const ev = evidenceRes.data as {
      findings?: Array<{ ruleId?: string; message?: string; relativePath?: string }>;
    };
    const findings = ev.findings ?? [];
    parts.push(`\n## Evidence (${findings.length} findings, showing up to 5)`);
    for (const f of findings.slice(0, 5)) {
      parts.push(`- ${f.ruleId ?? "?"}: ${f.message ?? ""} (${f.relativePath ?? ""})`);
    }
    if (findings.length > 5) parts.push(`- … and ${findings.length - 5} more`);
  }
  if (contextRes.ok) {
    const pack = (
      contextRes.data as {
        pack?: {
          manifest?: Array<{ path?: string; tokens?: number }>;
          budget?: { maxTokens?: number; usedTokens?: number };
        };
      }
    ).pack;
    const manifest = pack?.manifest ?? [];
    parts.push(
      `\n## Context pack (${pack?.budget?.usedTokens ?? "?"} / ${pack?.budget?.maxTokens ?? "?"} tokens)`,
    );
    for (const m of manifest.slice(0, 10)) {
      parts.push(`- ${m.path ?? "?"} (${m.tokens ?? "?"} tok)`);
    }
  }
  if (readinessRes.ok) {
    const r = (
      readinessRes.data as {
        score?: { overall?: number; categories?: Array<{ id?: string; score?: number }> };
      }
    ).score;
    parts.push(`\n## Readiness\nOverall: ${r?.overall ?? "?"} / 100`);
    if (r?.categories) {
      for (const c of r.categories) {
        parts.push(`- ${c.id}: ${c.score}`);
      }
    }
  }
  parts.push(
    "\n---\nPaste this handoff into a new chat to restore project context. Nothing was auto-submitted.",
  );
  previewContent = parts.join("\n");
  ($("inp-composer") as HTMLTextAreaElement).value = previewContent;
  updateCounts();
}

type NavItemWithPin = { id: string; label?: string; pinned?: boolean; index?: number };

async function updateCounts(): Promise<void> {
  const txt = ($("inp-composer") as HTMLTextAreaElement).value;
  previewContent = txt;
  const counts = $("perf-counts");
  const navigatorEl = $("navigator");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      counts.textContent = "";
      navigatorEl.textContent = "";
      return;
    }
    const nav = (await chrome.tabs
      .sendMessage(tab.id, { type: "ackit:navigate" })
      .catch(() => null)) as { items?: NavItemWithPin[] } | null;
    const items = nav?.items ?? [];
    counts.textContent = `${items.length} turns detected — pin keeps visible during compact`;
    navigatorEl.innerHTML = "";
    for (const it of items.slice(0, 40)) {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "6px";
      row.style.padding = "2px 0";
      const label = document.createElement("span");
      label.textContent = it.label ?? `Turn ${String(it.index ?? "?")}`;
      label.style.flex = "1";
      if (it.pinned) {
        label.style.fontWeight = "600";
        label.textContent = `📌 ${label.textContent}`;
      }
      const btn = document.createElement("button");
      btn.textContent = it.pinned ? "Unpin" : "Pin";
      btn.title = it.pinned ? "Keep visible: will survive compaction" : "Pin to keep visible";
      btn.style.fontSize = "11px";
      btn.style.padding = "2px 6px";
      // Use narrow closure with correct types
      const turnId: string = it.id;
      const nextPinned: boolean = !it.pinned;
      btn.addEventListener("click", () => {
        void (async () => {
          try {
            const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!t?.id) return;
            await chrome.tabs.sendMessage(t.id, {
              type: "ackit:pin",
              id: turnId,
              pinned: nextPinned,
            });
            await updateCounts();
          } catch {}
        })();
      });
      row.appendChild(label);
      row.appendChild(btn);
      navigatorEl.appendChild(row);
    }
    if (items.length > 40) {
      const more = document.createElement("div");
      more.textContent = `… and ${items.length - 40} more`;
      more.style.opacity = "0.7";
      more.style.fontSize = "11px";
      navigatorEl.appendChild(more);
    }
  } catch {
    counts.textContent = "";
  }
}

function wire(): void {
  $("btn-emergency").addEventListener("click", () => void doEmergencyDisconnect());
  $("btn-disable-site").addEventListener("click", async () => {
    const host = await getActiveHost();
    if (!host) return;
    const disabled = await isSiteDisabled(host);
    if (disabled) {
      await setDisabledSite(host, false);
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "ackit:restore" });
      } catch {}
    } else {
      await chrome.runtime.sendMessage({ type: "ackit:disable-site", host });
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "ackit:site-disabled", host });
      } catch {}
    }
    await updateHealth();
  });
  $("btn-restore").addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "ackit:restore" });
    } catch {}
    await chrome.runtime.sendMessage({ type: "ackit:restore-page" }).catch(() => {});
  });
  $("btn-reconnect").addEventListener("click", async () => {
    const host = await getActiveHost();
    if (host) await setDisabledSite(host, false);
    await chrome.runtime
      .sendMessage({ type: "ackit:enable-site", host: host ?? "" })
      .catch(() => {});
    await updateHealth();
  });
  $("btn-connect").addEventListener("click", () => void doConnect());
  $("btn-disconnect").addEventListener("click", () => void doDisconnect());
  $("btn-task").addEventListener("click", () => void fetchAndPreview("task"));
  $("btn-instructions").addEventListener("click", () => void fetchAndPreview("instructions"));
  $("btn-preview-context").addEventListener("click", () => void fetchAndPreview("context"));
  $("btn-insert-context").addEventListener(
    "click",
    () => void fetchAndPreview("context").then(() => void insertToComposer(previewContent)),
  );
  $("btn-evidence").addEventListener("click", () => void fetchAndPreview("evidence"));
  $("btn-restore-context").addEventListener("click", () => void restoreProjectContext());
  $("btn-insert-preview").addEventListener("click", () => {
    const text = ($("inp-composer") as HTMLTextAreaElement).value;
    void insertToComposer(text);
  });
  $("btn-compact").addEventListener("click", async () => {
    const keep = Number.parseInt(($("inp-keep") as HTMLInputElement).value, 10) || 10;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      const res = (await chrome.tabs.sendMessage(tab.id, {
        type: "ackit:compact",
        keepRecent: keep,
      })) as { ok?: boolean; result?: { compacted?: number } };
      if (res?.ok) await updateCounts();
    } catch {}
  });
  $("btn-restore-perf").addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) await chrome.tabs.sendMessage(tab.id, { type: "ackit:restore" });
      await updateCounts();
    } catch {}
  });
  $("btn-show-prev").addEventListener("click", async () => {
    // Show previous 5 = increase keepRecent by 5 and restore then compact again
    const inp = $("inp-keep") as HTMLInputElement;
    const cur = Number.parseInt(inp.value, 10) || 10;
    inp.value = String(cur + 5);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, { type: "ackit:restore" });
        await chrome.tabs.sendMessage(tab.id, { type: "ackit:compact", keepRecent: cur + 5 });
      }
      await updateCounts();
    } catch {}
  });
  ($("inp-composer") as HTMLTextAreaElement).addEventListener("input", () => {
    previewContent = ($("inp-composer") as HTMLTextAreaElement).value;
  });
}

wire();
void updateHealth();
// Poll health every 10s
setInterval(() => void updateHealth(), 10_000);
void updateCounts();

// Listen for disabled state changes from SW
chrome.storage.onChanged.addListener(() => void updateHealth());

// Expose counts on load
void getDisabledSites().then(() => void updateHealth());
