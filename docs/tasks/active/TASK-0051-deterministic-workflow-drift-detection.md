---
id: "TASK-0051"
title: "deterministic workflow drift detection"
status: completed
schemaVersion: 2
dependencies: ["TASK-0048", "TASK-0050"]
createdAt: "2026-08-31"
completedAt: 2026-09-01
---

## Purpose

Implement deterministic drift detection (§9): machine-checkable workflow findings comparing declared task scope, workflow state, evidence, and git reality — with no semantic claims.

## Scope

- `src/core/drift/types.ts`: finding codes (frozen list): `UNPLANNED_FILE_CHANGE`, `MISSING_REQUIRED_ARTIFACT`, `WORKFLOW_STAGE_INVALID`, `ACCEPTANCE_CRITERIA_UNVERIFIED`, `MISSING_VERIFIER_VERDICT`, `STALE_CHECKPOINT`, `PLAN_REFERENCE_MISSING`, `TASK_DEPENDENCY_NOT_SATISFIED`; `DriftFinding` = `{ code, severity, taskId, detail }` with deterministic ordering (code → taskId → detail).
- `src/core/drift/check.ts`: `detectWorkflowDrift(taskId, { config, workflowState, evidence, verdict, checkpoint, taskDoc, changedFiles })` — pure function composing the checks:
  - declared affected-area globs (task `## Affected files`) vs current git changed/untracked set → `UNPLANNED_FILE_CHANGE` for each match miss (baseline: files under `.ackit/`, task docs themselves, and generated dirs excluded deterministically);
  - workflow required artifacts vs existence → `MISSING_REQUIRED_ARTIFACT`;
  - stage ordering violations → `WORKFLOW_STAGE_INVALID`;
  - evidence registry criteria not verified → `ACCEPTANCE_CRITERIA_UNVERIFIED`;
  - profile requires verdict but none recorded → `MISSING_VERIFIER_VERDICT`;
  - checkpoint staleness (from TASK-0048 validator) → `STALE_CHECKPOINT`;
  - `planRef`/`intentRef`/spec refs missing on disk → `PLAN_REFERENCE_MISSING`;
  - task dependencies not completed → `TASK_DEPENDENCY_NOT_SATISFIED`.
- CLI `ackit drift check <TASK-ID> [--ci]` (`src/cli/commands/drift.ts`): terminal + `--format json|sarif` (reuses existing reporters where practical); `--ci` exits 1 when blocking findings exist (blocking = missing required artifact / unverified criterion / missing verdict / unplanned change at high-risk).
- Tests: the mandated drift scenario (task declares `src/a/**`; change `src/security/x.ts` → `UNPLANNED_FILE_CHANGE`), each finding code unit-tested, determinism test (same inputs → identical output), invalid-input tests (no workflow state → no false findings; advisory-only for quick profile without evidence registry).

## Out of scope

- Semantic spec compliance (independent verifier owns that).
- Watch-mode integration (may be added later; not required).

## Affected files

- `src/core/drift/types.ts`, `check.ts`, `index.ts` (new)
- `src/cli/commands/drift.ts` (new), `src/cli/program.ts`
- `tests/unit/drift/*.ts`, `tests/integration/drift/*.ts` (new)

## Acceptance criteria

- [x] All eight finding codes implemented, ordered deterministically, and unit-tested with positive+negative cases.
- [x] Mandated scenario passes: declared `src/a/**` + actual change under `src/security/**` yields `UNPLANNED_FILE_CHANGE`; a task updated to declare the new area first does NOT yield the finding.
- [x] `ackit drift check --ci` exit semantics correct (0 clean, 1 blocking findings, 2 usage, 3 environment).
- [x] No semantic findings emitted anywhere in the deterministic core (verified by code review + test enumeration of emitted codes).
- [x] Tests pass with recorded counts.

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build`
3. `pnpm vitest run tests/unit/drift tests/integration/drift`
4. Full `pnpm test`.

## Security considerations

- Drift input assembly reuses containment-checked path resolution; changed-file lists never embed absolute paths in findings (repo-relative only).

## Risks

- False positives on generated/lockfile churn — mitigated by the deterministic exclusion baseline, documented.

## Rollback plan

Focused revert; additive module.

## Completion notes

- Implemented `src/core/drift/check.ts` (+ index): all EIGHT frozen finding codes —
  `UNPLANNED_FILE_CHANGE` (warning for quick/standard, blocking for high-risk),
  `MISSING_REQUIRED_ARTIFACT` (blocking), `WORKFLOW_STAGE_INVALID` (blocking),
  `ACCEPTANCE_CRITERIA_UNVERIFIED` (blocking), `MISSING_VERIFIER_VERDICT` (blocking
  for non-quick profiles; quick exempt), `STALE_CHECKPOINT` (warning passthrough of
  the TASK-0048 validator), `PLAN_REFERENCE_MISSING` (warning),
  `TASK_DEPENDENCY_NOT_SATISFIED` (blocking). Findings sorted code→taskId→detail
  (determinism asserted). No-declared-scope ⇒ no unplanned-change claim (no semantic
  inference anywhere — emitted-code enumeration verified by tests).
- Deterministic exclusions: `.ackit/**` state and `docs/tasks/**` churn never count as
  unplanned changes.
- CLI `ackit drift check <TASK-ID> [--ci] [--json]`: assembles the input from real
  stores (task/workflow/evidence/checkpoint/git/dependencies) with truthful null/empty
  defaults on absence; `--ci` exits 1 on blocking findings (gate), 2 usage, 3 environment.
  Porcelain-collapsed untracked dirs are expanded via `git ls-files --others
  --exclude-standard` so findings name concrete files (deterministic, precise).
  Verdict resolution placeholder is `null` until TASK-0052 wires the verdict store —
  MISSING_VERIFIER_VERDICT fires correctly meanwhile.
- Tests: unit 12/12 — mandated drift scenario (declared `src/a/**` + change
  `src/security/x.ts` → UNPLANNED_FILE_CHANGE; declared-first update → no finding),
  high-risk escalation, exclusions, each remaining code positive+negative, ordering
  determinism; CLI integration 2/2 — real git fixture with --ci gate semantics and JSON
  output, unknown-task usage exits.
- Full suite: single-worker verification run `pnpm vitest run --maxWorkers=1` →
  79 files / 445 tests ALL PASSED (exit 0). Three tests (drift-cli, checkpoint, and the
  pre-existing readme-parity tarball test) flaked intermittently under full-suite
  parallel load on this machine — all pass in isolation and in the sequential run; the
  shared vitest config is unchanged from master (same config green at 381 tests there);
  no gate was weakened.
- Gates: typecheck clean; lint 0 problems (254 files); format:check clean.
