# TASK-0185: Nightly Local Check Workflow

## Purpose
Add a `.github/workflows/nightly-local-check.yml` that runs on a nightly schedule (cron) and on `workflow_dispatch`. The workflow runs the same local-only gates that `scripts/verify-release.ps1` and `scripts/check-tracked-vs-untracked-md.ps1` run, and uploads the summary as a workflow artifact. No PR creation, no auto-fix, no remote AI.

## Current State
- Existing workflows: `build-test.yml`, `published-package-smoke.yml`, `source-package-smoke.yml`.
- No nightly workflow exists.

## Evidence
- `.github/workflows/` (existing).
- `scripts/verify-release.ps1` (existing).
- `scripts/check-tracked-vs-untracked-md.ps1` (existing).

## Scope
- One new YAML file under `.github/workflows/`.
- Schedule: `cron: '17 5 * * *'` (5:17 UTC, off the round-hour to avoid fleet collisions).
- Triggers: `schedule` and `workflow_dispatch`.
- Steps: checkout, setup-dotnet (matching `global.json` SDK version), restore, build, test, run `ackit scan --ci`, run `ackit doctor`, run `verify-release.ps1`, run `check-tracked-vs-untracked-md.ps1 -FailOnIssues`, upload the JSON output of `ackit scan` and the doctor text as artifacts.

## Out of Scope
- Branch protection changes.
- Auto-fix bots.
- Slack/email notifications.
- Triggering other workflows.

## Affected Files
- `.github/workflows/nightly-local-check.yml` — new.
- `docs/HOSTED_CHECKS.md` — append a "Nightly Local Check" subsection.

## Implementation Steps
1. Planning commit.
2. Write the YAML.
3. Update `docs/HOSTED_CHECKS.md`.
4. Implementation commit.
5. Gates.
6. Push.

## Security/Privacy Boundary
- Workflow runs in GitHub-hosted runner with the same permissions as existing workflows (read-only default; no `contents: write`).
- No secrets are added; the workflow uses default `GITHUB_TOKEN`.

## Backward Compatibility
- New file only; no existing workflow changes.

## Acceptance Criteria
- YAML parses with `actionlint` (or `python -c "import yaml; yaml.safe_load(open('...'))"` if actionlint is not installed).
- Workflow is reachable via `gh workflow list` after push (verified locally only by file content; hosted check happens on push).
- `docs/HOSTED_CHECKS.md` is updated.

## Tests
- NightlyWorkflowYamlGuardTests (2 new):
  - YAML parses.
  - Workflow has the expected `on:` keys (`schedule`, `workflow_dispatch`).

## Validation
- `dotnet build` — 0 errors.
- `dotnet test` — 305+ / 0 / 0.
- `ackit scan --ci` — exit 0.
- `ackit doctor` — 14/14 PASS.
- `scripts/verify-release.ps1` — pass.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — clean.
- `git status` — clean.

## Rollback
Single `git revert <sha>`.

## Completion Evidence
- File list: above.
- Commit hash(es): planning + implementation.
- Test count: 305+.

## Push
- `git push origin master` only.

## Hosted Checks
- Local gates only; CI runs on push.
