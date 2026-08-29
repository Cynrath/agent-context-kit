---
id: "TASK-0050"
title: "Browser Companion v0.3 — Site adapters (ChatGPT, Claude, Gemini, GitHub) contract & isolation"
status: completed
schemaVersion: 2
dependencies: ["TASK-0046"]
createdAt: "2026-08-29"
completedAt: "2026-08-29"
---


## Purpose

Define and implement the isolated per-site adapter contract so a DOM change on one provider (ChatGPT/Claude/Gemini/GitHub) never breaks ACKit core or other adapters, with health-check fail-closed and no cross-selector leakage.

## Scope

- `extensions/browser/src/adapters/types.ts` — `SiteAdapter` contract (`detect`, `healthCheck`, `findComposer`, `insertText`, `isStreaming`, `enumerateTurns`, `compact`, `restore`, `navigator`, `pause`, `disconnect`, `destroy`) + `TurnInfo`/`AdapterHealth`/`CompactResult`/`NavItem`.
- `extensions/browser/src/adapters/chatgpt/index.ts` — ChatGPT adapter using stable semantic selectors (`#thread`, `[data-turn-id-container]`, `section[data-testid^="conversation-turn-"][data-turn]`, `[data-message-author-role]`), `detect()` via hostname + #thread, `healthCheck()` requires root + turns + `breaker.shouldTrip()` check, `findComposer()` tries `#prompt-textarea` → `contenteditable` → `textarea`, `insertText` via `execCommand`+`input` event (no submit), `isStreaming` via `stop-button`/`generating`/`result-streaming`, `compact`/`restore` as in TASK-0049.
- `extensions/browser/src/adapters/claude/index.ts` — Claude adapter, `detect()` `claude.ai`, `healthCheck` fail-closed (`not on claude.ai` or `no turns` → `ok:false`), `findComposer` `contenteditable`/`textarea`, `isStreaming` `[data-is-streaming]`, isolated selectors (no `#thread`), own `compact`/`restore` with same reversible placeholder pattern.
- `extensions/browser/src/adapters/gemini/index.ts` — Gemini adapter, `detect()` `gemini.google.com`, similar isolation.
- `extensions/browser/src/adapters/github/index.ts` — GitHub adapter, `detect()` `github.com`, `findComposer` `textarea[name='comment[body]']`/`js-comment-field`/`contenteditable`, `isStreaming` always false (no chat streaming), `compact` for timeline items.
- `extensions/browser/src/content/content.ts` — `resolveAdapter()` iterates 4 adapters in order, picks first `detect()` true, then `healthCheck()` fail-closed (warn + no mutation), `setupListeners` for `ackit:insert/compact/restore/health/navigate`, `setupSpaObserver` patching `pushState/replaceState` + `popstate/hashchange` debounced 300ms with `disconnect`/`restore` and re-`detect`.
- Isolation verified: `src/core/**` contains no provider selectors (`#thread`, `conversation-turn`, `claude.ai`) via `tests/browser/adapter-contract.test.ts` “no core module knows provider selectors” 1 test; ChatGPT selectors not reused verbatim in Claude/Gemini/GitHub via “do not reuse” 1 test.

## Out of scope

- Performance synthetic fixtures and live MCP verification (TASK-0052).

## Affected files

- `extensions/browser/src/adapters/types.ts`
- `extensions/browser/src/adapters/chatgpt/index.ts`
- `extensions/browser/src/adapters/claude/index.ts`
- `extensions/browser/src/adapters/gemini/index.ts`
- `extensions/browser/src/adapters/github/index.ts`
- `extensions/browser/src/content/content.ts`
- `tests/browser/adapter-contract.test.ts` (3 isolation tests)

## Acceptance criteria

- [x] Common `SiteAdapter` contract exists with 9 capabilities; `src/index.ts` SDK not imported by adapters (grep gate via `adapter-contract` test).
- [x] Each adapter `detect()` checks its own hostname only; `healthCheck()` returns `{ok:false,reason}` when root/turns missing or breaker tripped, and content script does `if (!health.ok) return` (no mutation).
- [x] ChatGPT adapter uses semantic selectors, not hashed Tailwind, and does not patch React/Vue internals.
- [x] Claude/Gemini/GitHub adapters have distinct selectors and do not contain `#thread` as primary root.
- [x] `src/core/**` contains no provider selectors; `tests/browser/adapter-contract.test.ts` 9/9 PASS (including “no core module knows provider selectors”, “ChatGPT uses stable selectors”, “do not reuse”, “no auto-submit”, “storage”, “SPA lifecycle”, “performance hierarchy”, “emergency restore”).
- [x] Content script `resolveAdapter` isolates failures: one adapter's `detect` throw is caught and `continue`, SPA route change fully disconnects/restores old adapter before re-detecting.

## Test steps

1. `npx vitest run tests/browser/adapter-contract.test.ts` — 9/9 PASS.
2. `rg -n "#thread|conversation-turn|claude\.ai" src/core --glob '!*.test.ts'` — 0 hits (verified by test).
3. `npx tsc -p extensions/browser/tsconfig.json --noEmit` — 0 errors, `node extensions/browser/scripts/build.mjs` — 3 bundles.

## Risks

- Provider DOM redesign → mitigated by `healthCheck` fail-closed + per-site Safe Mode + `CircuitBreaker` → auto Safe Mode, page restored.

## Rollback plan

Revert 5 adapter files + content.ts + test.

## Completion notes

2026-08-29 — TASK-0050 completed. Four adapters isolated per contract, each with `detect`/`healthCheck` fail-closed, own composer finder, isolated selectors, reversible compact/restore, SPA lifecycle. Core remains selector-agnostic (verified via grep test). Content script resolves adapter in order and catches per-adapter errors, so one provider's drift does not affect others or core. Verified via 9 contract tests and esbuild 29.3kb content bundle.

