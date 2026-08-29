#!/usr/bin/env node
/**
 * Offline-egress static gate.
 * Fails if product runtime introduces outbound network primitives outside allowlist.
 * Allowlist:
 * - node:http only in src/core/dashboard/server.ts, src/core/reporting/serve.ts,
 *   src/core/browser-bridge/server.ts (createServer, loopback) and
 *   src/cli/commands/browser.ts (loopback client probeHealth/stop via http.request to 127.0.0.1)
 * - fetch('/api/...') relative only (reject absolute/protocol-relative/dynamic)
 * - schema URLs (json.schemastore.org) are documentation, not fetch args
 * - product-runtime git network commands rejected
 */

import { promises as fsp } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Files to audit: shipped runtime
const AUDIT_GLOBS = ["src", "extensions/vscode/src", "templates", "dist/action"];

const ALLOWED_HTTP_MODULES = new Set([
  "src/core/dashboard/server.ts",
  "src/core/reporting/serve.ts",
  "src/core/browser-bridge/server.ts",
  "src/cli/commands/browser.ts",
]);

const ALLOWED_LOOPBACK_HTTP_REQUEST = new Set(["src/cli/commands/browser.ts"]);

const FORBIDDEN = [
  {
    id: "node-https-import",
    pattern: /from\s+["']node:https["']|require\(["']node:https["']\)|require\(["']https["']\)/g,
    message: "node:https import — outbound TLS client (product egress)",
  },
  {
    id: "https-request",
    pattern: /https\.(request|get)\s*\(/g,
    message: "https.request/https.get — outbound egress",
  },
  {
    id: "http-request",
    pattern: /http\.(request|get)\s*\(/g,
    message: "http.request/http.get — outbound egress (createServer is allowed)",
  },
  {
    id: "net-connect",
    pattern: /net\.connect\s*\(|Socket\.prototype\.connect/g,
    message: "net.connect / Socket.connect — outbound TCP",
  },
  {
    id: "node-net-import",
    pattern: /from\s+["']node:net["']/g,
    message: "node:net import — check for outbound usage",
  },
  {
    id: "node-tls-import",
    pattern: /from\s+["']node:tls["']|tls\.connect/g,
    message: "tls.connect / node:tls — outbound TLS",
  },
  {
    id: "node-dgram",
    pattern: /from\s+["']node:dgram["']|dgram\./g,
    message: "dgram — UDP outbound potential",
  },
  {
    id: "dns-resolve",
    pattern: /dns\.(resolve|lookup|resolve4|resolve6)\s*\(|from\s+["']node:dns/g,
    message: "dns.resolve/lookup — network",
  },
  {
    id: "websocket",
    pattern: /\bWebSocket\s*\(|new\s+WebSocket/g,
    message: "WebSocket — outbound",
  },
  {
    id: "eventsource",
    pattern: /\bEventSource\s*\(|new\s+EventSource/g,
    message: "EventSource — outbound",
  },
  {
    id: "axios-got-undici",
    pattern:
      /\baxios\s*\(|\baxios\.\b|from\s+["']axios["']|require\(["']axios["']\)|\bgot\s*\(|from\s+["']got["']|\bundici\b/g,
    message: "axios/got/undici — external request client",
  },
  {
    id: "curl-wget-powershell",
    pattern: /\bcurl\s|wget\s|Invoke-WebRequest|Invoke-RestMethod/g,
    message: "curl/wget/Invoke-WebRequest — network fetch in source",
  },
];

const GIT_NETWORK = [
  /git\s+fetch/g,
  /git\s+pull/g,
  /git\s+push/g,
  /git\s+clone/g,
  /git\s+ls-remote/g,
  /remote\s+update/g,
];

function getFetchViolations(content) {
  const violations = [];
  const fetchRe = /fetch\s*\(\s*(['"`][^'"`]*['"`]|[^,)]+)\s*[,)]/g;
  for (const m of content.matchAll(fetchRe)) {
    const arg = (m[1] ?? "").trim();
    const pos = m.index ?? 0;
    const line = content.slice(0, pos).split("\n").length;
    const col = pos - content.lastIndexOf("\n", pos);
    const snippet = m[0].slice(0, 80);
    if ((arg.startsWith("'") && arg.endsWith("'")) || (arg.startsWith('"') && arg.endsWith('"'))) {
      const url = arg.slice(1, -1);
      if (url.startsWith("/api/") || url.startsWith("/")) {
        if (url.startsWith("//")) {
          violations.push({
            line,
            col,
            message: `fetch protocol-relative URL refused: ${url}`,
            snippet,
          });
        } else if (/^https?:\/\//i.test(url)) {
          violations.push({
            line,
            col,
            message: `fetch absolute URL refused: ${url}`,
            snippet,
          });
        }
        continue;
      }
      if (/^https?:\/\//i.test(url) || url.startsWith("//") || url.startsWith("ftp:")) {
        violations.push({
          line,
          col,
          message: `fetch remote URL refused: ${url}`,
          snippet,
        });
      } else if (url.startsWith("http")) {
        violations.push({
          line,
          col,
          message: `fetch remote URL refused: ${url}`,
          snippet,
        });
      } else if (url.includes("://") || url.includes("//")) {
        violations.push({
          line,
          col,
          message: `fetch dynamic remote target refused: ${url}`,
          snippet,
        });
      }
    } else if (arg.startsWith("`")) {
      const inner = arg;
      if (
        inner.includes("http://") ||
        inner.includes("https://") ||
        inner.includes("//") ||
        inner.includes("${")
      ) {
        if (!inner.startsWith("`/api/") && !inner.startsWith("`/")) {
          violations.push({
            line,
            col,
            message: `fetch dynamic/template URL refused: ${inner.slice(0, 60)}`,
            snippet,
          });
        } else if (inner.includes("http")) {
          violations.push({
            line,
            col,
            message: `fetch template with http refused: ${inner.slice(0, 60)}`,
            snippet,
          });
        }
      } else {
        const url = inner.slice(1, -1);
        if (/^https?:\/\//i.test(url) || url.startsWith("//")) {
          violations.push({
            line,
            col,
            message: `fetch template remote URL refused: ${url}`,
            snippet,
          });
        }
      }
    } else {
      violations.push({
        line,
        col,
        message: `fetch dynamic variable refused: ${arg.slice(0, 40)}`,
        snippet,
      });
    }
  }
  return violations;
}

async function walk(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git") {
      continue;
    }
    if (e.name === "dist" && dir.includes("src")) {
      continue;
    }
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (e.isFile()) {
      if (/\.(ts|js|mjs|cjs|json|yml|yaml)$/.test(e.name)) {
        files.push(full);
      }
    }
  }
  return files;
}

async function main() {
  console.log(`[offline-egress] static gate — repo: ${repoRoot}`);
  const overallViolations = [];
  let scanned = 0;

  for (const glob of AUDIT_GLOBS) {
    const abs = path.join(repoRoot, glob);
    const stat = await fsp.stat(abs).catch(() => null);
    if (!stat) {
      continue;
    }
    const files = stat.isDirectory() ? await walk(abs) : [abs];
    for (const full of files) {
      const rel = path.relative(repoRoot, full).split(path.sep).join("/");
      if (rel.endsWith(".d.ts") || rel.endsWith(".map")) {
        continue;
      }
      const content = await fsp.readFile(full, "utf8").catch(() => "");
      scanned += 1;

      for (const rule of FORBIDDEN) {
        const re = new RegExp(rule.pattern.source, rule.pattern.flags);
        for (const m of content.matchAll(re)) {
          // Allow localhost loopback http.request for Browser Bridge CLI (probeHealth/stop)
          if (
            rule.id === "http-request" &&
            ALLOWED_LOOPBACK_HTTP_REQUEST.has(rel) &&
            (content.includes("127.0.0.1") || content.includes("localhost"))
          ) {
            continue;
          }
          const pos = m.index ?? 0;
          const after = content.slice(pos, pos + 200);
          const snippet = after.split("\n")[0]?.slice(0, 120) ?? "";
          const line = content.slice(0, pos).split("\n").length;
          const col = pos - content.lastIndexOf("\n", pos);
          overallViolations.push({
            file: rel,
            line,
            col,
            rule: rule.id,
            message: rule.message,
            snippet,
          });
        }
      }

      const httpImportRe = /from\s+["']node:http["']|require\(["']node:http["']\)/g;
      for (const hm of content.matchAll(httpImportRe)) {
        const pos = hm.index ?? 0;
        if (!ALLOWED_HTTP_MODULES.has(rel)) {
          const line = content.slice(0, pos).split("\n").length;
          overallViolations.push({
            file: rel,
            line,
            col: pos - content.lastIndexOf("\n", pos),
            rule: "node-http-import-not-allowlisted",
            message: `node:http import only allowed in ${[...ALLOWED_HTTP_MODULES].join(", ")}`,
            snippet: hm[0],
          });
        } else if (
          !content.includes("127.0.0.1") &&
          !content.includes("localhost") &&
          !content.includes("::1")
        ) {
          overallViolations.push({
            file: rel,
            line: content.slice(0, pos).split("\n").length,
            col: 1,
            rule: "node-http-host-not-loopback",
            message: "node:http server must default to loopback (127.0.0.1/localhost/::1)",
            snippet: hm[0],
          });
        }
      }

      const fetchV = getFetchViolations(content);
      for (const v of fetchV) {
        overallViolations.push({
          file: rel,
          line: v.line,
          col: v.col,
          rule: "fetch-remote-dynamic",
          message: v.message,
          snippet: v.snippet,
        });
      }

      if (rel.startsWith("src/") || rel.startsWith("extensions/")) {
        for (const re of GIT_NETWORK) {
          const gRe = new RegExp(re.source, re.flags);
          for (const gm of content.matchAll(gRe)) {
            const pos = gm.index ?? 0;
            const line = content.slice(0, pos).split("\n").length;
            overallViolations.push({
              file: rel,
              line,
              col: pos - content.lastIndexOf("\n", pos),
              rule: "git-network-command",
              message: `product-runtime git network command refused: ${gm[0]}`,
              snippet: gm[0],
            });
          }
        }
      }
    }
  }

  const remoteAssetRe =
    /(fonts\.googleapis|cdn\.jsdelivr|cdn\.skypack|unpkg\.com|analytics|googletagmanager|beacon)/i;
  for (const glob of AUDIT_GLOBS) {
    const abs = path.join(repoRoot, glob);
    const stat = await fsp.stat(abs).catch(() => null);
    if (!stat?.isDirectory()) {
      continue;
    }
    const files = await walk(abs);
    for (const full of files) {
      const rel = path.relative(repoRoot, full).split(path.sep).join("/");
      if (rel.endsWith(".d.ts")) {
        continue;
      }
      const content = await fsp.readFile(full, "utf8").catch(() => "");
      for (const m of content.matchAll(new RegExp(remoteAssetRe.source, "gi"))) {
        const pos = m.index ?? 0;
        overallViolations.push({
          file: rel,
          line: content.slice(0, pos).split("\n").length,
          col: 1,
          rule: "remote-asset",
          message: `remote asset/CDN/analytics refused in product runtime: ${m[0]}`,
          snippet: content.slice(pos, pos + 80).split("\n")[0] ?? "",
        });
      }
    }
  }

  console.log(`[offline-egress] scanned ${scanned} file(s)`);
  if (overallViolations.length === 0) {
    console.log(
      "[offline-egress] PASS — no outbound egress primitives found (allowlist respected)",
    );
    console.log(`[offline-egress] allowlisted node:http: ${[...ALLOWED_HTTP_MODULES].join(", ")}`);
    console.log("[offline-egress] allowed fetch: relative /api/... only");
    console.log(
      "[offline-egress] local dashboard exception: node:http createServer bound to 127.0.0.1 by default (assertBindableHost)",
    );
    process.exit(0);
  } else {
    console.error(`[offline-egress] FAIL — ${overallViolations.length} violation(s):`);
    for (const v of overallViolations) {
      console.error(`  ${v.file}:${v.line}:${v.col} [${v.rule}] ${v.message}`);
      console.error(`    > ${v.snippet}`);
    }
    console.error(
      "\nFix: remove outbound primitive or add explicit allowlist with justification and test coverage.",
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[offline-egress] script error:", e);
  process.exit(2);
});
