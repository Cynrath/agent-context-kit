# Release Candidate Hosted Evidence

## Purpose
`.github/workflows/release-candidate-evidence.yml` is a manual-only Windows, Ubuntu, and macOS evidence workflow for a future release-candidate decision. It does not publish or approve a release.

## Current Hosted Status
TASK-0128 completed the hardened workflow and exact hosted run. Run [27478635057](https://github.com/Cynrath/agent-context-kit/actions/runs/27478635057) passed on Windows, Ubuntu, and macOS for exact commit `4c4fa64ff34287dff01818d52f49b521efb3176d`, predecessor `0.2.0-alpha.1`, and source candidate `0.2.0-alpha.2.ci.27478635057`.

TASK-0205 verified hosted `0.2.0-alpha.3` release-candidate evidence with `gh`. Run [27868539971](https://github.com/Cynrath/agent-context-kit/actions/runs/27868539971) passed on Windows, Ubuntu, and macOS for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801`, predecessor `0.2.0-alpha.2`, and source candidate package `0.2.0-alpha.3.ci.27868539971`.

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

TASK-0128's dispatch is complete and remains alpha.2-only. TASK-0205 records the alpha.3 hosted RC evidence for `beaa14deed3dbc55ac98d216679f9a9799261801`. Do not tag, publish, or create a GitHub Release from this evidence-recording task; publication still requires a separate authorized publish task.

## Failure Interpretation
- Predecessor install failure can indicate NuGet/network availability rather than source behavior.
- Candidate install/help failure indicates package or command-surface drift.
- Config hash change is a blocking mutation regression.
- Config/baseline/SARIF failure is a compatibility or privacy-contract regression.
- Benchmark threshold failure requires investigation; the threshold is a regression tripwire, not an SLA.

## Remote Boundary
The workflow dispatch writes only a GitHub Actions run record. It does not change GitHub settings, releases, tags, packages, artifacts, or Code Scanning state.
