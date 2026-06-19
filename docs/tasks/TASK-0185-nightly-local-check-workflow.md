# TASK-0185: Nightly Local Check Workflow

## Purpose
Add a `.github/workflows/nightly-local-check.yml` that runs on a nightly schedule (cron) and on `workflow_dispatch`. The workflow runs the same local-only gates that `scripts/verify-release.ps1` and `scripts/check-tracked-vs-untracked-md.ps1` run, and uploads the JSON output of `ackit scan --ci` and `ackit doctor` as workflow artifacts. No PR creation, no auto-fix, no remote AI.

## Current State
- Existing workflows: `ci.yml`, `cross-platform-smoke.yml`, `cross-platform-source-smoke.yml`, `release-candidate-evidence.yml`, `release.yml`.
- No nightly workflow existed.

## Evidence
- `.github/workflows/` (existing).
- `scripts/verify-release.ps1` (existing).
- `scripts/check-tracked-vs-untracked-md.ps1` (existing).

## Scope
- One new YAML file under `.github/workflows/nightly-local-check.yml`.
- Schedule: `cron: '17 5 * * *'` (5:17 UTC, off the round-hour to avoid fleet collisions).
- Triggers: `schedule` and `workflow_dispatch`.
- Steps: checkout, setup-dotnet, restore, build, test, `ackit scan --ci --json`, `ackit doctor --json`, `verify-release.ps1`, `check-tracked-vs-untracked-md.ps1 -FailOnIssues`, upload `nightly-scan-<os>` and `nightly-doctor-<os>` artifacts (14-day retention).
- Matrix: `ubuntu-latest` and `windows-2025` to mirror `ci.yml`.
- Permissions: `contents: read` only; default `GITHUB_TOKEN`.

## Out of Scope
- Branch protection changes.
- Auto-fix bots.
- Slack/email notifications.
- Triggering other workflows.

## Affected Files
- `.github/workflows/nightly-local-check.yml` — new.
- `docs/HOSTED_CHECKS.md` — append a "Nightly Local Check" subsection.
- `tests/AgentContextKit.Tests/AgentContextKit.Tests.csproj` — add `YamlDotNet` 15.1.6 reference.
- `tests/AgentContextKit.Tests/NightlyWorkflowYamlGuardTests.cs` — new.

## Implementation Steps
1. Implementation commit.
2. Gates.
3. Push.

## Security/Privacy Boundary
- Workflow runs in GitHub-hosted runner with the same permissions as existing workflows (`contents: read`).
- No secrets are added; the workflow uses default `GITHUB_TOKEN`.

## Backward Compatibility
- New file only; no existing workflow changes.

## Acceptance Criteria
- YAML parses with `YamlDotNet` from the test suite.
- Workflow declares `schedule` and `workflow_dispatch` triggers.
- `docs/HOSTED_CHECKS.md` documents the new workflow.

## Tests
- NightlyWorkflowYamlGuardTests (2 new):
  - `NightlyWorkflowYamlParses`
  - `NightlyWorkflowDeclaresScheduleAndDispatchTriggers`

## Validation
- `dotnet build AgentContextKit.sln -c Release --no-restore` — 0 warnings, 0 errors.
- Focused `NightlyWorkflowYamlGuardTests` — 2/2 green.
- `dotnet test AgentContextKit.sln -c Release --no-build` — 315/315 green.
- Source `ackit scan --ci` — exit 0.
- Source `ackit doctor` — 13/13 PASS.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — clean after implementation commit.
- `git diff --check` — clean.
- `scripts/verify-release.ps1` — passed.

## Rollback
Single `git revert <sha>`.

## Completion Evidence
- File list: above.
- Commit hash(es): implementation `7311d4e`.
- Test count: 315/315 (2 new).
- Hosted checks for pushed HEAD `7311d4e`:
  - `ci` run `27830798357` — success.
  - `cross-platform-smoke` run `27830798402` — success.
  - `cross-platform-source-smoke` run `27830798370` — success.

## Push
- `git push origin master` only.

## Hosted Checks
- All three standard `master` workflows passed for pushed HEAD `7311d4e`.
