# Release Candidate Hosted Evidence

## Purpose
`.github/workflows/release-candidate-evidence.yml` is a manual-only Windows, Ubuntu, and macOS evidence workflow for a future release-candidate decision. It does not publish or approve a release.

## Current Hosted Status

### V100 `1.0.0-rc.1` Exact Candidate (TASK-0240 — PASS)

The single authorized manual dispatch completed successfully:

| Field | Observed value |
| --- | --- |
| Workflow run | [`29118452246`](https://github.com/Cynrath/agent-context-kit/actions/runs/29118452246) |
| Event / branch | `workflow_dispatch` / `master` |
| Exact candidate SHA | `548b6affd0da25cb379ec1b153b1064fd5ff6f0b` |
| Candidate / predecessor | `1.0.0-rc.1` / `0.2.0-alpha.4` |
| Run-unique source package | `1.0.0-rc.1.ci.29118452246` |
| Created / completed | 2026-07-10 19:34:16Z / 19:35:50Z |
| Manual dispatch count | `1` |
| Artifact upload / SARIF upload | Disabled / disabled |
| Publication | No NuGet package, tag, GitHub Release, release workflow, artifact, SARIF, or provenance publication |

| Runner | Job ID | Build | Tests | Config/contract | Elapsed | Peak working set | Result |
| --- | ---: | --- | --- | --- | ---: | ---: | --- |
| `windows-2025` | `86447580477` | 0 warnings / 0 errors | 431/431; 0 failed; 0 skipped | PASS | 1.019s | 45.1 MiB | SUCCESS |
| `ubuntu-latest` | `86447580502` | 0 warnings / 0 errors | 431/431; 0 failed; 0 skipped | PASS | 0.910s | 59.9 MiB | SUCCESS |
| `macos-latest` | `86447580508` | 0 warnings / 0 errors | 431/431; 0 failed; 0 skipped | PASS | 0.696s | 53.8 MiB | SUCCESS |

Every runner installed published predecessor `AgentContextKit 0.2.0-alpha.4`, built and installed `1.0.0-rc.1.ci.29118452246`, regenerated an exact representative alpha4 config, and passed the sanitized fixture comparison. `config-check` returned `valid`, automatic migration remained `False`, and the before/after raw config SHA-256 was identical at `0868078DFFF7DF6FA095D741F3EFA3AC52EEEAA6565CB9E3BACDE63C12579D2A` on all runners.

Baseline creation/use passed with entry count 0; the frozen CLI/config/JSON/localization gates passed; SARIF parsed; config hash remained unchanged; and the final scan passed. All mixed-corpus runs passed the 30-second and 512-MiB thresholds. TASK-0233's interruption and unreadable-file results remain deterministic local evidence and are not relabeled as hosted cancellation evidence.

The workflow retained `contents: read`, used no publishing credentials, and contained no upload or release operation. Status: `HOSTED_RC_EVIDENCE_PASS / EXACT_CANDIDATE_SHA_VERIFIED / PUBLICATION_NOT_AUTHORIZED`.

TASK-0128 completed the hardened workflow and exact hosted run. Run [27478635057](https://github.com/Cynrath/agent-context-kit/actions/runs/27478635057) passed on Windows, Ubuntu, and macOS for exact commit `4c4fa64ff34287dff01818d52f49b521efb3176d`, predecessor `0.2.0-alpha.1`, and source candidate `0.2.0-alpha.2.ci.27478635057`.

TASK-0205 verified hosted `0.2.0-alpha.3` release-candidate evidence with `gh`. Run [27868539971](https://github.com/Cynrath/agent-context-kit/actions/runs/27868539971) passed on Windows, Ubuntu, and macOS for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801`, predecessor `0.2.0-alpha.2`, and source candidate package `0.2.0-alpha.3.ci.27868539971`.

TASK-0206 refreshed hosted `0.2.0-alpha.3` release-candidate evidence after the release-gate `git status` stderr hardening changed `scripts/**`. Run [27870246504](https://github.com/Cynrath/agent-context-kit/actions/runs/27870246504) passed on Windows, Ubuntu, and macOS for exact commit `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`, predecessor `0.2.0-alpha.2`, and source candidate package `0.2.0-alpha.3.ci.27870246504`. This refreshed tuple supersedes the earlier TASK-0205 tuple for TASK-0206 publish gating only; the earlier tuple remains valid historical evidence for its exact commit.

TASK-0206 published `0.2.0-alpha.3` from final SHA `92984c6448332aa24b7cff94647f627bf944e535`, which was classified as a docs/handoff/governance-only successor to refreshed RC evidence commit `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`. The bridge changed 8 files and 0 package/source-impacting paths. NuGet package `AgentContextKit` `0.2.0-alpha.3`, tag `v0.2.0-alpha.3`, and GitHub prerelease `v0.2.0-alpha.3` now exist and target the final publish SHA.

Alpha.3 hosted evidence tuple:
- workflow: `release-candidate-evidence.yml`
- run ID: `27868539971`
- run URL: `https://github.com/Cynrath/agent-context-kit/actions/runs/27868539971`
- event: `workflow_dispatch`
- branch: `master`
- candidate commit: `beaa14deed3dbc55ac98d216679f9a9799261801`
- candidate version: `0.2.0-alpha.3`
- predecessor version: `0.2.0-alpha.2`
- source candidate package: `0.2.0-alpha.3.ci.27868539971`
- matrix:
  - `windows-2025`: success, job `82476527430`
  - `ubuntu-latest`: success, job `82476527450`
  - `macos-latest`: success, job `82476527416`
- status: hosted RC evidence passed
- release decision: exact-candidate GO for a later publish task only

TASK-0206 refreshed alpha.3 hosted evidence tuple:
- workflow: `release-candidate-evidence.yml`
- run ID: `27870246504`
- run URL: `https://github.com/Cynrath/agent-context-kit/actions/runs/27870246504`
- event: `workflow_dispatch`
- branch: `master`
- candidate commit: `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`
- candidate version: `0.2.0-alpha.3`
- predecessor version: `0.2.0-alpha.2`
- source candidate package: `0.2.0-alpha.3.ci.27870246504`
- matrix:
  - `windows-2025`: success, job `82480881678`
  - `ubuntu-latest`: success, job `82480881695`
  - `macos-latest`: success, job `82480881666`
- status: hosted RC evidence passed
- release decision: refreshed exact-candidate GO for TASK-0206 publish gating, subject to final docs-only publish-SHA bridge classification

Each hosted job completed these expected steps successfully:
- checkout exact commit;
- setup .NET;
- validate exact commit and versions through `scripts/check-release-candidate-inputs.ps1`;
- restore, Release build, and tests;
- install predecessor and source candidate;
- verify predecessor upgrade and baseline policy;
- run the synthetic performance tripwire;
- write evidence summary.

Non-blocking annotations were xUnit analyzer warnings only:
- `xUnit1051` cancellation-token responsiveness warnings in `tests/AgentContextKit.Tests/McpStdioTransportTests.cs`;
- `xUnit2013` collection-size assertion warning in `tests/AgentContextKit.Tests/WatchCommandTests.cs`.

No hosted job failed. Artifact upload and SARIF upload were disabled. The run did not publish a package, create or move a tag, create a GitHub Release, create repository secrets, or mutate release/security settings.

## What It Verifies
- restore, Release build, and the full test suite on each runner;
- selected published predecessor `AgentContextKit` package install in an isolated tool path;
- current source pack/install with a run-unique prerelease package version in a second tool path;
- predecessor config readability and unchanged config content hash;
- current-source `config-check` success for the predecessor fixture;
- current-source baseline create/load/classification behavior;
- baseline-aware SARIF generation and JSON parse;
- final clean scan;
- 2,000-file synthetic performance tripwire within 30 seconds.

## Safety And Permissions
- Trigger: `workflow_dispatch` only.
- Inputs: full `commit_sha`, `candidate_version`, and `predecessor_version`.
- Exact state: checkout and validation require `commit_sha == HEAD == origin/master`.
- Concurrency: one run per exact commit/candidate version.
- Permission: `contents: read` only.
- Repository data: committed source plus sanitized synthetic/upgrade fixtures only.
- Artifact upload: disabled.
- SARIF/Code Scanning upload: disabled.
- Secrets and publishing credentials: not used.

The candidate package receives a run-unique local package version. This prevents the candidate install from being satisfied by the published predecessor package when source and public metadata still share a base version.

## Local Review
```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-workflow.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/test-release-candidate-inputs.ps1
```

This static gate verifies required markers and rejects push/PR triggers, uploads, write permissions, and secret references. It cannot prove hosted runner behavior.

Local Windows reproduction on 2026-06-12 passed the isolated predecessor/source package install, predecessor scan JSON, current-source `config-check`, config hash immutability, baseline scan, SARIF parse, and final scan. The first run exposed fixture self-noise; the sanitized predecessor fixture now ignores only its own non-Critical `.ackit/config.yml` keyword matches while Critical findings remain unsuppressible.

The first hosted attempt, run `27478415124`, exposed a null `$env:TEMP` assumption on Ubuntu and macOS before the benchmark started. The performance script now resolves `TEMP`, `TMPDIR`, `RUNNER_TEMP`, then `.NET`'s platform temp path. The repeat run passed without changing the 2,000-file/30-second threshold.

Hosted benchmark evidence from the successful run:
- Windows: 1.265 seconds;
- Ubuntu: 0.957 seconds;
- macOS: 0.684 seconds.

## Maintainer Execution
For a future different candidate, dispatch `release-candidate-evidence` from the reviewed branch and record:
- workflow URL and commit SHA;
- each OS result;
- predecessor and candidate package versions;
- benchmark elapsed time from each job;
- any accepted runner-specific warning or failure.

Equivalent maintainer command for a future candidate:

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

TASK-0128's dispatch is complete and remains alpha.2-only. TASK-0205 records the alpha.3 hosted RC evidence for `beaa14deed3dbc55ac98d216679f9a9799261801`. TASK-0206 records refreshed alpha.3 hosted RC evidence for `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f` after source-impacting script hardening, then published final docs-only successor SHA `92984c6448332aa24b7cff94647f627bf944e535`. Do not tag, publish, or create a GitHub Release from evidence recording alone for future releases; each release still needs its own explicit publish task and immutable release checks.

## Failure Interpretation
- Predecessor install failure can indicate NuGet/network availability rather than source behavior.
- Candidate install/help failure indicates package or command-surface drift.
- Config hash change is a blocking mutation regression.
- Config/baseline/SARIF failure is a compatibility or privacy-contract regression.
- Benchmark threshold failure requires investigation; the threshold is a regression tripwire, not an SLA.

## Remote Boundary
The workflow dispatch writes only a GitHub Actions run record. It does not change GitHub settings, releases, tags, packages, artifacts, or Code Scanning state.
