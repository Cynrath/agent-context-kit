---
id: "TASK-0103"
title: "Authorized patch publication and public-surface verification"
status: active
schemaVersion: 2
dependencies:
  - "TASK-0102"
  - "TASK-0105"
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

- [x] PR merged only after all exact-head CI checks pass; master SHA verified.
- [~] Marketplace target visible before new immutable tag triggers npm publication.
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

### Publication preflight 2026-11-17

- TASK-0098/0099/0100/0101/0104/0102 are verified and archived. Runtime correction
  commit `a0e077c`; release preparation `eae5351`; current source/extension 0.5.5.
  Full local suite: 772 PASS / 3 existing Windows privilege skips; extension
  8 unit + 6 Electron PASS; explicit CLI/package/Action consumers, schemas,
  SARIF validation, offline, production audit and ACKit gates PASS.
- Local audited VSIX: 414975 bytes, SHA-256
  `8fa4cfc2f804f1440fcf1c5abe215570b7ee5c4c1762654a53676696c8d9fd9f`;
  tarball: 497350 bytes, SHA-256
  `699437eff29c9dbd74ccd7104e2116ea1a384229cfb1b4e65cc49c88fa6b6a7f`.
- Existing stored Cynrath publisher was found and `vsce@4.1.1 verify-pat Cynrath`
  exited 0 (publish-right verification). No secret value was printed or written
  to repository/log files. No new credential or permission was created.
- Remote master is `64a9c9d56ea36eb475de29d050596b506264a07e`; strict rules require
  all 12 established CI contexts. No release-owned open PR exists yet. The
  branch will be pushed only after this status/evidence commit and clean-tree
  verification. Publishing still waits for exact-head PR and master checks.
- npm latest/Marketplace are 0.5.4; npm 0.5.5 and remote tag are absent at the
  preparation read. Stable pointer remains 0.5.4. Recheck immediately before
  publishing; no immutable version or existing tag will be changed.

### Hosted CI checkpoint — publication held

PR #43 exists at head `5daa10f9c572462cd89265b73f0affc5d9bb8578`. Linux and
Windows verification passed, but Action setup, extension lifecycle and macOS
diagnostic redaction failed. Required checks correctly block merge. TASK-0105
owns the observed corrections and actual new-head CI proof; this task resumes
afterward. No master merge, Marketplace publication, tag, npm publication or
GitHub Release has been performed. Docs7 Preview separately reported success;
it is not evidence of the production/account acceptance in TASK-0097.

### Protected merge verified; primary checkout on master

PR #43 implementation head `49af9ad672662e8d3b939f9668b10fb18f94e668` passed all
12 required checks plus Docs7 Preview. The user then explicitly requested merging
and deleting the feature branch and continuing on the main branch. The protected
squash merge is `3c70d09a6104ba2eec2b02a2d9c4e24edc4d89ef`; the exact old tip and
identical merged tree were checked before deleting its local/remote refs.
Primary workspace is clean master equal to origin/master. TASK-0105 is complete.

Primary work remains on master. Protected metadata integration uses only a
temporary detached records worktree/PR transport, removed after merge; no direct
master push or persistent development branch is introduced. Publication still
waits for master checks, a fresh audited master VSIX and current target absence.

Dependencies: TASK-0102
