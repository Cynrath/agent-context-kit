---
id: "TASK-0095"
title: "Spec Kit bridge integration docs"
status: completed
schemaVersion: 2
dependencies:
  []
createdAt: "2026-10-02"
completedAt: 2026-10-02
---


## Purpose

Add docs-only integration pointers from ACKit to the community
ACKit Spec Kit Bridge (no core behavior change).

Authorization: the top-level user instruction for the bridge v0.1.0 program
explicitly authorizes changes in this repository (docs/integration links),
including branch/commit/push/PR/merge when CI is green. No force-push, no
history rewrite, no tag/release actions under this task.

## Scope

- `docs/guides/spec-kit-bridge.md` (new guide)
- `README.md` (docs table row + Ecosystem section)
- `CHANGELOG.md` (`[Unreleased]` entry)
- This task file

## Out of scope

- ACKit core code, schemas, CLI behavior, release actions

## Affected files

- `docs/guides/spec-kit-bridge.md`
- `README.md`
- `CHANGELOG.md`
- `docs/tasks/active/TASK-0095-spec-kit-bridge-integration-docs.md`

## Required tests

- `node scripts/check-text-hygiene.mjs <touched files>`
- `node dist/cli/index.js config check`
- `node dist/cli/index.js scan --ci` (must stay exit 0)
- `git diff --check`

## Acceptance criteria

- [x] Guide renders correct links (bridge repo public).
- [x] README/docs-table changes are link-only additions.
- [x] CHANGELOG entry under `[Unreleased]`, no version bump.
- [x] Hygiene + config + scan gates pass.
- [x] PR opened from feature branch; merged only with green CI.

## Test steps

1. `node scripts/check-text-hygiene.mjs README.md docs/guides/spec-kit-bridge.md CHANGELOG.md` → clean.
2. `node dist/cli/index.js config check` → ackit.yml OK.
3. `node dist/cli/index.js scan --ci` → exit 0 (only 2 LOW informational in touched files).
4. `git diff --check` → clean.
5. PR #37: 12/12 checks pass → squash-merged 2026-10-02.

## Risks

- Docs-only; no runtime/security impact. Rollback: focused commit revert.

## Rollback plan

Focused commit revert.

## Completion notes

PR Cynrath/agent-context-kit#37 merged as 133ff55 after 12/12 green checks.
Bridge repo public at https://github.com/Cynrath/ackit-spec-kit-bridge with
matching positioning sentence. Gates evidenced below via evidence registry +
independent verification verdict.
