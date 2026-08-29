---
id: "TASK-0054"
title: "Browser Companion v0.3 — real Chrome E2E, provider validation and performance evidence"
status: pending
schemaVersion: 2
dependencies: ["TASK-0053"]
createdAt: "2026-08-29"
completedAt: null
---

## Purpose

Complete the missing Browser Companion runtime: Pin / Keep Visible, synthetic performance benchmark, and real Chrome E2E (MCP) validation for all providers. This task produces the evidence TASK-0052 deferred.

## Scope

### Chrome DevTools MCP (workspace-root fix + full E2E)
- Resolve `Access denied: path is not within configured workspace roots` using the correct MCP/client workspace mechanism (prefer repository-scoped/workspace-safe fix; document if global MCP config change required). Do not copy repo to unrelated location to bypass security unless absolutely necessary and documented.
- Then perform in real Chrome (when MCP available):
  ```
  install extension (extensions/browser, unpacked)
  list extensions → ACKit Browser Companion enabled
  reload extension
  inspect service worker (no errors, alarms registered, sidePanel behavior)
  open Side Panel (take_snapshot)
  inspect console (extension + page)
  inspect network (bridge 127.0.0.1 only when connected)
  ```
- If MCP still unavailable after documented fix attempt, record exact error + workspace config and keep evidence pending — but do not mark adapter as verified.

### ChatGPT adapter (live DOM re-verification)
- Inspect current live DOM at chat.openai.com/chatgpt.com (selectors `#thread`, `[data-turn-id-container]`, `section[data-testid^="conversation-turn-"]`, `[data-message-author-role]` may have drifted). Re-verify healthCheck, enumerateTurns, detect.
- Verify native provider virtualization behavior (if ChatGPT now virtualizes, document coexistence).
- Exercise via MCP or manual harness: composer insertion (contenteditable/textarea, no auto-submit), compact old turns (keepRecent), restore all, streaming pause (isStreaming → compact no-op), scroll anchoring (bottomDistance), focus preservation (skip focused turn), SPA conversation change (pushState/popstate), Emergency Disconnect, Safe Mode per-site disable, reconnect.
- Record selector health, turn counts, compacted counts, scroll delta.

### Claude / Gemini / GitHub (independent)
- Each provider independently: inspect current live DOM, validate detect/healthCheck/composer insertion/compose boundaries, verify `chrome.storage` vs `localStorage`, SPA lifecycle, and that adapter isolation holds (no ChatGPT selector leakage, fail-closed).
- GitHub: validate composer/context integration appropriate to github.com (comment field), not fake chat parity. Document known limitations explicitly.

### Pin / Keep Visible (complete missing feature)
- Implement per `extensions/browser/src/lib/storage.ts` backed by `chrome.storage.local`:
  - Each turn can be pinned from UI (side panel navigator or in-page control) — pinned state visible (icon/badge).
  - Pinned turns survive automatic compaction (even when older than keepRecent) until explicitly unpinned.
  - User can unpin; unpinned turn becomes eligible for next compaction.
  - `restore all` and `Emergency Disconnect` clear correctly (restore removes pins visually but persistent storage cleared on restore? spec: restore removes all ACKit marks; pinned state must be consistent — decide and document).
  - Provider-specific implementation stays in adapter modules; core only stores `turnId -> pinned` map keyed by stable turn id + host.
  - Extension settings use `chrome.storage.local` per-site key, not website storage.
- UI: Side Panel navigator shows pin toggle; compact logic skips `isPinned(turn.id)`.
- Add contract test for pinned-survives-compaction.

### Performance benchmark (real harness)
- Create deterministic synthetic fixture harness:
  - At least 500 conversation turns fixture (JSDOM or real DOM helper) approximating ChatGPT turn structure (section + data-testid + role + content + optional large pre/img).
  - Measure before/after: detectedTurnCount, visibleTurnCount, compactedTurnCount, DOM node impact, scripting/style/layout/paint duration via `performance.mark` / `performance.measure` or `performance.now` around `compact()`/`restore()`, and long-task approximation.
  - Methodology + raw numbers stored under `tests/browser/performance-benchmark.test.ts` or `tests/browser/benchmarks/` + `docs/benchmarks/browser-companion-v0.3-performance.md` (evidence file).
- Where Chrome tracing permits via `performance_start_trace`/`performance_stop_trace` MCP, gather live browser trace for at least ChatGPT fixture and record metrics (scripting, style/layout, paint, long tasks, heap). Distinguish synthetic vs live-site measurements.
- Do not invent percentages; report measured values and config (browser/version, fixture size, trace config).

## Out of scope

- Marketplace publish, npm publish, tag move, history rewrite.
- Aggressive detach mode (still opt-in only).
- Making Chrome DevTools MCP a hard CI dependency.

## Dependencies

- TASK-0053 strict remediation committed and green.
- MCP workspace fix may require user/client config doc.

## Affected files

- `extensions/browser/src/adapters/types.ts` (+ pin interface)
- `extensions/browser/src/adapters/chatgpt/index.ts` (pin-aware compact)
- `extensions/browser/src/adapters/claude/index.ts` / `gemini` / `github` (pin support)
- `extensions/browser/src/content/content.ts` (pin message handling, storage)
- `extensions/browser/src/lib/storage.ts` (pinned map schema)
- `extensions/browser/src/sidepanel/sidepanel.html|css|ts` (pin UI, navigator pin toggles)
- `extensions/browser/src/background/service-worker.ts` (if needed for storage relay)
- `tests/browser/performance-benchmark.test.ts` (new) + fixture helper
- `tests/browser/adapter-contract.test.ts` (pin tests)
- `docs/benchmarks/browser-companion-v0.3-performance.md` (evidence)
- `CHROMEWEBSTORE.md` (if pin permission notes needed — likely none)

## Acceptance criteria

- [ ] MCP workspace-root issue resolved or precisely documented with required client config change; install_extension succeeds and `list_extensions` shows ACKit Browser Companion (or exact block recorded).
- [ ] ChatGPT adapter: current DOM inspected (document which selectors hit/missed), enumerateTurns validated, composer insertion no auto-submit verified, compact/restore/streaming/focus/scroll/SPA/Emergency-D381 verified with live evidence notes.
- [ ] Claude, Gemini, GitHub each independently inspected and exercised; selector health + limitations documented; no cross-adapter selector leakage (grep test).
- [ ] Pin / Keep Visible: pin toggle exists, pinned survives compaction, unpin works, state visible, restore/emergency cleanup correct, storage is `chrome.storage.local`, adapter isolation preserved.
- [ ] Synthetic 500+ turn benchmark exists, runs deterministically (`vitest run tests/browser/performance-benchmark.test.ts`), and records measured metrics (detected/visible/compacted, timing breakdown) — no invented percentages.
- [ ] If Chrome trace available, live trace metrics captured and distinguished from synthetic; otherwise trace limitation documented with `performance_start_trace` attempt.
- [ ] `npx tsc -p extensions/browser/tsconfig.json --noEmit` (strict) PASS, `pnpm lint/format:check/typecheck/build` PASS, browser contract tests PASS.

## Test steps

1. `rg -n "ackit.*pin|pinned|keepVisible" extensions/browser/src` — hits in adapter + content + storage + sidepanel.
2. `npx vitest run tests/browser/performance-benchmark.test.ts` — PASS with numbers printed (or evidence file).
3. `npx vitest run tests/browser/adapter-contract.test.ts` — pin-related tests PASS, no core selector leakage.
4. MCP: `list_pages` → 1+, `list_extensions` → ACKit, `take_snapshot` side panel, `performance_start_trace` (if available) for ChatGPT fixture.
5. `npx tsc -p extensions/browser/tsconfig.json --noEmit` (strict) — 0 errors.
6. Manual: pin a middle turn → compact keepRecent=5 → pinned still visible → unpin → next compact collapses it; restore removes all.

## Security considerations

- Pin storage must not leak cross-site via shared key; per-host isolation (`ackit:browser:pins:<host>` or similar).
- DOM pin controls must not inject unsanitized HTML from page; use `textContent`.

## Risks

- Provider DOM redesign invalidates turn selectors → task owns re-discovery and fail-closed update.
- MCP workspace fix may require global config the agent cannot change → document required `allowedRoots` change for user.
- Large fixture may be slow in JSDOM → split synthetic vs trace evidence; synthetic is CI-safe, trace is manual/MCP.

## Rollback plan

Revert pin + benchmark + MCP evidence files + adapter changes in one commit; prior reversible collapse remains.

## Completion notes

(pending — to be filled with MCP evidence, provider results, pin behavior, benchmark numbers, trace config)
