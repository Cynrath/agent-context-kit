# v0.2.0-alpha.3 Release Decision

Initial decision date: 2026-06-14. Evidence intake update: 2026-06-20. Release-preparation update: 2026-06-20. Hosted RC planning update: 2026-06-20. Decision owner: `Cynrath`.

## Decision
**Release candidate prepared locally; hosted RC evidence and publication approval are still pending.**

`0.2.0-alpha.3` is the selected planning version. TASK-0202 closes the ownership/recovery blockers from maintainer-provided evidence. TASK-0203 prepared the source/package metadata, release-preparation docs, local package, package verification, and installed-tool smoke evidence at implementation commit `33e1897`. TASK-0204 identifies dispatch-time current `origin/master` as the hosted RC evidence candidate; preflight started from `195b933df52ccba37e0edc8327e64aaecb5c5d8b`, but TASK-0204 docs commits advance the branch before final dispatch. Hosted RC evidence, exact-candidate GO, tag creation, GitHub Release creation, NuGet publication, and workflow dispatch remain pending and unauthorized.

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
- TASK-0203 prepared package metadata, CLI runtime version, source-package smoke pin, release-preparation docs, local package validation, and installed-tool smoke evidence for `0.2.0-alpha.3`. This is not publication approval.
- TASK-0204 verified current-source `version` reports `AgentContextKit 0.2.0-alpha.3` and preflight `origin/master` was `195b933df52ccba37e0edc8327e64aaecb5c5d8b`.

## Remaining Release Conditions
1. Hosted RC evidence must be recorded for the exact `0.2.0-alpha.3` candidate commit before any release GO.
2. Future provenance is implemented locally but can only be verified during an authorized successful publish; it does not replace pre-publish approval.
3. Candidate-specific hosted RC evidence is still pending and must be obtained in a later task.
4. Publication, tag creation, GitHub Release creation, and workflow dispatch remain unauthorized until hosted RC evidence records a new exact-candidate GO decision.

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

TASK-0203 prepared the local `0.2.0-alpha.3` candidate by updating package metadata, the CLI runtime version, source-package smoke pin, release-preparation docs, and package validation evidence. The source-smoke workflow pin was updated because `scripts/prepare-release.ps1` requires the source-package smoke version to match the requested candidate version.

TASK-0203 local evidence:
- plan commit: `da51d4d`;
- candidate implementation commit: `33e1897`;
- package path: `artifacts/package-validation/0.2.0-alpha.3`;
- `dotnet restore`, Release build, `428/428` tests, current-source help, current-source `scan --ci`, `ackit doctor`, `git diff --check`, package verification, and installed-tool smoke passed;
- targeted release/contract scripts passed except for the documented Windows `git status --short` unreadable-directory stderr caveat in consolidated release/evidence gates; raw porcelain was clean.

TASK-0203 boundaries:
- the candidate is locally prepared only, not published;
- hosted RC evidence remains pending for a later task;
- final release GO is not recorded in TASK-0203;
- no tag, GitHub Release, NuGet publish, release workflow dispatch, release-candidate workflow dispatch, owner/account/recovery mutation, repository secret creation, branch ruleset mutation, security advisory, or destructive NuGet action is authorized.

## TASK-0204 Hosted RC Evidence Planning

TASK-0204 prepares the exact hosted RC evidence plan for the already prepared local candidate. The release-candidate workflow validates that `commit_sha` equals checked-out `HEAD` and current `origin/master`; because TASK-0204 commits move the branch, the workflow must be manually dispatched later with the post-push `origin/master` SHA:

```powershell
$commitSha = (git rev-parse origin/master).Trim()
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-inputs.ps1 `
  -CommitSha $commitSha `
  -CandidateVersion 0.2.0-alpha.3 `
  -PredecessorVersion 0.2.0-alpha.2 `
  -RequireOriginMaster

gh workflow run release-candidate-evidence.yml `
  --repo Cynrath/agent-context-kit `
  --ref master `
  -f commit_sha=$commitSha `
  -f candidate_version=0.2.0-alpha.3 `
  -f predecessor_version=0.2.0-alpha.2
```

Read-only hosted run check result: no exact hosted alpha.3 `release-candidate-evidence` run exists yet. Historical alpha.2 run `27478635057` remains valid only for alpha.2 and must not be reused as alpha.3 evidence.

TASK-0204 boundaries:
- hosted RC evidence is pending;
- exact-candidate GO is not recorded;
- publication remains not approved;
- no workflow dispatch is performed unless explicitly requested by the maintainer in the current session;
- no tag, GitHub Release, NuGet publish, release workflow dispatch, owner/account/recovery mutation, repository secret creation, branch ruleset mutation, security advisory, or destructive NuGet action is authorized.

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
Manual hosted RC dispatch and exact-candidate decision:
1. a maintainer dispatches `release-candidate-evidence.yml` with the post-push TASK-0204 tuple above;
2. record Windows, Ubuntu, and macOS results for the exact dispatch-time `origin/master` commit;
3. record exact-version/exact-commit GO or NO-GO;
4. only after an explicit GO in a separate authorized release task, publish through the OIDC-only release workflow.

Immutable release rules remain in force: never reuse a NuGet version, move an existing tag, force push, or replace published artifacts.
