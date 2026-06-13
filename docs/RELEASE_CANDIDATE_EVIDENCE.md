# Release Candidate Evidence

## Status
Local evidence preparation includes TASK-0084 through TASK-0096 baseline/config hardening, dependency cleanup, the manual hosted evidence workflow design, machine-readable contract assets, localization parity gates, a security/supply-chain maintainer evidence handoff, a consolidated local-readiness gate, and a conditional local contract freeze. This document does not approve a release candidate or 1.0 GA.

## Local Evidence Matrix
| Area | Local Evidence | Status | Remaining Blocker |
| --- | --- | --- | --- |
| Baseline policy | schema/fingerprint fixtures, explicit update, integrity checks, new/existing CI tests, JSON/SARIF/report/Web UI parity, three-OS run `27478635057` | Verified for reviewed alpha.2 state | rerun and sign off for a different final candidate |
| Config compatibility | published `0.2.0-alpha.1` config fixture plus read-only `config-check` human/JSON/exit/privacy contract tests and hosted predecessor smoke | Verified for reviewed alpha.2 state | final candidate sign-off |
| CLI/JSON/SARIF | contract tests, additive schema rules, exit-code parity, conditional local freeze, machine-readable schemas/golden fixtures | Ready locally | final candidate maintainer sign-off |
| Performance | disposable 2,000-file benchmark with unchanged 30-second tripwire; hosted Windows 1.265s, Ubuntu 0.957s, macOS 0.684s | Hosted tripwire verified | memory, cancellation, mixed corpus |
| Security response | policy, Critical regression tests, privacy boundaries, clean dated dependency review, metadata-only maintainer evidence register/handoff | Ready locally | enable and verify private GitHub reporting; record maintainer evidence |
| Runtime support | .NET 10, three-OS standard workflows, and successful dedicated RC run `27478635057` | Verified for reviewed alpha.2 state | final support window and future-candidate rerun |
| Supply chain | exact published package/release audit plus explicit owner alignment, sign/defer, SBOM, provenance, and recovery evidence fields | Published state verified | dated maintainer decisions and any approved remote publication |
| Migration/localization | upgrade/rollback guide, fixtures, read-only config diagnostics, explicit no-auto-migration policy, 13-command EN/TR human/error/JSON parity matrix | Ready locally | hosted evidence and final candidate sign-off |

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

The former xUnit test-tooling warning is resolved locally. Remaining supply-chain decisions are signing, SBOM, provenance, recovery policy, and release-date revalidation.

## Maintainer-Only Evidence
- Enable and verify private vulnerability reporting.
- Rerun green Windows/Ubuntu/macOS CI, source-package smoke, baseline upgrade smoke, and benchmark evidence for any different final candidate commit.
- Decide signing, SBOM, provenance, and package recovery/deprecation policy.
- Select/version a release candidate, create tag/GitHub pre-release, publish NuGet only in a dedicated approved release task.
- Record dependency vulnerability/deprecation review with the release date.
- Complete and approve `docs/MAINTAINER_RC_DECISION.md`; the current decision remains NO-GO for RC publication.

## Decision Rule
Do not call the project 1.0 RC-ready while any P0 gap in `docs/V100_GAP_ANALYSIS.md` remains open. P1 gaps require completion or an explicit dated maintainer risk acceptance before 1.0 GA.
