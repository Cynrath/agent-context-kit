---
id: "TASK-0051"
title: "deterministic workflow drift detection"
status: pending
schemaVersion: 2
dependencies: ["TASK-0048", "TASK-0050"]
createdAt: "2026-08-31"
completedAt: null
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

- [ ] All eight finding codes implemented, ordered deterministically, and unit-tested with positive+negative cases.
- [ ] Mandated scenario passes: declared `src/a/**` + actual change under `src/security/**` yields `UNPLANNED_FILE_CHANGE`; a task updated to declare the new area first does NOT yield the finding.
- [ ] `ackit drift check --ci` exit semantics correct (0 clean, 1 blocking findings, 2 usage, 3 environment).
- [ ] No semantic findings emitted anywhere in the deterministic core (verified by code review + test enumeration of emitted codes).
- [ ] Tests pass with recorded counts.

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

(placeholder)
