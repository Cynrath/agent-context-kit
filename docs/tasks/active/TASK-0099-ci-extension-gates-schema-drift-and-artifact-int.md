---
id: "TASK-0099"
title: "CI extension gates schema drift and artifact integrity"
status: active
schemaVersion: 2
dependencies:
  - "TASK-0098"
createdAt: "2026-11-17"
completedAt: null
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

## Dependencies

TASK-0098. TASK-0100 follows this task.

## Required tests

- Root lint/format/typecheck/build/test, schema drift, CLI/package smokes;
  extension typecheck/lint/unit/Electron/build; VSIX package/content checks;
  workflow contracts, version parity, offline-egress and ACKit gates.

## Acceptance criteria

- [~] Lint, unit and Electron commands propagate real failures with no bypass.
- [ ] Extension source/test typechecks and lint/unit/Electron tests actually pass.
- [ ] CI has schema drift, CLI/package smoke, version parity and VSIX integrity
  checks; source version and package filename are derived, not release literals.
- [ ] VSIX manifest/README/CHANGELOG identity, file allowlist, size and secret
  checks pass; release fail-closed gates remain effective.
- [ ] Bundled SDK version/templates load inside the extension host and finding
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

Plan allocated by repository CLI on 2026-11-17. Before implementation, unmasked
lint failed with 4 errors/2 warnings; source and test typechecks passed. The
additional runtime/test findings above were inspected and added to this plan
before their implementation. All existing assertions will be strengthened or
replaced with actual production-boundary/host behavior, never bypassed.

Dependencies: TASK-0098
