---
id: "TASK-0095"
title: "Spec Kit bridge integration docs"
status: active
schemaVersion: 2
dependencies:
  []
createdAt: "2026-10-02"
completedAt: null
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

- [ ] Guide renders correct links (bridge repo public).
- [ ] README/docs-table changes are link-only additions.
- [ ] CHANGELOG entry under `[Unreleased]`, no version bump.
- [ ] Hygiene + config + scan gates pass.
- [ ] PR opened from feature branch; merged only with green CI.

## Acceptance criteria

- [ ] Implementation matches scope.
- [ ] Test plan executed with pass counts recorded.

## Test steps

1. 

## Risks

- 

## Rollback plan

Focused commit revert.

## Completion notes

(placeholder)
