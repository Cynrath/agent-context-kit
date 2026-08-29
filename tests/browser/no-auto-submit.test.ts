import { promises as fsp } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname ?? ".", "../..");
const browserSrc = path.join(repoRoot, "extensions/browser/src");

// Ensure the extension never auto-submits: insert is explicit, user presses Send.
describe("Browser Companion — no auto-submit", () => {
  it("sidepanel insert never triggers form submit or Send click", async () => {
    const sidepanelPath = path.join(browserSrc, "sidepanel/sidepanel.ts");
    const content = await fsp.readFile(sidepanelPath, "utf8");
    expect(content, "should not contain form.submit").not.toMatch(/\.submit\s*\(/);
    expect(content, "should not contain .click() on Send").not.toMatch(/Send[^;]*\.click/);
    expect(content, "should have comment about no auto-submit").toMatch(
      /No auto-submit|never auto-submits/i,
    );
    // Insert must go via chrome.tabs.sendMessage ackit:insert
    expect(content).toContain("ackit:insert");
    expect(content).not.toContain('fetch("https://');
  });

  it("adapters insertText never auto-submits", async () => {
    const adapterFiles = [
      path.join(browserSrc, "adapters/chatgpt/index.ts"),
      path.join(browserSrc, "adapters/claude/index.ts"),
      path.join(browserSrc, "adapters/gemini/index.ts"),
      path.join(browserSrc, "adapters/github/index.ts"),
    ];
    for (const file of adapterFiles) {
      const content = await fsp.readFile(file, "utf8");
      const rel = path.relative(repoRoot, file);
      expect(content, `${rel} should not contain form.submit`).not.toMatch(/form\.submit/);
      // The adapter's insertText should use execCommand or value assignment, not click Send
      expect(content, `${rel} should contain insert logic`).toMatch(
        /execCommand|selectionStart|textContent/,
      );
      expect(content, `${rel} should mention never auto-submit or not click`).not.toMatch(
        /\.click\(\)/,
      );
    }
  });

  it("no extension file contains chrome.identity or OAuth that would require <all_urls>", async () => {
    const files = await collectFiles(browserSrc);
    for (const file of files) {
      const content = await fsp.readFile(file, "utf8");
      expect(content).not.toContain("chrome.identity");
    }
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
