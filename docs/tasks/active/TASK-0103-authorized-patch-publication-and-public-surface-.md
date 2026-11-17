---
id: "TASK-0103"
title: "Authorized patch publication and public-surface verification"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0102"
createdAt: "2026-11-17"
completedAt: null
---


## Purpose

Publish and independently verify the compatible patch through the repository's
PR and Marketplace-first, npm-second controlled-release process.

## Explicit user authorization (2026-11-17)

The goal objective authorizes scoped file changes/tests/docs/Git operations;
feature-branch commits and ordinary pushes; PR creation and merge to master;
creation/push of a NEW next-patch tag (planned v0.5.5); VS Code Marketplace
publication; tag-triggered npm OIDC Trusted Publishing; and GitHub Release
creation with audited VSIX assets. This is authorization for these exact actions
in this task, not permission for direct master push or credential disclosure.
Force push/reset/rebase/history rewrite/tag movement/deletion, workflow dispatch
or rerun, deployments, secret/permission changes and legacy .NET releases remain
prohibited. No release artifact may be overwritten.

## Scope

- Push the fully committed branch, create a reviewable PR and wait for successful
  exact-head CI (all Node 22/24 × OS jobs, extension/Electron, consumer smokes).
- Merge through the existing PR procedure; verify final master SHA and checks.
- Build/audit the exact release VSIX; publish outside workflow with already
  authorized maintainer authentication if available, otherwise provide the exact
  audited artifact/command and request the missing user authentication step.
- Verify Marketplace target BEFORE pushing the new tag. Let the tag-triggered
  release workflow perform npm OIDC publication and GitHub Release.
- Verify registry/latest/fresh npx + SDK + MCP, clean external Action consumer
  from the new tag, Marketplace/VSIX/Release identity and checksums.
- Only after live success, update stable pointer/current install pins through a
  follow-up PR with exact-head CI; record final master/task evidence truthfully.

## Out of scope

- Direct master push, workflow dispatch/rerun, deployment or site publication;
  credential creation/storage; tag or immutable version replacement; changes to
  unrelated repositories; closing old blocked tasks without literal evidence.

## Affected files

- Active/archive task evidence, `release-state.json`, current stable install
  references after live success, PR/release notes via UTF-8 body files; ignored
  VSIX/tarball/checksum outputs only.

## Dependencies

TASK-0102 and all prior tasks. Missing Marketplace authentication is a real
external blocker; do independent authorized work first, never partial-publish npm.

## Required tests

- Exact-head PR CI, post-merge CI, target absence, rebuilt VSIX preflight,
  Marketplace live reads, tag-trigger release run, npm latest/shasum/consumer
  smokes, SDK/MCP entrypoints, tag Action consumer, Release asset checksum,
  stable-pointer parity, final ACKit/Git cleanliness.

## Acceptance criteria

- [ ] PR merged only after all exact-head CI checks pass; master SHA verified.
- [ ] Marketplace target visible before new immutable tag triggers npm publication.
- [ ] npm latest, fresh CLI/SDK/MCP and new-tag external Action consumer pass.
- [ ] GitHub Release tag/VSIX identity and downloaded asset checksum pass.
- [ ] Stable-pointer bookkeeping merged with CI; final master clean/aligned;
  task evidence and open blockers match the actual public state.

## Test steps

1. Recheck remote HEAD, PR checks, target/tag absence and release prerequisites.
2. Publish audited Marketplace VSIX using available authorized authentication;
   never print credentials. Stop the dependent tag/npm sequence if unavailable.
3. Push new annotated tag only after Marketplace read-back succeeds; monitor
   the automatic release run and repair only via authorized forward changes.
4. Independently read all published channels, install in a fresh isolated
   consumer, compare checksums and merge truthful stable bookkeeping.

## Security considerations

Marketplace-first, npm OIDC/provenance, exact-tag/version checks, no overwrite,
no credential logging and least privilege remain mandatory. No production data
or schema migration. No new credential or secret/permission mutation.

## Risks

- Marketplace authentication may require the user. Replicas may be stale; use
  bounded repeated read-only observations. If release fails, preserve tag and
  published artifacts, record the exact stage and do not rerun prohibited work.

## Rollback plan

Before publication, forward corrective PR. After publication, only a NEW patch
can correct artifacts; never overwrite/repoint/delete the released version.

## Completion notes

Plan allocated by repository CLI on 2026-11-17. No publication or tag action yet.

Dependencies: TASK-0102
