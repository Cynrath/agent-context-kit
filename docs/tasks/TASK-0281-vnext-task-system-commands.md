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

- [x] Lifecycle integration test: create→start→complete(blocked by unchecked box)→check→complete(ok)→archive all behave per contract.
- [x] Gate blocks completion with exit code documented; `--force` requires explicit flag and prints warning banner.
- [x] Dependency cycle between two tasks detected by doctor with stable error.
- [x] task.schema.json validates this repo's own active planning tasks (dogfood contract test).
- [x] IDs strictly sequential from tool; duplicate-ID creation impossible (unit).

## Test steps

`pnpm vitest run tests/unit/tasks tests/integration/tasks`.

## Risks

Frontmatter dialect drift vs v1 files → v2 schemaVersion marker distinguishes legacy docs.

## Rollback plan

Focused commit.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Implementation:
- `src/core/tasks/types.ts` — TaskMetaSchema (zod, schemaVersion 2 marker distinguishing vNext docs from legacy planning files), status model pending/active/completed/blocked (REQ-TASKS-002), acceptance-criteria parser, completion-notes placeholder detection, new-task body template.
- `src/core/tasks/store.ts` — TaskStore over configurable repository root: locations docs/tasks/active|archive (REQ-TASKS-003); tool-allocated sequential IDs scanning both dirs (never user-invented); create/start/complete/archive; single-active invariant enforced at start(); completion gate blocks on unchecked criteria, placeholder notes, non-completed or unknown dependencies — `--force` overrides with recorded warnings and CLI prints a warning banner (REQ-TASKS-004); doctor detects duplicate ids, id/file mismatch, unknown deps, completed-with-unchecked, multiple actives, dependency cycles (iterative DFS) with stable messages.
- CLI: `ackit task create <title> [--depends-on ids...] | list [--all] | start <id> | complete <id> [--force] | archive <id> | doctor` — JSON mode schemaVersion ackit.tasks.v0; gate failures → exit 2 with task-error diagnostic; doctor problems → exit 1.
- schemas/task.schema.json generated via `pnpm gen:schemas` from the same zod source of truth.

Tests (29 files / 158 tests total, all green):
- Full lifecycle: dep-first ordering under the single-active rule, gate blocked on unchecked box, tick+real notes → completes, archive moves into docs/tasks/archive preserving content.
- Sequential-ID allocation across creates; duplicate-ID creation impossible by construction (nextId scans existing files).
- --force override records warnings containing "unchecked acceptance criteria".
- Doctor cycle detection on an A→B→A rewrite reports "dependency cycle detected" and fails ok=false.
- Schema contract: every tool-created doc parses through TaskMetaSchema; committed schemas/task.schema.json matches generator output (contains TASK-#### pattern).

Dogfood note: this repo's own planning tasks (TASK-0264..0290) intentionally remain in legacy no-frontmatter format; the schemaVersion:2 marker cleanly separates them so the product's store ignores them without error. Migration decision stays with maintainers.

Validation evidence: lint=0 · format:check=0 · typecheck=0 · build=0 · gen:schemas=0 · vitest 29 files / 158 tests=0 · smoke:cli=0 · ackit scan --ci --exclude pnpm-lock.yaml=0.

External actions: none beyond permitted branch pushes recorded earlier under TASK-0290.
