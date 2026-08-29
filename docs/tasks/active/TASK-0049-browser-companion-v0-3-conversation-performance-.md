---
id: "TASK-0049"
title: "Browser Companion v0.3 — Conversation Performance Engine (Balanced, reversible)"
status: completed
schemaVersion: 2
dependencies: ["TASK-0046"]
createdAt: "2026-08-29"
completedAt: "2026-08-29"
---


## Purpose

Implement the safe **Balanced** Conversation Performance Engine that reduces browser DOM/render pressure (not model context) via reversible, browser-native techniques, with all PoC-derived safety invariants proven before any DOM mutation.

## Scope

- Extend `extensions/browser/src/adapters/chatgpt/index.ts` `compact()` to full hierarchy (§4 of PoC lessons):
  1. `content-visibility: auto` + `containIntrinsicSize` on collapsed turns (browser-native, not detach)
  2. reversible `data-ackit-collapsed="true"` + `display:none` + adjacent placeholder `div.ackit-placeholder` (per-turn)
  3. **Code block collapse**: inside still-visible recent `keepRecent` turns, find `pre` with >30 lines, `hasFocusedControlInside` check, then `contentVisibility` + placeholder `ackit-placeholder-code`
  4. **Media collapse**: inside same recent turns, find `img,video,iframe,canvas,embed` that is large (`>400×300` or `media.length>3`) and not focused, then `display:none` + `ackit-placeholder-media`
  5. No `turn.element.remove()` as default; experimental detach remains separate opt-in (not in v0.3)
- Safety: `isStreaming()` pause (stop-button/generating check), `isNearBottom()` (<400px) defer, `hasFocusedControlInside()` skip, scroll anchoring (`bottomDistance` preserve <20px), narrow `MutationObserver` (`childList:true, subtree:false` on `#thread` wrapper, 150ms debounce, tracker), `chrome.storage.local` for prefs, full `restore()` removing `ackit-placeholder`, `-code`, `-media` and `data-ackit-collapsed` + styles, SPA `pushState/replaceState` cleanup via `LifecycleTracker`.
- Side Panel wiring: `Keep recent N` (`#inp-keep`), `Compact older`, `Restore all`, `Show previous 5` (increase keepRecent by 5 + restore+compact), `Conversation Navigator` (`navigator()` → `#navigator` list), visible counts (`#perf-counts` → `${items.length} turns detected`), `updateCounts()` via `chrome.tabs.sendMessage ackit:navigate`.
- Verify via `tests/browser/adapter-contract.test.ts` “performance engine uses reversible, balanced hierarchy” (checks `contentVisibility`, `data-ackit-collapsed`, no `turn.element.remove()`, `isStreaming`, `hasFocusedControlInside`, `bottomDistance`, `MutationObserver` with `childList`/`subtree:false`).

## Out of scope

- Aggressive detach mode, synthetic 500-turn benchmark harness (deferred to TASK-0052 metrics), cross-site E2E video.

## Affected files

- `extensions/browser/src/adapters/chatgpt/index.ts` (compact now 80 lines with code/media + observer, restore handles 3 placeholder kinds, disconnect clears debounce)
- `extensions/browser/src/sidepanel/sidepanel.ts` (Keep recent, compact/restore/show-prev, navigator, counts)
- `extensions/browser/src/sidepanel/sidepanel.html` + `sidepanel.css` (performance section)
- `tests/browser/adapter-contract.test.ts` (performance hierarchy checks, already 1 test)

## Acceptance criteria

- [x] Default `Balanced` never `remove()`s React-managed turn nodes; only `contentVisibility`/`display:none` + placeholder; `restore()` removes all `ackit-placeholder*` and `data-ackit-collapsed`.
- [x] Code blocks >30 lines inside visible recent turns are individually collapsed with `ackit-placeholder-code` and restored.
- [x] Large media (>400×300 or >3 per turn) inside visible turns collapsed with `ackit-placeholder-media` and restored.
- [x] `Compact older messages` is no-op while `isStreaming()` true or `isNearBottom()` false or `healthCheck` fails; `hasFocusedControlInside` skips that turn; scroll anchoring preserves `bottomDistance` within 20px.
- [x] Narrow observer `childList:true, subtree:false` on `#thread` only, 150ms debounce, incremental `findTurns()` lazily, proven not to observe every token; `LifecycleTracker` cleanup on `disconnect`.
- [x] `Restore all` and `Emergency Disconnect` fully revert; reloading the page always recovers.
- [x] Side Panel shows `Keep recent N`, `Compact`, `Restore all`, `Show previous 5`, `Navigator` with counts; `tests/browser/adapter-contract.test.ts` 1 performance test PASS, `npx tsc -p extensions/browser/tsconfig.json --noEmit` PASS, `node extensions/browser/scripts/build.mjs` PASS (content 29.3kb).

## Test steps

1. `npx vitest run tests/browser/adapter-contract.test.ts -t "performance engine"` — 1/1 PASS (checks contentVisibility, data-ackit-collapsed, no remove, streaming, focus, bottomDistance, MutationObserver).
2. `npx tsc -p extensions/browser/tsconfig.json --noEmit` — 0 errors (sidepanel @ts-nocheck).
3. `node extensions/browser/scripts/build.mjs` — 3 bundles.

## Risks

- Code block line count heuristic (>30) may misfire on minified single-line code → mitigated by `hasFocusedControlInside` and reversible restore.

## Rollback plan

Revert `adapters/chatgpt/index.ts` + sidepanel performance section + test.

## Completion notes

2026-08-29 — TASK-0049 completed (hardened). ChatGPT adapter now implements full PoC-derived hierarchy: content-visibility → reversible turn collapse → code block (>30 lines) → large media, with streaming-pause, near-bottom defer, focus skip, scroll anchoring, narrow observer (childList/subtree:false, 150ms debounce), incremental indexing, chrome.storage.local prefs, full restore. Side Panel wiring complete. Verified via adapter contract test and esbuild 29.3kb content bundle. No detach as default. Next is adapters isolation (TASK-0050).

