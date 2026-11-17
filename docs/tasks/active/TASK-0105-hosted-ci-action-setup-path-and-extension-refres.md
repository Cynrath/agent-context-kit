---
id: "TASK-0105"
title: "Hosted CI Action setup path and extension refresh race correction"
status: active
schemaVersion: 2
dependencies:
  - "TASK-0102"
createdAt: "2026-11-17"
completedAt: null
---


## Purpose

Correct the actual PR #43 hosted failures before authorized publication. User
authorized scoped fixes, tests, commits, ordinary branch pushes and PR work on
2026-11-17. No old workflow run may be dispatched or rerun.

## Scope

- Action dogfood job 134079004647 failed before build: pinned pnpm/action-setup
  joins GITHUB_WORKSPACE with package_json_file, so the composite's absolute
  Action manifest path resolves incorrectly. Derive a workspace-relative path
  to the Action's own pinned packageManager without copying a release number or
  reading the consumer's packageManager. Test different checkout/consumer paths.
- Extension job 134079005179 failed the real lifecycle finding assertion.
  Concurrent watcher/manual refreshes share one abort controller and mutate/re-
  publish the old snapshot even on cancellation. Serialize refreshes per root,
  publish fresh completed snapshots atomically, and abort safely on disposal.
  Preserve the real lifecycle assertion and add overlapping-request coverage.
- macOS jobs 134079005992/134079006277 failed the diagnostic redaction assertion:
  actual cwd is /private/var while the supplied temporary path is /var. Redact
  both declared and canonical aliases, longest first. Keep exact error/stdout/
  redaction assertions and test an actual link alias where portable.
- Preserve exact-head CI requirements and all gates; push successor commits to
  trigger normal PR CI. Rebuild/re-audit changed artifacts before publication.

## Out of scope

- New public SDK/CLI features, dependency upgrades, relaxed tests/timeouts,
  workflow dispatch/rerun, permission/secret changes, publication or tag actions.

## Affected files

- `action.yml`, a narrow Action manifest-path helper, Action distribution and
  independent-consumer tests; workspace refresh service and real Electron tests;
  consumer-command diagnostic helper/tests; affected task/CI guide notes.

## Dependencies

TASK-0102 (and its full audit chain). TASK-0103 waits on this correction.

## Required tests

- Action path/consumer/diagnostic contracts, root lint/format/typecheck/build/full
  suite, extension strict lint/typechecks/unit/Electron, real exported consumer,
  offline/ACKit gates and new-head required PR CI including macOS.

## Acceptance criteria

- [x] Pinned pnpm setup reads the Action manifest correctly for local and
  external consumer layouts; no preparatory dogfood build or mutable version pin.
- [x] Every explicit overlapping refresh awaits a completed current scan;
  lifecycle/diagnostics assertions pass with disposal/cancellation respected.
- [x] Canonical temporary path aliases are fully redacted on macOS and other
  hosts without weakening the exact stdout/status/path assertions.
- [~] Local focused/full/host checks and all required exact-head hosted checks
  pass; failures and corrective evidence are recorded truthfully.

## Test steps

1. Preserve the failed job logs and inspect the pinned setup implementation.
2. Add overlapping-refresh and path-layout/alias regressions before the fixes;
   record reproduced failures where the local platform permits.
3. Apply minimal owner-side changes; run local focused/full/extension/consumer
   checks and normal successor commits/pushes to PR #43.
4. Wait for actual new-head CI proof; no reruns, skipped tests or gate bypass.

## Security considerations

Action path comes only from trusted Action metadata and the workspace context,
not consumer-controlled tool input. No untrusted consumer script is installed.
Maintain root-bound file access, offline execution, credential redaction and
strict types. No data migration, production mutation or permission change.

## Risks

- Queueing changes refresh timing; preserve completed-snapshot semantics without
  performance claims and test actual overlapping commands in the host.
- Path aliases differ by OS; local link fixtures supplement, but never replace,
  required real macOS CI evidence.

## Rollback plan

Forward corrective commit/PR only; no history rewrite or immutable artifact change.

## Completion notes

Planned from actual hosted failures on PR head
`5daa10f9c572462cd89265b73f0affc5d9bb8578`. Source investigation verified pinned
pnpm/action-setup readTarget uses path.join(GITHUB_WORKSPACE, packageJsonFile).
The existing lifecycle and macOS redaction assertions exposed real owner-side
defects; none will be removed or turned into warnings.

### Local corrective evidence 2026-11-17

- Pinned upstream source confirms path.join(workspace, input). The new locator
  resolves the Action's own canonical manifest to a relative input, validates its
  exact packageManager pin, and handles distinct checkout/workspace directories.
  Its contract reads the target with the same path.join operation while a consumer
  has a deliberately different pin. Real exported consumer PASS with that locator.
- New real-host overlap regression failed before the service fix: [false,true]
  instead of [true,true]. Per-root request queues and fresh snapshot objects now
  publish only completed/non-disposed results. After-fix Electron: 7 PASS,
  including the unchanged lifecycle assertion; 8 host-free unit tests PASS.
- Diagnostic helper now redacts declared and realpath aliases longest first.
  Both exact failure/status/stdout assertions remain; a real directory link/
  junction test covers canonical output without depending on a machine path.
- Focused root contracts: 4 files / 32 PASS. Full root suite: 126 files PASS,
  774 PASS / 3 unchanged Windows privilege-dependent symlink skips (777 total).
  Root lint/format/typecheck/build, schema regeneration/no drift, extension strict
  lint/typechecks/build, cold Action consumer, offline and ACKit doctor/task doctor
  and git diff --check PASS. No timeout, assertion or publish gate was weakened.
- Required hosted checks are still unproven for the successor commit. This task
  remains active until the new exact-head matrix/Action/extension checks pass;
  no old run will be rerun. No publication or tag action has occurred.

Dependencies: TASK-0102
