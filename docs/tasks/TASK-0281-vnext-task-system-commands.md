# TASK-0281: vNext task system commands

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0269
- Unlocks: TASK-0283 (task tools), TASK-0289 gate uses it
- Requirement IDs: REQ-TASKS-001, REQ-TASKS-002, REQ-TASKS-003, REQ-TASKS-004, REQ-CFG-004 (task.schema.json), REQ-GOV-011
- Related ADR/spec: ADR-0011 (task-first docs structure); MS§16

## Purpose

Implement the new product's own task system: create/list/show/start/complete/archive/doctor over `docs/tasks/active|archive` with parseable Markdown+frontmatter and a completion evidence gate.

## Scope

- Task schema (REQ-TASKS-002 fields) as frontmatter + body sections; zod validation; `schemas/task.schema.json`.
- Commands per REQ-TASKS-001 with ID allocation by tool (never user-invented); status model pending/active/completed/blocked.
- Completion gate: unchecked acceptance items, missing test-evidence section, invalid dependency/reference links → error unless explicit `--force` intent flag.
- Archive moves file to archive dir preserving history; doctor validates active set integrity.

## Out of scope

MCP exposure (TASK-0283); migration of 300+ v1 historical tasks (they stay as archived evidence; bulk-move decision recorded in completion notes if performed).

## Affected files

- `src/core/tasks/**`, `src/cli/commands/task.ts`
- `schemas/task.schema.json`, `tests/unit/tasks/**`, `tests/integration/tasks/**`

## Data/database impact

None (filesystem only).

## Security impact

Path safety via fs engine; no code execution from task content.

## Permission/auth impact

None.

## Localization impact

English CLI strings; task docs authored by users in any language.

## UX impact

This repo itself becomes the first dogfood consumer (REQ-GOV-012).

## Logging/audit impact

Task files are the audit trail; completion summaries required.

## Acceptance criteria

- [ ] Lifecycle integration test: create→start→complete(blocked by unchecked box)→check→complete(ok)→archive all behave per contract.
- [ ] Gate blocks completion with exit code documented; `--force` requires explicit flag and prints warning banner.
- [ ] Dependency cycle between two tasks detected by doctor with stable error.
- [ ] task.schema.json validates this repo's own active planning tasks (dogfood contract test).
- [ ] IDs strictly sequential from tool; duplicate-ID creation impossible (unit).

## Test steps

`pnpm vitest run tests/unit/tasks tests/integration/tasks`.

## Risks

Frontmatter dialect drift vs v1 files → v2 schemaVersion marker distinguishes legacy docs.

## Rollback plan

Focused commit.

## Completion notes

(placeholder)
