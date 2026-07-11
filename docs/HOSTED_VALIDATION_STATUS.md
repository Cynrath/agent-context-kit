# Hosted Validation Status

## TASK-0242 Release Run — Partial Failure / Hard Stop

Release run [`29131335084`](https://github.com/Cynrath/agent-context-kit/actions/runs/29131335084) targeted exact HEAD `258918b33c3d1359aac967604ee524e8b66ddf02`. Validate job `86487127197` passed. Publish job `86487525013` completed OIDC login and NuGet publish, then failed because the package did not become available to its verification runner inside the bounded retry window. Tag, GitHub prerelease, provenance, and attestation steps were skipped. One-time follow-up verified NuGet availability/signature/repository commit and global install, while tag/release/attestation remained absent. User-required hard stop applies; no recovery or second dispatch occurred.

TASK-0243/0244/0245 recovery authorization was recorded separately on 2026-07-11. TASK-0243 must implement and validate a NuGet-publish-free path first. TASK-0244 may dispatch that recovery operation exactly once after green pre-recovery CI; its run ID and per-platform evidence will be appended without changing the TASK-0242 record above.

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
