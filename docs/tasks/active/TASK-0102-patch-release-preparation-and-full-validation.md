---
id: "TASK-0102"
title: "Patch release preparation and full validation"
status: active
schemaVersion: 2
dependencies:
  - "TASK-0101"
  - "TASK-0104"
createdAt: "2026-11-17"
completedAt: null
---


## Purpose

Prepare the next compatible patch only after fixing and verifying the audit
chain. npm latest and Marketplace were both independently read as 0.5.4 on
2026-11-17, so the planned source version is 0.5.5 if no breaking change emerges.

## Scope

- Align source/extension manifests, lockfile if affected, source-facing README,
  root/extension CHANGELOG and extension README/packaged metadata.
- Preserve `release-state.json.publishedStable = 0.5.4` and stable install pins
  until TASK-0103 proves all public channels at the new version (ADR-0029).
- Execute the entire requested local verification matrix and audit VSIX/tarball.
- Record authorization, exact evidence, risks and release-ready decision.
- Correct the final read-only Marketplace visibility probe: TASK-0094 records
  that the 0.5.4 release's last one-shot read saw a stale replica after successful
  publication. Add bounded retries while requiring exact target visibility and
  retaining exit 91 on exhaustion; no publish order, permission or gate changes.

## Out of scope

- Publication/tag creation before validation, dependency upgrades, speculative
  source changes, changing historical version references or public stable early.

## Affected files

- Root/extension manifests and release docs, relevant lockfile metadata, task
  evidence; ignored local packages/checksums are never tracked.
- `.github/workflows/release.yml` final visibility read and its focused workflow
  contract, planned before implementing this demonstrated release-wrapper fix.

## Dependencies

TASK-0101 and TASK-0104. TASK-0103 requires all acceptance below and exact-head PR CI.

## Required tests

- Frozen install; lint/format/typecheck/build/gen:schemas/no drift; full tests;
  CLI/package/doc smokes; config/doctor/task doctor/skills/instructions/scan;
  extension typechecks/lint/unit/Electron/build/package; VSIX integrity;
  Action clean-consumer, release/version parity, offline and text hygiene gates.

## Acceptance criteria

- [x] Source/extension/package docs are coupled at the next absent patch;
  published-stable claims remain truthful until publication.
- [x] All required local checks pass with exact counts/commands recorded;
  no skipped mandatory tests or unresolved release-scope security finding.
- [x] Actual tarball/VSIX audited, SHA-256 recorded and release notes reviewed.
- [~] Final diff and ACKit checks pass; all pre-release work is committed and
  the tree is clean before an authorized push.

## Test steps

1. Recheck npm/Marketplace versions and target absence; couple source metadata.
2. Run the required checks with repository-pinned pnpm 11.22.0. Environment
   preflight: PowerShell 7.6.9/Git 2.56.1/Node 26.13.1 work; broken global pnpm
   12.21.0 launchers are bypassed by an ignored isolated 11.22.0 toolchain.
3. Build/audit packages and record checksums, then review final diff/state.

## Security considerations

No secrets in outputs/artifacts; no data/migration/permission changes. User
explicitly authorized scoped commits, ordinary branch push and PR creation.
No workflow dispatch, rerun, deployment or direct master push is authorized.

## Risks

- Hosted Node 22/24 and Linux/macOS verification is required in TASK-0103; local
  Windows Node 26 evidence alone never proves that matrix. Existing historical
  blocked tasks retain their real status.

## Rollback plan

Forward corrective PR before release; never reuse or move immutable versions.

## Completion notes

Final local validation 2026-11-17, after TASK-0104 corrective verification:

- Source/extension/packaged metadata 0.5.5; stable pointer/install pins remain
  0.5.4 as required by ADR-0029. npm/Marketplace both re-read 0.5.4; target npm
  0.5.5 returns E404 and remote v0.5.5 tag is absent. No breaking public SDK/CLI
  export/argument removal. Source README build instructions now use the real
  package selector and audited bundled VSIX command.
- Pinned pnpm 11.22.0 frozen install PASS; root lint, format, typecheck, build,
  version 0.5.5 and schema generation/no drift PASS. Full current code suite:
  125 files PASS, 772 tests PASS / 3 unchanged Windows privilege-dependent
  symlink skips (775 total). Release/version/tag/VSIX/docs subset also passed.
- CLI smoke, explicit real-tarball package consumer smoke, documentation command
  smoke and clean Action source consumer PASS. The Action consumer now exercises
  scan/optimize/drift thresholds, CLI error preservation, legacy no-op and
  canonical CLI/Action optimize SARIF equality with no consumer runtime files.
- Final extension source/test typechecks, strict lint, build, 8 unit and 6 real
  Electron host tests PASS at 0.5.5. An initial command batch used an incorrect
  relative toolchain prefix; it was cancelled and not counted. The verified
  root-cwd run explicitly reported pnpm 11.22.0 and all actual checks above.
- Audited artifacts in ignored `artifacts/release-0.5.5/`:
  - `ackit-vscode-0.5.5.vsix`: 31 entries, 414975 bytes, SHA-256
    `8fa4cfc2f804f1440fcf1c5abe215570b7ee5c4c1762654a53676696c8d9fd9f`.
  - `cynrath-agent-context-kit-0.5.5.tgz`: 497350 bytes, SHA-256
    `699437eff29c9dbd74ccd7104e2116ea1a384229cfb1b4e65cc49c88fa6b6a7f`.
  Actual VSIX manifest/XML/SDK/README/CHANGELOG, templates, file list, icon,
  bounded ZIP extraction/CRC, size and secret checks PASS. Local checksum file
  contains filenames/hashes only. Extracted 0.5.5 release notes pass text hygiene.
- Production dependency audit: zero known advisories (TASK-0101 has the explicit
  separate development-tool advisory disposition). Offline-egress, config,
  doctor/task doctor, skills (4/0 issues), instructions, scan --ci (exit 0),
  text hygiene, version parity and git diff --check PASS.
- Final Marketplace read now has six bounded attempts with exact target
  comparison and exit 91 retained. Focused workflow contracts PASS; all original
  publish-order/security/absence/OIDC/artifact gates remain. No dispatch/rerun,
  permission, credential or deployment action.
- Final diff reviewed. The implementation/evidence commit and clean-tree proof
  are the remaining Git criterion before completion. Hosted OS/Node matrix,
  protected PR merge and all publication actions belong to TASK-0103.

### Dependency checkpoint 2026-11-17

Source/extension metadata is coupled at 0.5.5, stable remains 0.5.4, npm target
and remote tag are absent. The versioned full suite passed 758 tests (3 unchanged
Windows privilege skips), extension 8 unit/6 Electron tests passed, and the final
visibility-read contract passed. The actual clean Action consumer then failed
at frozen install with an opaque diagnostic; source review also found optimize
suggestions omitted from Action threshold projection. TASK-0104 owns corrective
verification before this task resumes final checks. All working changes remain
preserved. No push, tag, PR merge or publication has occurred.

Dependencies: TASK-0101
