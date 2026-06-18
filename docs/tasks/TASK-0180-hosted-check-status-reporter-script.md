# TASK-0180: Hosted Check Status Reporter Script

## Purpose
Add a read-only local PowerShell inspector for recent hosted GitHub Actions runs. The script gives maintainers a deterministic Markdown summary of hosted CI state without opening the GitHub UI and without triggering, mutating, caching, or posting anything.

The screenshot-provided `nuget-release` deployment red markers are historical deployment status entries from 2026-06-13 release workflow runs. Current `master` workflow runs are green, and this task does not perform release, tag, NuGet, deployment, or environment writes. It only adds safer local hosted-check inspection.

## Scope
- Add `scripts/hosted-checks-summary.ps1`.
- Add `docs/HOSTED_CHECKS.md`.
- Add focused tests in `tests/AgentContextKit.Tests/HostedChecksSummaryScriptTests.cs`.
- Keep the script outside the main `ackit` CLI command surface.
- Use `gh api` for GitHub remote reads.
- Print a Markdown table with only workflow name, run id, status, conclusion, URL, and duration.

## Out Of Scope
- Workflow triggering or reruns.
- Pull request, issue, release, tag, deployment, environment, or NuGet writes.
- Posting summaries anywhere.
- Caching API responses to disk.
- Printing tokens, raw secret-bearing environment values, or raw `gh` stderr.
- Changing `.github/workflows/*`.
- Changing package version or release metadata.

## Affected Files
- `scripts/hosted-checks-summary.ps1` - new script.
- `docs/HOSTED_CHECKS.md` - new usage and safety documentation.
- `tests/AgentContextKit.Tests/HostedChecksSummaryScriptTests.cs` - new focused tests.
- `docs/tasks/TASK-0180-hosted-check-status-reporter-script.md` - task planning and completion evidence.
- Post-push evidence sync only if hosted checks complete: `.codex/NEXT_STEPS.md`, `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`, and `docs/NEXT_TASKS.md`.

## DB Impact
None. The project has no database or migrations in scope for this task.

## Admin Impact
None. No admin UI, GitHub setting, environment setting, label, release, or deployment mutation is performed.

## Permission Impact
The script requires only the caller's existing local `gh` authentication for read access. It should fail open for missing or unauthenticated `gh` with a clear message and exit code `0`, because it is an inspector and must not block local developer flow.

## SEO / i18n Impact
None. Documentation is English to match existing repo docs. No localized CLI strings are touched.

## Audit / Security Impact
- Read-only GitHub API inspection through `gh api`.
- No token printing and no raw stderr echoing.
- No remote AI calls, telemetry, uploads, or generated report commits.
- Invalid invocation arguments are the only intentional non-zero exit path.
- Missing `gh`, unauthenticated `gh`, GitHub API failures, network failures, and unavailable workflow data exit `0` with a concise non-secret message.

## Current State
- `scripts/hosted-checks-summary.ps1` does not exist.
- `docs/HOSTED_CHECKS.md` does not exist.
- GitHub workflows currently present: `ci`, `cross-platform-smoke`, `cross-platform-source-smoke`, `release-candidate-evidence`, and `release`.
- Latest read-only `gh run list` check on 2026-06-18 showed current `master` runs for `f3c4efb34e5e3c9f68e8cb3fdf62eaeee65a4045` are successful.
- `nuget-release` deployment red entries are older release-environment deployment statuses, not current `master` CI failures.

## Script Contract
Required invocations:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/hosted-checks-summary.ps1
powershell -ExecutionPolicy Bypass -File scripts/hosted-checks-summary.ps1 --count 1
powershell -ExecutionPolicy Bypass -File scripts/hosted-checks-summary.ps1 --workflow ci.yml
powershell -ExecutionPolicy Bypass -File scripts/hosted-checks-summary.ps1 --help
```

Argument behavior:
- No args: print the last 10 runs across workflows.
- `--count N`: positive integer count; default `10`.
- `--workflow <name>`: filter through the GitHub workflow-runs endpoint for the given workflow id or file name.
- `--help`: print usage and exit `0`.
- Invalid args, missing values, unknown flags, or `--count 0`: print an argument error and exit `2`.

Output table columns:

```text
| Workflow | Run ID | Status | Conclusion | URL | Duration |
```

Duration is calculated from `run_started_at` or `created_at` to `updated_at` when available; otherwise the field is `n/a`.

## Test Plan
Use a fake `gh` executable on the test `PATH` so tests do not call GitHub.

Minimum focused tests:
- No args exits `0` and prints the Markdown table header.
- `--count 0` exits `2` and prints a clear argument error.
- `--help` exits `0` and prints usage.

Additional useful coverage:
- `--count 1` prints exactly one data row when the fake API returns multiple runs.
- `--workflow ci.yml` uses the workflow-filtered endpoint and prints the filtered run.

## Implementation Steps
1. Update this task record and add hosted-check usage docs before code.
2. Commit the docs/task planning update locally.
3. Implement `scripts/hosted-checks-summary.ps1` with manual `--count`, `--workflow`, and `--help` parsing.
4. Add `HostedChecksSummaryScriptTests` with a safe fake `gh` fixture.
5. Run focused tests.
6. Run the required local validation gates.
7. Commit implementation/docs/tests.
8. Push `master`.
9. Check hosted `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` runs for the pushed HEAD.
10. Record hosted run IDs/status in the task and handoff docs, then push a hosted evidence sync commit.

## Acceptance Criteria
- Script exists at `scripts/hosted-checks-summary.ps1`.
- Documentation exists at `docs/HOSTED_CHECKS.md`.
- No args prints the last 10 runs across workflows when data is available.
- `--count 1` prints exactly 1 data row when at least one run is available.
- `--workflow <name>` filters to the specified workflow through the workflow-specific API endpoint.
- Missing `gh` exits `0` with a clear message.
- Unauthenticated or failing `gh api` exits `0` with a clear non-secret message.
- Invalid args such as `--count 0` exit `2`.
- Output avoids fields other than workflow name, run id, status, conclusion, URL, and duration.
- Focused tests pass without real GitHub calls.

## Validation Gates
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- Focused `HostedChecksSummaryScriptTests`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci`
- `dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor`
- `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues`
- `git diff --check`
- `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1`
- `git status --short --branch`

`scripts/check-cli-contract.ps1` and `scripts/check-localization-parity.ps1` are not expected to be required because the `ackit` CLI/help/localized text surface is not touched. Run them if implementation unexpectedly changes those surfaces.

## Risks
- GitHub API shape changes could break table extraction. Mitigation: tolerate missing fields and print `n/a`.
- Very old or in-progress runs may not have calculable duration. Mitigation: use `n/a`.
- Existing historical `nuget-release` deployment failures can remain visible in GitHub Deployments even after current CI is green. Mitigation: document them as historical and avoid unauthorized environment/release writes.

## Rollback
Revert the TASK-0180 implementation commit:

```powershell
git revert <task-0180-implementation-sha>
```

If a separate evidence sync commit exists, revert that commit first.

## Completion Evidence
- Planning commit: `8a65723`.
- Implementation commit: `1bc0019`.
- Local validation on 2026-06-18:
  - `dotnet build AgentContextKit.sln -c Release --no-restore` passed with 0 warnings and 0 errors.
  - Focused `HostedChecksSummaryScriptTests` passed 6/6.
  - Full `dotnet test AgentContextKit.sln -c Release --no-build` passed 293/293.
  - Source `scan --ci` exited 0 with existing `.remember` Medium log findings only.
  - Source `doctor` passed 13/13.
  - `git diff --check` passed.
  - `scripts/verify-release.ps1` passed; its release blocker review reported the expected dirty-tree warning before the implementation commit.
  - `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` passed after commit.
- Real read-only smoke:
  - `scripts/hosted-checks-summary.ps1 --count 1` printed one recent hosted run row.
  - `scripts/hosted-checks-summary.ps1 --workflow ci.yml --count 1` printed one `ci` row.
- Hosted evidence for pushed HEAD `1bc0019f599b15d34debbfa79bf6e572e5d53666` on 2026-06-18:
  - `ci` run `27782907605` completed `success`.
  - `cross-platform-smoke` run `27782907712` completed `success`.
  - `cross-platform-source-smoke` run `27782907825` completed `success`.
- Screenshot/deployment diagnosis: `nuget-release` red entries are historical 2026-06-13 release-environment deployment statuses tied to runs `27470495270` and `27470659578`; no environment/release/deployment write was performed in TASK-0180.

## Push
Normal `git push origin master` only after local validation. No force push, tag, release, version bump, NuGet publish, or deployment write.
