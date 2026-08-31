---
id: "TASK-0048"
title: "checkpoint model and resume/handoff"
status: pending
schemaVersion: 2
dependencies: ["TASK-0045", "TASK-0047"]
createdAt: "2026-08-31"
completedAt: null
---

## Purpose

Implement deterministic task checkpoints and resumability (ADR-0027, §7): long-running work must survive context compaction, new chats, model/provider switches, terminal/agent restarts, and handoff to a fresh implementer or verifier — with zero dependence on conversation history.

## Scope

- `src/core/checkpoint/types.ts`: `CHECKPOINT_SCHEMA_ID = "ackit.checkpoint.v1"`; `CheckpointSchema` (strict) with: `schemaId`, `id` (`CP-####` per task), `taskId`, `workflow` (`{ profile, stage }` snapshot), `intentRef`, `planRef`, `completedWork[]` / `pendingWork[]` (extracted from task body checkboxes), `decisions[]`, `failures[]`, `blockers[]`, `evidenceRefs[]`, `changedAreas[]` (git changed files snapshot), `nextAction` (`{ objective, path?, command?, expectedResult? }`), `gitHead` (short SHA), `createdAt` (date-only ISO).
- `src/core/checkpoint/store.ts`: `CheckpointStore` under `.ackit/workflow/TASK-####/checkpoints/CP-####.yaml`; sequential per-task numbering; atomic writes; deterministic serialization; containment rules identical to workflow store.
- `src/core/checkpoint/extract.ts`: deterministic extraction of `completedWork`/`pendingWork` from task-body checkbox sections (reuses `extractSection`), changed areas from `changedFiles()` (git-unavailable → explicit `gitUnavailable: true` marker, never a silent lie), decisions/failures/blockers from explicit task-doc sections when present.
- `src/core/checkpoint/validate.ts`: structural validation + staleness detection: `STALE_CHECKPOINT` when recorded `gitHead` is not reachable from current HEAD or recorded changed files no longer match the working set in a way that invalidates `nextAction` (deterministic comparison; git-unavailable → advisory).
- `src/core/checkpoint/resume.ts`: `renderResumeContext(taskId)` — concise, deterministic markdown resume block (intent summary, completed/pending, decisions/failures/blockers, evidence refs, next action) bounded by a token budget parameter; `renderHandoffPack(taskId)` — single self-contained markdown handoff document (resume context + task doc + latest checkpoint + intent summary) for transfer to a fresh agent/machine.
- CLI `ackit checkpoint` (`src/cli/commands/checkpoint.ts`): `create <TASK-ID> --next-objective <text> [--next-path p] [--next-command c] [--next-expected e]`, `show <TASK-ID> [CP-ID]`, `validate <TASK-ID>`, `export <TASK-ID> --out <file>` (handoff pack); plus `ackit task resume <TASK-ID>` printing the resume context.
- Tests: scenario tests for resume (partial work → checkpoint → fresh process → resume pack → correct pending next action) and provider switch (agent A checkpoint → fresh `TaskStore`/`CheckpointStore` instances → identical state, no conversation dependence); determinism (byte-stable output for same repo state); staleness; invalid-input/security tests.

## Out of scope

- `pack --task/--resume` integration (TASK-0049) — this task provides the render functions it consumes.
- Automatic checkpoint creation on every command (explicit creation only; no hidden state growth).

## Affected files

- `src/core/checkpoint/types.ts`, `store.ts`, `extract.ts`, `validate.ts`, `resume.ts`, `index.ts` (new)
- `src/cli/commands/checkpoint.ts` (new), `src/cli/commands/task.ts` (resume subcommand), `src/cli/program.ts`
- `scripts/generate-schemas.mjs`, `schemas/checkpoint.schema.json` (new)
- `tests/unit/checkpoint/*.ts`, `tests/integration/checkpoint/*.ts` (new, includes the two mandated scenario tests)

## Acceptance criteria

- [ ] Checkpoint create/show/validate/export work end-to-end; files are strict-validated, deterministic, and contained under `.ackit/workflow/`.
- [ ] Resume context renders completed vs pending work correctly from real task bodies and states the exact recorded next action; output is stable across processes with no conversation dependence (provider-switch scenario test passes).
- [ ] `STALE_CHECKPOINT` detection works when git state moved past the recorded head/changed set; git-unavailable is an explicit advisory, never a fabricated state.
- [ ] No secret-shaped values or absolute machine paths in any checkpoint/resume/handoff output (secret gate + scrubber applied).
- [ ] `schemas/checkpoint.schema.json` committed and current; mandated resume + provider-switch scenario tests pass with recorded counts.

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build && pnpm gen:schemas` (`git diff --exit-code schemas/`)
3. `pnpm vitest run tests/unit/checkpoint tests/integration/checkpoint`
4. Full `pnpm test`.

## Security considerations

- Checkpoint content is untrusted local state: never executed; fields length-capped; secret gate applies to every emitted resume/handoff surface.
- No absolute paths serialized (repo-relative only); git head stored as short SHA (no remote refs).
- Task-id validation before path construction (traversal prevention).

## Risks

- Checkpoint drift vs task-doc state (agent edits doc but not checkpoint) — mitigated by extraction-from-source at create time + staleness detection at validate time.

## Rollback plan

Focused revert; additive module (`.ackit/` state is disposable by design).

## Completion notes

(placeholder)
