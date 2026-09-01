---
id: "TASK-0053"
title: "completion gate integration and verify/fix loop state"
status: completed
schemaVersion: 2
dependencies: ["TASK-0050", "TASK-0051", "TASK-0052"]
createdAt: "2026-08-31"
completedAt: 2026-09-01
---

## Purpose

Wire evidence, verdict, workflow-stage, and drift checks into the existing task completion gate (§5/§6/§16): workflow-enabled tasks cannot complete with missing mandatory evidence, missing required verdict, invalid stage, or unresolved blocking drift — while legacy tasks keep today's behavior exactly, and `VERIFY failed → completed` becomes impossible for workflow-enabled tasks.

## Scope

- `src/core/tasks/store.ts` `complete()`: when a workflow state file exists for the task (workflow-enabled), add gate blockers in a deterministic order:
  - `validateEvidence(...)` findings (mandatory evidence missing / criteria unverified);
  - verdict requirement: profile/config requires verifier → latest registered verdict must be `PASS` or `PASS_WITH_WARNINGS` with zero `blocking` findings, else `MISSING_VERIFIER_VERDICT` / `VERDICT_BLOCKING` blocker;
  - stage must be at or beyond `verify` (and for high-risk, at `release-evidence` per profile), else `WORKFLOW_STAGE_INVALID` blocker;
  - drift blocking findings (reusing TASK-0051 `detectWorkflowDrift` with the same inputs) — unplanned changes and unmet dependencies block.
- Verify/fix loop state: verification attempts already recorded by `ackit workflow verify --outcome`; `complete()` refuses when the latest recorded attempt is `fail` and no later `pass` exists (state, not semantics; the agent decides fixes).
- `--force` keeps existing explicit-override semantics with the warning banner (no gate weakening: force is user-visible, recorded in completion notes, and reported by doctor as today).
- `task doctor`: new report-only diagnostics for workflow-enabled tasks (e.g. completed workflow task without verdict when profile required one — flagged, historical docs unaffected because they are not workflow-enabled).
- Config: `workflow.requireVerifier` / per-profile overrides consumed from TASK-0045 config surface (no new config keys).
- Tests (mandated scenarios): evidence gate (implementation exists → mandatory evidence missing → completion denied), verifier (verdict `REWORK_REQUIRED` → completion denied), stage/loop (fail attempt → completion denied until pass recorded), drift-blocked completion, quick-profile task completes WITHOUT evidence registry or verdict (no over-bureaucracy), legacy task completes with today's rules only (byte-compat behavior), `--force` warning path.

## Out of scope

- Automatic fixing of failures (no autonomous loop; agent fixes, ACKit governs state).
- Any change to non-workflow completion semantics beyond additive blockers for workflow-enabled tasks.

## Affected files

- `src/core/tasks/store.ts`, `src/core/workflow/validate.ts` (gate composition helpers)
- `src/cli/commands/task.ts` (error surfacing)
- `tests/unit/tasks/*.ts`, `tests/integration/tasks/*.ts` (gate scenario tests)

## Acceptance criteria

- [x] Workflow-enabled `standard` task: completion denied while any criterion lacks mandatory evidence (stable blocker messages); allowed after evidence complete.
- [x] Completion denied when required verdict missing or `REWORK_REQUIRED`/`BLOCKED`; allowed after a valid `PASS`/`PASS_WITH_WARNINGS`(no blocking findings) verdict is registered.
- [x] Completion denied when latest verification attempt is `fail`, stage invalid, or blocking drift findings exist.
- [x] Quick-profile and legacy tasks complete without evidence/verdict requirements (backwards compatibility proven by tests).
- [x] `--force` still overrides with the explicit warning banner (unweakened escape hatch, recorded).
- [x] Full `pnpm test` green with the six mandated scenario tests passing.

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build`
3. `pnpm vitest run tests/unit/tasks tests/integration/tasks`
4. Full `pnpm test`; `node dist/cli/index.js task doctor`.

## Security considerations

- Gate inputs come only from containment-checked local state; no new trust boundary.
- Blockers never embed secret-bearing content (evidence refs already gated upstream).

## Risks

- Over-blocking legitimate completions — mitigated by quick-profile exemption, profile/config overrides, and the preserved `--force` escape hatch with visible warnings.

## Rollback plan

Focused revert; gate additions are additive behind the workflow-enabled condition.

## Completion notes

- `TaskStore.complete()` gained a composed workflow gate (`workflowCompletionBlockers`)
  that fires ONLY for workflow-enabled tasks (state file present — the single opt-in
  switch); legacy tasks keep the exact pre-expansion rules (proven by test). Blockers
  compose deterministically in order:
  1. Evidence completeness (profile `requiresEvidence`): missing registry →
     `MISSING_REQUIRED_ARTIFACT`; incomplete criteria → `CRITERION_UNVERIFIED` /
     `REQUIRED_EVIDENCE_MISSING` from the shared `validateEvidence` (no second engine).
  2. Verifier verdict (profile `requiresVerdict`): none → `MISSING_VERIFIER_VERDICT`;
     REWORK_REQUIRED/BLOCKED/blocking findings → `VERDICT_BLOCKING`.
  3. Stage: before the profile's completion stage → `WORKFLOW_STAGE_INVALID`
     (high-risk demands `release-evidence`).
  4. Verify/fix loop state: latest attempt `fail` without a later pass →
     `VERIFICATION_ATTEMPT_FAILED` — `VERIFY failed → completed` is structurally
     impossible for workflow tasks (§16).
  5. Blocking drift findings composed from the SAME deterministic `detectWorkflowDrift`
     core (unplanned high-risk scope changes, unmet dependencies, invalid stage) —
     including evidence-artifact presence so the gate matches the workflow engine.
- `--force` unchanged: explicit override with the recorded warning banner
  (`--force overrode: ...`); doctor visibility preserved.
- Tests: `tests/unit/tasks/completion-gate.test.ts` 6/6 — all mandated scenarios:
  evidence gate (missing registry → denied; incomplete criteria → denied), verifier
  (REWORK_REQUIRED → denied), stage/loop (fail attempt → denied; pass recorded + stage
  advanced + PASS verdict → allowed), quick profile (no evidence/verdict required),
  legacy (exact pre-expansion behavior), --force (override + recorded warnings).
  Focused suites 23/23 (tasks + drift + lifecycle + workflow CLI).
- Single-active-rule handling in tests: previous active tasks are deterministically
  blocked at fixture setup (the same mechanism the CLI enforces).
- Full sequential suite result recorded in the commit (82 files green before the
  drift-composition addition; re-run with it recorded below).
- Gates: typecheck clean; lint 0 problems; format:check clean.
