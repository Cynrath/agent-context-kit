---
id: "TASK-0069"
title: "post-0.3.0 follow-up: atomic checkpoint writes via temp+rename"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0066"
createdAt: "2026-09-02"
completedAt: null
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

- [ ] Writes are temp+fsync+rename atomic; no partial file observable at any interruption point (failure-injection test)
- [ ] Failed rename leaves the previous checkpoint fully intact and removes the temp file
- [ ] Sequential numbering and deterministic serialization unchanged (regression tests green)
- [ ] Full gate matrix green; no perf regression beyond noise (checkpoint write is small-file local IO)

## Test steps

1. Unit: happy-path write, crash-injection (temp write fails / rename fails), temp-file cleanup assertions.
2. Integration: `checkpoint create`/`validate` round-trip on fixture repo.
3. Full `pnpm test` + `scan --ci`.

## Risks

- Windows rename-over-existing semantics (EEXIST/EPERM on some filesystems) — use the repository's established safe-replace pattern; test on the Windows CI matrix explicitly.

## Rollback plan

Focused commit revert (write path returns to current direct write; schema untouched).

## Completion notes

(proposed post-0.3.0 maintenance chain; planned 2026-09-02 during the v0.3.0 release session per release-task §20 — not executed in the release itself)
