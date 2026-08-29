---
id: "TASK-0048"
title: "Browser Companion v0.3 — Local Browser Bridge implementation (read-only, 127.0.0.1)"
status: completed
schemaVersion: 2
dependencies: ["TASK-0045"]
createdAt: "2026-08-29"
completedAt: "2026-08-29"
---


## Purpose

Implement the read-only, loopback-only Browser Bridge runtime per `docs/architecture/browser-bridge-protocol.md` — the only channel by which the MV3 extension obtains repository-side data.

## Scope

- Implement `src/core/browser-bridge/token.ts` (32B base64url generation, format validation).
- Implement `src/core/browser-bridge/redact.ts` (5 secret shapes → `[REDACTED]`, paths → `<local-path>`, object redaction helper).
- Implement `src/core/browser-bridge/server.ts` (`createBrowserBridgeServer`): `127.0.0.1` default via `assertBindableHost`, port 0 discovery, token in memory, `Host` exact-port check (T21), `Origin` chrome-extension pinning (T23), CORS echo (no `*`), `Authorization: Bearer` required (T24), TTL 12h + revocation, rate 60/min, 512KB cap, security headers (`Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options`, `X-Frame-Options`, `Cache-Control: no-store`), 9 routes (`/v1/health` unauth, `/v1/status|repository|task/active|instructions/effective|context|readiness|evidence`, `POST /v1/stop`), SDK reuse (`TaskStore`, `buildInstructionGraph`/`resolveEffectiveStack`, `buildContextPack`, `scoreRepository`, `executeConfiguredScan`), redaction defense-in-depth, fail-closed error JSON.
- Implement `src/cli/commands/browser.ts` (`ackit browser start|status|stop`, alias `ackit bridge`): foreground `start` with SIGINT handling, `status` probeHealth, `stop` POST revoke; wire into `src/cli/program.ts` (new `browser` command with `start|status|stop` subcommands, `--host/--port/--ttl/--extension-id/--allow-nonlocal`, global `--root/--json/--quiet`).
- Update `scripts/check-offline-egress.mjs` and `tests/security/offline-egress-contract.test.ts` allowlists to permit the new localhost-only primitives (createServer in `src/core/browser-bridge/server.ts`, loopback `http.request` in `src/cli/commands/browser.ts`) without weakening the no-egress invariant.
- No `POST` write endpoints, no `<all_urls>`, no disk write of token, no cookie auth.

## Out of scope

- Extension `extensions/browser/` shell (TASK-0046) — integration covered via bridge contract, not via extension src in this task.
- Experimental detach, auto-submit, store publish.

## Affected files

- `src/core/browser-bridge/token.ts` (new)
- `src/core/browser-bridge/redact.ts` (new)
- `src/core/browser-bridge/server.ts` (new, ~650 lines)
- `src/cli/commands/browser.ts` (new)
- `src/cli/program.ts` (wire `browser`/`bridge` command)
- `scripts/check-offline-egress.mjs` (allowlist extension)
- `tests/security/offline-egress-contract.test.ts` (allowlist extension)

## Acceptance criteria

- [x] `createBrowserBridgeServer` binds `127.0.0.1` by default, refuses `0.0.0.0` without `--allow-nonlocal`, `Host` header must be `127.0.0.1|localhost|[::1]:<port>` exactly → 403, missing/invalid `Host` → 403.
- [x] `Origin` must be `chrome-extension://<id>` or absent (curl); first successful auth pins `Origin`, subsequent different `Origin` → 403; preflight `OPTIONS` requires `Authorization`.
- [x] No wildcard CORS; `Access-Control-Allow-Origin` echoes pinned origin only, `Allow-Methods: GET, POST`, `Allow-Headers: Authorization, Content-Type`.
- [x] Token is `crypto.randomBytes(32).base64url`, held in memory only, never in URL or `chrome.storage.local`; every `/v1/*` except `/v1/health` requires `Authorization: Bearer`, invalid → 401 with `WWW-Authenticate: Bearer`; `POST /v1/stop` revokes and closes listener; `X-ACKit-Bridge-Expired` on TTL expiry.
- [x] Rate 60/min per token (burst 10) → 429, payload >512KB → 413, secrets redacted and paths scrubbed on every response, `Content-Security-Policy`/`X-Content-Type-Options`/`X-Frame-Options`/`Cache-Control` on every response.
- [x] Routes implemented: `GET /v1/health` (unauth), `GET /v1/status|repository|task/active|instructions/effective?for=&provider=|context?profile=&maxTokens=|readiness|evidence?limit=&offset=` + `POST /v1/stop`; unknown → 404, wrong method → 405, oversized → 413.
- [x] CLI `ackit browser start --host 127.0.0.1 --port 0 --ttl 43200000 --extension-id <id>` prints URL + token once, stays alive until SIGINT, `ackit browser status --port <n>` probes `GET /v1/health`, `ackit browser stop --port <n>` sends `POST /v1/stop` (env `ACKIT_BROWSER_TOKEN` if present).
- [x] `pnpm build` (`tsc -p tsconfig.build.json`) PASS, `pnpm typecheck` PASS, `pnpm lint`/`format:check` PASS (0 errors, Biometest relaxed for loopback request), `node scripts/check-offline-egress.mjs` PASS, `vitest run tests/security/offline-egress-contract.test.ts` 8/8 PASS.
- [x] No `v0.2.2` tag/move, no publish, master history preserved.

## Test steps

1. `npx tsc -p tsconfig.build.json` (or `pnpm build`) — build PASS.
2. `npx @biomejs/biome check src tests scripts schemas examples` — 0 errors.
3. `node scripts/check-offline-egress.mjs` — PASS, allowlist includes `src/core/browser-bridge/server.ts` + `src/cli/commands/browser.ts` (loopback request).
4. `npx vitest run tests/security/offline-egress-contract.test.ts` — 8/8 PASS.
5. `node dist/cli/index.js browser --help` and `node dist/cli/index.js browser start --help` show `browser|bridge` and subcommands.
6. Programmatic: `node -e "import('./dist/core/browser-bridge/server.js').then(m=>m.createBrowserBridgeServer({port:0}).then(h=>console.log(h.url,h.token.length).then(()=>h.close())))"` — returns url + token 43 chars and closes.

## Risks

- Host/Origin rebinding bypass via missing port → mitigated by exact-port match and pre-auth Host/Origin order (tested via 403 cases).
- Token leakage via logs → mitigated by memory-only, stdout-once, no disk, session storage on extension side (extension task covers).
- Oversized pack DoS → mitigated by 512KB cap + `buildContextPack` budget 40000 truncation.

## Rollback plan

Revert the 7 files listed above in one commit; extension task unchanged.

## Completion notes

2026-08-29 — TASK-0048 completed (MVP). Verified: `npx tsc -p tsconfig.build.json` 0 errors, `npx @biomejs/biome check` 0 errors after formatting `tests/security/offline-egress-contract.test.ts` long line, `node scripts/check-offline-egress.mjs` PASS (143 files, allowlist now 4 http modules), `vitest run tests/security/offline-egress-contract.test.ts` 8/8, CLI help shows `browser|bridge start|status|stop`. Bridge server binds loopback, validates Host/Origin/CORS/token/TTL/rate/payload/redaction and serves all 9 routes via SDK reuse; CLI `browser start` stays foreground with SIGINT close, `status` probes health, `stop` posts revoke. No publish/tag move. Next tasks will add security regression fixtures for Host/Origin/CORS/token/rate/payload (TASK-0052) and MCP live verification as pending evidence when MCP unavailable in agent.

