import { promises as fsp } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname ?? ".", "../..");
const manifestPath = path.join(repoRoot, "extensions/browser/manifest.json");
const chromewebStorePath = path.join(repoRoot, "CHROMEWEBSTORE.md");

describe("Browser Companion manifest contract", () => {
  it("manifest exists and is MV3 with correct fields", async () => {
    const content = await fsp.readFile(manifestPath, "utf8");
    const manifest = JSON.parse(content) as {
      manifest_version?: number;
      name?: string;
      version?: string;
      permissions?: string[];
      host_permissions?: string[];
      background?: { service_worker?: string; type?: string };
      side_panel?: { default_path?: string };
      action?: Record<string, unknown>;
      content_scripts?: Array<{ matches?: string[] }>;
      content_security_policy?: { extension_pages?: string };
    };
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("ACKit Browser Companion");
    expect(manifest.version).toBe("0.3.0");
    expect(manifest.permissions).toEqual(["storage", "sidePanel", "alarms"]);
    // host_permissions must be exactly 6 enumerated, no <all_urls>
    expect(manifest.host_permissions).toEqual([
      "https://chat.openai.com/*",
      "https://chatgpt.com/*",
      "https://claude.ai/*",
      "https://gemini.google.com/*",
      "https://github.com/*",
      "http://127.0.0.1/*",
    ]);
    expect(manifest.host_permissions).not.toContain("<all_urls>");
    expect(manifest.background?.service_worker).toBe("dist/background/service-worker.js");
    expect(manifest.background?.type).toBe("module");
    expect(manifest.side_panel?.default_path).toBe("dist/sidepanel/sidepanel.html");
    expect(manifest.action).toBeDefined();
    // action must NOT have default_popup when setPanelBehavior is used
    expect((manifest.action as { default_popup?: string }).default_popup).toBeUndefined();
    expect(manifest.content_scripts?.length).toBe(4);
    const allMatches = manifest.content_scripts?.flatMap((cs) => cs.matches ?? []) ?? [];
    expect(allMatches).not.toContain("<all_urls>");
    expect(manifest.content_security_policy?.extension_pages).toBe(
      "script-src 'self'; object-src 'none'",
    );
  });

  it("manifest permissions have CHROMEWEBSTORE.md justifications", async () => {
    const cws = await fsp.readFile(chromewebStorePath, "utf8");
    for (const perm of ["storage", "sidePanel", "alarms"]) {
      expect(cws).toContain(perm);
    }
    for (const host of [
      "https://chat.openai.com/*",
      "https://chatgpt.com/*",
      "https://claude.ai/*",
      "https://gemini.google.com/*",
      "https://github.com/*",
      "http://127.0.0.1/*",
    ]) {
      expect(cws).toContain(host);
    }
    // No <all_urls> justification
    expect(cws).not.toMatch(/<all_urls>.*justification/i);
  });

  it("version matches CHROMEWEBSTORE.md Version History 0.3.0 Draft", async () => {
    const cws = await fsp.readFile(chromewebStorePath, "utf8");
    expect(cws).toContain("| 0.3.0 |");
    expect(cws).toContain("Draft");
  });

  it("extension dist is built and contains expected bundles", async () => {
    const bg = await fsp
      .stat(path.join(repoRoot, "extensions/browser/dist/background/service-worker.js"))
      .catch(() => null);
    expect(bg).not.toBeNull();
    const side = await fsp
      .stat(path.join(repoRoot, "extensions/browser/dist/sidepanel/sidepanel.js"))
      .catch(() => null);
    expect(side).not.toBeNull();
    const content = await fsp
      .stat(path.join(repoRoot, "extensions/browser/dist/content/content.js"))
      .catch(() => null);
    expect(content).not.toBeNull();
  });

  it("no <all_urls> in any extension source file", async () => {
    const files = await collectFiles(path.join(repoRoot, "extensions/browser/src"));
    for (const file of files) {
      const content = await fsp.readFile(file, "utf8");
      expect(content).not.toContain("<all_urls>");
    }
  });
});

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collectFiles(full)));
    else if (/\.(ts|js|html|json|css)$/.test(e.name)) out.push(full);
  }
  return out;
}
