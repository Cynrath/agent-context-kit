---
id: "TASK-0099"
title: "CI extension gates schema drift and artifact integrity"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0098"
createdAt: "2026-11-17"
completedAt: 2026-11-17
---


## Purpose

Make every extension validation failure visible to CI and keep schema, version,
CLI/package consumer and VSIX integrity gates effective across patch releases.
User authorized scoped changes, tests, commits, branch pushes and PRs on 2026-11-17.

## Scope

- Confirmed CI masks extension lint, unit and Electron failures with shell
  fallbacks, and hardcodes the source version/VSIX filename.
- Remove bypasses and correct underlying lint/test defects. Add usable extension
  scripts and narrowly scoped formatting configuration if necessary.
- Pre-implementation inspection also found fabricated Electron assertions,
  standalone unit tests importing the host-only `vscode` module, CommonJS
  bundling of SDK `import.meta.url` asset lookups, and string-prefix finding path
  checks. Replace these with real host/data assertions, a tested pure diagnostic
  boundary, and a resource-aware bundle without changing the public SDK.
- The first real host run then proved an SDK defect: `scanRepository` documents
  built-in rules plus optional extra rules but passes only `extraRules` (empty by
  default) to the pipeline. Restore the existing built-in contract with a focused
  SDK regression before rerunning extension tests; this is required for real
  extension findings and remains backward-compatible with the documented API.
- Add schema drift and CLI smoke to CI; preserve real-tarball consumer smoke.
- Derive extension version from manifests, strengthen parity guard and packaged
  VSIX inspection, and keep release security gates and Marketplace-first order.

## Out of scope

- Dependency upgrades, permission or protection changes, workflow dispatch/rerun,
  release publication and unrelated extension UI redesign.

## Affected files

- `.github/workflows/ci.yml`, extension scripts/source/tests/configuration as
  required by real failures, extension build/resource metadata, parity
  scripts/contracts and VSIX integrity checks.
- `src/api/scan-repository.ts` and focused SDK scanning tests for the observed
  missing-catalog defect; no new API or dependencies.

## Dependencies

TASK-0098. TASK-0100 follows this task.

## Required tests

- Root lint/format/typecheck/build/test, schema drift, CLI/package smokes;
  extension typecheck/lint/unit/Electron/build; VSIX package/content checks;
  workflow contracts, version parity, offline-egress and ACKit gates.

## Acceptance criteria

- [x] Lint, unit and Electron commands propagate real failures with no bypass.
- [x] Extension source/test typechecks and lint/unit/Electron tests actually pass.
- [x] CI has schema drift, CLI/package smoke, version parity and VSIX integrity
  checks; source version and package filename are derived, not release literals.
- [x] VSIX manifest/README/CHANGELOG identity, file allowlist, size and secret
  checks pass; release fail-closed gates remain effective.
- [x] Bundled SDK version/templates load inside the extension host and finding
  navigation/diagnostics cannot resolve traversal or sibling-prefix paths.

## Test steps

1. Run the unmasked extension checks and fix observed failures, recording counts.
2. Add workflow contracts that reject suppressed exit codes and missing checks;
   test version-parity negative probes against dynamic workflow configuration.
3. Package an actual VSIX and inspect packaged content, then run affected gates.

## Security considerations

No credential, data, migration or permission changes. Preserve strict types and
all existing publish gates. Electron uses a disposable local workspace.

## Risks

- Previously hidden failures may require focused source/test fixes. Preserve
  assertions and validate Electron behavior in an actual VS Code host.

## Rollback plan

Forward corrective PR; no weakening checks, history rewriting or tag changes.

## Completion notes

Verified 2026-11-17; source/extension remain at the existing 0.5.4 during audit.

- Removed all three CI exit-code fallbacks. Added schema drift, CLI smoke and
  dynamic source/extension/VSIX parity gates; the existing real-tarball jobs stay.
  Pinned packaging/probes to published vsce 4.1.1. Release retains every original
  preflight, absence, Marketplace-first, npm OIDC and immutable-artifact gate;
  the portable VSIX audit is an additional pre-publish check.
- Unmasked lint initially failed (4 errors/2 warnings). The old standalone unit
  suite required host-only `vscode` and the Electron suite contained unconditional
  assertions/catches. Production diagnostic/path logic now has 8 passing host-free
  tests; Electron has 6 passing real data/command/diagnostic/lifecycle tests on
  VS Code 1.146.0 (exit 0). No test failure fallback or disabled assertion remains.
- Host tests exposed SDK's empty default rule list, now restored to built-ins
  plus extras. SDK scan/cancellation tests: 6 PASS. Initial runtime packaging
  errors were corrected through the real host; the final bundled SDK identity,
  templates and readiness calculation pass. Finding paths reject traversal,
  sibling prefixes and escaping directory links, with real filesystem tests.
- Source maps were actually found in the first VSIX because the old ignore
  matched only top-level maps. `**/*.map` now excludes them. Final audited VSIX:
  31 entries, 375515 bytes, SHA-256
  `ac731ccd09af55f23726dd7a16d329118e3ceefcd97bc5027a44fb0effadc2fd`.
  Manifest/XML/SDK/README/CHANGELOG, profiles/roles, icon, path/file list, ZIP
  bounds/CRC, size and credential-material checks PASS. Seven gate contracts
  reject version/resource drift, unexpected files, actual synthetic key/token
  material and payload corruption; detector header text is correctly accepted.
- Focused workflow/version/VSIX/SDK suites: 5 files / 69 tests PASS.
  Full `pnpm test --maxWorkers=2`: 120 files PASS; 745 tests PASS, 3 unchanged
  Windows privilege-dependent symlink skips. The full suite also exercises
  isolated real-tarball consumers.
- Root lint/format/typecheck/build, extension source/test typechecks/lint/build,
  schema generation with zero drift, CLI smoke, version parity, offline-egress
  (204 files), text hygiene, doctor/task doctor, `scan --ci` exit 0 and
  `git diff --check` PASS. No suppression/baseline or permission change.
- Separate audit discovery: registry audit of unchanged production dependencies
  returns 40 advisories (1 critical/11 high). Dependency remediation belongs to
  the preplanned TASK-0101 audit, outside this task's explicit no-upgrade scope;
  TASK-0102/0103 cannot release without its disposition and verification.
- Successor TASK-0100: MCP schema/reference/CI hint parity. Hosted CI remains a
  TASK-0103 prerequisite; no publication, tag or remote push occurred here.

Dependencies: TASK-0098
