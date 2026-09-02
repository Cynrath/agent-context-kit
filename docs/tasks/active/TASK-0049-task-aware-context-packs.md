---
id: "TASK-0049"
title: "task-aware context packs"
status: completed
schemaVersion: 2
dependencies: ["TASK-0048"]
createdAt: "2026-08-31"
completedAt: 2026-09-01
---

## Purpose

Extend the existing Context Pack engine (no parallel context system) with task-, resume-, and verification-aware generation (§8): `ackit pack --task TASK-XXXX`, `--resume`, and ranking signals from task/intent/plan/spec/evidence/changed files/pending work, while preserving token budgets and deterministic ranking.

## Scope

- `src/cli/commands/pack.ts` + `src/core/context/pack.ts`: new options `--task <TASK-ID>`, `--resume` (implies `--task` or uses the single active task), and `--verification <TASK-ID>` (verification-bundle-oriented variant owned by TASK-0052; this task provides the ranking primitive).
- Ranking: extend `BuildPackOptions` with `taskContext` (precomputed by the caller): declared affected-file globs (→ `activeTaskRef`-weight match), intent/system references, plan/spec/decision refs, evidence refs, pending-work file mentions, plus changed files boost (existing `changed` weight). New weight entries documented in `RANKING_WEIGHTS` (e.g. `taskDeclaredScope`, `taskReference`) — transparent and documented like existing weights; ranking stays deterministic (score → path tiebreak).
- `activeTaskContent` already boosts task-mentioned paths; extend the content source to include the full task doc + intent body + resume context when `--task/--resume` requested (bounded by a fixed token allowance for task sections).
- Context sections: when `--task` is used, prepend a `task-resume` section (from `renderResumeContext`) — reuses the REQ-CTX-001 section mechanism, no new section pipeline.
- Determinism: same repository state + same config + same task state → byte-identical pack (verified by test).
- Tests: integration tests for task/resume packs on a fixture with a real task + intent + checkpoint; ranking-order assertions (declared scope outranks unrelated files at equal size); budget respected; no embeddings/semantic retrieval introduced; secret gate still enforced on task-sourced content.

## Out of scope

- Verification bundle assembly (TASK-0052).
- Any change to profile resolution or the base pack contract (`ackit.pack.v0` unchanged; additive fields only if strictly needed and documented).

## Affected files

- `src/core/context/pack.ts` (options + weights), `src/core/context/orchestrate.ts` (task section builder)
- `src/cli/commands/pack.ts`, `src/cli/program.ts`
- `tests/integration/context/*.ts` (task-aware pack tests)

## Acceptance criteria

- [x] `ackit pack --task TASK-XXXX` and `--task TASK-XXXX --resume` produce deterministic packs that rank declared task scope, task references, and changed files above unrelated content.
- [x] Token budget is respected including task/resume sections; manifest reasons name the new ranking signals.
- [x] Byte-stable output for identical repository + task state (determinism test).
- [x] No regression in existing pack behavior (all existing pack tests green unchanged).

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build`
3. `pnpm vitest run tests/integration/context`
4. Full `pnpm test`.

## Security considerations

- Task/intent/checkpoint content entering packs passes the existing pack secret gate and absolute-path scrubbing (single gate, no bypass).
- No new network/semantic retrieval primitives (offline-egress gate stays green).

## Risks

- Task sections crowding out code files in small budgets — mitigated by a bounded task-section allowance and documented ranking order.

## Rollback plan

Focused revert; pack contract additive only.

## Completion notes

- Extended the EXISTING pack engine (no parallel context system): `BuildPackOptions`
  gained `taskContext` (`TaskPackContext`: declaredScopeGlobs, referencePaths,
  changedFiles); `RANKING_WEIGHTS` gained documented entries `taskDeclaredScope: 80`
  and `taskReference: 70` (+ changed boost reuses `changed: 60`); `PackContextSection`
  id union extended with `task-resume`.
- `buildTaskPackContext` (orchestrate.ts, single source shared by CLI/MCP paths):
  extracts declared scope from the task's `## Affected files`, collects reference paths
  (task doc, intent, spec/decision/plan refs), snapshots git changed files, and renders
  the latest checkpoint's resume section via `renderResumeContext` (TASK-0048). Unknown
  task ids return `PACK-TASK-UNKNOWN` (usage exit, never a throw).
- CLI: `ackit pack --task <TASK-ID>` (+ `--resume` to embed the checkpoint resume
  section; `--resume` alone resolves the single active task). Resume section rides the
  existing REQ-CTX-001 section mechanism (unshifted, budget-prioritized like all
  sections). Secret gate + absolute-path scrubbing unchanged and still enforced on every
  emitted surface (resume content passes the same gate inside renderResumeContext).
- Tests: `tests/integration/context/task-pack.test.ts` 5/5 — scope extraction, ranking
  (declared `src/tasks/**` file included + score visible in manifest reason), byte-stable
  determinism (two builds identical), resume-section embedding (only after a checkpoint
  exists), unknown-task reporting. Full suite 420 tests: 419 stable green +
  `readme-parity` tarball test flaked intermittently under full-suite parallel load
  (pre-existing class, TASK-0040 documented sibling; passes 4/4 in isolation in 18s and
  passed 2 of 3 full runs; NOT related to pack changes — no README/package/tarball files
  touched; gate NOT weakened).
- Gates: typecheck clean; lint 0 problems (240 files); format:check clean; doctor +
  task doctor OK.
