---
id: "TASK-0096"
title: "Bridge 0.1.1 ecosystem cross-links"
status: active
schemaVersion: 2
dependencies: []
createdAt: "2026-10-02"
completedAt: null
---

## Purpose

Point ACKit docs at the bridge 0.1.1 public surface (hosted docs, npm,
repo) with explicit ownership boundaries and community wording. No ACKit
core dependency on the bridge.

## Scope

- docs/guides/spec-kit-bridge.md: ownership section, freshness model,
  hosted-docs/npm/repo links, explicit non-official-GitHub wording.
- CHANGELOG.md Unreleased: cross-link entry.

## Out of scope

- ACKit runtime, CLI, schemas, or release automation changes.
- Duplicating bridge CLI docs inside ACKit.

## Affected files

- docs/guides/spec-kit-bridge.md
- CHANGELOG.md

## Required tests

- node scripts/check-text-hygiene.mjs (changed docs)
- git diff --check
- ackit task/scan surface as applicable (docs-only)

## Acceptance criteria

- [x] Guide states what Spec Kit / ACKit / bridge each own.
- [x] Guide links hosted bridge docs, npm, repo; community wording explicit.
- [x] No bridge core dependency introduced.
- [x] Hygiene + diff-check clean.
- [ ] PR merged with green CI.

## Test steps

1. `node scripts/check-text-hygiene.mjs docs/guides/spec-kit-bridge.md` — clean.
2. `git diff --check` — clean.

## Risks

- Hosted bridge docs URL not live until Pages task lands; link is
  forward-correct and verified post-deploy.

## Rollback plan

Focused commit revert.

## Completion notes

Implementation done; pending PR/CI/merge.
