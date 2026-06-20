# v0.2.0-alpha.3 Release Decision

Initial decision date: 2026-06-14. Evidence intake update: 2026-06-20. Release-preparation update: 2026-06-20. Hosted RC planning update: 2026-06-20. Hosted RC evidence update: 2026-06-20. Publish update: 2026-06-20. Decision owner: `Cynrath`.

## Decision
**Published: `AgentContextKit` `0.2.0-alpha.3` is available on NuGet and recorded as GitHub prerelease `v0.2.0-alpha.3`.**

`0.2.0-alpha.3` is the selected planning version. TASK-0202 closes the ownership/recovery blockers from maintainer-provided evidence. TASK-0203 prepared the source/package metadata, release-preparation docs, local package, package verification, and installed-tool smoke evidence. TASK-0204 identified the dispatch-time `origin/master` hosted RC evidence candidate. TASK-0205 verified hosted RC run `27868539971` for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801`, candidate `0.2.0-alpha.3`, predecessor `0.2.0-alpha.2`, and source candidate package `0.2.0-alpha.3.ci.27868539971`; Windows, Ubuntu, and macOS jobs all succeeded. TASK-0206 later required source-impacting release-gate script hardening and therefore refreshed hosted RC evidence with run `27870246504` for exact commit `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`; Windows, Ubuntu, and macOS jobs all succeeded.

TASK-0206 selected final publish SHA `92984c6448332aa24b7cff94647f627bf944e535`, a docs/handoff/governance-only successor to refreshed hosted RC evidence commit `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`. The final bridge changed 8 files and 0 package/source-impacting files. Publication used `.github/workflows/release.yml` with matching `automation_commit_sha` and `release_commit_sha`.

Final release state:
- NuGet package: `AgentContextKit` `0.2.0-alpha.3` exists and `scripts/verify-published-package.ps1 -Version 0.2.0-alpha.3` passed.
- Global tool smoke: reinstall from NuGet passed; `ackit version` returned `AgentContextKit 0.2.0-alpha.3`.
- Git tag: `v0.2.0-alpha.3` points to `92984c6448332aa24b7cff94647f627bf944e535`.
- GitHub Release: `v0.2.0-alpha.3` exists as a prerelease targeting `92984c6448332aa24b7cff94647f627bf944e535`.
- Release assets: `AgentContextKit.0.2.0-alpha.3.nupkg` SHA-256 `72649efbd3ab0b6751281e200de5671cb361c53ad954bbd5510a4d31232cb33f`; `AgentContextKit.0.2.0-alpha.3.snupkg` SHA-256 `716da07eb6bfa6c12b98b7e6ceaeb6e94999547a686b0af5bce5a0d75d2c9c2f`.
- Successful release workflow verification: `release.yml` `operation=verify-existing` run `27870813763`, `https://github.com/Cynrath/agent-context-kit/actions/runs/27870813763`, succeeded without package/tag/release mutation.

Publish workflow caveat:
- `operation=publish` runs `27870383897`, `27870603776`, and `27870710093` completed the immutable publication sequence in stages but did not finish green. Run `27870383897` published the NuGet package and then hit NuGet propagation delay before tag/release. Run `27870603776` created the exact tag and GitHub prerelease/assets without republishing, then failed in the provenance probe. Run `27870710093` reproduced the same provenance-probe failure after verifying existing package/tag/release.
- The failed provenance step attempted `gh api repos/Cynrath/agent-context-kit/attestations/sha256:<digest>` for the release nupkg and exited nonzero when no attestation existed, before `actions/attest@v4` could run. This is a workflow idempotency/provenance follow-up for the next release. It did not move tags, replace assets, reuse a version, expose secrets, or manually mutate release state.

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
- TASK-0205 verified hosted RC run `27868539971` with `gh`: run conclusion `success`; head SHA `beaa14deed3dbc55ac98d216679f9a9799261801`; event `workflow_dispatch`; branch `master`; jobs `evidence (windows-2025)`, `evidence (ubuntu-latest)`, and `evidence (macos-latest)` all succeeded.

## Remaining Release Conditions
1. `0.2.0-alpha.3` publication is complete and immutable; do not republish, replace assets, move `v0.2.0-alpha.3`, or reuse the version.
2. Record and carry forward the workflow provenance follow-up: the publish path's attestation probe must handle the "no attestation exists yet" case before the next release.
3. Future releases still require their own task, hosted RC evidence, exact SHA decision, package/source bridge classification, and `release.yml` dispatch.
4. The current published package remains governed by successor-release policy; any correction must be a new version unless it is docs-only evidence.
5. Repository secrets and manual NuGet API keys remain prohibited for package publication.

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

TASK-0204 prepared the exact hosted RC evidence plan for the already prepared local candidate. The release-candidate workflow validates that `commit_sha` equals checked-out `HEAD` and current `origin/master`; because TASK-0204 commits move the branch, the workflow must be manually dispatched later with the post-push `origin/master` SHA:

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

## TASK-0205 Hosted RC Evidence And GO

TASK-0205 records hosted release-candidate evidence for run `27868539971`:

- run URL: `https://github.com/Cynrath/agent-context-kit/actions/runs/27868539971`;
- event: `workflow_dispatch`;
- branch: `master`;
- candidate commit: `beaa14deed3dbc55ac98d216679f9a9799261801`;
- candidate version: `0.2.0-alpha.3`;
- predecessor version: `0.2.0-alpha.2`;
- source candidate package: `0.2.0-alpha.3.ci.27868539971`;
- matrix result: `windows-2025`, `ubuntu-latest`, and `macos-latest` all succeeded;
- job IDs: macOS `82476527416`, Windows `82476527430`, Ubuntu `82476527450`;
- annotations: xUnit analyzer warnings only (`xUnit1051` and `xUnit2013`), non-blocking.

TASK-0205 decision:
- exact-candidate GO is recorded for a later publish task;
- `0.2.0-alpha.3` remains unpublished;
- hosted RC evidence validates commit `beaa14deed3dbc55ac98d216679f9a9799261801`;
- TASK-0205 docs commits happen after the hosted evidence and must be considered by the later publish task's exact-commit policy;
- no tag, GitHub Release, NuGet publish, release workflow dispatch, new release-candidate workflow dispatch, owner/account/recovery mutation, repository secret creation, branch ruleset mutation, security advisory, or destructive NuGet action is authorized or performed in TASK-0205.

## TASK-0206 Publish Preflight

TASK-0206 is the explicit publish task for `0.2.0-alpha.3`. The maintainer authorizes verification, GitHub Actions checks, `release.yml` dispatch, run monitoring, and post-publish verification without repeated confirmation, provided all release gates pass and no package/tag/release conflict exists.

Pre-dispatch decision:
- hosted RC evidence commit: `beaa14deed3dbc55ac98d216679f9a9799261801`;
- initial publish SHA candidate after TASK-0206 plan push: `85383a9321566f9e0989a0db5429fb7d72d6109a`;
- final publish SHA policy: recompute current `origin/master` after the pre-dispatch evidence commit is pushed and use that full SHA for both `automation_commit_sha` and `release_commit_sha`;
- reason: `.github/workflows/release.yml` requires matching automation/release SHAs for `operation=publish`, and runs `scripts/prepare-release.ps1 -RequireOriginMaster`;
- RC-to-publish bridge from `beaa14deed3dbc55ac98d216679f9a9799261801` to `85383a9321566f9e0989a0db5429fb7d72d6109a`: 16 changed files, all docs/handoff/governance; 0 package/source-impacting files;
- package/source-impacting paths checked included `src/**`, `tests/**`, `scripts/**`, release workflow YAML, RC workflow YAML, README files, solution/build metadata, `global.json`, and `NuGet.config`;
- current source version and package metadata both verified `0.2.0-alpha.3`;
- NuGet package, local tag, and GitHub Release for `v0.2.0-alpha.3` did not exist before publish;
- local restore/build/test/source CLI smoke/source scan/doctor/diff checks passed;
- release gates passed except `verify-release.ps1` stopped in its alpha.2-era release blocker review due to the known Windows `git status --short` unreadable-directory stderr warning after restore/build/test/source scan/doctor had passed. Raw porcelain and focused guards were separately clean.

Pre-dispatch GO: proceed to `release.yml` publish dispatch only after pushing the pre-dispatch evidence commit, recomputing `origin/master`, and confirming the bridge remains docs/handoff/governance-only with 0 package/source-impacting changes.

First TASK-0206 dispatch result: release workflow run `27869569988` failed before pack/publish in the Windows `validate exact package` job. The failed step was `Run release gates`; `scripts/check-v100-readiness.ps1 -FailOnIssues` reported missing `.codex/NEXT_STEPS.md` references to `V100_GAP_ANALYSIS.md`, `RELEASE_CANDIDATE_CONTRACT_FREEZE.md`, and `MAINTAINER_RC_DECISION.md`. Restore/build/test and source output validation had passed. The publish job was skipped, and no NuGet package, tag, GitHub Release, attestation, or release asset was created. TASK-0206 may continue only after a docs-only remediation commit restores the references, the gate passes, and the RC-to-publish bridge is reclassified as package/source clean.

Second TASK-0206 dispatch result: release workflow run `27869677726` failed before pack/publish in the same pre-publish `Run release gates` step. The previous v1.0 readiness failure was fixed. The new failure was `scripts/check-security-supply-chain-evidence.ps1 -FailOnIssues`, which still expects the historical `docs/PACKAGE_RECOVERY.md` marker `NuGet unlist/deprecate/account-recovery authority: unverified`. That marker describes the pre-TASK-0202 state and must be retained as historical evidence while TASK-0202 remains the superseding closure record for `RB-008`. The publish job was skipped again, and no NuGet package, tag, GitHub Release, attestation, or release asset was created.

Third TASK-0206 dispatch result: release workflow run `27869894026` failed before pack/publish in `validate exact package`, step `Run release gates`. The first two blocker remediations held, but hosted Windows reproduced the known unreadable-directory stderr warning from `git status --short` in `scripts/check-config-generated-conventions.ps1`; because the release step runs with native command stderr treated as failure, this stopped the gate even though Git exits `0`. The publish job was skipped, and no NuGet package, tag, GitHub Release, attestation, or release asset was created. A script hardening change under `scripts/**` is now required; this is package/source-impacting for release governance, so the next candidate SHA requires fresh hosted RC evidence before another publish dispatch.

TASK-0206 source-impacting remediation and refreshed RC evidence:
- remediation commit: `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f` (`scripts: harden release gate git status checks`);
- local validation after remediation: `dotnet restore`, `dotnet build -c Release --no-restore`, `dotnet test -c Release --no-build` (`428/428`), raw porcelain, Markdown completeness guard, `git diff --check`, and the full release workflow `Run release gates` command set under PowerShell 7 with native stderr failure semantics all passed;
- hosted RC run: `27870246504`, `https://github.com/Cynrath/agent-context-kit/actions/runs/27870246504`;
- result: `success`;
- matrix: `windows-2025` job `82480881678`, `ubuntu-latest` job `82480881695`, and `macos-latest` job `82480881666` all succeeded;
- source candidate package: `0.2.0-alpha.3.ci.27870246504`;
- annotations: xUnit analyzer warnings only, non-blocking.

TASK-0206 publish decision now uses refreshed RC evidence commit `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f` as the package/source baseline. Any later publish SHA must be a docs/handoff/governance-only successor to that refreshed evidence commit, or publication must stop for a new hosted RC run.

## Actions Not Performed
- no manual tag creation outside `release.yml`;
- no manual GitHub Release creation outside `release.yml`;
- no manual NuGet package upload outside `release.yml`;
- no repository secret creation or API-key publication path;
- no existing tag/package mutation or asset replacement;
- no security advisory creation;
- no branch ruleset mutation;
- no owner removal, account/recovery mutation, or destructive NuGet action.

## Next Required Task
Post-publish follow-up:
1. harden the `release.yml` provenance/idempotency probe so a missing attestation records `exists=false` and lets `actions/attest@v4` run;
2. update published-package smoke workflow/docs to `0.2.0-alpha.3` only in a separate docs/workflow task;
3. keep successor-release policy for any package or release-asset correction.

Immutable release rules remain in force: never reuse a NuGet version, move an existing tag, force push, or replace published artifacts.
