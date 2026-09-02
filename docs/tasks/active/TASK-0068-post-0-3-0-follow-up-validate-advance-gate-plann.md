---
id: "TASK-0068"
title: "post-0.3.0 follow-up: validate advance-gate planning artifacts by disk existence"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0066"
createdAt: "2026-09-02"
completedAt: null
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

- [ ] Advance past a planning stage with a declared-but-missing plan artifact fails with a deterministic, documented finding
- [ ] Existing valid references (present on disk) advance exactly as before (regression tests)
- [ ] Path traversal/escape attempts are rejected by containment (test)
- [ ] Full gate matrix green; legacy compatibility fixture unchanged

## Test steps

1. Unit: gate matrix — artifact present / declared-but-absent / outside-root path.
2. Integration: workflow advance CLI on fixture repo with missing plan file.
3. Full `pnpm test` + `scan --ci`.

## Risks

- Repositories that legitimately keep plans outside the repo would newly fail the gate — mitigation: containment stays repo-rooted by design (documented), and the failure is a gate denial, not a crash; users can restore the artifact or use documented escape hatch policy.

## Rollback plan

Focused commit revert.

## Completion notes

(proposed post-0.3.0 maintenance chain; planned 2026-09-02 during the v0.3.0 release session per release-task §20 — not executed in the release itself)
