import { createHash } from "node:crypto";
import http from "node:http";
import path from "node:path";
import { buildContextPack } from "../context/pack.js";
import { resolveRepositoryRoot } from "../filesystem/root.js";
import { buildInstructionGraph } from "../instructions/graph.js";
import { scoreRepository } from "../readiness/index.js";
import { assertBindableHost } from "../reporting/serve.js";
import { executeConfiguredScan } from "../scanner/orchestrate.js";
import { validateSkills } from "../skills/validate.js";
import { TaskStore } from "../tasks/store.js";

function _escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function redactForHtml(input: string): string {
  // Redact secrets and absolute paths for HTML
  let out = input;
  out = out.replace(/AKIA[0-9A-Z]{16}/g, "[REDACTED]");
  out = out.replace(/ghp_[0-9a-zA-Z]{36}/g, "[REDACTED]");
  out = out.replace(/-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g, "[REDACTED]");
  out = out.replace(/[A-Z]:\\[^\s"'`)\]]*/g, "<local-path>");
  out = out.replace(/\/home\/[^\s"'`)\]]*/g, "<local-path>");
  return out;
}

export interface DashboardHandle {
  port: number;
  url: string;
  close(): Promise<void>;
}

export async function serveDashboard(options: {
  host?: string;
  port?: number;
  allowNonLocal?: boolean;
  root?: string;
}): Promise<DashboardHandle> {
  const host = options.host ?? "127.0.0.1";
  const allowNonLocal = options.allowNonLocal ?? false;
  assertBindableHost(host, allowNonLocal);

  let cachedScan: Awaited<ReturnType<typeof executeConfiguredScan>> | null = null;
  let cachedGraph: Awaited<ReturnType<typeof buildInstructionGraph>> | null = null;
  let cachedReadiness: ReturnType<typeof scoreRepository> | null = null;

  async function refreshCache() {
    try {
      const rootReq = path.resolve(options.root ?? process.cwd());
      const executed = await executeConfiguredScan(rootReq, {});
      cachedScan = executed;
      try {
        const graph = await buildInstructionGraph(executed.root);
        cachedGraph = graph;
        try {
          const pack = await buildContextPack(executed.root, { maxTokens: 100000 });
          const skills = await validateSkills(executed.root);
          const store = new TaskStore(executed.root.canonicalPath);
          const tasks = await store.list(true).catch(() => []);
          const policy = {
            findings: executed.result.findings.filter((f) => f.category === "config-problem"),
          } as unknown;
          const taskHealth = { dirExists: true, totalTasks: tasks.length } as unknown;
          const readiness = scoreRepository(
            {
              graph: graph as never,
              pack: pack as never,
              scan: executed.result,
              skills: skills as never,
              policy: policy as never,
              tasks: taskHealth as never,
            },
            {},
          );
          cachedReadiness = readiness;
        } catch {
          cachedReadiness = null;
        }
      } catch {
        cachedGraph = null;
      }
    } catch {
      // ignore
    }
  }

  await refreshCache();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}`);
    // Security headers
    res.setHeader("Content-Security-Policy", "default-src 'self'");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Cache-Control", "no-store");

    if (url.pathname === "/api/scan.json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      const findings = cachedScan?.result.findings ?? [];
      // Paginate: ?page=1&limit=100
      const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1;
      const limit = Math.min(
        100,
        Number.parseInt(url.searchParams.get("limit") ?? "100", 10) || 100,
      );
      const start = (page - 1) * limit;
      const slice = findings.slice(start, start + limit);
      res.end(JSON.stringify({ findings: slice, total: findings.length, page, limit }));
      return;
    }
    if (url.pathname === "/api/graph.json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(cachedGraph ?? { nodes: [], diagnostics: [], schemaVersion: 2 }));
      return;
    }
    if (url.pathname === "/api/readiness.json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(cachedReadiness ?? { overall: 0, categories: [], deductions: [] }));
      return;
    }
    if (url.pathname === "/api/tasks.json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      try {
        const rootReq = path.resolve(options.root ?? process.cwd());
        const rootRes = await resolveRepositoryRoot(rootReq);
        if (rootRes.ok) {
          const store = new TaskStore(rootRes.root.canonicalPath);
          const docs = await store.list(false);
          res.end(
            JSON.stringify(
              docs.map((d) => ({ id: d.meta.id, status: d.meta.status, title: d.meta.title })),
            ),
          );
          return;
        }
      } catch {}
      res.end(JSON.stringify([]));
      return;
    }
    if (url.pathname === "/api/refresh" && req.method === "POST") {
      await refreshCache();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // Default: serve dashboard HTML
    const findingsCount = cachedScan?.result.findings.length ?? 0;
    const readinessOverall = cachedReadiness?.overall ?? 0;
    const graphCount = cachedGraph?.nodes.length ?? 0;
    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ACKit Dashboard</title>
<style>
body{font-family:system-ui,sans-serif;margin:1rem;max-width:900px}
table{border-collapse:collapse;width:100%}
th,td{border:1px solid #ccc;padding:0.25rem 0.5rem;text-align:left}
th{background:#f5f5f5}
</style>
</head>
<body>
<h1>ACKit Dashboard</h1>
<p>Readiness <strong>${readinessOverall}/100</strong></p>
<p>Findings: <span id="findings-count">${findingsCount}</span></p>
<p>Instructions: ${graphCount} nodes</p>
<table id="findings-table"><thead><tr><th>Rule</th><th>Message</th><th>Path</th></tr></thead><tbody></tbody></table>
<script>
(function(){
  const esc = (s)=> String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  async function load(){
    try{
      const r = await fetch('/api/scan.json');
      const j = await r.json();
      document.getElementById('findings-count').textContent = j.total;
      const tbody = document.querySelector('#findings-table tbody');
      tbody.innerHTML = '';
      for(const f of j.findings.slice(0,100)){
        const tr = document.createElement('tr');
        const td1 = document.createElement('td'); td1.textContent = f.ruleId || f.id || '';
        const td2 = document.createElement('td'); td2.textContent = f.message || '';
        const td3 = document.createElement('td'); td3.textContent = f.relativePath || '';
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
        tbody.appendChild(tr);
      }
    }catch(e){}
  }
  load();
  setInterval(load, 2000);
})();
</script>
</body>
</html>`;
    const sanitized = redactForHtml(html);
    // Also ensure XSS escaped: we use textContent, but also escape
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Create hash for deterministic
    const hash = createHash("sha256").update(sanitized).digest("hex").slice(0, 8);
    res.setHeader("X-Content-Hash", hash);
    res.end(sanitized);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, host, () => resolve());
  });
  const addr = server.address();
  const port =
    typeof addr === "object" && addr !== null
      ? (addr as { port: number }).port
      : (options.port ?? 0);
  return {
    port,
    url: `http://${host}:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
