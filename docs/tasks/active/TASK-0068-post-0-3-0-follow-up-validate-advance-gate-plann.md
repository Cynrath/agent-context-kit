---
id: "TASK-0068"
title: "post-0.3.0 follow-up: validate advance-gate planning artifacts by disk existence"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0066"
createdAt: "2026-09-02"
completedAt: 2026-09-03
---

## Purpose

Close the documented v0.3.0 limitation: advance-gate planning-artifact validation is declaration-based (the task's `planRef` frontmatter value is trusted) rather than checking that the referenced plan document actually exists on disk. Make the `ackit workflow advance` gate (and doctor's reference validation where applicable) verify real disk existence of referenced planning artifacts, so a declared-but-absent plan blocks advancing past PLAN-style stages.

## Current-state evidence

- v0.3.0 CHANGELOG "Known limitations": "Advance-gate planning-artifact validation remains declaration-based rather than disk-existence based."
- Task reference fields (`planRef`, `specRefs`, `decisionRefs`, `intentRef`) are validated by doctor as references; the workflow advance gate consumes the stored declaration without disk proof.
- `tests/unit/tasks/task-refs.test.ts` and `tests/unit/workflow/lifecycle-gates.test.ts` cover current (declaration-based) behavior.

## Scope

- Advance-gate evaluation: resolve `planRef` (and stage-required plan artifacts) against the repository root and fail the gate with a deterministic finding when the artifact is missing on disk.
- Doctor: strengthen reference validation for plan/spec/decision refs to distinguish declared vs present (advisory first, or gate per ADR-0025 semantics — decide in plan review).
- Containment: resolution must stay inside the canonical root (same realpath containment as other stores).
- Update CHANGELOG (shipping release) and workflow/advance docs (`docs/reference/cli.md`, `docs/concepts/workflows.md`).

## Out of scope

- Published v0.3.0 artifacts (immutable).
- Changing task schema shape; adding new frontmatter fields; network anything.

## Affected files

- `src/core/workflow/gates.ts` (advance gate), `src/core/tasks/store.ts` (reference resolution) as needed
- `tests/unit/workflow/lifecycle-gates.test.ts`, `tests/unit/tasks/task-refs.test.ts`, `tests/integration/tasks/workflow-cli.test.ts`
- `docs/concepts/workflows.md`, `docs/reference/cli.md`, CHANGELOG (next release)

## Acceptance criteria

- [x] Advance past a planning stage with a declared-but-missing plan artifact fails with a deterministic, documented finding
- [x] Existing valid references (present on disk) advance exactly as before (regression tests)
- [x] Path traversal/escape attempts are rejected by containment (test)
- [x] Full gate matrix green; legacy compatibility fixture unchanged

## Test steps

1. Unit: gate matrix — artifact present / declared-but-absent / outside-root path.
2. Integration: workflow advance CLI on fixture repo with missing plan file.
3. Full `pnpm test` + `scan --ci`.

## Risks

- Repositories that legitimately keep plans outside the repo would newly fail the gate — mitigation: containment stays repo-rooted by design (documented), and the failure is a gate denial, not a crash; users can restore the artifact or use documented escape hatch policy.

## Rollback plan

Focused commit revert.

## Completion notes

Implemented 2026-09-03 on `feat/post-v030-hardening` (quick profile, verify stage):

- Advance gate (`src/cli/commands/workflow.ts` `artifactsExist`) now proves
  disk existence instead of trusting declarations: intent via `IntentStore.find`,
  spec refs (all must resolve) and `planRef` via containment-checked
  `refExistsOnDisk` (absolute → deny, root escape → deny, absent → deny, no
  implicit creation, same resolve→contained→access policy as
  `TaskStore.refExists` — symlink escape follows that policy).
- Doctor decision (plan review): no doctor change needed — `task doctor`
  already distinguishes declared vs present via `TASK-REF-MISSING`
  (file-existence, advisory), and `TaskMetaSchema` already rejects
  absolute/traversal refs at parse time (deterministic schema deny, proven by
  test: unparsable doc + `workflow set` usage denial).
- Proven by `tests/unit/workflow/advance-disk.test.ts` (4 tests:
  declared-but-missing plan → `missing-required-artifact` threshold denial;
  valid nested path → advances; absolute/traversal → schema+gate denial; no
  planRef → denial). Existing `workflow-cli` (4), `lifecycle-gates` (6),
  `task-refs` (8), legacy compat (2) all green unchanged.
- Full matrix: lint/format/typecheck/build clean; `pnpm test` 98/554 PASS.
