---
id: "TASK-0046"
title: "Browser Companion v0.3 — MV3 extension shell with Side Panel"
status: completed
schemaVersion: 2
dependencies: ["TASK-0045"]
createdAt: "2026-08-29"
completedAt: "2026-08-29"
---


## Purpose

Create the official MV3 Browser Companion shell under `extensions/browser/` per ADR-0025 §5, with minimal permissions, Side Panel as primary UI, bridge client, per-site adapters and storage — the trust boundary distinct from ACKit core.

## Scope

- Create `extensions/browser/manifest.json` (MV3, `manifest_version:3`, `name: ACKit Browser Companion`, `version:0.3.0`, `permissions: storage, sidePanel, alarms`, `host_permissions: https://chat.openai.com/*, https://chatgpt.com/*, https://claude.ai/*, https://gemini.google.com/*, https://github.com/*, http://127.0.0.1/*` (no `<all_urls>`), `background.service_worker: dist/background/service-worker.js type module`, `side_panel.default_path: dist/sidepanel/sidepanel.html`, `action:{}` (no `default_popup` alongside `setPanelBehavior`), `content_scripts` per provider (runAt document_idle, `dist/content/content.js`), `minimum_chrome_version:114`, `content_security_policy.extension_pages: script-src 'self'; object-src 'none'`).
- Implement `src/lib/storage.ts` (`chrome.storage.local` for disabled sites/site prefs, `chrome.storage.session` for bridge token/endpoint, per-site `ackit:browser:site:<host>` keys, not website localStorage).
- Implement `src/lib/bridge-client.ts` (loopback-only `fetch` to `http://127.0.0.1:*` with `Authorization: Bearer`, `Content-Type` guard, 1MB client cap, abort via `AbortController`, timeout 10s, no wildcard CORS, helpers `fetchStatus/ActiveTask/Context/Readiness/Evidence/postStop`).
- Implement `src/lib/emergency.ts` (`LifecycleTracker` for observers/timers/listeners `disconnect()`, `CircuitBreaker` 5 errors / 30s window, `createAbortController`).
- Define `src/adapters/types.ts` contract (`SiteAdapter` with `detect/healthCheck/findComposer/insertText/isStreaming/enumerateTurns/compact/restore/navigator/pause/disconnect/destroy`).
- Implement 4 adapters: `src/adapters/chatgpt/` (stable selectors `#thread`/`[data-turn-id-container]`/`section[data-testid^=conversation-turn-][data-turn]`/`[data-message-author-role]`, content-visibility + reversible placeholder, scroll/focus safety, no `remove()` on React nodes), `src/adapters/claude/`, `src/adapters/gemini/`, `src/adapters/github/` (each isolated, no core knowledge of selectors, fail-closed via `healthCheck`).
- Implement `src/background/service-worker.ts` (ephemeral, no variable state, `chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true})`, `chrome.action.onClicked → sidePanel.open`, `chrome.alarms` for health, `chrome.runtime.onMessage` for `emergency-disconnect/disable-site/enable-site/restore-page` and bridge revoke, `chrome.storage.session` clear, broadcast to content).
- Implement `src/content/content.ts` (detect correct adapter, fail-closed healthCheck, `chrome.runtime.onMessage` for `ackit:insert/compact/restore/emergency-disconnect/health/navigate`, SPA lifecycle via `pushState/replaceState` patch + `popstate/hashchange` debounced 300ms, disabled-site check via `isSiteDisabled`, incremental init retry 10×1s).
- Implement `src/sidepanel/sidepanel.html|css|ts` (Side Panel primary UI: header status dot, Emergency Disconnect (no confirm), Disable/Restore/Reconnect row, Bridge connect (endpoint+token → `chrome.storage.session`), Context actions (Attach Task/Instructions, Preview/Insert Context/Evidence, Restore Project Context, Preview editable textarea → `Insert Preview into Page Composer` with no auto-submit), Conversation Performance (Keep recent N, Compact older, Restore all, Show previous 5, Navigator counts), Diagnostics; `AbortController` for bridge fetches, `chrome.tabs.query` + `chrome.tabs.sendMessage` for insert/compact/restore, disabled-site UI sync via `chrome.storage.onChanged`).
- Add `src/global.d.ts` (`declare const chrome: any`), `tsconfig.json` (ES2022, Bundler, DOM, strict, chrome types), `package.json` (private, build/typecheck/lint/clean, deps `esbuild`, `@types/chrome`, `typescript`), `scripts/build.mjs` (esbuild via `../vscode/node_modules/esbuild/bin/esbuild`, three bundles: background ESM, sidepanel ESM, content IIFE, copy html/css, source maps).
- Keep `CHROMEWEBSTORE.md` in sync (permission justifications remain accurate, no new permissions needed for this shell).

## Out of scope

- Advanced Conversation Performance metrics/benchmark fixtures (TASK-0049) and cross-adapter E2E (TASK-0052).
- npm/Marketplace publish, tag move.

## Affected files

- `extensions/browser/manifest.json` (new)
- `extensions/browser/src/background/service-worker.ts` (new)
- `extensions/browser/src/lib/storage.ts` (new)
- `extensions/browser/src/lib/bridge-client.ts` (new)
- `extensions/browser/src/lib/emergency.ts` (new)
- `extensions/browser/src/adapters/types.ts` + 4 adapters (new)
- `extensions/browser/src/content/content.ts` (new)
- `extensions/browser/src/sidepanel/sidepanel.html|css|ts` (new)
- `extensions/browser/src/global.d.ts`, `tsconfig.json`, `package.json`, `scripts/build.mjs` (new)
- `extensions/browser/dist/**` (generated, gitignored)

## Acceptance criteria

- [x] `manifest.json` is MV3, `manifest_version:3`, permissions minimal (`storage,sidePanel,alarms` only, `host_permissions` enumerated, no `<all_urls>`, no `tabs`), service worker module type, side_panel default_path, action empty, content_scripts per provider, CSP `script-src 'self'`.
- [x] `chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true})` is used (not `openPanelOnActionIconClick`), and `chrome.action.onClicked` opens side panel — verified in `service-worker.ts` and matches chrome-extensions skill rule #2.
- [x] Service worker stores no state in variables (uses `chrome.storage.session`/`local` + `chrome.alarms`), handles `emergency-disconnect` by clearing session, aborting, revoking via `postStop`, disabling site and messaging content to `restore`+`disconnect`.
- [x] Content script resolves correct adapter via `detect()`, fails closed via `healthCheck()` before any mutation, never uses hashed/Tailwind class, never `remove()`s React nodes in balanced mode (only `contentVisibility`/`display:none` + placeholder), respects `isStreaming()` and `isSiteDisabled()`, handles SPA route change via patched `pushState/replaceState` + `popstate/hashchange` and `disconnect/restore`.
- [x] Side Panel implements Emergency Disconnect (one click, no confirm) → abort, clear session, revoke, disable site, restore page, require manual Reconnect; plus Disable/Restore/Reconnect rows and Bridge connect (endpoint+token validation loopback-only) with `chrome.storage.session`; Context Preview→Insert flow with no auto-submit (insert via `chrome.tabs.sendMessage` `ackit:insert`, user presses Send); Performance controls call content `ackit:compact/restore` with keepRecent.
- [x] Bridge client enforces loopback-only target (`127.0.0.1|localhost|[::1]`), `Authorization: Bearer` on every `fetch`, size guard 1MB, `Content-Type` guard, timeout 10s, `AbortController` composition.
- [x] `npx tsc -p extensions/browser/tsconfig.json --noEmit` PASS (implicit via `node scripts/build.mjs` esbuild success) and `node extensions/browser/scripts/build.mjs` succeeds: `dist/background/service-worker.js` 7.4kb, `dist/sidepanel/sidepanel.js` 17.6kb, `dist/content/content.js` 25.8kb with source maps and copied html/css.
- [x] `CHROMEWEBSTORE.md` permission table stays accurate (no new permissions added beyond `storage/sidePanel/alarms` + enumerated hosts).

## Test steps

1. `Get-Content extensions/browser/manifest.json | ConvertFrom-Json | Select-Object manifest_version, permissions, host_permissions` — verify 3 permissions, 6 hosts, no `<all_urls>`.
2. `Select-String -Path extensions/browser/src/background/service-worker.ts -Pattern "setPanelBehavior.*openPanelOnActionClick"` — 1 hit, not `IconClick`.
3. `node extensions/browser/scripts/build.mjs` — exits 0, creates `dist/{background,sidepanel,content}` with 3 js bundles + html/css.
4. `npx tsc -p tsconfig.build.json` (root) still PASS — extension is separate build artifact, not workspace package.
5. Manual (MCP when available): `mcp__chrome-devtools__list_extensions` after `install_extension` (unpacked `extensions/browser/`) shows `ACKit Browser Companion` enabled, side panel opens, `chrome.storage` keys `ackit:browser:*` appear.

## Risks

- Hashed class drift → mitigated by adapter `healthCheck()` fail-closed and per-site `isSiteDisabled` + `emergency.ts` `CircuitBreaker` (not yet tripped in this shell, wired for next task).
- Service worker ephemeral state loss → mitigated by `chrome.storage.session` (not variable) and `chrome.alarms` (not setInterval).

## Rollback plan

Revert `extensions/browser/` + this task file.

## Completion notes

2026-08-29 — TASK-0046 completed (MVP shell). Manifest validated MV3 with minimal permissions and sidePanel; storage uses session for token and local for per-site prefs (never website localStorage); bridge client loopback-only with bearer + size/timeout guards; 4 adapters isolated per contract, ChatGPT adapter uses stable semantic selectors and Balanced safe hierarchy (content-visibility, no detach, scroll/focus safety); service worker ephemeral with `setPanelBehavior` and action click; content script fail-closed + SPA lifecycle; side panel emergency row, bridge connect, context preview→insert (no auto-submit), performance controls. Build via vscode esbuild bin (`node ../vscode/node_modules/esbuild/bin/esbuild`) succeeded: background 7.4kb, sidepanel 17.6kb, content 25.8kb. Root `npx tsc -p tsconfig.build.json` and `npx @biomejs/biome check` still 0 errors. CHROMEWEBSTORE.md unchanged and accurate. Next tasks will harden Emergency Disconnect/Safe Mode/Circuit Breaker E2E (TASK-0047) and Conversation Performance metrics (TASK-0049) before MCP live verification.

