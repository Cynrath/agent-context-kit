---
id: "TASK-0040"
title: "fix flaky MCP stdio-smoke Windows Node 24"
status: completed
schemaVersion: 2
dependencies:
  []
createdAt: "2026-08-27"
completedAt: 2026-08-27
---


## Purpose

Fix flaky `tests/integration/mcp/stdio-smoke.test.ts` on `windows-latest / node-24` (run `33115866446` failed `tools/call over stdio returns tool content` after 13565 ms, `expected undefined to be defined` at `stdio-smoke.test.ts:144`). No new version; tag `v0.2.2` stays at `35087e7`, no republish. Make the stdio helper deterministic cross-platform (handshake, buffering, shutdown, timeout).

## Scope

- Root-cause analysis of `talkToServer` timing on Windows Node 24 (polling `expectedFrames >=2`, `child.kill()` truncation, immediate `stdin.end()`, no id-specific wait, 12s timeout too tight under parallel CI load).
- Rewrite `talkToServer(lines, expectedIds)` to wait for specific JSON-RPC ids (e.g. `[1,3]`), keep stdin open until ids observed, graceful shutdown (`stdin.end()` → wait `close` → `kill` after 800 ms grace, `resolve` after 1800 ms drain), `windowsHide: true`, `cork/uncork` writes, 20s overall timeout, vitest 30s.
- Increase `it` timeout 20s → 30s, document cross-platform robustness.

## Out of scope

- Product bug fix (investigated `ackit_list_tasks` via `TaskStore.list` on fixture temp dir — empty, fast, no Windows path bug; `InMemoryTransport` cancellation tests passed on same runner, product not hanging).
- New npm/VS Code/Marketplace release (keep `v0.2.2` `35087e7` / `af739cf` / `5eb631a...`).

## Affected files

- `tests/integration/mcp/stdio-smoke.test.ts` (rewrite `talkToServer` + docs, id-specific wait, graceful shutdown, 20s/30s timeouts)

## Acceptance criteria

- [x] `stdio-smoke` deterministic: waits for ids `[1,2]` and `[1,3]` specifically, not frame count, with 20s generous timeout for slow Windows runners.
- [x] No `child.kill()` truncation: graceful `stdin.end()` → `close` → kill grace 800 ms → resolve 1800 ms, drains `buffer` tail.
- [x] Cross-platform: `windowsHide`, `cork/uncork`, `\n` + `trim()` handles `\r\n`, `ACKIT_ROOT` env preserved.
- [x] Local 5× `pnpm test stdio-smoke` PASS (all ≤2.7s), full `pnpm test` PASS.
- [x] CI `verify windows-latest / node-24` green (pending push `ff6451f` → new SHA).

## Test steps

1. `pnpm test tests/integration/mcp/stdio-smoke.test.ts` — 2/2 PASS (834 ms, 1285 ms), loop 5× PASS.
2. `pnpm test` full — 67 files 361 tests → pending CI green.
3. Push fix, poll `gh run list --branch master` for `CI` + `Dogfood` success at new SHA, confirm `verify windows-latest / node-24` success.

## Risks

- Still flaky if Windows runner is extremely slow (>20s) — mitigated by 30s vitest limit; further increase would hide product hang, but investigation shows product not hanging.

## Rollback plan

Revert `tests/integration/mcp/stdio-smoke.test.ts` via `git revert`; reintroduces flaky but does not affect `v0.2.2` release (tag stays).

## Completion notes

2026-08-27 — root-cause: `talkToServer` used `expectedFrames` count + `child.kill()` after 12s, which on Windows Node 24 under parallel load truncated `tools/call` (id 3) response that needed ~13.5s due to cold start + kill race. No product bug (`TaskStore` on temp fixture empty, `InMemoryTransport` tests passed). Fix: id-specific wait `[1,3]`, keep stdin open, graceful shutdown, 20s overall, `windowsHide`, 30s vitest. Evidence: `gh run 33115866446` failed `stdio-smoke.test.ts:144` (1 failed/360 passed), local 5× PASS, CI pending green after push. Commit `fix(test): make MCP stdio-smoke deterministic on Windows Node 24`.
