# Hosted Validation Status

## TASK-0255 Authenticated Release Completion — PASS

Local authenticated account `Cynrath` with repository `ADMIN` permission completed exact GitHub prerelease `353913024` after TASK-0253's GitHub Actions integration token received HTTP 403 despite declared Contents write. URL: `https://github.com/Cynrath/agent-context-kit/releases/tag/v1.0.0-rc.1`. Exact tag/target/title/body/prerelease state and only nupkg/snupkg asset IDs `476881883`/`476881892` passed size, API digest, and downloaded SHA-256 verification. TASK-0256 hosted attestation and three-platform evidence remain pending.

TASK-0256 now has a locally green `attest-existing` implementation: exact release/body/assets and repository-signed NuGet equivalence precede two conditional attestations; both CLI verifications and final immutable recheck are mandatory; a dependent Windows/Ubuntu/macOS installed-package matrix follows. Local validation passed 431/431 tests, all focused/static gates, YAML parsing, ACKit, and Unicode 0/0. Hosted standard CI and manual attestation execution remain pending.

Implementation commit `0a9abd04cc515c049d60a7cbbcc2d446a355fb15` passed standard runs `29349381415`, `29349381490`, and `29349381465`. First attestation run `29349599514`, job `87142124518`, passed safety and exact release/package verification but returned exit 1 after a correctly recognized absent-attestation HTTP 404 because native `$LASTEXITCODE` was not reset. Attestation creation/verification/final recheck and matrix `87142353303` were skipped. One audit confirmed both attestations absent and the exact tag unchanged. The correction resets native exit state only for the verified 404 and adds a static regression; no identical retry occurs before validation/push.

Correction commit `83ab0a5c125fe25ec61dbd09026825e3cba18738` passed standard runs `29349905919`, `29349906036`, and `29349905891`. Corrected release run `29350091782` passed. Job `87143810767` verified exact tag/release/body/assets and repository-signed NuGet equivalence, created nupkg attestation `35295200` and snupkg attestation `35295205`, verified both against signer workflow `Cynrath/agent-context-kit/.github/workflows/release.yml`, and reverified immutable release state. Installed-package smoke passed on Ubuntu `87144074850`, Windows `87144074884`, and macOS `87144074933`. Two dispatches total; zero NuGet publish, tag mutation, or release/body/asset mutation.

## TASK-0252 Standard CI — PASS

TASK-0252 implementation commit `5f6c4ce2d0ab9745207196e6b01371653adfe009` passed `ci` run `29344903472`, published alpha4 `cross-platform-smoke` run `29344903420`, and `cross-platform-source-smoke` run `29344903850`. Source-smoke jobs `87125920260` (Windows), `87125920328` (Ubuntu), and `87125920330` (macOS) exercised the exact-existing-tag state fixtures and recovery static gates.

## TASK-0253 Recovery Run — Release Create 403 / Hard Stop

Exactly one `recover-existing` dispatch returned run [`29345313517`](https://github.com/Cynrath/agent-context-kit/actions/runs/29345313517), recovery job `87127346868`. Safety, exact source artifact/package/signature/content/install validation, and repeated exact tag/release/asset/attestation checks passed. `Create GitHub prerelease from verified exact existing tag` then failed because `gh release create` returned `HTTP 403: Resource not accessible by integration` for the releases endpoint.

Release verification, both attestation steps, completed-recovery verification, and the recovery matrix were skipped; matrix placeholder job `87127568071` is skipped. The failed log was read once and one immutable audit confirmed source artifact/NuGet/exact tag unchanged, prerelease/assets absent, and both attestations absent. State: `TASK_0253_DISPATCH_CONSUMED / RELEASE_CREATE_403 / REMOTE_STATE_UNCHANGED / NO_RERUN`.

## TASK-0249 Standard CI — PASS

TASK-0249 implementation commit `ca4b46967d18c03c8f39a5bf8e2dacb5745d249e` passed `ci` run `29340782994`, published alpha4 `cross-platform-smoke` run `29340783184`, and `cross-platform-source-smoke` run `29340782999`. The source-smoke run executed the expected-404 success/fail-closed fixtures on Windows, Ubuntu, and macOS.

## TASK-0250 Recovery Run — Tag Push Rejected / Hard Stop

The exact immutable preflight passed, then exactly one `recover-existing` dispatch returned run [`29341087462`](https://github.com/Cynrath/agent-context-kit/actions/runs/29341087462), job `87112724358`. Safety, exact source artifact/package/signature/content/install validation, and repeated remote-state absence checks passed. `git push origin refs/tags/v1.0.0-rc.1` was then rejected because the GitHub App token lacked `workflows` permission to create a ref targeting a commit that contains `.github/workflows/cross-platform-source-smoke.yml`.

The failed log was read once. `gh release create` did not run; release verification, both attestations, completed-recovery verification, and all three recovered-package matrix jobs were skipped. One immutable-state audit confirmed source artifact and NuGet unchanged, remote tag absent, GitHub prerelease/assets absent, and both attestations absent. State: `TASK_0250_DISPATCH_CONSUMED / TAG_PUSH_REJECTED / REMOTE_STATE_UNCHANGED / NO_RERUN`.

## TASK-0242 Release Run — Partial Failure / Hard Stop

Release run [`29131335084`](https://github.com/Cynrath/agent-context-kit/actions/runs/29131335084) targeted exact HEAD `258918b33c3d1359aac967604ee524e8b66ddf02`. Validate job `86487127197` passed. Publish job `86487525013` completed OIDC login and NuGet publish, then failed because the package did not become available to its verification runner inside the bounded retry window. Tag, GitHub prerelease, provenance, and attestation steps were skipped. One-time follow-up verified NuGet availability/signature/repository commit and global install, while tag/release/attestation remained absent. User-required hard stop applies; no recovery or second dispatch occurred.

TASK-0243/0244/0245 recovery authorization was recorded separately on 2026-07-11. TASK-0243 implemented and validated the NuGet-publish-free path before TASK-0244 consumed its single recovery dispatch. The resulting failure is recorded below without changing the TASK-0242 record above.

## TASK-0244 Recovery Run — Pre-Mutation Failure / Hard Stop

TASK-0243 automation commit `3b979972ba24b6acd4f0eecca49ff3dcc2c8cdff` passed pre-recovery standard runs `29151153458`, `29151153453`, and `29151153454`. The single authorized recovery dispatch then created run [`29151228607`](https://github.com/Cynrath/agent-context-kit/actions/runs/29151228607), job `86540942756`.

The job failed in `Run exact recovery safety gates`. Exact-package fixtures and the release workflow static gate passed; `scripts/test-supply-chain-workflow.ps1` then called Windows-only `powershell` from Ubuntu and exited before source-artifact validation. Every tag/release/asset/attestation/completed-recovery step was skipped, and the three-platform recovered-package matrix was skipped. Normal `publish` and `verify-existing` jobs were also skipped.

The failed log was inspected once. One immutable-state audit confirmed artifact/package hashes and repository signature/commit unchanged, and remote tag, GitHub prerelease/assets, nupkg attestation, and snupkg attestation absent. No second dispatch, rerun, automatic correction, or remote mutation occurred. State: `RECOVERY_DISPATCH_CONSUMED / PRE_MUTATION_FAILURE / REMOTE_STATE_UNCHANGED / NEW_DECISION_REQUIRED`.

## TASK-0246 Cross-Platform Fix — Standard CI PASS

TASK-0246 planning commit `926fc03` and implementation commit `b815c44f81dbaa7d2a9556db05403aee4368f7c0` were pushed normally. Standard runs were discovered once and watched once each:

| Workflow | Run | Result | Relevant evidence |
| --- | ---: | --- | --- |
| `ci` | [`29182095416`](https://github.com/Cynrath/agent-context-kit/actions/runs/29182095416) | PASS | Ubuntu and Windows build/test/scan |
| `cross-platform-smoke` | [`29182095415`](https://github.com/Cynrath/agent-context-kit/actions/runs/29182095415) | PASS | Published alpha4 package smoke unchanged |
| `cross-platform-source-smoke` | [`29182095423`](https://github.com/Cynrath/agent-context-kit/actions/runs/29182095423) | PASS | New `pwsh` recovery safety/static/negative fixtures on Windows, Ubuntu, and macOS |

No release workflow dispatch or release/package mutation occurred in TASK-0246.

## TASK-0247 Recovery Run — Pre-Mutation Failure / Hard Stop

The single preflight passed and exactly one new `recover-existing` dispatch was accepted for automation commit `b815c44f81dbaa7d2a9556db05403aee4368f7c0`. The dispatch response identified run [`29182188201`](https://github.com/Cynrath/agent-context-kit/actions/runs/29182188201). One list/discovery response failed its bounded client-time filter; the direct dispatch run ID was used without a second discovery query, and one blocking watch observed the final failure.

Job `recover exact existing package` passed `Run exact recovery safety gates`. In `Validate exact source artifact and existing NuGet package`, the run verified source artifact `8242162439`, exact nupkg/snupkg hashes, NuGet repository signature/content equivalence/repository commit, and Linux global install/smoke. The step then returned exit 1 after the expected absent-release API probe and before `Recheck exact remote recovery state` or any mutation step. The trace is consistent with the handled 404 leaving native exit code 1 as final process status; this is diagnosis only and was not corrected.

The failed log was read once. One immutable-state audit confirmed the source artifact and NuGet package remained valid, while tag `v1.0.0-rc.1`, GitHub prerelease/assets, nupkg attestation, and snupkg attestation remained absent. Tag/release/attestation creation and all three recovered-package matrix jobs were skipped. State: `TASK-0247_DISPATCH_CONSUMED / PRE_MUTATION_FAILURE / REMOTE_STATE_UNCHANGED / NO_RERUN`.

## V100 `1.0.0-rc.1` Hosted Evidence — PASS

TASK-0240 dispatched `release-candidate-evidence.yml` exactly once. Run [`29118452246`](https://github.com/Cynrath/agent-context-kit/actions/runs/29118452246) completed successfully for `master`, event `workflow_dispatch`, exact candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`, candidate `1.0.0-rc.1`, predecessor `0.2.0-alpha.4`, and run-unique package `1.0.0-rc.1.ci.29118452246`.

| Runner | Job | Build/tests | Resource tripwire | Result |
| --- | ---: | --- | --- | --- |
| `windows-2025` | `86447580477` | 0 warnings/errors; 431/431 | 1.019s / 45.1 MiB | SUCCESS |
| `ubuntu-latest` | `86447580502` | 0 warnings/errors; 431/431 | 0.910s / 59.9 MiB | SUCCESS |
| `macos-latest` | `86447580508` | 0 warnings/errors; 431/431 | 0.696s / 53.8 MiB | SUCCESS |

Exact predecessor install/config fixture comparison, candidate install, valid/no-migration config-check, unchanged config hash, baseline, CLI/config/JSON/localization contract gates, SARIF parse, final scan, and 30-second/512-MiB resource thresholds passed on all runners. Artifact and SARIF uploads were disabled. No package, tag, release, release-workflow, or provenance publication occurred.

State: `HOSTED_RC_EVIDENCE_PASS / EXACT_CANDIDATE_SHA_VERIFIED / FINAL_CANDIDATE_ACCEPTED_BY_TASK_0241 / TASK_0242_PARTIAL_IMMUTABLE_PUBLICATION`. Historical results below remain valid only for their exact commits.

## Historical Published-Release Evidence

TASK-0206 completed `0.2.0-alpha.3` publication after refreshed hosted RC evidence. NuGet package verification, global tool install smoke, tag `v0.2.0-alpha.3`, and GitHub prerelease `v0.2.0-alpha.3` are complete. The alpha.3 and alpha.2 recovery, supply-chain, and hosted RC hardening evidence below remains historical and exact-commit scoped.

## Historical Alpha.3 Publication Evidence
- Final publish SHA: `92984c6448332aa24b7cff94647f627bf944e535`.
- Refreshed hosted RC run: `27870246504` for commit `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`.
- NuGet package: `AgentContextKit` `0.2.0-alpha.3` verified.
- Global tool install smoke: passed; `ackit version` returned `AgentContextKit 0.2.0-alpha.3`.
- TASK-0208 follow-up: release provenance probe hardening is complete locally for future releases; no alpha.3 package/tag/release mutation occurred.

## Historical Alpha.2 Commit
- Branch: `master`
- Commit: `4c4fa64ff34287dff01818d52f49b521efb3176d`
- Local/remote state observed on 2026-06-13: `master` equals `origin/master`.
- Commit title: `fix: make hosted performance evidence cross-platform`

## Successful Standard Workflows
The following public GitHub Actions runs completed successfully on 2026-06-13 for the exact commit above.

| Workflow | Run | Hosted Scope | Result |
| --- | --- | --- | --- |
| `ci` | [27478583268](https://github.com/Cynrath/agent-context-kit/actions/runs/27478583268) | Restore, build, test, and self-scan on `windows-2025` and `ubuntu-latest` | SUCCESS |
| `cross-platform-smoke` | [27478583266](https://github.com/Cynrath/agent-context-kit/actions/runs/27478583266) | Published `AgentContextKit` `0.2.0-alpha.2` smoke on Windows, Ubuntu, and macOS | SUCCESS |
| `cross-platform-source-smoke` | [27478583272](https://github.com/Cynrath/agent-context-kit/actions/runs/27478583272) | Source restore/build/test, local alpha.2 package install, and smoke on Windows, Ubuntu, and macOS | SUCCESS |

## Evidence Value
These runs verify that:
- the current commit restores, builds, tests, and self-scans on hosted Windows and Ubuntu runners;
- the published package remains installable and usable on Windows, Ubuntu, and macOS;
- the current source package builds, installs, and completes its source smoke flow on Windows, Ubuntu, and macOS.

This evidence strengthens runtime/platform and package portability confidence.

## Dedicated RC Evidence
Run [27478635057](https://github.com/Cynrath/agent-context-kit/actions/runs/27478635057) completed successfully on 2026-06-13 for exact commit `4c4fa64ff34287dff01818d52f49b521efb3176d`.

| Runner | Result | 2,000-file benchmark |
| --- | --- | --- |
| `windows-2025` | SUCCESS | 1.265 seconds |
| `ubuntu-latest` | SUCCESS | 0.957 seconds |
| `macos-latest` | SUCCESS | 0.684 seconds |

The run verified isolated predecessor `0.2.0-alpha.1` installation, current-source candidate `0.2.0-alpha.2.ci.27478635057`, predecessor config hash immutability, `config-check`, baseline create/load/classification, baseline-aware SARIF parsing, final clean scan, and the unchanged 30-second performance tripwire. No artifact or SARIF upload occurred.

`docs/MAINTAINER_RC_DECISION.md` remains **NO-GO for release-candidate publication** because private reporting, security/recovery ownership, NuGet identity, signing/SBOM/provenance, final version scope, and candidate approval remain unresolved. A future final candidate must rerun this exact-SHA workflow.

## Remote Boundary
The workflow dispatch created only an Actions run record. The evidence job used `contents: read`, did not edit settings, upload artifacts/SARIF, push, tag, create releases, or publish packages.
