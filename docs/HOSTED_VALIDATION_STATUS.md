# Hosted Validation Status

## V100 Final-Candidate Hosted Input — Prepared, Not Run

TASK-0236 prepares the next manual `release-candidate-evidence.yml` tuple without dispatching it:

- dispatch-time commit: final pushed `origin/master`, equal to local `HEAD`;
- current source metadata: `0.2.0-alpha.4`;
- predecessor: published immutable `0.2.0-alpha.3`;
- source-impacting local evidence base: `b1604ae1e73017521d28e5a83f328bb1347406b6`;
- state: `HOSTED_INPUT_PREPARED / NOT_DISPATCHED / OPEN_PENDING_MANUAL_WORKFLOW_DISPATCH`.

No V100 final-candidate run ID or hosted result exists yet. Historical results below remain valid only for their exact commits and must not be relabeled as final-candidate evidence.

TASK-0206 completed `0.2.0-alpha.3` publication after refreshed hosted RC evidence. NuGet package verification, global tool install smoke, tag `v0.2.0-alpha.3`, and GitHub prerelease `v0.2.0-alpha.3` are complete. The alpha.2 recovery, supply-chain, and hosted RC hardening evidence below remains historical for that release.

## Current Alpha.3 Publication Evidence
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
