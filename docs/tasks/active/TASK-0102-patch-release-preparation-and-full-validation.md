---
id: "TASK-0102"
title: "Patch release preparation and full validation"
status: active
schemaVersion: 2
dependencies:
  - "TASK-0101"
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

TASK-0101. TASK-0103 requires all acceptance below and exact-head PR CI.

## Required tests

- Frozen install; lint/format/typecheck/build/gen:schemas/no drift; full tests;
  CLI/package/doc smokes; config/doctor/task doctor/skills/instructions/scan;
  extension typechecks/lint/unit/Electron/build/package; VSIX integrity;
  Action clean-consumer, release/version parity, offline and text hygiene gates.

## Acceptance criteria

- [~] Source/extension/package docs are coupled at the next absent patch;
  published-stable claims remain truthful until publication.
- [ ] All required local checks pass with exact counts/commands recorded;
  no skipped mandatory tests or unresolved release-scope security finding.
- [ ] Actual tarball/VSIX audited, SHA-256 recorded and release notes reviewed.
- [ ] Final diff and ACKit checks pass; all pre-release work is committed and
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

Plan allocated by repository CLI on 2026-11-17. Full validation not yet run.

Dependencies: TASK-0101
