# Maintainer Decision Register

This register records future maintainer decisions. It contains no approval yet.

| Decision ID | Related blocker | Status | Decision | Rationale | Owner role | Evidence | Effective scope | Review/expiry | Remote action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MD-001 | RB-001 hosted evidence | Verified for reviewed alpha.2 state | Rerun for a different candidate | Run `27478635057` passed exact three-OS evidence | Release maintainer | Exact commit/run/results in hosted status | Commit `4c4fa64` only | Next candidate | Dispatch completed |
| MD-002 | RB-002 private reporting | Complete | Enabled | Secure repository disclosure path is required | Cynrath | GET `enabled: true` and public entry verification on 2026-06-14 | Repository | Before next RC | Setting enabled |
| MD-003 | RB-003 notifications | Partial | Primary assigned; backup and coverage evidence pending | Private reports need continuity beyond one account | Cynrath primary; backup unassigned | `docs/SECURITY_NOTIFICATION_OWNERSHIP.md`; TASK-0198 and TASK-0201 confirm no second verified human owner or notification coverage record | Repository / planned `0.2.0-alpha.3` preflight | Before next RC | No test advisory created; no security setting changed |
| MD-004 | RB-004 owner identity | Accepted risk | Keep `Cyranth` NuGet owner and `Cynrath` public metadata for current scope | OIDC publish works; unverified ownership mutation risks access disruption | Cynrath package maintainer | `docs/NUGET_OWNER_IDENTITY.md`, alpha.2 OIDC publish | Through next pre-release decision | 2026-09-30 | No owner change |
| MD-005 | RB-005 author signing | Accepted risk | Defer | No trusted certificate/custody/timestamp/recovery lifecycle is verified | Cynrath | `docs/SUPPLY_CHAIN_DECISIONS.md` | Next pre-release planning | 2026-09-30 | No signing |
| MD-006 | RB-006 SBOM | Accepted risk | Defer | Deterministic .NET 10 output, privacy, and publication lifecycle are not validated | Cynrath | `docs/SUPPLY_CHAIN_DECISIONS.md` | Next pre-release planning | 2026-09-30 | No SBOM publication |
| MD-007 | RB-007 provenance | Implemented locally | Attest next release asset | GitHub first-party attestation binds exact release nupkg to release workflow | Cynrath | `release.yml`, workflow tests, future run | Next published release | At next publish | Attestation write in publish job only |
| MD-008 | RB-008 recovery | Partial | Procedure accepted; destructive authority and backup pending | Immutable successor recovery is required, but NuGet destructive authority and continuity remain unresolved | Cynrath decision owner | `docs/PACKAGE_RECOVERY.md`, tabletop 2026-06-14; TASK-0198 and TASK-0201 confirm no verified unlist/deprecate/account-recovery authority or backup recovery owner | Package lifecycle / planned `0.2.0-alpha.3` preflight | Before next RC | No package state changed |
| MD-009 | RB-009 candidate | Selected / publication deferred | `0.2.0-alpha.3` | Additive release/security automation is the smallest compatible prerelease scope; metadata waits for GO | Cynrath release maintainer | `docs/V020_ALPHA3_PLAN.md` | Next candidate planning | Before metadata change or 2026-09-30 | No release write |
| MD-010 | RB-010 approval | NO-GO on 2026-06-14 | Do not prepare or publish `0.2.0-alpha.3` | Independent backup security ownership and recovery authority/backup evidence are incomplete | Cynrath release maintainer | `docs/V020_ALPHA3_RELEASE_DECISION.md`; planning commit `eabbe6a` 8/8 | Planned `0.2.0-alpha.3`; no candidate commit | Until blockers close and a new exact GO replaces this decision | Documentation push only; no release write |

## Recording A Decision
Replace `TBD` only with explicit maintainer evidence. Record the exact commit/version scope. Accepted risk must include why, compensating controls, owner role, review/expiry date, and rollback/recovery path. Do not use this register to store credentials, certificates, private report content, or recovery secrets.

## TASK-0198 Clarification

TASK-0198 did not change any maintainer decision status to `Complete` or `Accepted risk`. `MD-003` and `MD-008` remain `Partial` until the missing owner/authority evidence is recorded by a maintainer and linked to an exact release scope. Documentation-only investigation is not release approval.

## TASK-0201 Closure Preflight

TASK-0201 did not change any maintainer decision status to `Complete` or `Accepted risk`. The repository still lacks:

- `MD-003` / `RB-003`: a second verified human backup security owner, non-secret notification coverage path for primary and backup review, notification coverage evidence, review date, and effective release scope.
- `MD-008` / `RB-008`: maintainer-verifiable destructive NuGet unlist/deprecate/account-recovery authority, backup recovery owner, owner-linked trigger/unlist/deprecate/successor coverage, review date, and effective release scope.

Successful alpha.2 OIDC publishing and the accepted recovery procedure remain supporting evidence only; they do not prove destructive recovery authority or backup continuity.
