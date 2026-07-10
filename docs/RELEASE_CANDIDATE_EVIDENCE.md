# Release Candidate Evidence

## Status
Local evidence preparation includes TASK-0084 through TASK-0096 baseline/config hardening, machine-readable contract assets, localization parity gates, security/supply-chain decisions, and the conditional contract freeze. TASK-0239 selected exact candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`; TASK-0240 hosted run `29118452246` passed. This document does not publish the candidate or claim 1.0 GA.

The hosted tuple is `commit_sha=548b6affd0da25cb379ec1b153b1064fd5ff6f0b`, `candidate_version=1.0.0-rc.1`, and `predecessor_version=0.2.0-alpha.4`. It passed Windows, Ubuntu, and macOS after exactly one manual dispatch. Publication authorized: No.

## Local Evidence Matrix
| Area | Local Evidence | Status | Remaining Blocker |
| --- | --- | --- | --- |
| Baseline policy | schema/fingerprint fixtures, explicit update, integrity checks, new/existing CI tests, JSON/SARIF/report/Web UI parity; exact candidate run `29118452246` passed with baseline entry count 0 on three OS | CLOSED_BY_TASK_0241 | Reopen after candidate-impacting baseline-policy change |
| Config compatibility | exact alpha4 generated/frozen fixture, hosted regeneration comparison, read-only `config-check`, no-auto-migration, and unchanged SHA-256 on three OS | HOSTED_PREDECESSOR_CONFIG_EVIDENCE_PASS / CLOSED_BY_TASK_0241 | Exact candidate/predecessor tuple only |
| CLI/JSON/SARIF | contract tests, additive schema rules, exit-code parity, candidate-bound freeze, schemas/golden fixtures, direct hosted gates, and SARIF parse | FINAL_MACHINE_CONTRACT_ACCEPTED / CLOSED_BY_TASK_0241 | Reopen after machine-contract change |
| Performance | local interruption/unreadable-file proof plus hosted mixed corpus: Windows 1.019s/45.1 MiB, Ubuntu 0.910s/59.9 MiB, macOS 0.696s/53.8 MiB | FINAL_RC_HOSTED_RESOURCE_EVIDENCE_PASS / CLOSED_BY_TASK_0241 | Maintain as tripwire, not SLA |
| Security response | private reporting enabled; `Cynrath` primary and `ShadowFlameC` backup; coverage, non-public data rule, latest-pre-release fix scope, and non-SLA targets freshly reviewed by TASK-0232 | V100-06 CLOSED | recheck after owner/channel/support-policy change |
| Runtime support | .NET 10 policy plus exact candidate success on Windows, Ubuntu/Linux, and macOS; latest-pre-release fix scope and unsupported surfaces recorded | FINAL_RC_CROSS_PLATFORM_CONFIRMATION_PASS / CLOSED_BY_TASK_0241 | Reopen after support-policy change |
| Supply chain | OIDC/immutability/alignment/inspection/digest/signature/asset/upgrade/recovery baseline; recovery ownership reconciled; signing/SBOM accepted risks recorded | Maintainer decision recorded | hosted provenance on next authorized publish path |
| Migration/localization | alpha4-to-RC upgrade/rollback guide, exact fixture, read-only diagnostics, no-auto-migration policy, 13-command EN/TR human/error/JSON parity matrix; hosted gates passed on three OS | FINAL_LOCALIZATION_CONTRACT_ACCEPTED / CLOSED_BY_TASK_0241 | Reopen after localization/contract change |

## TASK-0240 Hosted Result

Run [`29118452246`](https://github.com/Cynrath/agent-context-kit/actions/runs/29118452246) completed on 2026-07-10 for exact candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`. Windows job `86447580477`, Ubuntu job `86447580502`, and macOS job `86447580508` all succeeded with 0 build warnings/errors and 431/431 tests.

Every job installed predecessor `0.2.0-alpha.4` and run-unique candidate `1.0.0-rc.1.ci.29118452246`. Exact predecessor fixture match, config `valid`, migration `False`, before/after config SHA-256 `0868078DFFF7DF6FA095D741F3EFA3AC52EEEAA6565CB9E3BACDE63C12579D2A`, baseline PASS/count 0, frozen CLI/config/JSON/localization gates, SARIF parse, hash immutability, and final scan passed. Resource results stayed below 30 seconds and 512 MiB on all runners.

Artifact upload and SARIF upload were disabled. The workflow was read-only and performed no NuGet, tag, GitHub Release, release workflow, or provenance publication. Status: `HOSTED_RC_EVIDENCE_PASS / EXACT_CANDIDATE_SHA_VERIFIED / PUBLICATION_NOT_AUTHORIZED`.

## Local Commands
```powershell
dotnet restore AgentContextKit.sln
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build
powershell -ExecutionPolicy Bypass -File scripts/measure-scan-performance.ps1 -FileCount 2000 -MaxSeconds 30 -FailOnThreshold
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-evidence.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-workflow.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-json-contract-assets.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-security-supply-chain-evidence.ps1 -RunDependencyReview -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-published-supply-chain-status.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-rc-local-readiness.ps1 -RunDependencyReview -FailOnIssues
```

## Dated Local Result
Local evidence recorded on 2026-06-12:
- Published-config and baseline-schema fixture tests passed: 2/2.
- The final disposable 2,000-file scan benchmark rerun completed in 2.936 seconds against a 30-second tripwire.
- NuGet vulnerability review reported no vulnerable direct or transitive packages.
- The initial NuGet deprecation review reported `xunit` `2.9.3` as Legacy. TASK-0091 migrated the executable test project to `xunit.v3` `3.2.2` and `xunit.runner.visualstudio` `3.1.5` using the official xUnit v3 migration requirements.
- Disposable migration smoke and the repository suite both passed 169/169 tests; the post-migration vulnerability and deprecation reviews reported no findings.
- Local Windows reproduction of the manual RC workflow steps passed isolated predecessor/source installs, config immutability, `config-check`, baseline, SARIF parse, and final scan.
- TASK-0092 reconciled the CLI, exit-code, config schema `1`, JSON schema `2`, baseline schema `1`, SARIF `2.1.0`, generated-file, privacy, and upgrade contracts into a conditional local freeze.
- TASK-0093 added machine-readable schemas/golden fixtures and TASK-0094 added English/Turkish human/error/exit/JSON semantic parity tests plus a local release gate.
- TASK-0095 added the security/supply-chain evidence register, maintainer procedure, explicit pending/verified vocabulary, and a local evidence-structure gate. Remote/security credential actions remain pending.
- TASK-0096 adds `docs/RC_LOCAL_READINESS.md` and a read-only orchestration gate that reports `LOCAL READY / REMOTE NO-GO`; it does not close hosted, security-setting, supply-chain, version, or approval blockers.
- TASK-0128 records successful standard 8/8 validation and dedicated RC run `27478635057` for exact commit `4c4fa64ff34287dff01818d52f49b521efb3176d`. Predecessor/config/baseline/SARIF/performance hosted evidence is complete for this reviewed alpha.2 state.
- TASK-0099 records the exact published package/release state: valid NuGet.org repository signature, no observed author signature, no package/release SBOM, no accessible GitHub package attestation, and a NuGet owner profile differing from the project persona.
- TASK-0233 expands the local performance/resource evidence: the 2,000-file mixed corpus completed in 5.185 seconds with 44.6 MiB observed peak working set; interruption left no generated output or source mutation; focused unreadable-file/script tests passed 2/2. This is a regression tripwire, not an SLA.

The former xUnit test-tooling warning is resolved locally. Remaining supply-chain decisions are signing, SBOM, provenance, recovery policy, and release-date revalidation.

## Maintainer-Only Evidence
- Recheck private vulnerability reporting and primary/backup coverage after any relevant owner/channel change.
- Rerun green Windows/Ubuntu/macOS CI, source-package smoke, baseline upgrade smoke, and benchmark evidence for any different final candidate commit.
- Recheck the bounded signing/SBOM dispositions by expiry; obtain hosted provenance on the next authorized publish path; keep recovery ownership current.
- Candidate `1.0.0-rc.1` is selected; create a tag/GitHub pre-release or publish NuGet only in a separately authorized TASK-0242.
- Record dependency vulnerability/deprecation review with the release date.
- Complete TASK-0241 exact-candidate acceptance and approve `docs/MAINTAINER_RC_DECISION.md`; publication remains separately unauthorized.

The executed tuple and hosted result are in `docs/RC_HOSTED_EVIDENCE.md`. Current status: `HOSTED_RC_EVIDENCE_PASS / EXACT_CANDIDATE_SHA_VERIFIED / FINAL_CANDIDATE_ACCEPTED_BY_TASK_0241 / CONDITIONAL_GO / PUBLICATION_NOT_AUTHORIZED`.

## TASK-0238 Final Safe/Local Audit

On 2026-07-10 the single complete goal-defined local suite passed: ACKit `0.2.0-alpha.4`, doctor 13/13, scan exit 0, Release build with 0 warnings/0 errors, 430/430 tests, pre/post-test Windows Unicode temp guards, all required V100/CLI/config/JSON/localization/RC gates, Markdown completeness/links, clean diff, and no tracked `.ackit/` output. The RC-gate benchmark passed at 5.432 seconds and 44.8 MiB; the required standalone benchmark passed at 4.620 seconds and 44.5 MiB against 30-second/512-MiB thresholds. This closes the safe/local evidence chain only; it does not close final-candidate or hosted gaps.

## Decision Rule
Do not call the project 1.0 RC-ready while any P0 gap in `docs/V100_GAP_ANALYSIS.md` remains open. P1 gaps require completion or an explicit dated maintainer risk acceptance before 1.0 GA.

Publication authorized: No. Even a successful hosted run and TASK-0241 conditional acceptance stop at `PUBLISH AUTHORIZATION REQUIRED`.
