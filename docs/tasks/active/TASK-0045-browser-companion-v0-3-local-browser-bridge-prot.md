---
id: "TASK-0045"
title: "Browser Companion v0.3 — Local Browser Bridge protocol & security contract"
status: completed
schemaVersion: 2
dependencies: ["TASK-0044"]
createdAt: "2026-08-29"
completedAt: "2026-08-29"
---


## Purpose

Freeze the Browser Bridge wire protocol, headers, auth/session lifecycle, CORS/CSRF, Host/Origin validation, redaction, rate/payload limits and CLI surface before any runtime implementation, so that the subsequent `TASK-0048` bridge code and `TASK-0046` extension client can be contract-tested deterministically and the MCP verification is evidence-grade.

## Scope

- Author `docs/architecture/browser-bridge-protocol.md` (§1–14: purpose, transport, auth/session (random 32B token, session storage, Bearer header, revocation, TTL), Host/Origin rebinding defense order, CORS exact echo (no wildcard), security headers, read-only `GET /v1/*` + `POST /v1/stop` shapes for status/repository/task/active/instructions/effective/context/readiness/evidence/health, error codes, redaction & 512KB cap, non-goals, extension client contract, CLI surface `ackit browser start|status|stop`, conformance tests and MCP verification).
- Validate that the protocol reuses existing dashboard seams (`assertBindableHost`, `Content-Security-Policy`/`X-Content-Type-Options`/`X-Frame-Options`/`Cache-Control`) and introduces no `POST` write endpoints in v0.3.
- Record protocol as the single source of truth for bridge security tests (`tests/security/browser-bridge-*.test.ts`) and for `extensions/browser` bridge client (`chrome.storage.session` token, loopback-only `fetch`, abort on Emergency Disconnect).
- No runtime code in this task — spec only.

## Out of scope

- Runtime bridge server (`src/core/browser-bridge/*`) and CLI command (`src/cli/commands/browser.ts`) — TASK-0048.
- Extension manifest/src/adapters — TASK-0046+.
- npm/VS Code/Marketplace publish, tag move, version bump.

## Affected files

- `docs/architecture/browser-bridge-protocol.md` (new)
- `docs/tasks/active/TASK-0045*` (this file)

## Acceptance criteria

- [x] `docs/architecture/browser-bridge-protocol.md` exists and covers all 14 sections: transport (127.0.0.1 default, port 0, lifetime), auth (32B base64url token, memory + `chrome.storage.session`, Bearer header, `POST /v1/stop` revocation, 12h TTL, foreground-only), Host validation (exact `127.0.0.1|localhost|[::1]:<port>` match →403), Origin pinning (`chrome-extension://<id>`), CORS (echo pinned origin, no `*`, preflight requires auth), headers (CSP/XCTO/XFO/Cache-Control/Content-Type), 9 API routes with JSON shapes (status/repository/task/active/instructions/effective?for=&provider=&context?profile=&maxTokens=&readiness/evidence/health/stop), error codes, redaction (5 secret shapes → `[REDACTED]`, paths → `<local-path>`) + 512KB / rate-limit 60/min, non-goals, extension client contract (session storage, AbortController, CSP connect-src), CLI surface, test & MCP plan.
- [x] Protocol explicitly declares v0.3 read-only (no `POST /write-file|run-command|git|execute`), offline-first preserved (bridge is explicit egress, no cloud), and the extension never accepts filesystem paths from the webpage.
- [x] Security header and CORS behavior aligns with `src/core/dashboard/server.ts` precedent; DNS rebinding order (Host → Origin → Auth) stated before auth so rebinding is not masked.
- [x] Document is referenced by `ADR-0025` §4 pipeline and by `THREAT_MODEL_BROWSER_COMPANION.md` T21–T26 controls.

## Test steps

1. `Get-Content docs/architecture/browser-bridge-protocol.md | Select-String "GET /v1/"` shows 8 GET routes + `POST /v1/stop` and `GET /v1/health`.
2. `Select-String "Access-Control-Allow-Origin"` lines contain “echo pinned origin, not `*`”.
3. `Select-String "Authorization: Bearer"` confirms header-only auth, no `?token=` query, no cookie.
4. Verify `Host` §4 lists exact-port match and `Origin` §4 pins `chrome-extension://<id>` with preflight.
5. `node dist/cli/index.js config check && node dist/cli/index.js doctor && node dist/cli/index.js task doctor` pass.

## Risks

- Protocol drift from ADR-0025/threat model → mitigated by cross-referencing ADR-0025 §4 and T21–T26 in every subsection and reusing the same token/Host/Origin/header vocabulary.

## Rollback plan

Revert the new protocol doc + this task file.

## Completion notes

2026-08-29 — TASK-0045 completed.

- Protocol spec created at `docs/architecture/browser-bridge-protocol.md` — 14 sections, 9 routes, 10 error codes, header table, redaction & limits, client contract and CLI surface as listed above.
- Validated against existing seams: `assertBindableHost` loopback-only, dashboard security headers, SDK engines (`TaskStore`, `buildInstructionGraph`, `buildContextPack`, `scoreRepository`, `resolveRepositoryRoot`) reused via bridge handlers without duplicating logic; no write endpoints introduced.
- Cross-linked: ADR-0025 §4 cites this doc for normative route shapes; threat model T21–T26 §controls cite §4–§6 Host/Origin/CORS and §9 redaction.
- No runtime code added; next task TASK-0048 will implement `src/core/browser-bridge/server.ts` + `src/cli/commands/browser.ts` against this spec and be gated by `tests/security/browser-bridge-*.test.ts`.

