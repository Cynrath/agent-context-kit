---
id: "TASK-0101"
title: "Documentation task integrity portability and cross-surface audit"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0100"
createdAt: "2026-11-17"
completedAt: 2026-11-17
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

- [x] Maintained README links, docs routes, Context7 config and ADR references
  resolve; active/archive task IDs are unique and legacy collisions explained.
- [x] Machine-specific test literals are either portable synthetic fixtures or
  replaced; historical proof remains intact.
- [x] Audit results record exact evidence and no unresolved new High/Critical
  finding remains in release scope.
- [x] TASK-0097 status reflects real evidence; incomplete external acceptance
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

Verified 2026-11-17 on Windows / Node 26.13.1 / pnpm 11.22.0.

- Fixed 12 broken README link occurrences by pointing to existing owning
  references/concepts/extension docs. All 32 Docs7 navigation routes resolve.
  Checked ADR IDs across 30 maintained files: no unresolved reference.
  Task store has 103 records / 103 unique live IDs; the new task README explains
  the separate root-level historical namespace. No historical record was moved,
  deleted, renumbered or falsely completed.
- The SDK example and cancellation snippet passed a path string to an API that
  requires `{ canonicalPath }`. They now resolve a portable canonical root;
  the real example runs on an unrelated one-file fixture and finds its marker.
  Corrected rule-pack/readiness signatures, config-loading description and
  overly broad cancellation claims without changing the public SDK API.
- Personal Windows profile literals in two content-only scanner fixtures became
  `fixture-user`; they never accessed that path. Generic Windows drive/case
  vectors remain intentionally synthetic. Maintained product docs/tests contain
  no former machine-specific user/repository path. Historical evidence is intact.
- Registry production audit initially returned 40 advisories (1 critical,
  11 high). Necessary compatible updates: MCP SDK 1.30.0 -> 1.32.2, Zod 4.4.3 ->
  4.6.7 and affected SDK transitives. Direct dependency major versions and all
  unrelated direct dependencies remain unchanged. Frozen install PASS.
  `pnpm audit --prod --json` now exits 0, zero advisories at every severity.
  Primary patch evidence: [SDK 1.32.2](https://github.com/modelcontextprotocol/typescript-sdk/releases/tag/1.32.2),
  [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
  [proxy-addr advisory](https://github.com/advisories/GHSA-jqcg-44mw-7w3h).
- Full development-tool audit still exits 1: 19 pre-existing advisories
  (6 high / 11 moderate / 2 low), confined to Mocha/glob/esbuild/Vitest/Vite
  development paths, not the production graph or packaged VSIX runtime.
  Mocha's serialize-javascript use is in its parallel worker pool; both harnesses
  run serial TDD. No .mocharc YAML payload is supplied; glob patterns are fixed
  test-discovery patterns. esbuild serves no development HTTP endpoint here;
  Vitest runs without its API/UI and product code imports none of these tools.
  Arbitrary major tool migrations are outside this patch; these metadata
  advisories are disclosed, not suppressed or reported as a clean full audit.
- Zod regenerated three tracked schemas, replacing string/null anyOf branches
  with equivalent type arrays. Recursive normalized comparison against HEAD
  proved equivalence in all three; a second generation has no unstaged drift.
- Focused documentation/SDK/portable-pack/security/MCP/API suites: 11 files /
  48 tests PASS. Full suite: 124 files PASS; 758 tests PASS / 3 unchanged Windows
  privilege-dependent symlink skips (761 total). Extension typechecks/lint/build,
  8 unit and 6 real Electron host tests PASS after the dependency update.
  Audited VSIX: 31 entries / 414645 bytes / SHA-256
  `e24783d4a19ce45587e69f6a73fccd4b3f31d95e73a85517bf5cba7bab9e9e95`.
- Root lint/format/typecheck/build, schema stability, actual documentation
  quickstart, version parity, offline-egress (204 files), config/doctor/task
  doctor/skills (4 skills, 0 issues), `scan --ci` exit 0, text hygiene and
  `git diff --check` PASS. Full-suite tarball consumers also PASS.
- Context7 validates against the downloaded official schema. The upstream
  Docs7 schema has an unrelated invalid Unicode regex; production hosting,
  endpoints and account verification are **Not run**. TASK-0097 records the
  exact external gap and remains blocked. TASK-0087/0092/0093 stay untouched.
- No new confirmed High/Critical finding remains in the shipped/runtime scope.
  No credentials, permissions, data migrations, deployment, tag or publication
  action. Successor TASK-0102 prepares the compatible patch; hosted matrix and
  final publication remain explicit TASK-0103 prerequisites.

Dependencies: TASK-0100
