---
id: "TASK-0047"
title: "task schema integration: artifact refs and workflow-aware task docs"
status: pending
schemaVersion: 2
dependencies: ["TASK-0045", "TASK-0046"]
createdAt: "2026-08-31"
completedAt: null
---

## Purpose

Integrate workflow/intent/reference contracts into the existing task model additively (§3/§4): task frontmatter gains optional artifact references (`intentRef`, `specRefs`, `decisionRefs`, `planRef`), `ackit task create` gains the matching options, the task template gains workflow-aware sections, and `task doctor` validates reference existence and dependency ordering — without breaking any legacy task document.

## Scope

- `src/core/tasks/types.ts`: extend `TaskMetaSchema` additively with optional `intentRef` (`INTENT-####`), `specRefs` (repository-relative doc paths, POSIX, max 8), `decisionRefs` (repository-relative paths, max 8), `planRef` (repository-relative path). `schemaVersion` stays `2` (additive optional fields — decision recorded in ADR-0025; no bump, no break).
- `serialize()` writes new fields only when present (legacy byte-output unchanged for tasks without refs).
- `TaskStore.create(options)` gains `--intent`, `--spec`, `--decision`, `--plan` passthrough; `newTaskBody` extended with the repo-standard planning sections (`## Dependencies` when present, `## Affected files` with glob lines, `## Required tests`, `## Rollback plan`) — the template AGENTS.md already mandates.
- `TaskStore.doctor()` new checks (report-only for refs; integrity): `intentRef` must resolve to an existing intent doc; `specRefs`/`decisionRefs`/`planRef` must exist as files within the repository root (containment-checked); declared affected-files globs parseable; message codes stable (`TASK-REF-MISSING`, `TASK-AFFECTED-UNPARSABLE`).
- Plan-first machine check (§4): `doctor`/drift verify that for workflow-enabled tasks (state file present) with `planRef`, the referenced plan file's git first-commit date is not after the first commit touching declared affected areas (best-effort deterministic check using `git log --format=%as -- <path>`; when git unavailable → advisory diagnostic, never a hard failure).
- `schemas/task.schema.json` regenerated (new optional properties).
- Tests: backward compatibility (existing 43 task docs parse unchanged; serialized legacy output byte-identical), ref validation, invalid-ref doctor problems, CLI option wiring.

## Out of scope

- Evidence/verdict/checkpoint fields (later tasks).
- Any change to completion-gate semantics (TASK-0053).

## Affected files

- `src/core/tasks/types.ts`, `store.ts`
- `src/cli/commands/task.ts` (create options)
- `scripts/generate-schemas.mjs`, `schemas/task.schema.json`
- `tests/integration/tasks/*.ts`, `tests/unit/tasks` (if present) / new focused tests

## Acceptance criteria

- [ ] Task documents with artifact references validate; references to missing intent docs / missing files surface as doctor problems with stable codes.
- [ ] All 43 pre-existing task documents parse identically (no migration required); `serialize()` output for ref-less tasks is byte-identical to the current implementation.
- [ ] `ackit task create --intent INTENT-0001 --spec docs/specs/x.md --plan docs/plans/y.md` produces a fully populated task doc.
- [ ] Plan-first check runs deterministically with git present; degrades to an advisory with git unavailable.
- [ ] Regenerated `schemas/task.schema.json` current; full test suite green.

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build && pnpm gen:schemas` (`git diff --exit-code schemas/`)
3. `pnpm vitest run tests/integration/tasks` + focused unit tests
4. Full `pnpm test` (backward-compat assertions included).

## Security considerations

- Spec/decision/plan refs are repository-relative POSIX paths; any absolute path, `..` traversal, or escape outside the canonical root is rejected (existing filesystem containment).
- Ref counts capped to bound resource usage.

## Risks

- Legacy repos with custom frontmatter — unknown keys already stripped by zod parsing today; new optional fields cannot break them (verified by compat tests).

## Rollback plan

Focused revert; additive schema fields with no migration.

## Completion notes

(placeholder)
