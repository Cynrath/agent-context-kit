---
id: "TASK-0074"
title: "Repository hygiene — archive completed task docs and lifecycle guard"
status: completed
schemaVersion: 2
dependencies:
  []
createdAt: "2026-09-03"
completedAt: 2026-09-03
---

## Purpose

Archive every parsed-`completed` task doc still under `docs/tasks/active/` into `docs/tasks/archive/` using ACKit itself (`task archive`), repair live references that break on move, add regression tests proving TaskStore resolves both locations, and add a durable lifecycle guard (`task doctor` finding for completed-in-active) so completed work never accumulates in active again. Part A of the post-v0.4.0 repository-hygiene session goal.

Session authorization (exact scope for THIS task chain): the session goal authorizes (1) archiving completed task docs out of `docs/tasks/active/`; (2) hardening PR/release Markdown against accidental C0 controls; (3) protecting `Cynrath.github.io/main` with PR governance + `docs-integrity` CI — on product branch `chore/repository-hygiene` and site branch `chore/docs-governance`. It explicitly does NOT authorize publishing/tagging/releasing a new ACKit version, changing package version from `0.4.0`, moving/deleting immutable tags, force-push/rebase/history rewrite, Browser Companion changes, hosted-docs redesign, or ACKit docs CSS/JS/theme changes. Product PR open + squash-merge after exact-head CI green (TASK-0074/0075 scope) and site PR merge + ruleset creation (TASK-0076 scope) are authorized by the session goal and recorded here per Controlled-release governance; all other master mutations remain prohibited without separate explicit authorization.

## Current-state evidence (verified live 2026-09-03)

- Product `O:\projeler\agent-context-kit` on `master` `e6463714e7b70f4ce3e9308700f2b30b5e79d5a2` == `origin/master`, tree clean, version `0.4.0` (`node dist/cli/index.js --version`).
- Branches: `master` + `feat/browser-companion-v0.3` (+ remotes); no open product PR does this work (`gh pr list` → `[]`).
- `task list` → 73 tasks, ALL parsed `completed`, ALL under `docs/tasks/active/` (`TASK-0001..TASK-0073`). `task list --all` total 73 → archive dir exists but holds 0 parseable tasks.
- `docs/tasks/` legacy root files (`TASK-0001..0291`, `PROJECT-CONTROL-*`) are pre-TaskStore history, not governed by the active/archive invariant; TaskStore only lists `active` (+ `archive` with `--all`).
- `task doctor` → integrity OK; `doctor` → all checks passed; `scan --ci` → 169 findings (15 critical / 21 high are known synthetic-secret fixtures + doc examples; readiness 88/100 pass).
- `TaskStore.find()` already resolves active then archive; `archive()` refuses non-completed; `complete()` refuses archived/unknown — move is safe provided callers use `find`/`list --all`, not hardcoded `active/` paths.

## Scope

- Audit table `Task ID | Current path | Parsed status | Dependencies | Referenced by current docs? | Archive-safe?` for all 73 active docs + archive emptiness + malformed/duplicate/link/code-assumption checks (§4 of goal).
- `task archive TASK-XXXX` for every completed task still in active (prefer CLI; document any manual fallback with reason).
- Repair current-facing links pointing at moved `active/TASK-*` files (historical evidence bundles keep historical wording; do not rewrite history).
- Tests: TaskStore resolves active+archive; archived completed remain readable/showable; dependency lookup survives archive; evidence/verdict lookup (ID-keyed, path-independent) survives archive; invalid archive transitions refused; archived completed not treated as open work.
- Durable guard: `task doctor` finding for completed-in-active (stable code, e.g. `TASK-COMPLETED-IN-ACTIVE`); optional `task archive --completed` bulk helper ONLY if it fits CLI conventions (completed-only, idempotent, dry-run consistent).
- Governance text: archive-after-final-evidence rule in current docs.

## Out of scope

- Version bump, npm/VS Code/GitHub publish, tag/release creation or mutation.
- Browser Companion (`feat/browser-companion-v0.3`) — do not touch/merge.
- Hosted-docs redesign; ACKit docs CSS/JS/theme assets (hash-preserved).
- Renaming historical task IDs; modernizing archived wording; faking completion.
- Archiving any task whose parsed status is not `completed`.
- Multiple corrective side branches (single product branch `chore/repository-hygiene`).

## Dependencies

- None (chain head; TASK-0075 depends on this).

## Affected files / expected areas

- `docs/tasks/active/TASK-00*.md` → `docs/tasks/archive/` (73 moves via CLI).
- `src/core/tasks/store.ts` (`doctor` completed-in-active finding; optional bulk helper core).
- `src/cli/commands/task.ts` (+ `src/cli/program.ts` wiring if bulk flag added).
- `docs/guides/**`, `docs/reference/cli.md`, `docs/plans/*`, `ADR-0025` references to `active/TASK-*` (current-facing only).
- `tests/unit/tasks/**`, `tests/integration/**/task*`, `tests/contract/**` (archive-resolution regressions).
- `AGENTS.md` / `.github/copilot-instructions.md` narrow governance line (archive-after-evidence).

## Acceptance criteria

- [x] `task list` (active) shows 0 completed; every remaining active task (only TASK-0074/0075/0076 until closed) parses pending/active/blocked.
- [x] `task list --all` shows 73 archived completed + chain tasks; duplicate IDs = 0; non-completed in archive = 0.
- [x] `task doctor` green on final state; new completed-in-active finding fires deterministically on a fixture (test-proven).
- [x] `task show` / `find` resolves an archived completed task by ID; dependency/evidence/verdict lookups for archived IDs pass (tests).
- [x] `task archive <pending>` refused (test-proven); archiving is idempotent for already-archived IDs.
- [x] `git diff --check`, `task doctor`, full gates per §12 green; package stays `0.4.0`; Browser Companion untouched.

## Test steps

1. `node dist/cli/index.js task list --json` → count statuses/paths before + after.
2. `node dist/cli/index.js task doctor` before + after (expect new finding code on fixture with completed-in-active).
3. Archive loop via CLI; re-run `task list` / `task list --all` JSON counts.
4. `pnpm typecheck && pnpm build && pnpm test` (focused: task/evidence/verdict/checkpoint/drift suites first, then full).
5. `git diff --check`; `node dist/cli/index.js scan --ci` (findings reviewed, no new real secrets).

## Security considerations

- No secrets in task docs; archive moves preserve bytes (no redaction of history).
- Bulk helper (if added) moves completed-only; never pending/active/blocked; deterministic ordering; no network.
- No absolute local paths in new docs/commit messages.

## Risks

- Live `active/TASK-*` links in current docs break → mitigated by link audit + ID-based lookup preference + tests.
- Evidence bundles reference historical `active/` paths → kept verbatim as history, not rewritten.
- Archiving 73 files at once obscures review → CLI moves are pure renames; diff reviewable; one branch only.

## Rollback plan

- `git revert <commit>` for plan/commit granularity; moves are renames so revert restores paths. No history rewrite.

## Completion notes

Done 2026-09-03 on `chore/repository-hygiene`. Audit: 73/73 active docs parsed
`completed` (TASK-0001..0073), dependency closure clean, no duplicates/malformed,
archive held 0 files. All 73 moved with `task archive TASK-XXXX` (pure renames,
bytes preserved); `task show TASK-0001/TASK-0073` resolve from archive.
Live-reference audit (`git grep docs/tasks/active/TASK-` minus active/evidence/rebuild):
only historical prose (ADR-0025 range, evidence bundles, root legacy tasks, plan
backlink), one synthetic guide example, and in-memory test/readiness fixtures —
no functional edits required; all runtime lookups are id-based (`TaskStore.find`
covers active+archive; evidence/verdict stores are id-keyed under
`.ackit/workflow/`). Guard: `doctor` emits `TASK-COMPLETED-IN-ACTIVE` for
completed-in-active; bulk `task archive --completed [--dry-run]` moves
completed-only, deterministic/idempotent. Governance recorded in
`docs/reference/cli.md` ("task lifecycle guard"). Evidence:
`tests/unit/tasks/archive.test.ts` 8/8 pass; task suites 35/35 pass;
`pnpm lint`, `format:check`, `typecheck`, `build` green; `task doctor` integrity
OK; `task archive TASK-0075` (pending) refused live; bulk `--dry-run` reports
nothing left. Package `0.4.0`; Browser Companion untouched.
