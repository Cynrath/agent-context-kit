---
id: "TASK-0101"
title: "Documentation task integrity portability and cross-surface audit"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0100"
createdAt: "2026-11-17"
completedAt: null
---


## Purpose

Audit maintained documentation, task integrity and runtime boundaries; fix
verified scoped defects while preserving historical evidence. User authorized
necessary edits, tests, commits and PRs on 2026-11-17.

## Scope

- Check README links, Docs7 routes/schema, Context7 config, ADR references and
  live task IDs versus the frozen legacy namespace. Preserve legacy task files.
- Reconcile TASK-0097 with actual repository/CI/external hosting evidence; close
  and archive only if every literal acceptance criterion passes.
- Inspect machine-specific fixtures, cross-surface exit contracts, cancellation,
  bounded processes, filesystem/traversal/secret boundaries, dependencies,
  offline behavior and packaging. Fix confirmed in-scope defects with tests.
- Registry audit on 2026-11-17 found 40 advisories in the unchanged production
  graph (1 critical/11 high). Inspect primary advisory ranges and reachability;
  perform only necessary compatible security updates (SDK 1.x, Zod 4.x and
  affected transitives), with frozen lockfile/schema/contract/runtime checks.
  No major-version migration or indiscriminate dependency refresh.
- Record source-grounded findings and distinguish external validation gaps.

## Out of scope

- Rewriting historical ADR/task evidence; casually closing TASK-0087/0092/0093;
  hosted account setup/deployment; speculative refactoring or unrelated dependency upgrades.

## Affected files

- README and maintained docs/configuration, task records, focused fixture/tests,
  documentation checks; runtime files only for confirmed audit defects.
- Root package manifest/lockfile only for necessary audited dependency fixes;
  regenerate schemas only if the validated generator actually changes them.
- `examples/sdk-consumer.mjs` and SDK reference signatures: inspection found
  string roots where the actual scanner requires `{ canonicalPath }` and stale
  rule-pack/readiness signatures. Verify the corrected example on a real fixture.

## Dependencies

TASK-0100. TASK-0102 follows; external Docs7 setup is not a patch-release prerequisite.

## Required tests

- Local link/route/config validation, documentation smoke, portability/security
  and cross-surface tests, dependency audit, full affected gates and ACKit checks.

## Acceptance criteria

- [ ] Maintained README links, docs routes, Context7 config and ADR references
  resolve; active/archive task IDs are unique and legacy collisions explained.
- [ ] Machine-specific test literals are either portable synthetic fixtures or
  replaced; historical proof remains intact.
- [ ] Audit results record exact evidence and no unresolved new High/Critical
  finding remains in release scope.
- [ ] TASK-0097 status reflects real evidence; incomplete external acceptance
  stays explicitly blocked and historical blocked tasks remain unchanged.

## Test steps

1. Inspect current source/security tests and published documentation schemas.
2. Verify all maintained local links/routes and task namespace integrity; run
   actual CLI documentation quickstart in a disposable fixture.
3. Run targeted boundary/portability/cancellation tests and dependency audit,
   then affected full checks. Record any external hosting/account blocker.

## Security considerations

Use source review and existing defensive tests with synthetic fixtures; no live
attack probes, real secrets or production data. No permission/data migrations.
Do not change suppression rules or baselines merely to obtain a passing scan.

## Risks

- Historical root-level task IDs intentionally overlap the live TypeScript
  namespace. External Docs7 ownership/build evidence may be unavailable.

## Rollback plan

Forward corrective PR; retain historical records and immutable release artifacts.

## Completion notes

Plan allocated by repository CLI on 2026-11-17. No implementation yet.

Dependencies: TASK-0100
