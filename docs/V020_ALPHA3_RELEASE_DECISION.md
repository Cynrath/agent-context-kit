# v0.2.0-alpha.3 Release Decision

Initial decision date: 2026-06-14. Evidence intake update: 2026-06-20. Release-preparation update: 2026-06-20. Decision owner: `Cynrath`.

## Decision
**Release preparation in progress; publication is not approved.**

`0.2.0-alpha.3` is the selected planning version. TASK-0202 closes the ownership/recovery blockers from maintainer-provided evidence. TASK-0203 prepares the source/package metadata and release-preparation docs for local candidate validation. Hosted RC evidence, exact-candidate GO, tag creation, GitHub Release creation, NuGet publication, and workflow dispatch remain pending and unauthorized.

## Verified Inputs
- TASK-0126 immutable alpha.2 recovery verification is green in run `27478046088`.
- TASK-0128 hosted RC evidence is green on Windows, Ubuntu, and macOS in run `27478635057` for reviewed alpha.2 source state.
- TASK-0129 private vulnerability reporting is enabled and independently verified.
- TASK-0130 records `Cynrath` as primary security triage/recovery decision owner and documents immutable successor recovery.
- TASK-0131 records the bounded `Cyranth` NuGet owner / `Cynrath` project persona disposition.
- TASK-0132 records bounded author-signing/SBOM deferrals and implements future exact-release-asset provenance.
- TASK-0132 commit `46be43f` passed the standard 8/8 hosted jobs.
- TASK-0133 planning commit `eabbe6a` passed the standard 8/8 hosted jobs: `27496554495`, `27496554487`, and `27496554492`.
- Local validation passes 186/186 tests, clean scan, doctor, sample smoke, package verification, contract/readiness/security gates, and the 2,000-file performance tripwire.
- TASK-0202 records maintainer-provided evidence from `Cynrath` dated 2026-06-20 that `ShadowFlameC` is repository `write` collaborator, independent backup security notification owner, backup maintainer contact, current NuGet package owner, and backup package recovery owner for planned `0.2.0-alpha.3`.
- `.github/workflows/release.yml` uses `environment: nuget-release`, `NuGet/login@v1` with `user: Cyranth`, and `NUGET_API_KEY: ${{ steps.login.outputs.NUGET_API_KEY }}` from trusted publishing. No repository secret is required for NuGet publish.
- TASK-0203 prepares package metadata, CLI runtime version, source-package smoke pin, and release-preparation docs for `0.2.0-alpha.3` local validation. This is not publication approval.

## Remaining Release Conditions
1. TASK-0203 local validation, package verification, and install smoke evidence must be recorded before the local candidate is considered prepared.
2. Future provenance is implemented locally but can only be verified during an authorized successful publish; it does not replace pre-publish approval.
3. Candidate-specific hosted RC evidence is still pending and must be obtained in a later task.
4. Publication, tag creation, GitHub Release creation, and workflow dispatch remain unauthorized until release preparation and hosted RC evidence record a new exact-candidate GO decision.

## TASK-0198 Evidence Check

TASK-0198 rechecked repository-local evidence for `RB-003` and `RB-008` on 2026-06-20. The check found no new maintainer evidence that closes either blocker:

- `docs/SECURITY_NOTIFICATION_OWNERSHIP.md` still records `Cynrath` as primary, backup security triage owner as not assigned, and notification delivery as unverified.
- `docs/PACKAGE_RECOVERY.md` still records the recovery procedure/tabletop as accepted, but NuGet unlist/deprecate/account-recovery authority and backup recovery owner as unverified.
- This investigation does not authorize a version bump, release-candidate workflow dispatch, release workflow dispatch, tag, GitHub Release, NuGet publish, owner mutation, security-setting change, or destructive NuGet action.

## TASK-0201 Closure Preflight

TASK-0201 rechecked whether repository-local evidence was then sufficient to close `RB-003` or `RB-008`. It was not.

- `RB-003` closure criteria remain incomplete: primary owner exists, but the independent backup human owner is missing, notification delivery/backup coverage is unverified, and no exact-candidate GO scope exists.
- `RB-008` closure criteria remain incomplete: recovery trigger criteria and successor/unlist/deprecate procedure steps exist, but destructive NuGet unlist/deprecate/account-recovery authority and backup recovery owner remain unverified.
- TASK-0201 required maintainer-provided closure evidence to update the ownership/recovery docs, blocker board, and decision register with review date and effective release scope before this decision could change.
- At TASK-0201 close, `0.2.0-alpha.3` remained `NO-GO`; TASK-0202 below supersedes that ownership/recovery boundary, but there is still no alpha.3 candidate commit, package, tag, GitHub Release, NuGet publication, release-candidate dispatch, or release workflow dispatch.

## TASK-0202 Maintainer Evidence Intake

TASK-0202 records maintainer-provided external evidence from `Cynrath` dated 2026-06-20:

- `ShadowFlameC` has repository `write` collaborator permission for `Cynrath/agent-context-kit`.
- `ShadowFlameC` is the independent backup security notification owner and backup maintainer contact for repository security notifications, private vulnerability reporting, future security advisory escalation, and direct maintainer escalation.
- `ShadowFlameC` appears in the current NuGet package owner list for `AgentContextKit` and is the backup package recovery owner for owner continuity, unlist/deprecate coordination, recovery escalation, and successor release coordination.
- Primary repository owner remains `Cynrath`; primary NuGet/package owner remains `Cyranth`.
- `ShadowFlameC` is backup/recovery coverage only, not a mandatory release approver.
- The `nuget-release` environment is release environment configuration for trusted publishing, not a required external approval gate for owner-driven release preparation.

Result:
- `RB-003` is closed for `0.2.0-alpha.3` release-preparation entry.
- `RB-008` is closed for `0.2.0-alpha.3` release-preparation entry.
- `0.2.0-alpha.3` is release-preparation eligible, but not published.
- TASK-0203 is authorized to prepare source/package metadata for local validation only.

## TASK-0203 Release Preparation

TASK-0203 prepares the local `0.2.0-alpha.3` candidate by updating package metadata, the CLI runtime version, source-package smoke pin, release-preparation docs, and package validation evidence. The source-smoke workflow pin is updated because `scripts/prepare-release.ps1` requires the source-package smoke version to match the requested candidate version.

TASK-0203 boundaries:
- local package validation and installed-tool smoke are required before the candidate is recorded as locally prepared;
- hosted RC evidence remains pending for a later task;
- final release GO is not recorded in TASK-0203;
- no tag, GitHub Release, NuGet publish, release workflow dispatch, release-candidate workflow dispatch, owner/account/recovery mutation, repository secret creation, branch ruleset mutation, security advisory, or destructive NuGet action is authorized.

## Actions Not Performed
- no published-package workflow version change;
- no release-candidate workflow dispatch for alpha.3;
- no release workflow dispatch;
- no NuGet login or publish;
- no tag or GitHub Release creation;
- no existing tag/package mutation;
- no security advisory creation;
- no branch ruleset mutation;
- no repository secret creation;
- no owner removal, account/recovery mutation, or destructive NuGet action.

## Next Required Task
Finish release preparation, then hosted RC evidence:
1. finish TASK-0203 local restore/build/test/source scan/doctor/package validation/install smoke;
2. record the exact local candidate commit and package path;
3. push the validated release-preparation commits;
4. in a later task, obtain standard hosted checks and dedicated three-OS RC evidence for the exact candidate;
5. record exact-version/exact-commit GO or NO-GO;
6. only after GO, publish through the OIDC-only release workflow.

Immutable release rules remain in force: never reuse a NuGet version, move an existing tag, force push, or replace published artifacts.
