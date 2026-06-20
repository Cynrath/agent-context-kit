# Package Recovery Procedure

## Purpose
Define immutable-package recovery for a compromised, vulnerable, or materially broken AgentContextKit release.

## Ownership
- Decision owner: `Cynrath`, project/release maintainer.
- Primary NuGet/package owner: `Cyranth`.
- NuGet publication authority: verified by successful alpha.2 OIDC Trusted Publishing under configured user `Cyranth`.
- Backup package recovery owner: `ShadowFlameC`, recorded by maintainer-provided evidence as current NuGet package owner for `AgentContextKit`.
- NuGet unlist/deprecate/account-recovery coverage: owner continuity is recorded through `Cyranth` primary ownership and `ShadowFlameC` backup owner coverage; destructive actions are intentionally not tested solely for release evidence.

The procedure is accepted for project operations. TASK-0202 closes `RB-008` for planned `0.2.0-alpha.3` release-preparation entry; publication still requires exact-candidate preparation, validation, and GO.

## Activation Threshold
Recovery may be activated for:
- a confirmed exploitable security issue;
- leaked credentials or malicious/incorrect package content;
- a package that cannot perform its documented primary install/startup flow;
- a critical privacy regression that exposes raw secrets or repository content;
- a provenance or integrity mismatch between package, tag, release, and recorded commit.

Minor documentation defects or non-blocking usability issues use a normal successor release, not emergency unlisting.

## Procedure
1. Stop recommending the affected version in active documentation.
2. Verify package ID/version, digest, tag target, release assets, and affected behavior without changing immutable package content.
3. Decide whether to deprecate or unlist the affected NuGet version through the verified package owner account.
4. Prepare a fixed successor version; never overwrite or reuse the published version.
5. Run local gates, exact-commit hosted checks, OIDC-only publication, install smoke, and post-publish validation.
6. Update GitHub Release, README install guidance, security guidance, and support status with factual impact/remediation information.
7. Record incident dates, affected/fixed versions, remediation commit, package/tag/release actions, and follow-up ownership without private report content.

## Communication
- Security-sensitive details remain in the private advisory until coordinated disclosure.
- Public communication names affected/fixed versions and mitigation, but omits reporter identity, raw secrets, private source, and exploit details that increase risk before remediation.
- NuGet deprecation guidance points to the fixed successor.

## Tabletop Result
Documentation review on 2026-06-14 confirmed the procedure preserves immutable package history, requires a new successor version, and separates decision authority from credential custody. TASK-0202 maintainer evidence on 2026-06-20 records `ShadowFlameC` backup owner continuity for planned `0.2.0-alpha.3`. No package state was changed.

## Review Cadence
Review before each release candidate and after any owner, publishing, recovery, or security-notification change.

## TASK-0201 Closure Preflight

2026-06-20 TASK-0201 preflight result: `RB-008` remained open/partial before TASK-0202 maintainer evidence.

Found evidence:
- decision owner: `Cynrath`;
- normal NuGet publication authority: successful alpha.2 OIDC Trusted Publishing under configured user `Cyranth`;
- recovery activation thresholds;
- successor/unlist/deprecate procedure steps;
- tabletop review date: 2026-06-14.

Missing closure evidence:
- maintainer-verifiable NuGet unlist/deprecate/account-recovery authority;
- backup recovery owner or role;
- owner-linked trigger criteria, unlist/deprecate/successor steps, and communication path coverage;
- review date for the completed authority/backup record;
- effective release scope for the completed recovery authority record.

Maintainer handoff checklist:
- record non-destructive evidence that the maintainer has NuGet unlist/deprecate/account-recovery authority, or record an explicit bounded accepted-risk decision;
- record the backup recovery owner or role without storing credentials, recovery secrets, or private account data;
- link the verified owner and backup roles to the trigger, unlist/deprecate, successor-release, and communication procedure;
- update `docs/RELEASE_BLOCKER_BOARD.md` and `docs/MAINTAINER_DECISION_REGISTER.md` with the same evidence and review scope;
- only then consider closing `RB-008`.

## TASK-0202 Maintainer Evidence Intake

2026-06-20 result: `RB-008` is closed for planned `0.2.0-alpha.3` release-preparation entry.

Maintainer-provided evidence from `Cynrath`:
- package: `AgentContextKit`;
- primary repository/release owner: `Cynrath`;
- primary NuGet/package owner: `Cyranth`;
- backup owner: `ShadowFlameC`;
- status: `ShadowFlameC` appears in the current NuGet package owner list;
- purpose: backup package recovery owner, package owner continuity, unlist/deprecate coordination, recovery escalation, successor release coordination;
- release approval role: not mandatory reviewer; backup/recovery coverage only.

GitHub Actions / release environment boundary:
- environment: `nuget-release`;
- purpose: release environment for trusted publishing;
- required external approval: not required for primary owner-driven release preparation;
- `ShadowFlameC` role: backup/recovery owner, not mandatory release approver;
- repository secrets: none required for NuGet publish because `.github/workflows/release.yml` uses `NuGet/login@v1` trusted publishing with `user: Cyranth` and `NUGET_API_KEY` from `steps.login.outputs.NUGET_API_KEY`.

No NuGet unlist/deprecate action, package state change, account/recovery mutation, repository secret creation, workflow dispatch, tag, GitHub Release, NuGet publish, owner removal, or destructive package action occurred.
