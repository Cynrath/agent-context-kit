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
Pending.
