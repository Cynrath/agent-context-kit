# Release Candidate Hosted Evidence

## Purpose
`.github/workflows/release-candidate-evidence.yml` is a manual-only Windows, Ubuntu, and macOS evidence workflow for a future release-candidate decision. It does not publish or approve a release.

## Current Hosted Status

### V100 Final-Candidate Input Preparation (TASK-0236 — Not Dispatched)

TASK-0236 prepares, but does not dispatch, the next manual hosted RC evidence input:

| Input | Dispatch-time value |
| --- | --- |
| `commit_sha` | Final pushed `origin/master`, equal to local `HEAD` after the one allowed push |
| `candidate_version` | `0.2.0-alpha.4` |
| `predecessor_version` | `0.2.0-alpha.3` |
| Source-impacting evidence base | `b1604ae1e73017521d28e5a83f328bb1347406b6` |

The workflow will build a run-unique local package such as `0.2.0-alpha.4.ci.<run-id>`; it must not publish, replace, or mutate the immutable `0.2.0-alpha.4` package. The final pushed HEAD is eligible only after the bridge review proves every commit after `b1604ae1e73017521d28e5a83f328bb1347406b6` is docs/evidence/governance-only.

Pre-dispatch validation after the single final push:

```powershell
git fetch origin master --prune

$commitSha = (git rev-parse origin/master).Trim()
$localHead = (git rev-parse HEAD).Trim()
if ($localHead -ne $commitSha) {
    throw 'Local HEAD and origin/master must match before hosted RC dispatch.'
}

git diff --name-status b1604ae1e73017521d28e5a83f328bb1347406b6..HEAD

pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-inputs.ps1 `
  -CommitSha $commitSha `
  -CandidateVersion 0.2.0-alpha.4 `
  -PredecessorVersion 0.2.0-alpha.3 `
  -RequireOriginMaster
```

First remaining authorization boundary — run only after explicit maintainer approval:

```powershell
gh workflow run release-candidate-evidence.yml `
  --repo Cynrath/agent-context-kit `
  --ref master `
  -f commit_sha=$commitSha `
  -f candidate_version=0.2.0-alpha.4 `
  -f predecessor_version=0.2.0-alpha.3
```

Expected evidence to record after an authorized run:

- workflow run ID/URL, event, branch, and exact head SHA;
- Windows, Ubuntu, and macOS job IDs/conclusions;
- actual discovered test count and zero-warning/zero-error build result;
- predecessor install and source run-unique package version;
- config hash/`config-check`, baseline, SARIF, and clean-scan results;
- mixed-corpus distribution, elapsed seconds, peak working set, time/memory threshold results from TASK-0233's expanded script;
- confirmation that artifact and SARIF upload remain disabled.

The interruption/unreadable-file results are local deterministic evidence; the current hosted workflow invokes the default mixed/time/memory benchmark and does not claim graceful in-process cancellation.

Status: `HOSTED_INPUT_PREPARED`, `NOT_DISPATCHED`, `OPEN_PENDING_MANUAL_WORKFLOW_DISPATCH`.

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
