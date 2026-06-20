# TASK-0205: alpha3 hosted RC evidence GO

## Purpose
Record hosted release-candidate evidence for `0.2.0-alpha.3` run `27868539971`, verify all operating-system jobs passed for the exact candidate tuple, and update release documentation with an exact-candidate GO decision for a later publish task.

This task must not publish, tag, create a GitHub Release, dispatch a release workflow, dispatch a new release-candidate workflow, mutate owners/secrets/settings, or perform any package publication action.

## Scope
- Run required preflight checks before editing:
  - `ackit --help`
  - `git fetch origin`
  - `git status --porcelain=v1 --untracked-files=all 2>$null`
  - `git status --short`
  - `git rev-parse --short HEAD`
  - `git rev-parse HEAD`
  - `git rev-parse --short origin/master`
  - `git rev-parse origin/master`
  - `git log --oneline -n 20`
  - current-source `version`
  - current-source `--help`
- Confirm local `HEAD` and `origin/master` start aligned at `beaa14d`.
- Confirm package/source version remains `0.2.0-alpha.3`.
- Read the release workflows, package metadata, release decision, checklist, hosted evidence, GitHub Actions usage, release validation, maintainer handoff, state docs, and TASK-0203/TASK-0204 before evidence edits.
- Create and commit this TASK-0205 plan before verifying and recording hosted evidence.
- Verify hosted run `27868539971` with `gh`:
  - run URL `https://github.com/Cynrath/agent-context-kit/actions/runs/27868539971`;
  - branch `master`;
  - event `workflow_dispatch`;
  - head SHA `beaa14deed3dbc55ac98d216679f9a9799261801`;
  - conclusion `success`;
  - jobs `evidence (windows-2025)`, `evidence (ubuntu-latest)`, and `evidence (macos-latest)` all succeeded;
  - expected release-candidate steps completed successfully in each job.
- Record the evidence tuple:
  - candidate version `0.2.0-alpha.3`;
  - predecessor version `0.2.0-alpha.2`;
  - source candidate package `0.2.0-alpha.3.ci.27868539971`;
  - job IDs when available.
- Record non-blocking hosted annotations as xUnit analyzer warnings only.
- Update release evidence and decision docs:
  - `docs/RC_HOSTED_EVIDENCE.md`;
  - `docs/V020_ALPHA3_RELEASE_DECISION.md`;
  - `docs/RELEASE_CHECKLIST.md`;
  - `docs/RELEASE_VALIDATION.md` if needed;
  - `docs/MAINTAINER_RELEASE_HANDOFF.md` if needed.
- Update state and handoff docs:
  - `docs/NEXT_TASKS.md`;
  - `.codex/SESSION_HANDOFF.md`;
  - `.codex/CONTEXT_PACK.md`;
  - `.codex/NEXT_STEPS.md`.
- Keep package metadata and workflow YAML unchanged unless a verified mismatch blocks evidence recording.

## Out of scope
- NuGet publish.
- GitHub Release creation or edit.
- Tag creation, movement, or deletion.
- Release workflow dispatch.
- New release-candidate workflow dispatch.
- Repository secret creation or mutation.
- Owner/account/recovery mutation.
- Branch ruleset or security setting mutation.
- Security advisory creation.
- Destructive NuGet action.
- Source feature work.
- Unrelated refactor.

## Affected files
- `docs/tasks/TASK-0205-alpha3-hosted-rc-evidence-go.md`
- `docs/RC_HOSTED_EVIDENCE.md`
- `docs/V020_ALPHA3_RELEASE_DECISION.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/MAINTAINER_RELEASE_HANDOFF.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`
- `docs/RELEASE_BLOCKER_BOARD.md`
- `docs/ROADMAP.md`
- `docs/V020_ALPHA3_PLAN.md`
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Data/database impact
None. The repository has no database or migrations in this task scope.

## Admin impact
None. No admin UI, repository setting, branch rule, environment, security setting, owner, or NuGet account setting is changed.

## Security impact
Positive release-governance impact. Hosted evidence is verified through read-only GitHub Actions inspection and recorded without exposing secrets, private notification details, recovery secrets, API keys, tokens, or private advisory content.

## Permission/auth impact
Read-only GitHub Actions verification through `gh` is required. No permission, auth, owner, environment, repository secret, GitHub setting, or NuGet account mutation is performed.

## Localization impact
Documentation wording only. No runtime localization resources are expected to change.

## SEO/i18n impact
No SEO surface change. English release documentation is updated; public install wording must not claim `0.2.0-alpha.3` is published.

## UX impact
No runtime CLI UX change. Documentation clarifies the release decision and next publish boundary.

## Logging/audit impact
Adds task-first audit records for hosted RC evidence, exact-candidate GO, validation results, and explicit non-publication boundaries. No telemetry, artifact upload, SARIF upload, release write, or package publication is introduced.

## Package/release impact
- Candidate source/package version remains `0.2.0-alpha.3`.
- Published predecessor remains `0.2.0-alpha.2`.
- Hosted RC evidence is recorded for run `27868539971` and exact commit `beaa14deed3dbc55ac98d216679f9a9799261801` if `gh` verification confirms success.
- Exact-candidate GO may be recorded only for a later publish task.
- Publication remains not performed.

## Acceptance criteria
- TASK-0205 plan is committed before hosted-evidence documentation edits.
- Hosted run `27868539971` is verified with `gh`, not only maintainer UI observation.
- Run metadata matches the expected tuple:
  - `workflow_dispatch`;
  - `master`;
  - `beaa14deed3dbc55ac98d216679f9a9799261801`;
  - `0.2.0-alpha.3`;
  - `0.2.0-alpha.2`;
  - `0.2.0-alpha.3.ci.27868539971`.
- Windows, Ubuntu, and macOS jobs are recorded as successful.
- Non-blocking annotations are recorded as xUnit analyzer warnings only.
- Release decision docs record exact-candidate GO for a later publish task if evidence is green.
- Publish boundary docs explicitly state no publish/tag/release/workflow dispatch occurred in TASK-0205.
- The distinction is recorded that hosted RC evidence validates commit `beaa14d`, while TASK-0205 documentation commits happen after that evidence and do not change package/source code.
- Local validation and targeted scripts are run and recorded, including any known Windows `git status --short` stderr caveat.
- Final raw porcelain is clean before push.

## Test steps
- `dotnet restore AgentContextKit.sln`
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- version`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- --help`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
- `ackit doctor`
- `git diff --check`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-workflow.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-inputs.ps1 -CommitSha beaa14deed3dbc55ac98d216679f9a9799261801 -CandidateVersion 0.2.0-alpha.3 -PredecessorVersion 0.2.0-alpha.2 -RequireOriginMaster`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-evidence.ps1`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/verify-release.ps1`

## Risks
- Accidentally treating hosted RC GO as immediate publication approval.
- Accidentally dispatching a new workflow or publishing during an evidence-recording task.
- Confusing hosted evidence commit `beaa14d` with later docs-only TASK-0205 HEAD.
- The future publish workflow may require `release_commit_sha == origin/master`, so a later publish task must decide whether to publish the RC commit or a final docs-only HEAD after confirming package/source metadata did not change, or else run a new hosted RC evidence workflow.
- Root `dotnet restore` can fail when both `.sln` and `.slnx` exist; use explicit `AgentContextKit.sln`.
- Global installed `ackit` may still be `0.2.0-alpha.2`, so global help/scan can differ from current-source behavior until alpha.3 is published.
- Some PowerShell gates may hit the known Windows `git status --short` unreadable-directory stderr warning even when raw porcelain is clean.
- `verify-release.ps1` or RC evidence scripts may fail only on the known Windows git stderr behavior; if so, record internal restore/build/test/current-source scan/doctor evidence separately.

## Rollback plan
Single `git revert <sha>` for TASK-0205 documentation/evidence commits if the hosted evidence record or decision must be replaced. No tag, release, NuGet package, workflow run, owner, secret, branch rule, security advisory, or remote setting cleanup should be needed because this task performs no release write action.

## Completion notes
Completed locally on 2026-06-20.

Evidence summary:
- Plan commit: `168a992` (`docs: plan task 0205 hosted rc go`).
- Hosted evidence documentation commit: `5e986ec` (`docs: record alpha3 hosted rc evidence`).
- Hosted run ID: `27868539971`.
- Hosted run URL: `https://github.com/Cynrath/agent-context-kit/actions/runs/27868539971`.
- Workflow: `release-candidate-evidence`.
- Event: `workflow_dispatch`.
- Branch: `master`.
- Exact candidate commit: `beaa14deed3dbc55ac98d216679f9a9799261801`.
- Candidate version: `0.2.0-alpha.3`.
- Predecessor version: `0.2.0-alpha.2`.
- Source candidate package: `0.2.0-alpha.3.ci.27868539971`.
- Hosted matrix:
  - `evidence (windows-2025)`: success, job `82476527430`;
  - `evidence (ubuntu-latest)`: success, job `82476527450`;
  - `evidence (macos-latest)`: success, job `82476527416`.
- Hosted steps verified successful in each job: checkout exact commit, setup .NET, validate exact commit and versions, restore/build/test, install predecessor and source candidate, verify predecessor upgrade and baseline policy, synthetic performance tripwire, and write evidence summary.
- Non-blocking annotations: xUnit analyzer warnings only:
  - `xUnit1051` cancellation-token responsiveness warnings in `tests/AgentContextKit.Tests/McpStdioTransportTests.cs`;
  - `xUnit2013` collection-size assertion warning in `tests/AgentContextKit.Tests/WatchCommandTests.cs`.
- No hosted job failed. Artifact upload and SARIF upload were disabled.
- Hosted evidence GO decision: exact-candidate GO for a later publish task only.
- Publication status: `0.2.0-alpha.3` remains unpublished.
- Publish boundary: TASK-0205 did not create or move tags, create a GitHub Release, publish NuGet, dispatch `release.yml`, dispatch a new `release-candidate-evidence.yml`, mutate owners, create secrets, mutate branch rulesets/security settings, create security advisories, or perform destructive NuGet actions.
- RC commit vs docs-only HEAD distinction: hosted RC evidence validates `beaa14deed3dbc55ac98d216679f9a9799261801`; TASK-0205 documentation commits happen after that evidence and do not change package/source code. A later publish task must decide whether to publish the RC evidence commit or a final docs-only HEAD under the release workflow exact-commit policy. If publishing a later docs-only HEAD, prove package/source metadata remains unchanged from the RC evidence commit or record a new hosted RC run for that final HEAD.
- `RB-003`: closed by TASK-0202 for `0.2.0-alpha.3` release-preparation entry and not a blocker for the TASK-0205 GO decision.
- `RB-008`: closed by TASK-0202 for `0.2.0-alpha.3` release-preparation entry and not a blocker for the TASK-0205 GO decision.

Required preflight:
- `ackit --help`: passed.
- `git fetch origin`: passed; no `.git/FETCH_HEAD` or `.git` write error.
- `git status --porcelain=v1 --untracked-files=all 2>$null`: clean at task start.
- `git status --short`: emitted the known Windows unreadable-directory stderr warning, with raw porcelain separately clean.
- `git rev-parse --short HEAD`: `beaa14d` at task start.
- `git rev-parse HEAD`: `beaa14deed3dbc55ac98d216679f9a9799261801` at task start.
- `git rev-parse --short origin/master`: `beaa14d` at task start.
- `git rev-parse origin/master`: `beaa14deed3dbc55ac98d216679f9a9799261801` at task start.
- `git log --oneline -n 20`: top entry `beaa14d docs: record task 0204 evidence`.
- Current-source `version`: `AgentContextKit 0.2.0-alpha.3`.
- Current-source `--help`: passed and showed the current alpha.3 command surface.

GitHub Actions verification:
- `gh run view 27868539971 --repo Cynrath/agent-context-kit`: passed and showed run success, three successful evidence jobs, job IDs, and xUnit analyzer annotations only.
- `gh run view 27868539971 --repo Cynrath/agent-context-kit --json databaseId,headSha,headBranch,event,status,conclusion,createdAt,updatedAt,url,workflowName,jobs`: passed and confirmed `databaseId=27868539971`, `headSha=beaa14deed3dbc55ac98d216679f9a9799261801`, `headBranch=master`, `event=workflow_dispatch`, `status=completed`, `conclusion=success`, `workflowName=release-candidate-evidence`, and every expected job step succeeded.
- `gh run list --repo Cynrath/agent-context-kit --workflow release-candidate-evidence.yml --limit 10 --json databaseId,headSha,status,conclusion,createdAt,url,event`: passed and listed run `27868539971` as the latest successful alpha.3 RC run.
- Job logs confirmed `CANDIDATE_PACKAGE_VERSION: 0.2.0-alpha.3.ci.27868539971`, predecessor `0.2.0-alpha.2`, candidate `0.2.0-alpha.3`, and exact commit `beaa14deed3dbc55ac98d216679f9a9799261801`.

Local validation:
- `dotnet restore AgentContextKit.sln`: passed.
- `dotnet build AgentContextKit.sln -c Release --no-restore`: passed with existing xUnit analyzer warnings (`xUnit1051`, `xUnit2013`) and 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build`: passed, `428/428`.
- Current-source `dotnet run ... -- version`: passed, `AgentContextKit 0.2.0-alpha.3`.
- Current-source `dotnet run ... -- --help`: passed.
- Current-source `dotnet run ... -- scan --ci`: passed; reported existing Medium `.remember` / package-validation artifact review findings and Low local-path findings only.
- `ackit doctor`: passed all checks.
- `git diff --check`: passed; Git printed CRLF/LF working-copy conversion warnings for existing docs/state files, with no whitespace errors.

Targeted script results:
- `scripts/check-tracked-vs-untracked-md.ps1`: passed.
- `scripts/check-cli-contract.ps1`: passed with expected dirty-working-tree warning during pre-commit validation.
- `scripts/check-localization-parity.ps1`: passed with expected dirty-working-tree warning during pre-commit validation.
- `scripts/check-release-candidate-workflow.ps1`: passed.
- `scripts/check-release-candidate-inputs.ps1 -CommitSha beaa14deed3dbc55ac98d216679f9a9799261801 -CandidateVersion 0.2.0-alpha.3 -PredecessorVersion 0.2.0-alpha.2 -RequireOriginMaster`: failed with `Checked-out HEAD does not match commit_sha.` after the TASK-0205 plan commit advanced local HEAD. This is the expected distinction: hosted RC evidence validates `beaa14d`, while TASK-0205 docs commits occur afterward and must be considered by the later publish task.
- `scripts/check-release-candidate-evidence.ps1`: exited `0`; synthetic benchmark passed, but subordinate gates reported issues caused by the known Windows `git status --short` unreadable-directory stderr warning. This was recorded as pre-existing environment behavior.
- `scripts/verify-release.ps1`: restore, build, test, current-source scan, and doctor passed; the script then failed in release blocker review because `scripts/check-release-blockers.ps1` hit the known Windows `git status --short` unreadable-directory stderr warning. This was recorded as pre-existing environment behavior.

Initial global ackit inspection:
- `ackit doctor`: passed.
- Global `ackit scan --ci`: exited `1` because the currently installed global tool still reflects the published `0.2.0-alpha.2` scanner behavior and reported a High finding in `src/AgentContextKit.Core/Scanning.cs`, plus known Medium/Low review findings. Current-source `scan --ci` passed and is the candidate validation authority for alpha.3.

Result:
- Hosted RC evidence for `0.2.0-alpha.3` is recorded and passed.
- Exact-candidate GO is recorded for a later publish task only.
- `0.2.0-alpha.3` remains unpublished.
- The next task should be publish preparation/execution only after resolving whether publish uses RC commit `beaa14d` / `beaa14deed3dbc55ac98d216679f9a9799261801` or a final docs-only HEAD.
