---
id: "TASK-0047"
title: "Browser Companion v0.3 — Emergency Disconnect and Safe Mode (release-blocking)"
status: completed
schemaVersion: 2
dependencies: ["TASK-0046"]
createdAt: "2026-08-29"
completedAt: "2026-08-29"
---


## Purpose

Implement the release-blocking Emergency Disconnect / Safe Mode / CLI kill-switch / circuit breaker per ADR-0025 §6 and threat model T21–T33 controls, ensuring the extension never leaves a broken page and the bridge can be stopped without Chrome settings.

## Scope

- Side Panel **Emergency Disconnect** (one click, no confirmation) wiring in `extensions/browser/src/sidepanel/sidepanel.ts` + `src/background/service-worker.ts`: abort `AbortController`, `clearBridgeSession()` (`chrome.storage.session`), `chrome.alarms.clearAll`, `postStop` best-effort revoke, mark `disabledSites[host]=true` in `chrome.storage.local`, `chrome.tabs.sendMessage` `ackit:emergency-disconnect` to content, which calls `adapter.restore()` + `adapter.disconnect()` and removes `data-ackit-collapsed` / placeholders / injected styles.
- Per-site **Safe Mode** in service worker + sidepanel: `Disable ACKit on this site` → `setDisabledSite(host,true)` + content `ackit:site-disabled` → restore+disconnect; `Restore page` → `ackit:restore`; `Reconnect` → `setDisabledSite(host,false)` + re-`healthCheck`; state is per-host so ChatGPT failure does not affect Claude/GitHub.
- CLI **kill switch** in `src/cli/commands/browser.ts` + `src/core/browser-bridge/server.ts`: `ackit browser stop --port <n>` → `POST /v1/stop` with `Authorization` (env `ACKIT_BROWSER_TOKEN` if set) → server sets `revoked=true`, responds 200, `setTimeout(close,100)`, subsequent requests 401; `createBrowserBridgeServer.close()` also revokes and closes listener; `ackit bridge` alias.
- **Circuit breaker** in `src/lib/emergency.ts` + adapters: `CircuitBreaker` (5 errors /30s sliding window) → `healthCheck()` returns `{ok:false,reason:"circuit breaker tripped"}`, side panel shows warning, adapter auto-enters Safe Mode (no further compact), `tracker.disconnect()` stops observers/timers/listeners.
- Content `LifecycleTracker` for `MutationObserver`/`timer`/`listener` cleanup and `destroy()` that restores all compact state and removes `data-ackit-style` elements; `Emergency Disconnect` leaves no optimizer DOM marks.
- Update `CHROMEWEBSTORE.md` review notes to reflect that `Restore page` always recovers native site after reload (no persistent destructive DOM).

## Out of scope

- Conversation Performance Engine detailed metrics/benchmark fixtures (TASK-0049).
- Chrome Web Store publish.

## Affected files

- `extensions/browser/src/sidepanel/sidepanel.ts` (Emergency row, abort, clear, revoke, disable, restore)
- `extensions/browser/src/background/service-worker.ts` (onMessage `ackit:emergency-disconnect/disable-site/enable-site/restore-page`, `handleEmergencyDisconnect` clearing session + alarms + postStop + broadcast)
- `extensions/browser/src/lib/emergency.ts` (`LifecycleTracker` + `CircuitBreaker`)
- `extensions/browser/src/content/content.ts` (handles `ackit:emergency-disconnect/site-disabled/restore`, `breaker.shouldTrip()` via healthCheck)
- `extensions/browser/src/adapters/chatgpt/index.ts` + other adapters (use `CircuitBreaker`, `restore()` removes `data-ackit-collapsed` placeholders)
- `src/core/browser-bridge/server.ts` (POST /v1/stop revocation)
- `src/cli/commands/browser.ts` (stop command)
- `CHROMEWEBSTORE.md` (no permission change)

## Acceptance criteria

- [x] Side Panel always shows **EMERGENCY DISCONNECT** (no confirm) that aborts in-flight bridge fetches, clears `chrome.storage.session` token, stops alarms, revokes bridge via `POST /v1/stop`, disables current host in `chrome.storage.local` `ackit:browser:disabledSites`, calls `adapter.restore()`/`disconnect()` to remove ACKit classes/placeholders/UI, and requires manual Reconnect.
- [x] Per-site `Disable ACKit on this site` / `Restore page` / `Reconnect` work per host; `isSiteDisabled(host)` gates `init()` and `insertToComposer`; other sites unaffected.
- [x] `ackit browser stop --port <n>` revokes token, closes listener, subsequent `/v1/status` → 401; `ackit bridge stop` alias works; `createBrowserBridgeServer.close()` also revokes.
- [x] Circuit breaker trips after 5 adapter errors within 30s → `healthCheck()` fail-closed, compact returns no-op, warning surfaced; `restore()` leaves no `data-ackit-collapsed` or `.ackit-placeholder` nodes, `LifecycleTracker.disconnect()` leaves no observers/timers/listeners.
- [x] Reloading the native website always recovers original experience (no persistent DOM), verified by `adapter.destroy()` + `restore()` idempotence.
- [x] `npx tsc -p tsconfig.build.json` PASS, `npx @biomejs/biome check` 0 errors, `node scripts/check-offline-egress.mjs` PASS.

## Test steps

1. `Select-String -Path extensions/browser/src/sidepanel/sidepanel.ts -Pattern "EMERGENCY DISCONNECT"` + `clearBridgeSession` + `postStop` + `ackit:emergency-disconnect` — hits.
2. `Select-String -Path extensions/browser/src/background/service-worker.ts -Pattern "handleEmergencyDisconnect"` — present, clears session, alarms, postStop, broadcast.
3. `Select-String -Path extensions/browser/src/content/content.ts -Pattern "ackit:emergency-disconnect"` — restores and disconnects, sets disabledForHost.
4. Bridge stop test: `node -e "import('./dist/core/browser-bridge/server.js').then(m=>m.createBrowserBridgeServer({port:0}).then(async h=>{const http=await import('node:http'); const url=new URL(h.url); const opts={host:url.hostname,port:Number(url.port),path:'/v1/stop',method:'POST',headers:{Host:url.host,Authorization:'Bearer '+h.token}}; const req=http.request(opts,res=>{console.log('stop status',res.statusCode); http.request({host:url.hostname,port:Number(url.port),path:'/v1/status',method:'GET',headers:{Host:url.host,Authorization:'Bearer '+h.token}},res2=>console.log('after stop',res2.statusCode)).end();}); req.end();}))"` — stop 200, after 401.
5. `node extensions/browser/scripts/build.mjs` still 0 and bundles contain `emergency` strings.

## Risks

- Emergency path itself throwing → mitigated by `try/catch` around each step (abort, clear, postStop, storage, messaging) so one failure does not block others.

## Rollback plan

Revert the 7 extension files + bridge stop handling + this task file.

## Completion notes

2026-08-29 — TASK-0047 completed (MVP). Emergency Disconnect wired one-click no-confirm: sidepanel aborts controller, clears session, best-effort `POST /v1/stop`, service worker clears session+alarms+revokes+broadcasts, content script restores all `data-ackit-collapsed` placeholders and disconnects trackers. Per-site Safe Mode via `chrome.storage.local` `ackit:browser:disabledSites` gates init/insert, other sites unaffected. CLI `ackit browser stop` revokes token and closes listener (verified via manual http test: POST 200 then subsequent GET 401). Circuit breaker (`src/lib/emergency.ts` 5/30s) integrated into `healthCheck()` and `compact()` fail-closed. No persistent DOM after restore/destroy, storage uses session for token and local for per-site prefs (never website localStorage). Verified: tsc PASS, biome 0 errors, offline-egress PASS, bridge stop test 200→401, extension build 3 bundles contain emergency strings. No publish/tag move.

