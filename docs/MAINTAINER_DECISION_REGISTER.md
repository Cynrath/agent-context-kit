# Maintainer Decision Register

This register records future maintainer decisions and release-scoped approval boundaries. It contains no credentials or private recovery material.

| Decision ID | Related blocker | Status | Decision | Rationale | Owner role | Evidence | Effective scope | Review/expiry | Remote action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MD-001 | RB-001 hosted evidence | Verified for reviewed alpha.2 state | Rerun for a different candidate | Run `27478635057` passed exact three-OS evidence | Release maintainer | Exact commit/run/results in hosted status | Commit `4c4fa64` only | Next candidate | Dispatch completed |
| MD-002 | RB-002 private reporting | Complete | Enabled | Secure repository disclosure path is required | Cynrath | GET `enabled: true` and public entry verification on 2026-06-14 | Repository | Before next RC | Setting enabled |
| MD-003 | RB-003 notifications | Complete | Primary assigned; `ShadowFlameC` assigned as independent backup security notification owner / backup maintainer contact | Private reports need continuity beyond one account | `Cynrath` primary; `ShadowFlameC` backup | Maintainer-provided evidence dated 2026-06-20; `ShadowFlameC` repository `write` collaborator; `docs/SECURITY_NOTIFICATION_OWNERSHIP.md`; TASK-0202 | Repository / planned `0.2.0-alpha.3` release-preparation entry | Recheck before each RC or owner/security-notification change | No test advisory created; no security setting changed; `ShadowFlameC` is not mandatory release approver |
| MD-004 | RB-004 owner identity | Accepted risk | Keep `Cyranth` NuGet owner and `Cynrath` public metadata for current scope | OIDC publish works; unverified ownership mutation risks access disruption | Cynrath package maintainer | `docs/NUGET_OWNER_IDENTITY.md`, alpha.2 OIDC publish | Through next pre-release decision | 2026-09-30 | No owner change |
| MD-005 | RB-005 author signing | Accepted risk | Defer | No trusted certificate/custody/timestamp/recovery lifecycle is verified | Cynrath | `docs/SUPPLY_CHAIN_DECISIONS.md` | Next pre-release planning | 2026-09-30 | No signing |
| MD-006 | RB-006 SBOM | Accepted risk | Defer | Deterministic .NET 10 output, privacy, and publication lifecycle are not validated | Cynrath | `docs/SUPPLY_CHAIN_DECISIONS.md` | Next pre-release planning | 2026-09-30 | No SBOM publication |
| MD-007 | RB-007 provenance | Implemented locally | Attest next release asset | GitHub first-party attestation binds exact release nupkg to release workflow | Cynrath | `release.yml`, workflow tests, future run | Next published release | At next publish | Attestation write in publish job only |
| MD-008 | RB-008 recovery | Complete | Procedure accepted; `ShadowFlameC` assigned as NuGet backup package recovery owner | Immutable successor recovery requires package owner continuity and backup recovery coverage | `Cynrath` decision owner; `Cyranth` primary NuGet/package owner; `ShadowFlameC` backup owner | Maintainer-provided evidence dated 2026-06-20; `ShadowFlameC` appears in current NuGet package owner list; `docs/PACKAGE_RECOVERY.md`; TASK-0202 | Package lifecycle / planned `0.2.0-alpha.3` release-preparation entry | Recheck before each RC or owner/recovery change | No package state changed; no destructive NuGet action performed; `ShadowFlameC` is not mandatory release approver |
| MD-009 | RB-009 candidate | Selected / publication deferred | `0.2.0-alpha.3` | Additive release/security automation is the smallest compatible prerelease scope; metadata waits for GO | Cynrath release maintainer | `docs/V020_ALPHA3_PLAN.md` | Next candidate planning | Before metadata change or 2026-09-30 | No release write |
| MD-010 | RB-010 approval | Exact-candidate GO / publish deferred | `0.2.0-alpha.3` is GO for a later publish task only; do not publish in TASK-0205 | TASK-0202 closes ownership/recovery blockers; TASK-0203 records metadata and local package evidence; TASK-0205 verifies hosted RC run `27868539971` green on all three OS jobs | `Cynrath` release maintainer | `docs/V020_ALPHA3_RELEASE_DECISION.md`; `docs/RC_HOSTED_EVIDENCE.md`; TASK-0202 maintainer evidence; TASK-0203 release-preparation task; TASK-0205 hosted evidence task | Exact hosted RC evidence commit `beaa14deed3dbc55ac98d216679f9a9799261801`; candidate `0.2.0-alpha.3`; predecessor `0.2.0-alpha.2`; source package `0.2.0-alpha.3.ci.27868539971` | Publish task must resolve RC commit vs later docs-only HEAD policy | No release write in TASK-0205; publication requires separate authorized OIDC release task |

## Recording A Decision
Replace `TBD` only with explicit maintainer evidence. Record the exact commit/version scope. Accepted risk must include why, compensating controls, owner role, review/expiry date, and rollback/recovery path. Do not use this register to store credentials, certificates, private report content, or recovery secrets.

## TASK-0198 Clarification

TASK-0198 did not change any maintainer decision status to `Complete` or `Accepted risk`. `MD-003` and `MD-008` remain `Partial` until the missing owner/authority evidence is recorded by a maintainer and linked to an exact release scope. Documentation-only investigation is not release approval.

## TASK-0201 Closure Preflight

TASK-0201 did not change any maintainer decision status to `Complete` or `Accepted risk`. At TASK-0201 close, the repository still lacked:

- `MD-003` / `RB-003`: a second verified human backup security owner, non-secret notification coverage path for primary and backup review, notification coverage evidence, review date, and effective release scope.
- `MD-008` / `RB-008`: maintainer-verifiable destructive NuGet unlist/deprecate/account-recovery authority, backup recovery owner, owner-linked trigger/unlist/deprecate/successor coverage, review date, and effective release scope.

Successful alpha.2 OIDC publishing and the accepted recovery procedure remain supporting evidence only; they do not prove destructive recovery authority or backup continuity.

## TASK-0202 Maintainer Evidence Intake

TASK-0202 records maintainer-provided external evidence from `Cynrath` dated 2026-06-20 for planned `0.2.0-alpha.3`.

- `MD-003` / `RB-003`: complete. `ShadowFlameC` is recorded as repository `write` collaborator, independent backup security notification owner, and backup maintainer contact. Coverage includes repository security notifications, private vulnerability reporting, future security advisory escalation, and direct maintainer escalation.
- `MD-008` / `RB-008`: complete. `ShadowFlameC` is recorded as current NuGet package owner and backup package recovery owner. Coverage includes package owner continuity, unlist/deprecate coordination, recovery escalation, and successor release coordination.
- `MD-010`: release-preparation eligible / publish deferred. Primary owner-driven release preparation remains allowed for `Cynrath` / `Cyranth`; `ShadowFlameC` is backup/recovery coverage only, not a mandatory release approver.

No version bump, package metadata change, tag, GitHub Release, NuGet publish, workflow dispatch, security advisory, branch ruleset mutation, repository secret creation, owner removal, account/recovery mutation, or destructive NuGet action occurred in TASK-0202.

## TASK-0203 Release Preparation

TASK-0203 prepared the local `0.2.0-alpha.3` candidate at implementation commit `33e1897`.

- `MD-010`: local candidate prepared / publish deferred at TASK-0203 close. Package metadata, CLI runtime version, source-package smoke version parity, release-preparation docs, package verification, and installed-tool smoke evidence are recorded.
- Hosted RC evidence was pending for the exact candidate at TASK-0203 close.
- Exact-candidate GO or NO-GO was pending at TASK-0203 close.

No tag, GitHub Release, NuGet publish, release workflow dispatch, release-candidate workflow dispatch, security advisory, branch ruleset mutation, repository secret creation, owner/account/recovery mutation, or destructive NuGet action occurred in TASK-0203.

## TASK-0205 Hosted RC Evidence GO

TASK-0205 records hosted RC evidence for maintainer-dispatched run `27868539971`.

- `MD-010`: exact-candidate GO / publish deferred. The hosted run passed for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801`, candidate version `0.2.0-alpha.3`, predecessor version `0.2.0-alpha.2`, and source candidate package `0.2.0-alpha.3.ci.27868539971`.
- Windows job `82476527430`, Ubuntu job `82476527450`, and macOS job `82476527416` all succeeded.
- The only annotations are non-blocking xUnit analyzer warnings (`xUnit1051` and `xUnit2013`).
- The later publish task must resolve whether publication uses the RC evidence commit or a later docs-only HEAD under the release workflow exact-commit policy.

No tag, GitHub Release, NuGet publish, release workflow dispatch, new release-candidate workflow dispatch, security advisory, branch ruleset mutation, repository secret creation, owner/account/recovery mutation, or destructive NuGet action occurred in TASK-0205.
