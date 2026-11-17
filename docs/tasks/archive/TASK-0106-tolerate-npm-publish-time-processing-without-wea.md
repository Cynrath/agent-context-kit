---
id: "TASK-0106"
title: "Tolerate npm publish-time processing without weakening release verification"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0105"
createdAt: "2026-11-17"
completedAt: 2026-11-17
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

- [x] Delayed visibility beyond the old budget succeeds within a bounded wait.
- [x] Permanent absence, wrong shasum and wrong latest retain failure exits.
- [x] Marketplace-first, OIDC, immutable tag and all downstream gates remain.
- [x] Local checks and required exact-head PR CI pass; evidence matches results.

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

All literal criteria passed locally and in exact-head hosted CI. The correction
is merged on protected master; TASK-0103 owns final stable release bookkeeping.

- Plan commit `1219388` preceded the workflow/test changes. The installed CLI
  allocated this task with `task create`; the old title-only alias failed
  before creating a file. No manual task ID was invented.
- The actual parsed registry-verification shell, with only npm and sleep
  replaced by stubs, reproduced the old delayed-visibility failure: exit 20
  instead of 0. The other three failure cases passed. After correction all
  28 workflow contracts pass, including delayed success and unchanged exits
  20 (permanent absence), 21 (shasum) and 22 (latest).
- Full root suite: 126 files PASS, 778 tests PASS / 3 existing Windows symlink
  privilege skips (781 total). Frozen install, lint, format, strict typecheck
  and build PASS. The full suite also executes cold Action/package consumers.
- A shared dependency junction was unsuitable for pnpm's workspace safety
  checks. It was moved intact to ignored temp, and a separate frozen install
  succeeded. Primary dependencies were preserved; no external target deleted.
- The next-release gate now allows 90 x 20s reads and has a 35-minute outer
  timeout. No version/shasum/latest condition, exit, consumer, ordering,
  permission, authentication or immutable-artifact control was removed.
- **Not run:** a new live publish/workflow dispatch or rerun; those actions
  are outside this task. The existing 0.5.5 run remains failed at its original
  visibility timeout, with downstream verification/release repair in TASK-0103.

### Exact-head completion evidence

PR #45 head `7a191414d7ff351acc20b8051914ca0492962ee2` passed all 13 checks
(12 required) and merged as `f42937d7ffc97a5d21307935995d1a858c4af847`.
Actual YAML-shell delayed-success and failure cases are among the 28 workflow
contracts passing on the default full OS/Node matrix. macOS/Node 24 and Linux/
Node 24 each report 126 files / 781 tests PASS. The later user-authorized CI
capacity retry belongs to TASK-0107; the original Release run remains unchanged.
The next-release change introduces no version, publication or permission change.
