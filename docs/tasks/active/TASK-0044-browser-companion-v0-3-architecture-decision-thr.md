---
id: "TASK-0044"
title: "Browser Companion v0.3 — architecture decision & threat model"
status: completed
schemaVersion: 2
dependencies: []
createdAt: "2026-08-29"
completedAt: "2026-08-29"
---


## Purpose

Decide and record the Browser Companion v0.3 architecture and threat model before any runtime code, preserving ACKit core offline-first invariants and defining the trust boundary between the localhost bridge and the MV3 extension.

## Scope

- Create `docs/decisions/ADR-0025-browser-companion-architecture.md` (topology, package location, bridge reuse, security boundary summary, extension boundary, fail-safe and performance invariants, alternatives, consequences).
- Create `docs/security/THREAT_MODEL_BROWSER_COMPANION.md` (delta T21–T33, controls, verification plan) as the delta to `docs/security/THREAT_MODEL.md` T1–T20.
- Create/maintain `CHROMEWEBSTORE.md` from day one per `chrome-extensions` skill (single-purpose, permission justifications, privacy disclosure).
- Confirm tooling preflight: `chrome-extensions` + `modern-web-guidance` global skills visible, Chrome DevTools MCP patched in `cordis.patch.yml` with `--categoryExtensions --isolated --no-usage-statistics --no-performance-crux`, bridge/Dashboard seams inspected, SDK surface audited.
- No runtime implementation in this task — decisions only.

## Out of scope

- `ackit browser` runtime, bridge server, extension `manifest.json`/`src` implementation (TASK-0045..0052).
- npm/VS Code Marketplace/Chrome Web Store publish, tag move, version bump.

## Affected files

- `docs/decisions/ADR-0025-browser-companion-architecture.md` (new)
- `docs/security/THREAT_MODEL_BROWSER_COMPANION.md` (new)
- `CHROMEWEBSTORE.md` (new)
- `docs/tasks/active/TASK-0044*` (this file)

## Acceptance criteria

- [x] `ADR-0025` exists, status Accepted, covers topology, `extensions/browser/` location (single-package invariant preserved), bridge reuse of existing seams, read-only v0.3 API, Host/Origin/CORS/token/redaction/rate-limit controls summary, extension minimal permissions, Emergency Disconnect / Safe Mode / circuit breaker, Balanced performance hierarchy, adapter isolation contract, alternatives and consequences.
- [x] `THREAT_MODEL_BROWSER_COMPANION.md` enumerates T21–T33 (rebinding, CORS/CSRF, Origin forgery, token leakage, prompt injection/exfiltration, oversized payload, DOM drift, framework corruption, observer regression, scroll/focus hijack, SPA leak, permission over-request, persistent mutation) with normative controls and test/MCP verification plan.
- [x] `CHROMEWEBSTORE.md` present from first extension-related change, follows `chrome-extensions` skill template, single purpose coherent, every host/permission justified, privacy egress behavior (“no auto-submit, local 127.0.0.1 only, token in session”) documented, graphics/assets table present, version history `0.3.0 Draft`, review notes include pre-publish blockers.
- [x] Tooling preflight recorded: global skills discovered at `~\.agents\skills\chrome-extensions` and `~\.agents\skills\modern-web-guidance`, DSH `cordis.patch.yml` contains `mcp-chrome-devtools` with exact args, telemetry `DISABLE_TELEMETRY=1` left unchanged, SDK/dashboard seams inspected (`src/index.ts`, `src/core/dashboard/server.ts`, `src/core/reporting/serve.ts`), no skill/MCP reinstall attempted.
- [x] Master history not rewritten, `v0.2.2` tag not moved, no publish.

## Test steps

1. `Get-ChildItem $HOME\.agents\skills` shows `chrome-extensions` + `modern-web-guidance`; `Get-Content $HOME\.dsh\profiles\web\cordis.patch.yml` contains `mcp-chrome-devtools` with `--categoryExtensions=true --isolated --no-usage-statistics --no-performance-crux`.
2. `Get-Content src\index.ts` confirms SDK is the only supported surface; no `src/core/**` direct import needed for bridge/extension docs.
3. `Get-Content docs/decisions/ADR-0025*.md` and `docs/security/THREAT_MODEL_BROWSER_COMPANION.md` review — headings for T21–T33 and controls T21–T33 present.
4. `Get-Content CHROMEWEBSTORE.md` — permission justification table has no `<all_urls>` and each host has a user-benefit reason.

## Risks

- Architecture doc drift from prompt → mitigated by referencing prompt sections 4–8 verbatim and mapping each invariant to an ADR subsection.
- Threat model incomplete → mitigated by enumerating all 13 new threats listed in the prompt's Security requirements + PoC lessons and requiring a regression test or MCP check per control.

## Rollback plan

Revert the three new docs + this task file in one commit (`git revert`).

## Completion notes

2026-08-29 — TASK-0044 completed.

- ADR-0025 created at `docs/decisions/ADR-0025-browser-companion-architecture.md` — covers Repository → SDK → Local Browser Bridge (127.0.0.1, read-only GET /v1/*, token, Host/Origin/CORS/rate-limit/redaction) → MV3 extension (`extensions/browser/`, service worker + Side Panel + adapters), reuse of dashboard/reporting seams, permission minimality, three-layer fail-safe, Balanced performance hierarchy (content-visibility → reversible collapse → code/media compact), adapter contract isolation, alternatives rejected.
- Threat model delta created at `docs/security/THREAT_MODEL_BROWSER_COMPANION.md` — T21–T33 with normative controls (Host exact-port match, CORS no-wildcard + token, Origin pinning, token in session only, no auto-submit / no arbitrary path, 512KB cap + rate limit, healthCheck fail-closed, no React detach, narrow observer, scroll/focus preservation, SPA disconnect, no <all_urls>, reversible restore) and verification plan (unit/contract + MCP).
- CHROMEWEBSTORE.md created at root from the `chrome-extensions` skill template — single purpose “Bring local ACKit project context into supported AI and developer websites…”, six host_permissions (chat.openai.com, chatgpt.com, claude.ai, gemini.google.com, github.com, 127.0.0.1), permissions `storage/sidePanel/alarms`, privacy disclosure “no auto-submit, 127.0.0.1 only, session token”, assets table present.
- Tooling preflight: agent identified as `muse-spark-1.2-contributor-free` via DSH, working directory `O:\projeler\agent-context-kit`, global skills confirmed at `C:\Users\gizem\.agents\skills\chrome-extensions` (`SKILL.md` 530 lines, mandatory rules 1–20) and `modern-web-guidance` (114 lines), MCP patched at `~\.dsh\profiles\web\cordis.patch.yml` with `serverName: chrome-devtools`, `command: npx`, `args: [-y, chrome-devtools-mcp@latest, --categoryExtensions=true, --isolated, --no-usage-statistics, --no-performance-crux]`, SDK seams inspected (`src/index.ts` 25 exports, `src/core/dashboard/server.ts` loopback + CSP headers, `src/core/reporting/serve.ts` NonLocalBindRefusedError). No reinstall or global config mutation performed.
- Feature branch `feat/browser-companion-v0.3` created from `master` (SHA `3041b20` → branch head). Working tree clean before branch.

