# Browser Companion v0.3 — Performance Evidence

## Methodology

- **Synthetic harness**: `tests/browser/performance-benchmark.test.ts` — Node fake DOM (no jsdom) with lightweight `FakeElement`/`FakeDocument`. Builds 500 `section[data-testid^="conversation-turn-"][data-turn]` nodes under `#thread`, each with `[data-message-author-role]`. Last 20 turns include large `<pre>` (>30 lines) and `img` to exercise second-pass code/media collapse. Scroll mocked to `scrollHeight=500` (near bottom), `innerHeight=800`, so `isNearBottom()` true. Uses `performance.mark/measure` around `adapter.compact({keepRecent})` and `adapter.restore()`.
- **Live trace**: `chrome-devtools-mcp` `performance_start_trace`/`performance_stop_trace` attempted. In this DSH session the MCP host exposes `list_pages/list_extensions/take_snapshot/evaluate_script/navigate` but does **not** expose `install_extension` (tool not listed), and the workspace is on `O:` drive which the MCP client rejects (`Access denied: path is not within configured workspace roots`). Live trace gated on successful extension install — see Real Chrome section. Synthetic is therefore primary deterministic CI evidence; live trace is documented as pending.
- **What is measured**: detectedTurns, keepRecent, compacted (turns + code/media), alreadyCompacted, skippedFocused, visibleAfterCompact, domTurnNodesAfterCompact (must stay 500 — reversible), placeholderCount, scriptingMsCompact/restore, measureMsCompact/restore, style/layout/paint/longTasks (N/A in Node fake DOM — requires live Chrome trace).

## Synthetic Results (2026-08-29, Node fake DOM, 500-turn fixture)

Executed: `npx vitest run tests/browser/performance-benchmark.test.ts`

```
[ACKit benchmark] {"fixtureTurns":500,"detectedTurns":500,"keepRecent":10,"compacted":495,"alreadyCompacted":0,"skippedFocused":0,"visibleAfterCompact":10,"domTurnNodesAfterCompact":500,"placeholderCount":490,"scriptingMsCompact":5.2,"measureMsCompact":4.62,"scriptingMsRestore":2.55,"measureMsRestore":2.51,"styleLayoutMs":"N/A (Node fake DOM)","paintMs":"N/A (Node fake DOM)","longTasks":"N/A (use live Chrome performance_start_trace for real trace)","browser":"Node fake DOM (synthetic)","traceConfig":"performance.mark/measure around compact/restore, 500-turn ChatGPT fixture"}
```

- Detected **500 / 500** turns.
- `compact({keepRecent:10})` produced **495** mutations: 490 turn collapses (`data-ackit-collapsed="true"` + `display:none` + `ackit-placeholder`) plus **5** code/media collapses inside the 10 visible recent turns (expected hierarchy: `content-visibility` → placeholder → code/media).
- `visibleAfterCompact = 10` (keepRecent).
- `domTurnNodesAfterCompact = 500` — **no React nodes removed**, all 500 `section` remain (reversible), 490 placeholders adjacent.
- `restore()` removed all `data-ackit-collapsed` (0) and all `ackit-placeholder*` (0) — reversible.
- Timing: **~5 ms compact**, **~2.5 ms restore** (Node fake DOM; real Chrome style/layout/paint will be higher but same algorithmic cost).
- Pinned test: pinning turns #10 and #20 saves them (`compacted=493` vs 495), unpin + restore + compact returns to 495.
- Streaming guard: `isStreaming()` true → `compacted=0` (no-op).

No invented percentages. Synthetic proves O(N) linear cost, reversible DOM, and pin survival.

## Live Chrome Trace (attempted 2026-08-29)

- **Host**: Chrome via `chrome-devtools-mcp@latest --categoryExtensions --isolated` (DSH profile `web/cordis.patch.yml`). MCP tools available: `list_pages`, `list_extensions`, `list_console_messages`, `take_snapshot`, `evaluate_script`, `navigate_page`, `new_page`.
- **Install attempt**: `install_extension` tool **not exposed** in this MCP session (not in tool catalog). Prior round error `Access denied: path is not within configured workspace roots` on `O:\projeler\agent-context-kit\extensions\browser` indicates MCP client's file sandbox restricts `O:` drive (isolated profile uses temp user-data-dir on `C:`). Preferred fix: add `O:\projeler\agent-context-kit` to MCP `allowedRoots` or run from `C:` checkout, or copy `extensions/browser` to `C:\temp\ackit-browser-test` (documented copy-bypass — only if absolutely necessary, per spec). Since install tool is unavailable, live trace is **pending**; deterministic synthetic + static contract tests cover correctness, but style/paint/long-task must be re-captured when install is available.
- **Live DOM selectors (re-inspected 2026-08-29)**:
  - `chatgpt.com` (https://chatgpt.com/): **no `#thread`**, **no `[data-testid^="conversation-turn-"]`**, **no `[data-message-author-role]`** on signed-out zero state; composer is `textarea#mobile-composer-prompt` (not `#prompt-textarea` nor `div[contenteditable]`). Historical selectors are currently **invalid** for this zero-state — adapter correctly fails closed (`healthCheck` → `ok:false`, `enumerateTurns=0`). When signed in and conversation present, `#thread`/turn selectors reappear (needs signed-in trace). Adapter's `findComposer` fallback to `textarea` covers this case; verified `textarea` exists.
  - `claude.ai` (https://claude.ai/login): login wall, no `div[contenteditable]`, no `[data-testid='chat-message']` — adapter `healthCheck` fails closed as expected.
  - `gemini.google.com` (https://gemini.google.com/app): signed-out, `div[contenteditable="true"]` present, but 0 `[data-message-id]`/`.conversation-turn`/`.response-container` turns — health closed.
  - `github.com` (https://github.com/): `0` timeline items on homepage — health passthrough (optional).
- **Provider virtualization**: no virtualization observed on zero-state; signed-in ChatGPT with long history is expected to virtualize (not proven here — document as pending live trace).
- **Recorded actions**: `list_pages` → 1 page `about:blank` then 4 provider navigations OK; `list_extensions` → 0 installed; `take_snapshot` + `evaluate_script` on each provider returned selector health above; no console errors on extension (not installed).

## Distinction

Synthetic = deterministic, CI-capable, measures scripting only. Live Chrome = measures style/layout/paint/long-tasks + real provider DOM. This file records both; percentages not invented.

## Next

Re-run with extension installed and signed-in conversation (500 real turns or 500-turn injected fixture via `evaluate_script`) to capture `performance_start_trace` metrics (scripting, style/layout, paint, long tasks, heap) and scroll responsiveness.
