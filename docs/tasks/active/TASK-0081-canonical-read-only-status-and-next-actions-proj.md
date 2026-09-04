---
id: "TASK-0081"
title: "Canonical read-only status and next-actions projection"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0079"
  - "TASK-0080"
createdAt: "2026-09-04"
completedAt: null
---

## Purpose

Give users one canonical read-only status projection so they never have to manually inspect task + workflow + evidence + verdict + drift + checkpoint separately to answer: what am I working on, what blocks completion, what is stale, what should I do next. Prefer `ackit status` (or an equivalent `doctor --task/--next` design if that avoids unnecessary command growth). It must compose existing engines, not create a second workflow engine. Do NOT build an autonomous `ackit run` command that executes/advances everything automatically unless a separate ADR proves it does not violate ACKit's non-autonomous/no-execution boundary.

## Consensus basis

Strong multi-auditor consensus (MUST, but read-only/composed): status consolidation is agreed; the mutating state-machine `ackit run` variant suggested in one audit is explicitly NOT accepted without a boundary-proving ADR.

## Scope

- Design the canonical projection: exact questions answered, source engines composed (task store, workflow store, evidence registry, verdict/bundle state from TASK-0079/0080, drift, checkpoints), staleness surfacing, next-action derivation rules.
- Decide command shape (`status` vs `doctor --task/--next`) with a written rationale; avoid command growth unless justified.
- Implement as a pure projection (no state mutation; prove read-only with a mutation spy/fixture test).
- Wire verification-staleness and completion-blocker output to the TASK-0079/0080 contracts (stable codes surfaced, not redefined).
- Tests: projection fixtures (composed states → exact rendered output/JSON), read-only proof, staleness display.
- Docs: reference for the projection; agent-integration notes if surfaces change.

## Out of scope

- Any mutating/autonomous `ackit run` (rejected unless a separate ADR proves boundary compliance; that ADR is not this task).
- A second workflow engine or duplicated state machine.
- Write paths in MCP/Action/VS Code projections (TASK-0083 may expose the read model; this task defines it).

## Dependencies

- TASK-0079 (staleness semantics to display).
- TASK-0080 (independence/replay states to display).

## Affected files / expected areas

- `src/cli/commands/` (status or doctor extension) + composition layer (no new engine)
- `src/core/**/store*.ts` read paths only
- `tests/` projection fixtures + read-only proof
- `docs/reference/cli.md`, `docs/guides/agent-integration.md` (as needed)

## Acceptance criteria

- [ ] One canonical command answers the four questions (working on / blockers / stale / next) for fixture states, in human and JSON forms.
- [ ] Projection is proven read-only (mutation-spy test green).
- [ ] Staleness/blocker output reuses TASK-0079/0080 stable codes (no parallel code vocabulary).
- [ ] No second engine: implementation composes existing stores (reviewable in diff).
- [ ] Full gates green with counts; offline/scan/hygiene hold; real-gate completion with evidence.

## Test steps

1. `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
2. Focused projection suites, then `pnpm test` (record counts).
3. Read-only proof test + manual `git status` clean after runs against fixtures.
4. `doctor`, `task doctor`, `scan --ci`, `git diff --check`.

## Security considerations

- Read-only surface must not expose secret values or absolute local paths; redaction consistent with existing commands.

## Risks

- Scope creep into execution/autonomy → the ADR precondition for `run`-like behavior is a hard stop, recorded in-task if proposed.
- Output churn breaking agent consumers → JSON contract + fixtures.

## Rollback plan

- Focused revert on the task branch before merge; after merge, forward fix.

## Completion notes

(placeholder)
