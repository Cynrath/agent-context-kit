# TASK-0180: Hosted Check Status Reporter Script

## Purpose
Add `scripts/hosted-checks-summary.ps1`, a small PowerShell companion that summarizes the last N GitHub Actions workflow runs (status, conclusion, URL, duration) and prints a markdown table. Used locally to inspect CI health without opening the GitHub UI. Calls only `gh api` (which is already permitted by `settings.json`); no other remote calls.

## Current State
- No `scripts/hosted-checks-summary.ps1` exists.
- `gh` is permitted in `settings.json` allow-list.
- The repo has 4 GitHub Actions workflows: `build-test.yml`, `published-package-smoke.yml`, `source-package-smoke.yml`, and the new `nightly-local-check.yml` (added by TASK-0185; the script must work with or without it).

## Evidence
- `scripts/verify-release.ps1` (existing; similar style).
- `scripts/check-tracked-vs-untracked-md.ps1` (existing; similar style).

## Scope
- Single PowerShell script that takes `--count N` (default 10) and `--workflow <name>` (default all) and prints a markdown table.
- Use `gh api` to fetch workflow runs.
- Exit 0 always (this is a read-only inspector); non-zero only on argument errors.

## Out of Scope
- Modifying workflow files.
- Triggering runs.
- Posting to PRs or issues.
- Caching results to disk.

## Affected Files
- `scripts/hosted-checks-summary.ps1` — new.
- `docs/HOSTED_CHECKS.md` — new, describes usage.

## Implementation Steps
1. Planning commit.
2. Write the script.
3. Write `docs/HOSTED_CHECKS.md`.
4. Test the script locally (if `gh` is authenticated; otherwise the script should print a clear "gh not authenticated" message and exit 0).
5. Implementation commit.
6. Gates.
7. Push.

## Security/Privacy Boundary
- Script is read-only; no writes, no tokens, no secrets.
- Script never prints more than the workflow name, run id, status, conclusion, and URL.

## Backward Compatibility
- New file; no existing script changes.

## Acceptance Criteria
- Running the script with no args prints the last 10 runs across all workflows.
- Running the script with `--count 1` prints exactly 1 row.
- Running the script with `--workflow build-test.yml` filters to that workflow.
- Running the script without `gh` installed prints a clear error and exits 0.

## Tests
- HostedChecksSummaryScriptTests (3 new) — test the script via PowerShell:
  - With no args, exits 0 and prints a markdown table header.
  - With `--count 0`, prints a clear argument error and exits 2.
  - With `--help`, prints usage and exits 0.

## Validation
- `dotnet build` — 0 errors.
- `dotnet test` — 289+ / 0 / 0.
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
- Test count: 289+.

## Push
- `git push origin master` only.

## Hosted Checks
- Local gates only; CI runs on push.
