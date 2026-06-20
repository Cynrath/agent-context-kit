# Release Blocker Board

Status date: 2026-06-20. Decision boundary: local `0.2.0-alpha.3` release candidate prepared by TASK-0203; hosted RC evidence passed in TASK-0205 for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801`; publication remains unperformed and requires a separate authorized publish task.

| Blocker ID | Category | Priority | Current status | Owner role | Evidence required | Remote write? | Decision options / accepted risk | Review date | Release impact | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RB-001 | Hosted RC evidence | P0 | Closed for reviewed alpha.2 state: run `27478635057` green on three OS | Release maintainer | Exact candidate commit, workflow URL, Windows/Ubuntu/macOS jobs, package/config/baseline/SARIF/performance results | Yes: push/dispatch | Rerun for a different final candidate | 2026-06-14 | Rerun-dependent | Green reviewed run for exact candidate |
| RB-002 | Private vulnerability reporting | P0 | Closed: enabled and independently verified | Security maintainer | GitHub GET `enabled: true`, report entry visible, verification date/maintainer | Yes | Recheck before future RC | 2026-06-14 | Complete | Verified enabled state and report entry |
| RB-003 | Security notification ownership | P0 | Closed: `Cynrath` primary; `ShadowFlameC` independent backup security notification owner / backup maintainer contact with repository `write` collaborator evidence | Security maintainer | Primary owner, second verified human owner, coverage path, non-secret notification coverage evidence, review date, release scope | No action in TASK-0202 | Keep backup coverage current; no mandatory external release approval requirement | 2026-06-20 | Complete for release-preparation entry | `docs/SECURITY_NOTIFICATION_OWNERSHIP.md`, this board, and decision register record primary/backup coverage for `0.2.0-alpha.3` |
| RB-004 | NuGet owner identity | P1 | Disposed: bounded accepted risk; public owner `Cyranth`, package/project persona `Cynrath` | Package maintainer | Public owner/OIDC evidence and dated review | No owner change | Recheck or align before expiry | 2026-09-30 | Accepted for current scope | `docs/NUGET_OWNER_IDENTITY.md` maintained |
| RB-005 | Author signing | P1 | Disposed: bounded defer/accepted risk | Package/security maintainer | Repository signature plus dated controls/review | No signing | Revisit before expiry | 2026-09-30 | Accepted for current scope | Do not claim author signing |
| RB-006 | SBOM publication | P1 | Disposed: bounded defer/accepted risk | Release/security maintainer | Dependency/package inspection plus dated review | No publication | Validate generator/privacy before implementation | 2026-09-30 | Accepted for current scope | No false SBOM claim |
| RB-007 | Provenance/attestation | P1 | Implemented locally; hosted evidence pending next publish | Release/security maintainer | Exact release nupkg, signer workflow, verification result | Yes in publish job | No retrospective alpha.2 attestation | Next publish | Blocks completion of next publish | Successful `actions/attest@v4` and CLI verification |
| RB-008 | Package recovery | P1 | Closed: procedure/tabletop accepted; `ShadowFlameC` listed by maintainer evidence as NuGet package owner and backup package recovery owner for continuity/recovery coverage | Package/security maintainer | Maintainer-verifiable package owner continuity, backup recovery owner, trigger path, unlist/deprecate/successor steps, review date, release scope | No action in TASK-0202; destructive action only during incident | Keep backup owner current; no mandatory external release approval requirement | 2026-06-20 | Complete for release-preparation entry | `docs/PACKAGE_RECOVERY.md`, this board, and decision register record primary/backup recovery coverage for `0.2.0-alpha.3` |
| RB-009 | Candidate version | P0/P1 dependent | Closed for alpha.3 candidate: `0.2.0-alpha.3` local pack/verify/install smoke passed; hosted RC run `27868539971` passed for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801` | Release maintainer | Scope, compatibility, package diff, changelog, exact commit, prerequisite disposition | Yes in later publish task | Do not publish from evidence task; publish task must resolve RC commit vs later docs-only HEAD policy | 2026-06-20 | Complete for GO decision; publish still separate | TASK-0203 local package evidence and TASK-0205 hosted RC evidence recorded |
| RB-010 | Release approval | P0 | Exact-candidate GO recorded for later publish task only | Release maintainer | Completed checklist, local/hosted evidence, blocker dispositions, package/release review | Yes later | GO is scoped to future publish preparation/execution; no implicit publication action | 2026-06-20 | Unblocks planning of a dedicated publish task; does not itself publish, tag, release, or dispatch | TASK-0205 records GO for exact commit/version and no release write |

## Rules
- `TBD` is a placeholder, not a due-date commitment.
- An accepted-risk option is not accepted until the decision register has decision, rationale, owner role, evidence, review date, and exact release scope.
- Local docs/tests/gates cannot mark a remote/security/package blocker done.
- The current published `v0.2.0-alpha.2` remains unaffected; this board governs future candidate decisions.

## TASK-0198 Evidence Boundary

TASK-0198 rechecked the repository-local evidence for `RB-003` and `RB-008` without remote or destructive actions. The result is investigation-only:

- `RB-003` has primary ownership and private vulnerability reporting enabled, but no second verified human owner, backup notification path, or notification coverage evidence. A fake advisory is not required and must not be created solely for this check.
- `RB-008` has an accepted immutable-package recovery procedure and tabletop note, but no verified destructive NuGet unlist/deprecate/account-recovery authority and no backup recovery owner.
- The existing docs, tests, release scripts, successful OIDC publish, and package recovery procedure are useful supporting evidence but do not close either blocker by themselves.
- At TASK-0198 close, `0.2.0-alpha.3` remained `NO-GO` until the missing ownership/authority evidence was recorded and a new exact release decision replaced that boundary.

## TASK-0201 Closure Preflight

TASK-0201 rechecked repository-local closure evidence on 2026-06-20. At that point, no blocker could be closed from the then-current repository evidence.

### RB-003 Security Notification Ownership

| Criterion | Preflight result | Evidence |
| --- | --- | --- |
| Primary security owner | Found | `docs/SECURITY_NOTIFICATION_OWNERSHIP.md` records `Cynrath` as primary security triage owner. |
| Independent backup human owner | Missing | Backup security triage owner remains `Not assigned`; no second verified human maintainer is recorded. |
| Notification coverage path | Partial / insufficient | GitHub private vulnerability reporting is verified, but notification delivery remains unverified and no backup coverage path is recorded. |
| Review date | Partial / insufficient | Existing ownership status date is 2026-06-14; this 2026-06-20 preflight did not add closure evidence. |
| Exact release scope | Partial / insufficient | The planned scope is `0.2.0-alpha.3`, but no exact candidate or GO decision exists. |

Maintainer evidence required to close `RB-003`:
- record the second verified human backup owner or role;
- record a non-secret notification coverage path for primary and backup review;
- record non-secret evidence that notifications reach the covered owner path;
- record the review date and effective release scope;
- update `docs/SECURITY_NOTIFICATION_OWNERSHIP.md`, this board, and `docs/MAINTAINER_DECISION_REGISTER.md` without storing private contact details or advisory content.

### RB-008 Package Recovery

| Criterion | Preflight result | Evidence |
| --- | --- | --- |
| Destructive NuGet unlist/deprecate/account-recovery authority | Missing | `docs/PACKAGE_RECOVERY.md` records publication authority from alpha.2 OIDC but destructive recovery authority remains unverified and intentionally untested. |
| Backup recovery owner | Missing | `docs/PACKAGE_RECOVERY.md` records no backup recovery owner. |
| Recovery trigger criteria | Found | `docs/PACKAGE_RECOVERY.md` defines activation thresholds. |
| Successor/unlist/deprecate steps | Found | `docs/PACKAGE_RECOVERY.md` defines successor, deprecate, and unlist procedure steps. |
| Review date | Partial / insufficient | Tabletop review was recorded on 2026-06-14; this 2026-06-20 preflight did not add authority or backup evidence. |
| Exact release scope | Partial / insufficient | The package lifecycle blocker applies before the next release candidate; no exact alpha.3 candidate or GO decision exists. |

Maintainer evidence required to close `RB-008`:
- record maintainer-verifiable NuGet unlist/deprecate/account-recovery authority without executing a destructive action solely for testing;
- record the backup recovery owner or role;
- link trigger criteria, unlist/deprecate/successor steps, and communication path to the verified owner/backup roles;
- record the review date and effective release scope;
- update `docs/PACKAGE_RECOVERY.md`, this board, and `docs/MAINTAINER_DECISION_REGISTER.md`, or record an explicit bounded accepted-risk decision if the maintainer chooses that path.

## TASK-0202 Maintainer Evidence Intake

TASK-0202 records maintainer-provided external evidence from `Cynrath` dated 2026-06-20 for planned `0.2.0-alpha.3`.

### RB-003 Closure Evidence

| Criterion | TASK-0202 result | Evidence |
| --- | --- | --- |
| Primary security owner | Found | `Cynrath` remains repository owner / primary security triage owner. |
| Independent backup human owner | Found | `ShadowFlameC` is recorded by maintainer evidence as repository `write` collaborator and independent backup security notification owner. |
| Notification coverage path | Found | Coverage includes repository security notifications, private vulnerability reporting, future security advisory escalation, and direct maintainer escalation. |
| Review date | Found | Maintainer evidence date: 2026-06-20. |
| Exact release scope | Found | Planned `0.2.0-alpha.3`; release preparation is eligible, but no candidate commit/package/publish exists yet. |
| Release approval role | Explicitly bounded | `ShadowFlameC` is backup/recovery coverage only, not a mandatory release reviewer. |

Closure conclusion: `RB-003` is closed for `0.2.0-alpha.3` release-preparation entry.

### RB-008 Closure Evidence

| Criterion | TASK-0202 result | Evidence |
| --- | --- | --- |
| Primary package owner | Found | Primary NuGet/package owner remains `Cyranth`; primary repository/release owner remains `Cynrath`. |
| Backup recovery owner | Found | `ShadowFlameC` is recorded by maintainer evidence as current NuGet package owner and backup package recovery owner. |
| Recovery authority coverage | Found | Coverage includes package owner continuity, unlist/deprecate coordination, recovery escalation, and successor release coordination. No destructive NuGet action was performed. |
| Trigger criteria and procedure | Found | `docs/PACKAGE_RECOVERY.md` records activation thresholds and successor/unlist/deprecate procedure steps. |
| Review date | Found | Maintainer evidence date: 2026-06-20. |
| Exact release scope | Found | Planned `0.2.0-alpha.3`; release preparation is eligible, but no candidate commit/package/publish exists yet. |
| Release approval role | Explicitly bounded | `ShadowFlameC` is backup/recovery coverage only, not a mandatory release reviewer. |

Closure conclusion: `RB-008` is closed for `0.2.0-alpha.3` release-preparation entry.

TASK-0202 did not perform a version bump, package metadata change, tag, GitHub Release, NuGet publish, release workflow dispatch, release-candidate workflow dispatch, security advisory creation, branch ruleset mutation, repository secret creation, owner removal, account/recovery mutation, or destructive NuGet action.
