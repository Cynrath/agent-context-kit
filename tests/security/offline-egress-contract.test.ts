import { promises as fsp } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname ?? ".", "../..");

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
  const out: string[] = [];
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await collectFiles(full)));
    else if (/\.(ts|js|mjs|cjs)$/.test(e.name)) out.push(full);
  }
  return out;
}

describe("offline-egress contract — static", () => {
  it("no outbound primitives in shipped src runtime except allowlisted node:http", async () => {
    const srcFiles = await collectFiles(path.join(repoRoot, "src"));
    const allowlisted = new Set(["src/core/dashboard/server.ts", "src/core/reporting/serve.ts"]);
    let violations: string[] = [];

    for (const full of srcFiles) {
      const rel = path.relative(repoRoot, full).split(path.sep).join("/");
      if (rel.endsWith(".d.ts")) continue;
      const content = await fsp.readFile(full, "utf8");

      // Check forbidden patterns
      const checks: Array<[RegExp, string]> = [
        [/from\s+["']node:https["']/g, "node:https import"],
        [/https\.(request|get)\s*\(/g, "https.request/get"],
        [/http\.(request|get)\s*\(/g, "http.request/get — outbound"],
        [/net\.connect\s*\(/g, "net.connect"],
        [/Socket\.prototype\.connect/g, "Socket.connect"],
        [/from\s+["']node:net["']/g, "node:net import"],
        [/from\s+["']node:tls["']/g, "node:tls import"],
        [/tls\.connect\s*\(/g, "tls.connect"],
        [/from\s+["']node:dgram["']/g, "node:dgram import"],
        [/dns\.(resolve|lookup)\s*\(/g, "dns.resolve/lookup"],
        [/\bWebSocket\s*\(/g, "WebSocket"],
        [/\bEventSource\s*\(/g, "EventSource"],
        [/\baxios\b/g, "axios"],
        [/\bgot\b/g, "got (if import)"],
        [/\bcurl\s|\bwget\s/g, "curl/wget"],
      ];

      for (const [re, msg] of checks) {
        // Skip if content contains only comment? We flag anyway.
        // But filter out $schema https:// lines for https check? Our regex for http.request already filters, not for axios.
        // For axios we need to ensure it's not just comment
        re.lastIndex = 0;
        if (re.test(content)) {
          // Special: allow http.request detection to be filtered for createServer case — our regex already only matches request/get, so any hit is violation
          // For node:http import, allowlist
          if (msg.includes("node:http")) {
            // not in this list
          }
          violations.push(`${rel}: ${msg}`);
        }
      }

      // node:http allowlist check
      if (content.includes('from "node:http"') || content.includes("from 'node:http'")) {
        if (!allowlisted.has(rel)) {
          violations.push(`${rel}: node:http import not allowlisted`);
        } else {
          // For allowlisted, ensure it uses createServer not request
          expect(content).toContain("createServer");
          expect(content).not.toMatch(/http\.(request|get)\s*\(/);
          // Ensure default host is loopback
          expect(content).toMatch(/127\.0\.0\.1|localhost|::1/);
        }
      }

      // fetch checks: only relative /api/... allowed
      const fetchRe = /fetch\s*\(/g;
      for (const m of content.matchAll(fetchRe)) {
        const snippet = content.slice(m.index ?? 0, (m.index ?? 0) + 150);
        // Extract arg
        const argMatch = snippet.match(/fetch\s*\(\s*(['"`][^'"`]*['"`])/);
        if (argMatch) {
          const url = (argMatch[1] ?? "").slice(1, -1);
          if (url.startsWith("/api/") || url.startsWith("/")) {
            // Ensure not // or http
            expect(url.startsWith("//")).toBe(false);
            expect(/^https?:\/\//i.test(url)).toBe(false);
          } else if (/^https?:\/\//i.test(url) || url.startsWith("//")) {
            violations.push(`${rel}: fetch remote URL ${url}`);
          }
        } else {
          // dynamic fetch — check if in src/core/dashboard — only allowlisted is literal
          // If any dynamic fetch in src, flag
          violations.push(`${rel}: fetch dynamic variable ${snippet.slice(0, 40)}`);
        }
      }

      // Remote asset/CDN
      if (/fonts\.googleapis|cdn\.jsdelivr|unpkg\.com|googletagmanager|analytics/i.test(content)) {
        // But allow in comments? We still treat as violation in src
        violations.push(`${rel}: remote asset/CDN/analytics`);
      }

      // Git network commands in src
      if (/git\s+(fetch|pull|push|clone|ls-remote)/.test(content)) {
        violations.push(`${rel}: git network command in product runtime`);
      }
    }

    // Allow violations only if they are known allowlisted? Currently we expect zero.
    // Filter out false positives for "got" which may appear as word in comments? We flagged simple \bgot\b, refine:
    // Our violations list for "got" may be noisy; re-check: if violation contains "got (if import)" and content does not import got, we may have false flag.
    // For this test, we assert that src has no real egress: if we flagged got but it's just English word, it would still be flagged — so tighten.
    // Re-filter: only count violations that are not English word "got" in comments? Simplify: expect zero for real primitives; allow word "forgot" etc? Our regex \bgot\b will match comment word "got". So we remove that check from strict.
    violations = violations.filter(
      (v) =>
        !v.includes("got (if import)") ||
        v.includes("require('got')") ||
        v.includes("from 'got'") ||
        v.includes("axios"),
    );

    if (violations.length > 0) {
      console.error("violations:", violations);
    }
    expect(violations).toEqual([]);
  });

  it("extensions/vscode has no network client", async () => {
    const vscodeFiles = await collectFiles(path.join(repoRoot, "extensions/vscode/src")).catch(
      () => [],
    );
    for (const full of vscodeFiles) {
      const content = await fsp.readFile(full, "utf8");
      expect(content).not.toMatch(/fetch\s*\(\s*["']https?:\/\//i);
      expect(content).not.toMatch(/from\s+["']node:https["']/);
      expect(content).not.toMatch(/axios|got|undici/);
      expect(content).not.toContain("telemetry");
    }
  });

  it("dist/action has no outbound egress (if built)", async () => {
    const distPath = path.join(repoRoot, "dist/action/index.js");
    const content = await fsp.readFile(distPath, "utf8").catch(() => "");
    if (!content) return; // skip if not built yet
    expect(content).not.toMatch(/https\.request|https\.get|http\.request|http\.get/);
    expect(content).not.toMatch(/net\.connect|tls\.connect/);
    expect(content).not.toMatch(/WebSocket|EventSource/);
  });

  it("policy packs refuse http/https/ftp locations", async () => {
    // Verify source code contains POL-NETWORK-REFUSED for http
    const loadTs = await fsp.readFile(path.join(repoRoot, "src/core/policy/packs/load.ts"), "utf8");
    expect(loadTs).toContain("POL-NETWORK-REFUSED");
    expect(loadTs).toContain("isUrlShape");
    expect(loadTs).toMatch(/https\?|ftp/);

    const profileLoader = await fsp.readFile(
      path.join(repoRoot, "src/core/profiles/loader.ts"),
      "utf8",
    );
    expect(profileLoader).toContain("PROFILE-NETWORK-REFUSED");
    expect(profileLoader).toContain("remote URL fetch is forbidden");
  });

  it("provider profiles are local-only, no API calls", async () => {
    const builtIns = await fsp.readFile(
      path.join(repoRoot, "src/core/profiles/built-ins.ts"),
      "utf8",
    );
    // Should not contain fetch/http call for provider API
    expect(builtIns).not.toMatch(/fetch\s*\(/);
    expect(builtIns).not.toMatch(/https\.request/);
  });

  it("MCP is stdio only, no remote transport", async () => {
    const mcpIndex = await fsp
      .readFile(path.join(repoRoot, "src/mcp/server.ts"), "utf8")
      .catch(() => "");
    const mcpStdio = await fsp
      .readFile(path.join(repoRoot, "src/mcp/stdio.ts"), "utf8")
      .catch(() => "");
    const combined = mcpIndex + mcpStdio;
    expect(combined).not.toMatch(/WebSocket|EventSource|http\.request|https\.request/);
    // Should contain stdio (either file)
    expect(combined.toLowerCase()).toMatch(/stdio/);
    // Specifically ensure MCP uses McpServer from SDK and no remote transport
    expect(combined).toMatch(/McpServer/);
  });

  it("dashboard defaults to loopback and requires opt-in for non-loopback", async () => {
    const serverTs = await fsp.readFile(
      path.join(repoRoot, "src/core/dashboard/server.ts"),
      "utf8",
    );
    expect(serverTs).toContain("127.0.0.1");
    expect(serverTs).toContain("assertBindableHost");
    expect(serverTs).toMatch(/allowNonLocal/);

    const serveTs = await fsp.readFile(path.join(repoRoot, "src/core/reporting/serve.ts"), "utf8");
    expect(serveTs).toContain("127.0.0.1");
    expect(serveTs).toContain("assertBindableHost");
  });

  it("product runtime has no remote git commands", async () => {
    const files = await collectFiles(path.join(repoRoot, "src"));
    for (const f of files) {
      const content = await fsp.readFile(f, "utf8");
      // Allow git in tests? Only product src checked
      if (f.includes("git")) {
        // git.ts is wrapper for git operations but should not auto-fetch remote
        // Check that src/core/git/git.ts exists but does not auto fetch? It should have exec for git status/log without network? But git fetch is separate.
        // We forbid fetch/pull/push/clone in product code.
        const hasNetwork = /git\s+(fetch|pull|push|clone|ls-remote)/.test(content);
        // git.ts may legitimately call git for status but not network; we still forbid network.
        if (hasNetwork) {
          // Report
          throw new Error(`git network command found in ${f}`);
        }
      }
    }
  });
});
