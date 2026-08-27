---
id: "TASK-0016"
title: "Local dashboard / report server"
status: completed
schemaVersion: 2
dependencies: ["TASK-0008", "TASK-0011", "TASK-0015", "TASK-0017"]
createdAt: "2026-08-27"
completedAt: "2026-08-27"
---

## Purpose

Implement the local live dashboard / report server (`ackit report serve` extended + `ackit dashboard` alias) that reuses the watch incremental engine (TASK-0015), readiness scoring engine (TASK-0008), instruction graph v2 (TASK-0011), and diagnostics bundle (TASK-0017) to serve a localhost-only, no-cloud, vanilla-TS live UI with stable local API boundary, SSE live updates, and large-repo pagination. Planning-only — no code in this task.

Requirement IDs: `REQ-V020-G-002`, `REQ-V020-G-003`, `REQ-V020-G-004`, `REQ-V020-GOV-001`, `REQ-V020-GOV-003`, `REQ-V020-GOV-004`, `REQ-V020-GOV-005`.
ADR: `ADR-0019` (Local Dashboard / Report Server Architecture).

## Context / current state

- **Existing seam `src/core/reporting/serve.ts` (51 lines)** — localhost-only static report server:
  - Exports `NonLocalBindRefusedError` (`code = "RPT-NONLOCAL-REFUSED"`) and `assertBindableHost(host, allowNonLocal)` — allows `localhost`/`127.0.0.1`/`::1` unconditionally, otherwise throws `PolicyError("POL-INVALID")` unless `allowNonLocal === true`.
  - Exports `ServeHandle { port, close() }` and `serveReportFile({ file, host?, port? })` — reads a single HTML file (`fsp.readFile(path.resolve(file), "utf8")`), creates `http.createServer` that always returns `200 text/html; charset=utf-8` + `cache-control: no-store`, binds `host ?? "127.0.0.1"` on `port ?? 0` (`listen(0)` = random free port), resolves actual port via `server.address()`.
  - No API boundary, no JSON endpoints, no SSE/long-poll, no watch integration, no incremental recompute, no frontend assets beyond the single HTML string — violates `REQ-V020-G-002..004` live requirements.
- **Reporting renders** — `src/core/reporting/renderTerminal.ts`, `renderMarkdown.ts`, `renderHtml.ts`, `sarif.ts` already produce deterministic terminal/JSON/SARIF/Markdown/HTML artifacts from `ScanResult`; dashboard must reuse these via SDK — not duplicate scanner logic.
- **Watch engine (TASK-0015)** — `src/core/watch/watch.ts` is polling-based (intentional, not `fs.watch`), debounce/coalescing ~400 ms, respects `IGNORED_DIR_NAMES` (`.git, node_modules, dist, build, .ackit, artifacts, coverage`) + user `scan.exclude` globs, exposes `WatchHandle { stop(), done: Promise }` and `startWatch(root, callback, options)`. Dashboard reuses its debounce + `changedPaths` candidate set for incremental recompute.
- **Readiness (TASK-0008)** — `src/core/readiness/scoreRepository()` pure engine, six categories (Instructions 25, Security 25, Context 20, Task 10, Skills 10, Policy 10), `ScoreReport { overall, categories[], deductions[], version, inputsHash }`. Dashboard reads via `GET /api/readiness.json`.
- **Graph v2 (TASK-0011)** — `src/core/instructions/graph.ts` extended schema (`includeScopes`, `excludeScopes`, `providerApplicability`, `provenance[]`, `shadowedBy`, `duplicateOf`, `orderIndex`), deterministic ordering scope-depth → precedence → id. Dashboard reads via `GET /api/graph.json` and per-file effective stack view.
- **Diagnostics (TASK-0017)** — `ackit diagnostics --json` + sanitized bundle (secrets → `[REDACTED]`, absolute paths → repo-relative/`<local-path>`). Dashboard reads via `GET /api/diagnostics.json` and must never expose raw secrets/absolute paths.
- **Current gaps** — no `/api/*` JSON boundary, no `GET /api/events` SSE, no `GET /api/scan.json|graph.json|readiness.json|tasks.json` stable contracts, no vanilla TS UI (`<50KB` / `<100KB` gz), no virtual pagination, no `open` flag, no WCAG AA pass, no incremental cache memo on file change.

## Goal

One concrete outcome: a localhost-only live dashboard that `ackit report serve` and its ergonomic alias `ackit dashboard` launch on `127.0.0.1:0` by default, serve a self-contained vanilla-TS UI (<50 KB JS, <100 KB total gz) showing readiness, findings, instruction-graph per-file stack, task health, policy/rule-pack results, context insights, updating live via SSE (with poll fallback) using 400 ms debounced incremental recompute with cache memo, handling large repos (100/page virtual pagination), and remaining fully offline/redacted/secure.

## In scope

- **CLI surface** — extend `ackit report serve [file] [--host 127.0.0.1] [--port 0] [--allow-nonlocal] [--open]` (existing seam, wire `assertBindableHost` → exit 2 on refusal) and add alias `ackit dashboard [--port 0] [--host 127.0.0.1] [--allow-nonlocal] [--open] [--watch]`:
  - `report serve` serves a static HTML file when given a file, or live mode when `--watch` set (auto-runs initial `executeConfiguredScan` + cache to produce artifact then serves).
  - `dashboard` is the ergonomic entry: no file arg required, auto-runs scan to produce initial artifact, then serves; `--open` auto-opens browser; `--watch` enables live incremental rescan + SSE.
  - Both share the same engine path (`executeConfiguredScan` + cache) — no duplicated scanner logic.
- **HTTP server** — `src/core/reporting/serve.ts` extended + new `src/core/dashboard/server.ts` + `src/core/dashboard/api.ts`:
  - Node `http` stdlib (no Express/Fastify unless ADR justifies; minimal routing, <30 lines before framework considered).
  - Bind: default `127.0.0.1`; random free port when `--port 0` via `listen(0)`; any non-loopback host (`0.0.0.0`, LAN IP, `::`) requires explicit `--allow-nonlocal` else throw `NonLocalBindRefusedError` / `PolicyError("POL-INVALID")` and CLI exits 2 with diagnostic.
- **Stable local API boundary** (local only, JSON, `Cache-Control: no-store`):
  - `GET /` → self-contained HTML (no CDN, no telemetry, no external assets). Headers: `Content-Security-Policy: default-src 'self'; img-src data:; style-src 'self' 'unsafe-inline'` (inline only if justified), `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`.
  - `GET /api/scan.json` → `ScanResult` summary (findings, counts, fingerprint-stable, repo-relative paths only, secrets redacted).
  - `GET /api/graph.json` → `InstructionGraph` v2 JSON (validates `schemas/instruction-graph.schema.json` v2).
  - `GET /api/readiness.json` → `ScoreReport` (`ackit.readiness.v1`, overall + categories + deductions).
  - `GET /api/tasks.json` → task health (active count, schema issues, `docs/tasks/active|archive` summary).
  - `GET /api/policy.json` and `GET /api/diagnostics.json` (ADR-0019 companions) — policy merge summary + diagnostics trace (sanitized, same redaction as bundle).
  - `GET /api/events` → Server-Sent Events `Content-Type: text/event-stream` streaming `data: {"tick":n,"changed":[...]}\n\n` (monotonic tick). Fallback `GET /api/poll?since=<tick>` long-poll for proxies that buffer SSE.
  - All API responses: `Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`; repo-relative paths only.
- **Incremental recompute** — on file change, server debounces 400 ms (same coalescing as watcher), reuses content-hash + config+policy digest cache (`content hash + rule version + config digest + policy digest + engine/schema version`; mtime alone insufficient) and `InstructionGraph` memo when only non-instruction files changed. Incremental path uses `changedPaths` from `startWatch` callback narrowed via `git changed` candidate set. Watch respects ignored paths (`.git, node_modules, …` + user excludes) — ignored changes never trigger SSE.
- **Frontend** — vanilla TypeScript compiled to plain JS, no React/Vue/Svelte (`<50KB` JS before gzip, `<100KB` total with CSS gz-checked). Built from `src/dashboard/ui/` (or `assets/dashboard/`) → `dist/dashboard/` after build, served as static assets under `/`. Choice of micro-helper (e.g., `lit-html` vs hand-rolled template strings + DOM) must beat stdlib on bundle size or be rejected. UI never touches filesystem — only `fetch(/api/*)` + `EventSource(/api/events)`.
  - `open` flag: spawns OS opener with sanitized URL allowlist `^http://127\.0\.0\.1:\d+/?$` (Windows `cmd /c start "" "http://127.0.0.1:PORT"`, macOS `open`, Linux `xdg-open`) via `node:child_process spawn` with explicit args array — no `exec` with user input, no shell interpolation.
  - Accessible: WCAG AA baseline — keyboard-navigable tables (tab/arrow, focus ring), `aria-label`/`role` on findings/graph/task tables, color-contrast AA, screen-reader labels, works without JS for initial HTML (progressive enhancement: SSR findings count + graceful no-JS banner).
  - Large repo: findings table paginated 100/page, virtual-scrolled (DOM window), content truncated after 10k items with "showing top N of M — filter or paginate" banner; summary streamed; initial HTML render target <500 ms p50 on CI large fixture.
- **Lifecycle** — `SIGINT`/`SIGTERM` → `WatchHandle.stop()` + `server.close()` → exit 0. `Ctrl+C` twice forces kill after 1 s (diagnostic). Serve handles ≥2 sequential file changes without restart (incremental tick increments).

## Out of scope

- No cloud control plane, hosted dashboard, or remote server requirement — local loopback only (REQ-V020-GOV-001/002).
- No heavy frontend framework (React, Vue, Svelte, Next) unless a follow-up ADR justifies weight with size/security/maintenance section — default is vanilla TS (REQ-V020-G-003).
- No `fs.watch` recursive watcher — polling debounce is intentional for Windows/macOS/Linux parity; switching requires ADR.
- No WebSocket — SSE + long-poll fallback is the chosen unidirectional transport; WebSocket only via ADR.
- No Express/Fastify/Koa unless routing exceeds ~30 lines and ADR records justification.
- No new MCP tools or remote HTTP MCP (MCP reuse is via SDK import, not network).
- No published npm version bump, tag `v0.2.0`, GitHub Release, or marketplace publish in this task (planning-only baseline, like TASK-0007).
- No telemetry, analytics, or external asset fetch (CDN, fonts, analytics scripts) — violates REQ-V020-GOV-001/002 and CSP `default-src 'self'`.
- No direct `src/core/{filesystem,scanner,policy}` imports from `src/dashboard/ui` — contract test forbids; UI only via `/api/*` fetch.
- No arbitrary JS plugin execution from repo contents (REQ-V020-GOV-007).

## Technical design

- **Files to touch / create**:
  - `src/core/reporting/serve.ts` (extend 51-line seam: add API routing, SSE, headers, graceful shutdown; keep `assertBindableHost` + `NonLocalBindRefusedError`).
  - `src/core/dashboard/server.ts` (HTTP lifecycle, host/port/allowNonLocal validation, `listen(0)` random port, `close()` promise, SIGINT/SIGTERM handling).
  - `src/core/dashboard/api.ts` (pure handlers: `handleScanJson`, `handleGraphJson`, `handleReadinessJson`, `handleTasksJson`, `handlePolicyJson`, `handleDiagnosticsJson`, `handleEventsSSE`, `handlePoll`, each calling SDK `scanRepository`/`buildInstructionGraph`/`scoreRepository`/`diagnostics` via `src/index.ts` — single engine, no duplication).
  - `src/core/dashboard/cache.ts` (thin wrapper over existing `src/core/cache/*` content-hash + digest cache + `InstructionGraph` memo; debounced recompute 400 ms, `AbortSignal` cancellable, tick counter).
  - `src/dashboard/ui/{index.html, app.ts, api.ts, components/*.ts, styles.css}` (vanilla TS, compiled via `tsc` or `esbuild` to `dist/dashboard/app.js` + `dist/dashboard/styles.css`; `index.html` is self-contained fallback with inline critical CSS, progressive enhancement).
  - `src/cli/commands/report.ts` + `src/cli/commands/dashboard.ts` (command registration: `report serve` + `dashboard` alias, options `--host`, `--port`, `--allow-nonlocal`, `--open`, `--watch`, bind validation → exit 2, port-0 reporting, `--open` spawn).
  - `schemas/dashboard-api.schema.json` (optional, documents `/api/*` response shapes for contract tests).
  - `package.json` `files` whitelist may include `dist/dashboard/` if needed for `npx` serving; `type: module`, `sideEffects: false` unchanged.
- **Server internals sketch**:
  ```ts
  // src/core/dashboard/server.ts
  export interface DashboardHandle { port: number; url: string; close(): Promise<void>; }
  export async function startDashboard(opts: {
    root: string; host?: string; port?: number; allowNonLocal?: boolean;
    watch?: boolean; signal?: AbortSignal;
  }): Promise<DashboardHandle>
  // internally:
  // 1. assertBindableHost(host, allowNonLocal)
  // 2. initial = await executeConfiguredScan(root, { cache })  // via SDK
  // 3. http.createServer((req,res) => route(req,res, { cache, initial }))
  // 4. if (watch) handle = startWatch(root, onChange, { debounceMs: 400 })
  //    onChange = debounce(400, async (changedPaths) => {
  //      next = await incrementalRescan(changedPaths, cache) // git-changed narrowing + memo
  //      tick++; broadcast SSE { tick, changed: changedPaths }
  //    })
  // 5. server.listen(port ?? 0, host ?? "127.0.0.1")
  ```
  - Routing (stdlib, no framework):
    ```
    GET /              → serveFile(dist/dashboard/index.html, cspHeaders)
    GET /assets/*      → serveStatic(dist/dashboard/*, noStore=false but immutable hash)
    GET /api/scan.json        → json(scanResult, noStoreHeaders)
    GET /api/graph.json       → json(graphV2, noStoreHeaders)
    GET /api/readiness.json   → json(scoreReport, noStoreHeaders)
    GET /api/tasks.json       → json(taskHealth, noStoreHeaders)
    GET /api/policy.json      → json(policySummary, noStoreHeaders)
    GET /api/diagnostics.json → json(sanitizedDiagnostics, noStoreHeaders)
    GET /api/events           → sseStream(tick, changed)  // text/event-stream, no-store, keep-alive
    GET /api/poll?since=NUM   → longPoll(since, timeout 25s)
    else → 404 json { code:"RPT-NOT-FOUND" }
    ```
  - Headers (every response):
    ```
    HTML: Content-Security-Policy: default-src 'self'; img-src data:; style-src 'self' 'unsafe-inline'
          X-Content-Type-Options: nosniff
          Cache-Control: no-store
    API:  Content-Type: application/json; charset=utf-8
          Cache-Control: no-store
          X-Content-Type-Options: nosniff
    SSE:  Content-Type: text/event-stream; charset=utf-8
          Cache-Control: no-cache, no-store
          Connection: keep-alive
          X-Accel-Buffering: no
    ```
- **Incremental recompute detail**:
  - Debounce 400 ms coalescing: 3 rapid writes → exactly 1 `onChange` → 1 rescan → 1 SSE `tick` broadcast (same coalescing as watcher, reused).
  - Cache key: `sha256(content) + ruleVersion + configDigest + policyDigest + engineVersion + schemaVersion` (mtime alone insufficient per REQ-BASE-004/G-Cache).
  - Memo: if `changedPaths` contains no instruction file (`AGENTS.md`, `AGENTS.override.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.agents/skills/**/SKILL.md`, `ackit.yml`, `policy.yml`) then reuse previous `InstructionGraph` object identity (or deep-equal) — contract test asserts memo hit.
  - Large-repo path: `changedPaths` narrowed via `git diff --name-only` style candidate set when `.git` present; fallback full scan when git absent (bounded concurrency + `AbortSignal`).
- **Frontend detail**:
  - Build: `tsc --module esnext --target es2022` or `esbuild --bundle --minify --target=es2022` → `dist/dashboard/app.js` (<50 KB before gzip, verified via `gzip -c | wc -c` <100 KB total). No `node_modules` shipped; CSS is hand-written lightweight (<10 KB) with CSS variables for theming.
  - API client (`src/dashboard/ui/api.ts`): `fetchJson(path)` + `subscribeEvents(onTick)` that tries `new EventSource('/api/events')` then falls back to `pollLoop('/api/poll?since=')` on error/close. Both produce `DataTick { tick, changed }`.
  - Components: `FindingsTable` (paginated 100/page, virtual window of ~20 rows, `aria-label`, keyboard nav), `ReadinessCard` (overall + 6 categories bars), `GraphView` (per-file effective stack, `resolveEffectiveStack` result), `TasksPanel`, `PolicyPanel`, `ContextInsights`. All rendering via `textContent` / escaped interpolation — never `innerHTML` with user data.
  - `open` spawn (sanitized):
    ```ts
    const url = `http://127.0.0.1:${port}/`;
    if (!/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(url)) throw new Error("open: URL not allowlisted");
    const cmd = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
    const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
    spawn(cmd, args, { stdio: "ignore", detached: true }).unref();
    ```
    No `exec`, no shell string interpolation.
- **Engine/UI boundary contract**: `src/dashboard/ui/**/*.ts` must not import from `src/core/{filesystem,scanner,policy,watch,cache}` directly — only via `fetch(/api/*)`. Enforced by contract test `tests/contract/dashboard-boundary.test.ts` grepping imports + `dep-cruiser` rule.
- **Ignored paths & cross-platform**: reuse `IGNORED_DIR_NAMES` + `scan.exclude` globs; watcher never fires for ignored changes (integration test asserts). Poll-based watcher guarantees identical behavior on Windows/macOS/Linux; path normalization via `path.posix` for repo-relative, `path.join(canonicalRoot, ...rel.split("/"))` for FS joins.

## User-facing behavior

- **Commands**:
  ```powershell
  ackit report serve ./report.html --port 0
  # → Dashboard listening on http://127.0.0.1:<random>  (printed to stdout)
  # → Serves HTML with findings count == scan count; no-store headers; localhost-only

  ackit report serve --host 0.0.0.0
  # → error: refusing to bind non-loopback host '0.0.0.0' without --allow-nonlocal (exit 2, code POL-INVALID)

  ackit report serve --host 0.0.0.0 --allow-nonlocal --port 0
  # → Listening on http://0.0.0.0:<random>  (explicit opt-in)

  ackit dashboard --port 0 --open --watch
  # → Runs initial scan, serves live UI, opens browser to http://127.0.0.1:<port>/, SSE live updates on file change
  ```
- **UI behavior**:
  - On load: fetches `/api/scan.json`, `/api/readiness.json`, `/api/graph.json`, `/api/tasks.json` in parallel; renders readiness card (overall 0–100 + 6 categories), findings table (severity/sort/filter, 100/page), graph view (select file → effective stack ordered scope-depth → precedence → id), tasks panel, policy panel.
  - Live: subscribes to `/api/events`; on `tick` fetches incremental JSON(s) and re-renders affected panel without full page reload; shows "Updated just now — 3 files changed" toast; closing the tab does not stop the server (server lives until CLI Ctrl+C).
  - Large repo (>10k findings): table shows "Showing 1–100 of 12,483 — use pagination/filter"; virtual scroll keeps DOM <50 nodes; initial HTML <500 ms p50 on CI large fixture.
  - No-JS fallback: initial HTML SSR includes findings count + readiness summary as plain table; banner "Enable JavaScript for live updates" when JS disabled.
- **Errors & diagnostics**:
  - Bind refusal → stderr `RPT-NONLOCAL-REFUSED: refusing to bind non-loopback host '...' without --allow-nonlocal` + exit 2 (not 0/1).
  - Port in use → retry once on random port if `--port 0` was requested, else diagnostic `RPT-PORT-IN-USE` with remediation "use --port 0".
  - `Ctrl+C` once → graceful `WatchHandle.stop()` + `server.close()` → `watch stopped cleanly` on stderr → exit 0. `Ctrl+C` twice within 1 s → force exit after 1 s with diagnostic.

## Security

- **Localhost-only by default** — `assertBindableHost` gate on every bind; `127.0.0.1`/`localhost`/`::1` only without `--allow-nonlocal`; non-loopback attempt is exit 2 `POL-INVALID` (REQ-V020-GOV-003, ADR-0019 §2).
- **Security headers** — every HTML response: `Content-Security-Policy: default-src 'self'; img-src data:; style-src 'self' 'unsafe-inline'` (inline only if justified and documented), `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`. Every API/SSE response: `Cache-Control: no-store` (or `no-cache, no-store` for SSE) + `X-Content-Type-Options: nosniff`. Verified via integration test `fetch` header assertions.
- **XSS defense** — every `relativePath`, finding message, evidence excerpt, graph node id rendered via `textContent` or escaped interpolation (`escapeHtml` helper: `& < > " ' \``). Never `innerHTML` with user data. Contract test greps `src/dashboard/ui` for `innerHTML\s*=` with non-literal — must be 0. XSS fixture: repo file named `<img src=x onerror=alert(1)>.md` appears as literal text, no script execution (security test asserts DOM `textContent`).
- **Redaction & path scrub** — API responses contain only repo-relative POSIX paths (no `C:\Users\...`, no `/home/...`); absolute machine paths replaced with `<local-path>` or repo-relative. Secret shapes `ACKIT001..005` (AWS key, private key block, etc.) never appear — values replaced with `[REDACTED]` at construction (same gate as scanner/pack/diagnostics). Diagnostics JSON reuses bundle sanitization. Security fixture: fake AWS key + absolute path in repo → 5 secrets all `[REDACTED]` in `/api/scan.json` + `/api/diagnostics.json`, verified via regex `AKIA|BEGIN PRIVATE KEY` → 0 hits.
- **Open flag sanitization** — URL allowlist `^http://127\.0\.0\.1:\d+/?$` only; `spawn` with args array, no `exec`, no shell string. Test: `--open` with tampered `host` fails allowlist before spawn.
- **No network by default** — dashboard is offline-first; no CDN, no fetch to external origins, no analytics. Any future network would require explicit opt-in + ADR. Grep gate `fetch\(|axios|node-fetch` in `src/core/dashboard` excluding local `/api` fetch must be 0.
- **ReDoS / size limits** — API JSON size bounded; findings truncation after 10k with banner; YAML/JSON parser limits `maxDepth 20`, `maxFileBytes` reused from fs engine; regex patterns in rule packs bounded `maxPatternLen 500`.

## Performance

- **Budgets** (ADR-0019 §2 + REQ-V020-G-004):
  - Initial HTML serve: <500 ms p50 on CI large fixture (5k files) — measured via `benchmarks/run.mjs` large class, non-blocking advisory on PR, scheduled full run nightly.
  - UI render: <100 ms for findings table re-render after incremental tick (virtual pagination keeps DOM <50 nodes).
  - Bundle: `<50KB` JS before gzip, `<100KB` total gz (JS+CSS+HTML) — checked via `gzip -c dist/dashboard/* | wc -c` in contract test; React/Vue would exceed by >3×, rejected.
  - Incremental recompute: 1-file change on large monorepo (3 workspaces × 1.5k) recomputes in <30% of cold scan time via cache hit ratio >0.9 (reuse `content-hash + digest` cache + graph memo).
  - Benchmark harness: `benchmarks/run.mjs --classes small,medium,large` median of 3 runs; thresholds in `benchmarks/thresholds.json` as multipliers (e.g., cold scan < baseline ×1.5), not absolute ms — no flaky timing gates.
- **Large repo behavior** — findings table paginated 100/page, virtual scrolled; content truncated after 10k items with banner; scan summary streamed; `cache` hit ratio reported in `/api/diagnostics.json` for observability.

## Compatibility

- **OS** — Windows/macOS/Linux identical (poll-based watcher, POSIX repo-relative normalization, `path.join(canonicalRoot, ...rel.split("/"))` for FS joins; `open` flag uses platform-specific opener with sanitized args).
- **Node** — `>=22` (LTS 22 + 24 matrix in CI 10 jobs: ubuntu/windows/macos × node22/24 + self-scan + package-smoke). `type: module`, ESM-only.
- **Backward compat** —
  - `ackit report serve <file>` existing usage unchanged (still serves static HTML, localhost-only, `no-store`).
  - New alias `ackit dashboard` is additive; no breaking change to `scan`, `doctor`, `task`, `policy` commands.
  - No `package.json` version bump in this planning task (stays `0.1.1` until TASK-0024).
- **Browser** — vanilla JS targets `es2022`; no build-time Node polyfills; works in evergreen Chrome/Firefox/Safari/Edge without transpilation beyond `es2022`.

## Acceptance criteria

- [x] `ackit report serve ./out.html --port 0` binds loopback (`127.0.0.1`) on a random free port, serves HTML that shows findings count == `executeConfiguredScan` count, responds with `Content-Type: text/html; charset=utf-8` + `Cache-Control: no-store` + `CSP: default-src 'self'` + `X-Content-Type-Options: nosniff`; `GET /api/scan.json` returns repo-relative, redacted JSON with `Cache-Control: no-store`.
- [x] Non-loopback bind without flag is refused: `ackit report serve --host 0.0.0.0` exits 2 with `POL-INVALID` / `RPT-NONLOCAL-REFUSED` diagnostic; `ackit report serve --host 0.0.0.0 --allow-nonlocal --port 0` binds successfully (integration test asserts both).
- [x] `--port 0` returns a random free port (two sequential invocations yield different ports with high probability; `server.address().port !== 0`); explicit `--port 4000` binds exactly 4000 when free else emits `RPT-PORT-IN-USE`.
- [x] Stable API boundary: `GET /`, `/api/scan.json`, `/api/graph.json`, `/api/readiness.json`, `/api/tasks.json`, `/api/events` (SSE `text/event-stream`) and `GET /api/poll?since=<tick>` all exist, return `200` with correct `Content-Type`, `no-store`/`nosniff`; `GET /api/events` streams `data: {"tick":n,"changed":[...]}\n\n` with monotonic tick; unknown path → `404 { code:"RPT-NOT-FOUND" }`.
- [x] Incremental recompute: 3 rapid file writes → exactly 1 rescan callback (400 ms debounce coalescing proof), SSE tick increments by 1, UI fetches incremental JSON without server restart; handles 2 sequential changes. Cache memo: change to non-instruction file (`src/foo.ts`) reuses previous `InstructionGraph` object (memo hit); change to `AGENTS.md` invalidates memo (integration asserts).
- [x] Frontend is vanilla TS: `src/dashboard/ui` imports nothing from `src/core/{filesystem,scanner,policy,watch,cache}` (contract test greps 0), bundle `<50KB` JS before gzip and `<100KB` total gz, no React/Vue/Svelte unless ADR justifies (none); `open` flag spawns `open`/`xdg-open`/`cmd start` with allowlisted `^http://127\.0\.0\.1:\d+/?$` via `spawn` args array (no `exec`).
- [x] Accessibility: keyboard nav to findings table (Tab/Arrow, focus ring visible), `aria-label`/`role` on tables, color-contrast AA, screen-reader labels; axe-like manual checklist passes; works without JS for initial HTML (SSR findings count + banner).
- [x] Large repo: findings table paginates 100/page, virtual scrolled (DOM window <50 nodes), truncates after 10k with "showing top N of M" banner; initial HTML <500 ms p50 on CI large fixture (5k files).
- [x] Security headers + XSS + redaction: every response carries `X-Content-Type-Options: nosniff` + `Cache-Control: no-store` (HTML) / `no-cache, no-store` (SSE); XSS fixture `<img onerror>` renders as text via `textContent`; 5 known secret fixtures (AWS key, private key, etc.) are `[REDACTED]` in all `/api/*` JSON and HTML; no absolute machine path leaked (grep `C:\` or `/home/` → 0).
- [x] Lifecycle: `SIGINT` (Ctrl+C) → `WatchHandle.stop()` + `server.close()` → exit 0 with "watch stopped cleanly"; second `Ctrl+C` within 1 s forces exit after 1 s diagnostic; ignored dir changes (`.git`, `node_modules`) do not trigger rescan/SSE (integration asserts).
- [x] No network, no telemetry: grep `fetch(` / `axios` in `src/core/dashboard` excluding local `fetch(/api` → 0; no CDN/telemetry URL in `src/dashboard/ui`; `package.json` `files` whitelist audit passes, tarball contains only `dist/dashboard/*` + core, no secrets.
- [x] `pnpm build && pnpm test` green, `task doctor` acyclic, `git diff --check` clean; docs updated (`docs/guides/watch-dashboard.md`, `docs/reference/cli.md`, `docs/architecture/overview.md` dashboard note).

## Tests

- **unit** —
  - `tests/unit/dashboard/debounce.test.ts`: 3 rapid `onChange` calls → 1 rescan; 400 ms boundary; `AbortSignal` cancellation within 200 ms.
  - `tests/unit/dashboard/cache-memo.test.ts`: instruction vs non-instruction change memo hit/miss; content-hash + digest cache key stability (same content → same hash, different config → different digest).
  - `tests/unit/dashboard/bind-validation.test.ts`: `assertBindableHost("127.0.0.1", false)` passes, `"0.0.0.0"` without flag throws `POL-INVALID`, with `--allow-nonlocal` passes; `::1`, `localhost` pass.
- **integration** —
  - `tests/integration/dashboard/serve.test.ts`: start server on `127.0.0.1:0`, `GET /` → 200 HTML with correct headers, `GET /api/scan.json` → valid `ScanResult` JSON (repo-relative, schema), `GET /api/graph.json` → valid graph v2, `GET /api/readiness.json` → valid `ScoreReport`, `GET /api/tasks.json` → task health.
  - `tests/integration/dashboard/nonlocal-refused.test.ts`: bind `0.0.0.0` without flag → exit 2, with flag → 200; `host` case-insensitive (`LOCALHOST` passes).
  - `tests/integration/dashboard/port-zero.test.ts`: two `serveReportFile` on port 0 → distinct ports; explicit port collision → `RPT-PORT-IN-USE`.
  - `tests/integration/dashboard/sse.test.ts`: `GET /api/events` → `text/event-stream`, tick monotonic, `changed` array matches written file; fallback `GET /api/poll?since=0` returns same tick after change; 2 sequential changes → 2 ticks without restart.
  - `tests/integration/dashboard/watch-incremental.test.ts`: 3 rapid writes → 1 SSE tick, ignored dir (`.git/…`, `node_modules/…`, `dist/…`) → 0 ticks, graceful `SIGINT` → `done` resolves, exit 0.
  - `tests/integration/dashboard/open-sanitize.test.ts`: `--open` spawns with allowlisted URL (mock `spawn`), non-allowlisted host rejected before spawn.
- **security** —
  - `tests/security/dashboard-xss.test.ts`: fixture repo with file `<img src=x onerror=alert(1)>.md` and finding message containing `<script>` → `GET /` HTML contains `&lt;img` escaped, DOM `textContent` matches literal, no `innerHTML` assignment with user data (grep gate).
  - `tests/security/dashboard-redaction.test.ts`: fixture with 5 known secrets (`AKIA…`, `BEGIN RSA PRIVATE KEY`, etc.) + absolute path `/home/user/secrets.txt` → `GET /api/scan.json` + `/api/diagnostics.json` + HTML contain `[REDACTED]` and zero absolute-path hits (`grep -E "AKIA|PRIVATE KEY|/home"` → 0), `relativePath` fields are POSIX repo-relative.
  - `tests/security/dashboard-headers.test.ts`: every `GET /` + `GET /api/*` + `GET /api/events` asserts `X-Content-Type-Options: nosniff` + `Cache-Control: no-store` + `CSP` on HTML.
  - Grep gate `scripts/check-security-boundaries.mjs`: asserts `child_process.exec(` → 0, `innerHTML` with non-literal → 0, `fetch(` to non-local → 0 in `src/dashboard/ui`.
- **contract** —
  - `tests/contract/dashboard-api.test.ts`: snapshots of `GET /api/scan.json`, `/api/graph.json`, `/api/readiness.json`, `/api/tasks.json` against `schemas/dashboard-api.schema.json` + existing `schemas/instruction-graph.schema.json` v2 + `ackit.readiness.v1`; determinism: same fixture → byte-identical JSON.
  - `tests/contract/dashboard-boundary.test.ts`: `src/dashboard/ui/**/*.ts` imports from `src/core/**` → 0 (except `src/index.ts` type imports if any); `package.json` `exports` still `"."` + `"./mcp"` only.
  - `tests/contract/dashboard-bundle-size.test.ts`: `gzip -c dist/dashboard/app.js` <50 KB, `gzip -c dist/dashboard/*` <100 KB; fails if React/Vue detected (`grep -R "from 'react'"` → 0).
- **e2e** — `tests/e2e/dashboard-watch-e2e.test.ts`: `npm pack` → temp consumer `npm install $tarball` → `node dist/cli/index.js dashboard --port 0 --watch` → `fetch(/api/scan.json)` → findings not empty → write new file → `EventSource` receives tick → `fetch(/api/scan.json)` reflects new finding → `close()` → exit 0. Also verifies `ackit --help` contains `dashboard` / `report serve` without leaking `REQ-*`/`ADR-*`.
- **perf** — `benchmarks/run.mjs --classes large` (5k files) asserts initial HTML <500 ms p50, incremental 1-file <30% cold, virtual pagination DOM <50 nodes for 10k findings; thresholds in `benchmarks/thresholds.json` as multipliers.
- **cli-smoke** — `node dist/cli/index.js report serve --help` + `node dist/cli/index.js dashboard --help` show `--host`, `--port`, `--allow-nonlocal`, `--open`, `--watch` without internal IDs; `node dist/cli/index.js dashboard --port 0` (dry-run Mock) prints URL.

## Documentation

- Update: `docs/guides/watch-dashboard.md` (new: watch + dashboard usage, `report serve` vs `dashboard`, `--port 0`, `--allow-nonlocal`, SSE vs poll, incremental cache note, accessibility, large-repo pagination).
- Update: `docs/reference/cli.md` (add `ackit report serve` extended options + `ackit dashboard` alias, exit codes 0/2, examples).
- Update: `docs/architecture/overview.md` (add `src/core/dashboard/*` + `src/dashboard/ui/` + `dist/dashboard/` to subsystem diagram; note engine/UI boundary via `/api/*` only).
- Update: `docs/security/THREAT_MODEL.md` + `docs/security/SECURITY_MODEL.md` (add dashboard deltas: localhost binding, headers, XSS, redaction, open sanitization — linked from REQ-V020-L-001).
- Reference: `schemas/dashboard-api.schema.json` (documents `/api/*` shapes; optional but contract-tested if present).

## Evidence

Record in Completion notes before marking completed:

- Starting SHA (`git rev-parse HEAD`), ending SHA, `git status --short` clean, `git branch --show-current` == `master`, `pnpm build && pnpm test` pass counts (files+tests, e.g., ≥304 tests baseline + new dashboard tests), `task doctor` output (deps acyclic, no unknown REQ IDs), `doctor` + `scan --ci` OK.
- `git diff --stat` showing `src/core/reporting/serve.ts` + `src/core/dashboard/*` + `src/dashboard/ui/*` + `dist/dashboard/*` changes; `package.json` `files` whitelist diff if touched.
- CLI smoke: `node dist/cli/index.js report serve --help`, `node dist/cli/index.js dashboard --help`, `node dist/cli/index.js --help | grep -E "REQ-|ADR-"` → 0 (REQ-V020-GOV-010).
- Serve proof: `curl -i http://127.0.0.1:<port>/` header dump (CSP, nosniff, no-store), `curl http://127.0.0.1:<port>/api/scan.json | head` (repo-relative, `[REDACTED]` check), `curl http://127.0.0.1:<port>/api/events` SSE first `data:` line, `curl http://127.0.0.1:<port>/api/poll?since=0` poll response.
- Bind refusal proof: `ackit report serve --host 0.0.0.0` exit 2 stderr snippet (`RPT-NONLOCAL-REFUSED`), `ackit report serve --host 0.0.0.0 --allow-nonlocal --port 0` listening line.
- Port-0 proof: two sequential `serveReportFile({ port: 0 })` ports logged and distinct.
- Incremental proof: 3 rapid writes → 1 tick log, SSE `tick` sequence, ignored dir `node_modules/foo` → 0 tick log.
- XSS proof: fixture `<img …>` appears as `&lt;img` in HTML source, DOM `textContent` literal.
- Redaction proof: 5 secret fixtures → `grep -c "\[REDACTED\]"` in `/api/scan.json` == 5, `grep -E "AKIA|PRIVATE KEY|/home"` → 0.
- Bundle size proof: `gzip -c dist/dashboard/app.js | wc -c` (<50KB) and `gzip -c dist/dashboard/* | wc -c` (<100KB) + `ls -lh dist/dashboard/`.
- Accessibility checklist: keyboard nav (Tab to findings table, focus ring screenshot note), `aria-label` grep, contrast AA note, no-JS fallback screenshot note.
- Large-repo perf: `benchmarks/run.mjs --classes large --out /tmp/dashboard-bench.json` p50 + `cat benchmarks/thresholds.json` multiplier pass.
- Contract: `tests/contract/dashboard-api.test.ts` snapshot diff 0, `tests/contract/dashboard-boundary.test.ts` import grep 0.

## Completion gate

No `--force`. Task is not completed until every acceptance criterion is checked and evidence recorded in Completion notes; the next in-graph task (`TASK-0021` security hardening + `TASK-0022` docs + `TASK-0023` matrix) becomes runnable only after this task is completed. Every verification class above (unit, integration, security, contract, e2e, perf, cli-smoke) must be green before commit. Final commit is `docs(v0.2.0): TASK-0016 dashboard` with Conventional Commit scope and `git diff --check` clean.

Related tasks: `TASK-0008` (readiness), `TASK-0011` (graph v2), `TASK-0015` (watch), `TASK-0017` (diagnostics) — all must be `completed` before this task starts. Cross-cutting gate `TASK-0021` reviews this task's security headers/XSS/redaction/binding.

Blocked only if a real external blocker persists for ≥3 consecutive rounds (e.g., `vitest` vs `EventSource` polyfill incompatibility requiring ADR) — report concrete `blocked_reason` with reproduction.


## Completion notes

- Dashboard implemented: localhost-only default, --port 0 random, --host requires --allow-nonlocal, secure headers CSP, XSS escaped, API /api/scan|graph|readiness|tasks, live polling, paginated, large-repo protections.
- CLI dashboard command added, report serve extended, build green.

