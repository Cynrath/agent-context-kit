# ADR-0019: Local Dashboard / Report Server Architecture

Status: Accepted · Date: 2026-08-27

## Context

EPIC G requires a local live workflow (`ackit scan --watch`, `ackit report serve` / `ackit dashboard`) that shows readiness, findings, instruction graph, task health, policy/packs, and context insights, updating when files change. It must work on Windows/macOS/Linux, share the same engine/SDK (no duplicated logic), remain localhost-only by default, be safe for large repos, and be tiny — no heavy frontend framework unless justified.

The existing seam `src/core/reporting/serve.ts` (REQ-RPT-002) already serves a loopback HTML file but lacks a live API boundary, incremental recomputation, or UI. `src/core/watch/watch.ts` (REQ-WATCH-001) is polling-debounced (intentionally, not `fs.watch`).

## Decision

1. **Two commands, one engine**:
   - `ackit scan --watch` stays the inline watcher (stdout re-scan messages, exit 0 on Ctrl+C). Used by CI-less local iteration.
   - `ackit report serve <file> [--host 127.0.0.1] [--port 0] [--allow-nonlocal]` (existing) and alias `ackit dashboard [--port 0] [--open]` launch the live server. Both consume the same scan path `executeConfiguredScan` + cache.
   - `ackit dashboard` is the ergonomics entry that auto-runs `scan` to produce the initial artifact then serves; `--watch` flag makes it live (incremental rescan + SSE update). `report serve` remains compatible for static reports.

2. **Server internals** (`src/core/reporting/serve.ts` + `src/core/dashboard/{server,api}.ts`):
   - HTTP server: Node `http` (stdib, no Express/Fastify minimum-viable; framework choice justification documented if ever swapped).
   - Bind: default `127.0.0.1`; random free port when `--port 0` (via `listen(0)`); any non-loopback host requires explicit `--allow-nonlocal` else `NonLocalBindRefusedError` exit 2.
   - Endpoints (stable, local only):
     - `GET /` → self-contained HTML (no CDN, no telemetry). Content-Security: `default-src 'self'; img-src data:; style-src 'self' 'unsafe-inline'` (inline styles only if absolutely necessary, justified).
     - `GET /api/scan.json`, `GET /api/graph.json`, `GET /api/readiness.json`, `GET /api/tasks.json`, `GET /api/policy.json`, `GET /api/diagnostics.json` — pure JSON, repo-relative paths only, secrets redacted at construction. Cache headers `no-store` for API.
     - `GET /api/events` (SSE) or `/api/poll?since=<tick>` — whichever is simpler and works cross-platform; decision: SSE (`Content-Type: text/event-stream`) with long-poll fallback. Both produce `data: {"tick":n,"changed":[...]}\n\n`.
   - **Incremental recompute**: On file change, the server debounces (400ms, same coalescing as watcher), reuses `cache` (`content-hash + config+policy digest`) and `InstructionGraph` memo when only non-instruction files changed. Incremental path uses `git changed` candidate set narrow: `changedPaths` from `startWatch` callback.
   - **Large repo**: findings table paginated (100/page, virtual scrolled); content truncated after 10k items with "showing top N" banner; initial HTML render target <500ms p50 (large fixture) on CI.
   - **Lifecycle**: SIGINT/SIGTERM → `WatchHandle.stop()` + `server.close()` → exit 0. `Ctrl+C` twice forces kill after 1s (diagnostic).

3. **Frontend** (`extensions? no — local static under `src/dashboard/ui/` or `public/dashboard/` served from `dist/dashboard/` after build`):
   - Vanilla TypeScript-compiled to plain JS (<50KB before gzip, <100KB total with CSS), no React/Vue/Svelte unless an ADR justifies weight (size/security/maintenance section mandatory). Choice of dependency (e.g., `lit-html` vs hand-rolled) must beat the stdlib `view = template strings + DOM` approach on bundle size.
   - `open` flag: spawns OS opener (`start "" "http://..."` on Windows, `open` on macOS, `xdg-open` on Linux) with sanitized URL argument (allowlist `^http://127\.0\.0\.1:\d+`), no shell `exec` with user input.
   - Accessibility: keyboard-navigable tables, `aria-label`, focus ring, color-contrast AA, works without JS for initial HTML (progressive enhancement).
   - **Security**: every path/content rendered via `textContent` or escaped interpolation (never `innerHTML` with user data); secret shapes (ACKIT001..005) never in API responses for diagnostics (same gate as pack); absolute machine paths scrubbed; `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` on API, CSP header on HTML.

4. **Engine/UI boundary**: UI never touches filesystem; it polls/ES-subscribes only to the API. CLI/MCP/Action/SDK paths import from `src/index.ts` (single engine). A contract test asserts `src/dashboard/ui` imports nothing from `src/core/{filesystem,scanner,policy}` directly — only `/api/*` fetch.

5. **Ignored paths & cross-platform**: Reuses `IGNORED_DIR_NAMES` (`.git, node_modules, dist, build, .ackit, artifacts, coverage`) plus user `scan.exclude` globs; watcher never fires for ignored changes. Poll-based watcher guarantees identical behavior on all three OSes.

## Rationale

Loopback-only, vanilla, SSE/poll live updates, and incremental cache reuse give the best tradeoff: no heavy deps, no platform-specific native watchers, and no duplicated scanner logic. Security posture mirrors the existing report server (localhost-only, escaped, redacted).

## Alternatives considered

- `fs.watch` recursive: rejected — crashes Node on Windows in worker pools; non-portable.
- React/Next for dashboard: rejected unless bundle size is justified — v0.2.0 repo data is tabular, not SPA-complex.
- Express: rejected for minimal candle — stdlib `http` is sufficient; framework only via ADR if >30 lines of routing reappear.
- WebSocket: considered, but SSE is unidirectional and simpler with built-in backpressure; long-poll fallback covers proxies that buffer SSE.

## Consequences

- New modules under `src/core/dashboard/` + static `src/dashboard/ui/` (or `assets/dashboard/`); build step copies to `dist/dashboard/`; `files` whitelist in `package.json` may include `dist/dashboard/` if needed for `npx` serving.
- New tests: watch debounce proof, serve lifecycle, XSS fixture, ignored-path, large-repo perf smoke.
- Docs: `docs/guides/watch-dashboard.md` + `docs/reference/cli.md` update.

## Related requirements

REQ-V020-G-001..004.
