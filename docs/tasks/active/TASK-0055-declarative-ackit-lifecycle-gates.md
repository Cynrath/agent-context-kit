---
id: "TASK-0055"
title: "declarative ACKit lifecycle gates"
status: pending
schemaVersion: 2
dependencies: ["TASK-0053"]
createdAt: "2026-08-31"
completedAt: null
---

## Purpose

Implement the small, stable, declarative lifecycle-gate contract at boundaries ACKit reliably owns (§12): `sessionStart, taskStart, preTaskComplete, verification, preCommit, release, error, sessionEnd` — as declared requirements enforced by existing commands, never as executable hooks.

## Scope

- `src/core/workflow/gates.ts`: `LIFECYCLE_POINTS` frozen list (the eight points); `LifecycleGateSchema` (strict, declarative only): `{ point: enum, requireArtifacts?: string[], requireEvidenceVerified?: boolean, requireVerdict?: boolean, requireCleanDrift?: boolean, message?: bounded string }` — NO command/script fields exist in the schema at all (structural guarantee; validated by a schema test asserting no command-executing fields can parse).
- Gate sources (merged deterministically, config < profile): the built-in workflow profile catalog (from TASK-0045) + optional per-point overrides in the config `workflow` section.
- Enforcement wiring (each an ACKit-owned boundary, all deterministic):
  - `sessionStart` → `ackit doctor` / `ackit workflow show`: report unmet gate requirements for active workflow tasks (advisory list).
  - `taskStart` → `ackit task start`: for workflow tasks with `requireArtifacts`, missing required artifacts warn (report; start allowed — the completion gate is the hard boundary).
  - `preTaskComplete` → `ackit task complete` for workflow-enabled tasks: all declared gate requirements enforced as blockers (reusing TASK-0053 gate composition — this is the declarative source of the same checks, not a second engine).
  - `verification` → `ackit verification bundle`: bundle header lists the resolved verification-point gates so the verifier sees exactly which requirements apply.
  - `preCommit` → `ackit hooks` managed pre-commit block (existing install/uninstall mechanism extended): the managed block runs the repository-built CLI gate (`node <dist>/cli/index.js drift check <active-task> --ci` when a workflow task is active; no-op otherwise) — the only "execution" is ACKit's own CLI invoked by the existing managed git hook the user explicitly installed (documented trust boundary; no arbitrary repository-specified commands).
  - `release` → advisory surface: `ackit workflow show` marks release-point requirements; actual release actions remain user-authorized per AGENTS.md governance (nothing automated).
  - `error` / `sessionEnd` → journal events (TASK-0058) + doctor advisory surfaces; no interception claims.
- Tests: gate schema strictness (unknown fields rejected; a fixture with `command: ...` fails validation — proving the no-execution invariant), merge order, each wired boundary's behavior, and the pre-commit managed block behavior (install/uninstall/status preserved from the existing hooks tests).

## Out of scope

- `preToolUse`/`postToolUse`-style provider interception (explicitly excluded by ADR-0028).
- Command hooks from repository YAML (permanently rejected).

## Affected files

- `src/core/workflow/gates.ts` (new), `src/core/workflow/validate.ts` (gate resolution), `src/core/workflow/profiles.ts` (per-point defaults)
- `src/core/config/schema.ts` (optional gate overrides), `src/cli/commands/hooks.ts` (managed block extension), `src/cli/commands/doctor.ts`, `src/cli/commands/workflow.ts`, `src/cli/commands/verification.ts`
- `tests/unit/workflow/gates*.ts`, `tests/integration/hooks/*.ts` (extended), `tests/security/policy-*` (no-execution assertion)

## Acceptance criteria

- [ ] Gate contract is purely declarative: schema rejects any executable field (test proves `command`/`script`/`run` keys cannot parse).
- [ ] All eight lifecycle points resolve deterministically from profile + config; the three hard boundaries (preTaskComplete, verification, preCommit-managed-block) enforce them.
- [ ] Pre-commit managed block installs/uninstalls cleanly preserving user content (existing hooks contract tests stay green) and invokes only the repository-built CLI.
- [ ] Release/error/sessionEnd surfaces are advisory only (no automation claims in docs or code).
- [ ] Tests pass with recorded counts.

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build`
3. `pnpm vitest run tests/unit/workflow tests/integration/hooks tests/security`
4. Full `pnpm test`.

## Security considerations

- Structural no-execution guarantee: the strict schema cannot represent a command; enforced by contract test (threat row T16 regression).
- The pre-commit block executes only ACKit's own CLI the user installed; removal path preserved via existing `hooks uninstall`.

## Risks

- Scope creep toward a universal hook system — mitigated by the frozen eight-point list and schema test.

## Rollback plan

Focused revert; managed pre-commit block uninstall path preserved.

## Completion notes

(placeholder)
