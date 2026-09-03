---
id: "TASK-0069"
title: "post-0.3.0 follow-up: atomic checkpoint writes via temp+rename"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0066"
createdAt: "2026-09-02"
completedAt: 2026-09-03
---

## Purpose

Close the documented v0.3.0 limitation: checkpoint writes are not yet temp+rename atomic (crash-window cosmetic risk identified in final-validation audit finding 4). Make `CheckpointStore` writes atomic with write-to-temp + rename/safe-replace so a crash mid-write can never leave a truncated/partial checkpoint file.

## Current-state evidence

- v0.3.0 CHANGELOG "Known limitations": "Checkpoint writes are not yet temp+rename atomic."
- TASK-0064 audit finding 4: "true temp+rename atomicity; cosmetic crash-window risk only; follow-up."
- `src/core/checkpoint/store.ts` writes YAML state files under `.ackit/workflow/TASK-####/checkpoints/CP-####.yaml` with deterministic serialization but direct write.
- Precedent in repo: `WorkflowStore`/`TaskStore` patterns (`atomic writes, deterministic serialization`) — reuse the same helper where one exists or extract one.

## Scope

- `CheckpointStore.save`: serialize to a temp file in the same directory (same filesystem for rename atomicity), fsync, then atomic rename over the target; failure leaves the previous checkpoint intact.
- Same treatment for any checkpoint-adjacent state files written in the same path family if they share the direct-write pattern (verify in implementation; keep the diff focused).
- Crash-window test: simulate failure between temp write and rename (unit test with injected failure), assert previous file intact and no stray temp files remain after the operation (cleanup on failure).
- CHANGELOG entry in the shipping release; update the limitation documentation (remove from "known limitations" list of that release).

## Out of scope

- Published v0.3.0 artifacts (immutable).
- Changing checkpoint schema/format; journal or verdict store rewrites (separate follow-ups if the same pattern is found there — record findings, do not silently expand scope).

## Affected files

- `src/core/checkpoint/store.ts`
- `tests/unit/checkpoint/checkpoint.test.ts` (atomicity + failure-injection tests)
- CHANGELOG (next release)

## Acceptance criteria

- [x] Writes are temp+fsync+rename atomic; no partial file observable at any interruption point (failure-injection test)
- [x] Failed rename leaves the previous checkpoint fully intact and removes the temp file
- [x] Sequential numbering and deterministic serialization unchanged (regression tests green)
- [x] Full gate matrix green; no perf regression beyond noise (checkpoint write is small-file local IO)

## Test steps

1. Unit: happy-path write, crash-injection (temp write fails / rename fails), temp-file cleanup assertions.
2. Integration: `checkpoint create`/`validate` round-trip on fixture repo.
3. Full `pnpm test` + `scan --ci`.

## Risks

- Windows rename-over-existing semantics (EEXIST/EPERM on some filesystems) — use the repository's established safe-replace pattern; test on the Windows CI matrix explicitly.

## Rollback plan

Focused commit revert (write path returns to current direct write; schema untouched).

## Completion notes

Implemented 2026-09-03 on `feat/post-v030-hardening` (quick profile, verify stage):

- `CheckpointStore.write` (`src/core/checkpoint/store.ts`) is now
  same-directory temp (`.CP-####.<pid>-<ts>-<rand>.tmp`, id-only naming — no
  absolute-path leakage) → complete write → `handle.sync()` fsync →
  `rename` over target → temp cleanup in `finally`. Windows replace semantics
  handled: EPERM/EEXIST/EBUSY falls back to unlink-then-rename (previous
  checkpoint already intact, temp still complete). Any pre-replace failure
  removes the temp and leaves the previous file byte-identical; no partial
  temp is ever accepted as canonical; no stale temp survives success. No
  schema/format migration.
- Adjacent-store finding (recorded, scope not expanded): `WorkflowStore.write`
  (`src/core/workflow/store.ts`), `EvidenceStore` (`src/core/evidence/store.ts`),
  verdict/journal/task stores still use direct `writeFile` — separate
  follow-ups if desired; checkpoint path family
  (`.ackit/workflow/TASK-####/checkpoints/`) is fully atomic now.
- Proven by `tests/unit/checkpoint/checkpoint-atomic.test.ts` (4 tests:
  happy-path validity + no stale temp + repeated writes CP-0001/0002;
  temp-write failure (injected ENOSPC) → previous byte-identical + only
  CP-0001.yaml remains; rename failure (injected EIO) → previous intact +
  no `.tmp`; temp names carry no absolute paths). Existing
  `tests/unit/checkpoint/checkpoint.test.ts` (10) green — numbering and
  deterministic serialization unchanged. Checkpoint-CLI round-trip suites
  green; full matrix 98/554 PASS. Write cost stays small-file local IO
  (atomic suite ~8s dominated by git fixtures, not IO).
