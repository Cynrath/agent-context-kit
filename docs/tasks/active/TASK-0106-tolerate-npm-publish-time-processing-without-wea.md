---
id: "TASK-0106"
title: "Tolerate npm publish-time processing without weakening release verification"
status: active
schemaVersion: 2
dependencies:
  - "TASK-0105"
createdAt: "2026-11-17"
completedAt: null
---


## Purpose

Prevent a successful OIDC upload from failing downstream verification solely
because npm's publish-time scanning exceeds the old five-minute retry budget.
Release run 44129100682 uploaded 0.5.5 at 16:45 UTC, exhausted its 30 x 10s
visibility gate, then the same immutable version became publicly readable
around 16:58 UTC with the exact uploaded checksum and signed provenance.

## Scope

- Increase only the post-upload registry-visibility retry budget to 90 x 20s
  (30 minutes), with an explicit 35-minute step timeout. Keep version, shasum,
  latest, isolated-consumer and Marketplace/GitHub ordering gates unchanged.
- Exercise the actual parsed workflow shell using local npm/sleep stubs: a
  delayed visible version beyond the old retry count succeeds; permanent
  absence, checksum mismatch and wrong latest still fail closed.
- Land forward through the current protected PR; preserve the failed release
  run and all immutable tag/package/VSIX identities.

## Explicit authorization

The current goal explicitly authorizes scoped CI fixes, commits/ordinary branch
pushes and protected PR/master integration. TASK-0103 records publication and
manual downstream repair authority; this task performs no publication action.

## Out of scope

- Workflow dispatch/rerun, npm or Marketplace republish, new/moved/deleted tags,
  credential/permission changes, deployment, runtime/package-version changes.

## Affected files

- `.github/workflows/release.yml`
- `tests/contract/ci-pinning.test.ts`
- This task's evidence; TASK-0103 public-release checkpoint as applicable.

## Required tests

- Behavioral shell regression against the old and corrected actual workflow
  step, existing complete workflow contracts, full affected root tests and
  lint/format/typecheck/build, offline/ACKit gates and exact-head PR CI.

## Acceptance criteria

- [ ] Delayed visibility beyond the old budget succeeds within a bounded wait.
- [ ] Permanent absence, wrong shasum and wrong latest retain failure exits.
- [ ] Marketplace-first, OIDC, immutable tag and all downstream gates remain.
- [ ] Local checks and required exact-head PR CI pass; evidence matches results.

## Test steps

1. Confirm official npm publish-time scanning guidance and the actual upload,
   processing notice, visibility timeout and later exact-checksum read-back.
2. Commit this complete task plan before implementation; run task doctor.
3. Add tests which execute the actual YAML step with bounded stubbed npm/sleep;
   show the delayed case fails with the old loop, then correct the retry budget.
4. Run workflow contracts, full root checks, ACKit gates and protected PR CI.
   No live release is dispatched to test the next-release workflow change.

## Security and compatibility

No data migration, new dependency, secret, permission, product-network or public
API change. Missing or mismatched registry metadata remains a hard failure.
Official reference: https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/

## Risks

- Slow registry processing can still exceed the bounded budget; record failure
  and verify existing upload before manual downstream repair, never republish.
- Windows tests must use Git's bundled Bash, not the unrelated WSL launcher;
  discover it relative to Git's actual exec path without machine-specific paths.

## Rollback plan

Forward protected PR restoring the previous retry values if needed; never move
the released tag or overwrite an existing package/asset. No destructive Git.

## Completion notes

Plan allocated using the installed repository CLI's supported `task create`
syntax. The older title-only task alias is unavailable; it failed before any
task file was created. Implementation has not started.
