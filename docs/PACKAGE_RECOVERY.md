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

## TASK-0232 V100 Reconciliation

Review date: 2026-07-10. The current recovery decision remains: `Cynrath` is decision owner, `Cyranth` is the primary NuGet/package owner identity, and `ShadowFlameC` is the backup package recovery owner. The V100-09 baseline requires immutable versions, no package replacement or tag movement, verified commit/tag/release/package alignment, digests, repository-signature and release-asset checks, upgrade/rollback evidence, and a fixed successor for recovery. No destructive action was executed for this review.

## TASK-0201 Closure Preflight

2026-06-20 TASK-0201 preflight result: `RB-008` remained open/partial before TASK-0202 maintainer evidence.

Historical gate marker retained for release automation: `NuGet unlist/deprecate/account-recovery authority: unverified` described the pre-TASK-0202 state. TASK-0202 superseded this state for planned `0.2.0-alpha.3` release-preparation entry by recording `ShadowFlameC` as current NuGet package owner and backup package recovery owner. Destructive NuGet actions are still not executed solely for release evidence.

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

## TASK-0243 Exact Existing-Package Recovery Path

TASK-0242 created a distinct partial state: NuGet `1.0.0-rc.1` is immutable and repository-signed at commit `258918b33c3d1359aac967604ee524e8b66ddf02`, while its tag, GitHub prerelease/assets, and provenance are absent. This is not a bad-package replacement scenario and does not authorize unlist, deprecation, republish, or successor-version substitution.

TASK-0243 adds a bounded `recover-existing` operation to the manual release workflow. It accepts only the prior validated workflow artifact, exact artifact/file hashes, the existing repository-signed NuGet package, the exact package commit, and an absent tag/release precondition. It contains no NuGet credential or push path. If authorized execution succeeds, it creates the non-force exact tag, prepared prerelease with only the verified nupkg/snupkg, separate attestations for both assets, and Windows/Ubuntu/macOS installed-tool evidence.

Any partial recovery failure triggers the same immutability rule: no second automatic dispatch, no asset replacement, no tag movement, and no manual upload. Audit the remote state once, preserve TASK-0242 and the recovery task as separate evidence, then require a new explicit decision.

## TASK-0246–0248 Authorized Continuation

TASK-0244 run `29151228607` failed before mutation because the supply-chain test started a Windows-only `powershell` child on Ubuntu. TASK-0246 changes only that test host to resolved PowerShell 7 (`pwsh`), adds three-platform execution, and strengthens the pre-mutation ordering regression. It does not dispatch recovery or modify any package, tag, release, asset, or attestation.

After TASK-0246 was pushed and all standard CI was green, TASK-0247 dispatched `recover-existing` exactly once for version `1.0.0-rc.1`, release commit `258918b33c3d1359aac967604ee524e8b66ddf02`, tag `v1.0.0-rc.1`, and the exact retained TASK-0242 nupkg/snupkg evidence. NuGet login/push/change/unlist/replace remained forbidden. The partial TASK-0247 failure received one log inspection and one immutable-state audit, then stopped without rerun.

TASK-0248 is success-only follow-up. The published smoke pin, current-release documentation, and V100-09 may change only if the exact tag, prepared prerelease, two exact release assets, two verified attestations, and Windows/Ubuntu/macOS installed-tool smoke all succeed. Neither this chain nor successful RC recovery claims 1.0 GA readiness.

TASK-0247 run `29182188201` stopped before mutation after exact artifact/package/signature/install validation and the expected absent-release probe. Its failed log and immutable remote state were each inspected once: package/artifact evidence remained valid and tag/release/two attestations remained absent. The dispatch is consumed; TASK-0248 success-only work did not run.

## TASK-0249–0251 Authorized Recovery Closure

TASK-0249 separately corrects the TASK-0247 expected-404 exit-state defect. The shared `scripts/github-release-state.ps1` helper is used by both recovery release-absence checkpoints, accepts only a verified HTTP 404, clears only that accepted native failure state, and throws for an existing release, authentication/permission/rate-limit/server responses, malformed output, or network/unknown failures. Network-free fixtures run through the Windows/Ubuntu/macOS source-smoke matrix before any new dispatch.

Only after TASK-0249 standard CI is fully green may TASK-0250 perform one new exact-existing-package recovery dispatch. The immutable source run/artifact/digest/package hashes/release commit must pass one preflight; NuGet publication remains impossible and forbidden. A remote failure consumes that dispatch and requires one log read, one immutable-state audit, documentation, and a safe stop without rerun or manual completion.

TASK-0251 is success-only. It may pin published smoke to `1.0.0-rc.1`, synchronize public/recovery/provenance evidence, and close V100-09 only after the exact tag, prepared prerelease, exact nupkg/snupkg assets and hashes, both verified attestations, and Windows/Ubuntu/macOS installed-tool smoke all pass. TASK-0242, TASK-0244, and TASK-0247 remain separate immutable failure records, and no recovery outcome is a 1.0 GA claim.

TASK-0249 subsequently passed its full local and three-workflow hosted gates. TASK-0250 run `29341087462` passed all pre-mutation checks but its GitHub App token tag push was rejected for missing `workflows` permission. The rejection left remote state unchanged; one audit confirmed the tag, prerelease/assets, and two attestations absent. The single TASK-0250 dispatch is consumed. Do not change repository settings, fix/retry/rerun/redispatch, create the tag manually, upload assets manually, or execute TASK-0251.

## TASK-0252–0254 Existing Exact-Tag Closure

After TASK-0250 stopped, the authenticated repository owner separately created immutable tag `v1.0.0-rc.1` at exact release commit `258918b33c3d1359aac967604ee524e8b66ddf02`. This owner action is existing state for the new chain; TASK-0252 must not recreate, push, move, delete, or otherwise mutate the tag.

TASK-0252 adapts `recover-existing` to fetch and resolve the exact existing tag twice, fail on missing/wrong-target state, prove the GitHub Release/assets and both candidate-digest attestations absent twice, and create only the prepared prerelease with `gh release create --verify-tag --target <exact-release-commit>`. Static and network-free fixtures prohibit tag commands/ref API writes and prove the positive/missing/wrong-tag plus unexpected release/asset/attestation contracts on all three source-smoke operating systems.

TASK-0253 was authorized to run exactly one NuGet-publish-free recovery dispatch only after TASK-0252 exact-HEAD standard CI was green. Any remote failure consumed that authorization and required one log read, one remote audit, factual documentation, and safe stop without rerun or manual completion. TASK-0254 was success-only and could update the published smoke pin/public evidence/V100-09 only after the prerelease, exact two assets, both verified attestations, and Windows/Ubuntu/macOS installed-tool recovery jobs all passed.

TASK-0252 passed exact-HEAD standard CI. TASK-0253 run `29345313517` passed its safety, source artifact, repository-signed NuGet package, content, exact tag, and absence gates, then `gh release create` returned HTTP 403. One failed-log read and one audit confirmed the package/artifact/tag unchanged while prerelease/assets/two attestations remained absent; the recovery matrix was skipped. The one dispatch is consumed, NuGet publish count is zero, and TASK-0254 was not executed. Do not rerun, redispatch, fix-and-retry, complete manually, change settings, or mutate the exact tag.

## TASK-0255–0257 Fully Authorized Exact-Release Closure

New full authorization supersedes only the obsolete recovery retry boundaries; all historical failures remain evidence. TASK-0255 reverified the frozen source/package/tag tuple and used the authenticated repository owner identity to create exact prerelease `353913024` once with the prepared body and only retained nupkg/snupkg assets. API digests, sizes, and downloaded hashes passed; NuGet and the tag remained unchanged.

TASK-0256 adds a separate `attest-existing` operation. It cannot publish NuGet, mutate the tag, or create/edit/upload/delete the existing release. Exact tag/release/body/assets and NuGet equivalence must pass before OIDC attestation; both exact subjects must pass signer-workflow verification; the release is rechecked afterward; and Windows/Ubuntu/macOS must install and smoke the published version. TASK-0257 may update public guidance and close V100-09 only after all hosted evidence passes. This release-candidate closure is not a `1.0.0` GA claim.

Corrected TASK-0256 run `29350091782` satisfied every gate, created and verified nupkg/snupkg attestations `35295200`/`35295205`, and passed installed-package jobs `87144074850`/`87144074884`/`87144074933`. TASK-0257 consequently updates public guidance and closes V100-09. NuGet, exact tag, release body, and exact assets remain immutable; the earlier failed recovery attempts remain separate historical records.
