import { promises as fsp } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname ?? ".", "../..");
const browserSrc = path.join(repoRoot, "extensions/browser/src");

describe("Browser Companion adapter contracts — static", () => {
  it("defines a common SiteAdapter contract", async () => {
    const typesPath = path.join(browserSrc, "adapters/types.ts");
    const content = await fsp.readFile(typesPath, "utf8");
    expect(content).toContain("interface SiteAdapter");
    expect(content).toContain("detect(): boolean");
    expect(content).toContain("healthCheck(): AdapterHealth");
    expect(content).toContain("findComposer()");
    expect(content).toContain("insertText(");
    expect(content).toContain("isStreaming()");
    expect(content).toContain("enumerateTurns()");
    expect(content).toContain("compact(");
    expect(content).toContain("restore()");
    expect(content).toContain("navigator()");
    expect(content).toContain("disconnect()");
  });

  it("no core module knows provider selectors (isolation)", async () => {
    const coreFiles = await collectFiles(path.join(repoRoot, "src/core"));
    for (const file of coreFiles) {
      const content = await fsp.readFile(file, "utf8");
      // Core must not contain ChatGPT/Claude selectors
      expect(content).not.toContain("#thread");
      expect(content).not.toContain("conversation-turn");
      expect(content).not.toContain("claude.ai");
      expect(content).not.toContain("chat.openai.com");
    }
  });

  it("ChatGPT adapter uses stable semantic selectors, not hashed Tailwind classes", async () => {
    const chatPath = path.join(browserSrc, "adapters/chatgpt/index.ts");
    const content = await fsp.readFile(chatPath, "utf8");
    expect(content).toContain("#thread");
    expect(content).toContain("[data-turn-id-container]");
    expect(content).toContain("conversation-turn");
    expect(content).toContain("[data-message-author-role]");
    // Should not contain Tailwind hashed patterns like bg-[#xxxx] or random class hashes
    expect(content).not.toMatch(/bg-\[#/);
    // Health check must exist and fail closed
    expect(content).toContain("healthCheck");
    expect(content).toContain("fail closed");
  });

  it("Claude/Gemini/GitHub adapters do not reuse ChatGPT selectors verbatim", async () => {
    const claude = await fsp.readFile(path.join(browserSrc, "adapters/claude/index.ts"), "utf8");
    const gemini = await fsp.readFile(path.join(browserSrc, "adapters/gemini/index.ts"), "utf8");
    const github = await fsp.readFile(path.join(browserSrc, "adapters/github/index.ts"), "utf8");
    // They should have their own detect() with hostname checks
    expect(claude).toContain("claude.ai");
    expect(gemini).toContain("gemini.google.com");
    expect(github).toContain("github.com");
    // They should not contain the ChatGPT #thread selector as primary root
    expect(claude).not.toContain("#thread");
    expect(gemini).not.toContain("#thread");
  });

  it("no extension source does auto-submit or synthesizes Send click", async () => {
    const files = await collectFiles(browserSrc);
    for (const file of files) {
      const content = await fsp.readFile(file, "utf8");
      const rel = path.relative(repoRoot, file).split(path.sep).join("/");
      // Forbid auto-submit patterns
      expect(content, `${rel} should not auto-submit`).not.toMatch(/form\.submit\s*\(/);
      expect(content, `${rel} should not click Send`).not.toMatch(/click\(\)[^;]*Send/i);
      // The only allowed insert is via execCommand / value assignment, not via fetch to external
      // Check that no fetch to https://* in extension src (only loopback)
      // This is already covered by offline-egress, but double-check here
      if (content.includes("fetch(")) {
        expect(content, `${rel} fetch must be loopback only`).toMatch(
          /127\.0\.0\.1|localhost|bridgeFetch/,
        );
      }
    }
  });

  it("extension storage uses chrome.storage, not website localStorage", async () => {
    const storagePath = path.join(browserSrc, "lib/storage.ts");
    const content = await fsp.readFile(storagePath, "utf8");
    expect(content).toContain("chrome.storage.local");
    expect(content).toContain("chrome.storage.session");
    expect(content).not.toContain("window.localStorage");
    expect(content).not.toContain("localStorage.setItem");
    // Per-site scoped keys
    expect(content).toContain("ackit:browser:site:");
  });

  it("content script handles SPA lifecycle (pushState/replaceState + popstate)", async () => {
    const contentPath = path.join(browserSrc, "content/content.ts");
    const content = await fsp.readFile(contentPath, "utf8");
    expect(content).toContain("pushState");
    expect(content).toContain("replaceState");
    expect(content).toContain("popstate");
    expect(content).toContain("hashchange");
    expect(content).toContain("disconnect()");
    expect(content).toContain("restore()");
  });

  it("performance engine uses reversible, balanced hierarchy (no detach as default)", async () => {
    const chatPath = path.join(browserSrc, "adapters/chatgpt/index.ts");
    const content = await fsp.readFile(chatPath, "utf8");
    expect(content).toContain("contentVisibility");
    expect(content).toContain("containIntrinsicSize");
    expect(content).toContain("data-ackit-collapsed");
    // Should not contain node.remove() on turn elements as default (only placeholder removal)
    // Allow placeholder remove, but not turn element remove
    const turnRemove = (content.match(/turn\.element\.remove\(\)/g) ?? []).length;
    expect(turnRemove).toBe(0);
    // Must handle streaming pause
    expect(content).toContain("isStreaming()");
    expect(content).toContain("isPaused");
    // Must handle focus safety
    expect(content).toContain("hasFocusedControlInside");
    // Must handle scroll anchoring
    expect(content).toContain("bottomDistance");
    // Must handle narrow MutationObserver
    expect(content).toContain("MutationObserver");
    expect(content).toContain("childList: true");
    expect(content).toContain("subtree: false");
  });

  it("emergency disconnect leaves no DOM marks — restore removes all", async () => {
    const chatPath = path.join(browserSrc, "adapters/chatgpt/index.ts");
    const content = await fsp.readFile(chatPath, "utf8");
    expect(content).toContain("restore(): void");
    expect(content).toContain("ackit-placeholder");
    expect(content).toContain("removeAttribute");
    // Ensure disconnect clears observers and timers
    expect(content).toContain("tracker.disconnect()");
    expect(content).toContain("observer?.disconnect()");
  });
});

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collectFiles(full)));
    else if (/\.(ts|js)$/.test(e.name)) out.push(full);
  }
  return out;
}
