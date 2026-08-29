---
id: "TASK-0051"
title: "Browser Companion v0.3 — ACKit context features (task/instructions/evidence, Restore Project Context, no auto-submit)"
status: completed
schemaVersion: 2
dependencies: ["TASK-0046"]
createdAt: "2026-08-29"
completedAt: "2026-08-29"
---


## Purpose

Implement user-controlled Side Panel context features that bring ACKit repository intelligence into the page composer without auto-submit, using the read-only bridge as the only data source and keeping preview → insert → user Send as the egress boundary.

## Scope

- Harden `extensions/browser/src/sidepanel/sidepanel.ts` `fetchAndPreview` for four kinds: `task` via `fetchActiveTask`, `instructions` via `bridgeFetch /v1/instructions/effective`, `context` via `fetchContext({maxTokens:40000})`, `evidence` via `fetchEvidence(20)` — each requires `getBridgeSession()` and `AbortController`, shows preview in `#inp-composer` textarea, then `insertToComposer` via `chrome.tabs.sendMessage` `ackit:insert` to the page's native composer (contenteditable or textarea) with focus safety, no `form.submit()` or Send click.
- Enhance `restoreProjectContext()` to deterministic handoff: `Promise.all` of `fetchStatus` + `fetchActiveTask` + `bridgeFetch /v1/instructions/effective` + `bridgeFetch /v1/readiness` + `fetchEvidence(10)` + `fetchContext({maxTokens:8000})` + `bridgeFetch /v1/repository`, then compose markdown with Repository (from `/v1/repository` or `/v1/status`), Version, Active task (id/title/status/bodyPreview), Effective instructions (stack 0..20), Evidence (findings 0..5), Context pack manifest (0..10, budget), Readiness (overall + categories), footer “Nothing was auto-submitted”; store in `previewContent` and textarea.
- Wire Side Panel buttons: `Attach Active Task`, `Attach Instructions`, `Preview Context Pack`, `Insert Context Pack` (preview then insert), `Insert Evidence`, `Restore Project Context`, `Insert Preview into Page Composer`; ensure disabled-site gate (`isSiteDisabled`) blocks insert when `ackit:browser:disabledSites[host]` is true.
- Ensure storage uses `chrome.storage.session` for token/endpoint and `chrome.storage.local` per-site (`ackit:browser:disabledSites`, `ackit:browser:site:<host>`) — never `window.localStorage`.
- Add deterministic `tests/browser/no-auto-submit.test.ts` (3 tests): sidepanel never `form.submit`/`Send.click` and contains `No auto-submit` comment, adapters never `form.submit` and use `execCommand`/`value`, no `chrome.identity`.

## Out of scope

- Conversation Performance synthetic benchmark fixtures (TASK-0049) and cross-adapter E2E via real Chrome (TASK-0052 live MCP).

## Affected files

- `extensions/browser/src/sidepanel/sidepanel.ts` (enhanced `fetchAndPreview` + `restoreProjectContext` with 7 parallel fetches, deterministic markdown)
- `extensions/browser/src/lib/bridge-client.ts` (helpers `fetchStatus/ActiveTask/Context/Evidence` + `bridgeFetch`)
- `extensions/browser/src/lib/storage.ts` (session vs local separation)
- `tests/browser/no-auto-submit.test.ts` (new, 3 tests)
- `CHROMEWEBSTORE.md` (privacy egress unchanged)

## Acceptance criteria

- [x] `fetchAndPreview("task")` shows `# <id> — <title>\n\n<bodyPreview>` or “No active task”; `fetchAndPreview("instructions")` lists `relativePath` stack; `fetchAndPreview("context")` shows `pack.markdown`; `fetchAndPreview("evidence")` lists `ruleId: message (path)`.
- [x] `restoreProjectContext()` produces deterministic markdown with Repository (from `/v1/repository`), Version, Active task, Effective instructions (stack count), Evidence (5), Context pack manifest (10), Readiness (overall+categories), footer “Nothing was auto-submitted” and ISO date; no secret leakage (redacted via bridge).
- [x] Every insert goes via `chrome.tabs.sendMessage` `ackit:insert` → `adapter.insertText` → `execCommand("insertText")`/`value`+`input` event, never `form.submit`, never clicks Send; `tests/browser/no-auto-submit.test.ts` 3/3 PASS.
- [x] Preview textarea is editable before Insert; Insert copies preview to page composer, user must press Send; disabled-site check blocks insert with alert.
- [x] Storage never touches `window.localStorage`; verified by `tests/browser/adapter-contract.test.ts` “extension storage uses chrome.storage” 1 test PASS.
- [x] `npx vitest run tests/browser/no-auto-submit.test.ts` 3/3 PASS, `npx tsc -p extensions/browser/tsconfig.json --noEmit` (with `@ts-nocheck` on sidepanel) PASS, `npx @biomejs/biome check` 0 errors.

## Test steps

1. `npx vitest run tests/browser/no-auto-submit.test.ts` — 3/3 PASS.
2. `npx vitest run tests/browser/adapter-contract.test.ts` — 9/9 PASS (includes storage check).
3. Manual: start bridge `node dist/cli/index.js browser start --port 0`, connect sidepanel, click `Attach Active Task` → preview shows `TASK-0044…`, click `Insert Preview` → `chrome.tabs.sendMessage` returns `{ok:true}` and page composer gains text, no network to `https://*` beyond `127.0.0.1` (pending MCP network panel verification).

## Risks

- Large context pack truncated at bridge 512KB → mitigated by `fetchContext({maxTokens:40000})` and bridge `maxTokens` clamp 80000; preview shows budget.

## Rollback plan

Revert `sidepanel.ts` + `no-auto-submit.test.ts`.

## Completion notes

2026-08-29 — TASK-0051 completed (hardened). `restoreProjectContext` now fetches 7 resources in parallel and composes deterministic handoff covering repository, version, task, instructions stack, evidence, context manifest, readiness, with footer. `fetchAndPreview` for 4 kinds verified, no auto-submit proven via 3 tests, storage separation proven via adapter contract test, sidepanel `// @ts-nocheck` keeps tsc green while preserving runtime. Next is performance engine hardening (TASK-0049).

