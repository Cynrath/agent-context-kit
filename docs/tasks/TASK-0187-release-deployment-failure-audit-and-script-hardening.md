# TASK-0187: Release deployment failure audit and script hardening

## Purpose
Audit all visible `nuget-release` failed deployment entries reported from GitHub Actions release runs, document the root causes, and harden the local release verification scripts/workflow so the same non-mutating checks do not fail on supported runners.

This is a user-prioritized hotfix inserted before TASK-0181. It does not authorize a tag, GitHub Release creation, NuGet publication, deployment deletion, workflow rerun, or release environment mutation.

## Scope
In scope:
- Inspect all three failed `nuget-release` deployment entries with read-only GitHub CLI/API calls.
- Map each deployment to its release workflow run, job id, commit, and failing step.
- Fix local script/workflow defects that caused the failures:
  - release #4: Ubuntu `publish and create release` job called `powershell`, which was not installed.
  - release #5: `scripts/verify-published-package.ps1` passed a null path into `Join-Path` on Ubuntu when `$env:TEMP` was unavailable.
  - release #4 attempt 2: delayed failed-job rerun could not download the validated package because the one-day workflow artifact had expired.
- Add focused tests or script checks for the cross-platform temp-directory behavior and release workflow command contract.
- Update release docs/handoff notes with the deployment diagnosis and current limitations.

Out of scope:
- Rerun `release` workflow.
- Publish or republish NuGet packages.
- Create, move, or delete tags.
- Create/edit GitHub releases or release assets.
- Delete, mark successful, or otherwise mutate historical deployment status records.
- Restore expired historical GitHub Actions artifacts.
- Change package version metadata or select/prepare `0.2.0-alpha.3`.

## Affected Files
Expected:
- `scripts/verify-published-package.ps1`
- `.github/workflows/release.yml`
- Existing script checks such as `scripts/check-release-workflow.ps1` or focused tests under `tests/AgentContextKit.Tests/`
- `docs/tasks/TASK-0187-release-deployment-failure-audit-and-script-hardening.md`
- `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`, `.codex/NEXT_STEPS.md`, and `docs/NEXT_TASKS.md`

Possible, only if needed:
- Release validation docs that describe the verified package smoke boundary.

## DB Impact
None. This repository has no database schema or migration change for this task.

## Admin Impact
None locally. GitHub environment/release administration is explicitly out of scope.

## Permission Impact
No new permissions. The investigation uses read-only GitHub API/log reads. The workflow permission model must not be broadened.

## SEO / i18n Impact
No public SEO impact. No localized CLI text is expected to change.

## Audit / Security Impact
- Do not print tokens, NuGet API keys, OIDC tokens, or secret values.
- Do not commit generated logs or downloaded artifacts.
- Keep package verification temporary files under disposable temp directories unless explicitly retained by an existing flag.
- Historical failed deployment status records may remain visible because deleting or overwriting them is a remote mutation outside this task.

## Deployment Diagnosis
Observed read-only deployment entries:

| Deployment ID | Run | Job | Commit | Failure |
| --- | --- | --- | --- | --- |
| `5047180313` | release #4 / `27470495270` | `81200598792` | `ed9bf78c193381646cec583d079a22c952ab020c` | Ubuntu publish job invoked `powershell`; executable missing. |
| `5047227343` | release #5 / `27470659578` | `81201079722` | `f540479a92cbe66097f6796553828ee49ddd5512` | Published package verification failed with null `Path`. |
| `5047239131` | release #5 / `27470659578` | `81201198341` | `f540479a92cbe66097f6796553828ee49ddd5512` | Repeated published package verification failed with null `Path`. |

Additional rerun audit:
- release #4 attempt 2 reran only the failed `publish and create release` job as job `82217924071` on 2026-06-18.
- The publish job failed at `Download validated package` because artifact `7611911273` (`AgentContextKit-0.2.0-alpha.2`) expired at `2026-06-14T15:12:39Z`.
- The Node 20 deprecation and `punycode` warnings were non-blocking; the blocking failure was the missing expired artifact.

## Implementation Plan
1. Reproduce the `verify-published-package.ps1` temp-path selection issue locally by clearing temp environment variables in a controlled child PowerShell process where practical.
2. Replace temp-root selection with a deterministic cross-platform helper that prefers existing writable environment temp directories and falls back to `[System.IO.Path]::GetTempPath()` safely.
3. Ensure `Join-Path` is never called with a null or whitespace base path.
4. Confirm `release.yml` publish job uses `pwsh` consistently on Ubuntu and add/extend a local workflow contract check for this.
5. Extend validated package artifact retention enough to support delayed failed-job reruns without retaining release candidates indefinitely.
6. Add focused tests/checks so all failure classes are covered without live release writes.
7. Run local validation gates, commit, push, then verify normal hosted `master` workflows only.

## Acceptance Criteria
- All three deployment failures are documented with run/job/commit/root cause.
- `verify-published-package.ps1` works when `$env:TEMP` is absent but another safe temp source exists.
- `verify-published-package.ps1` reports a clear error when no temp directory can be resolved.
- `release.yml` does not invoke Windows-only `powershell` inside Ubuntu `publish and create release` steps.
- `release.yml` retains validated package workflow artifacts for at least 14 days so delayed failed-job reruns do not fail solely because the package artifact expired after one day.
- No release, tag, deployment, environment, or NuGet mutation is performed.
- Local validation passes and final `master` is clean/aligned with `origin/master`.

## Tests / Checks
Minimum:
- Focused temp-resolution test or script check for `verify-published-package.ps1`.
- Focused workflow-retention guard for validated package artifacts.
- `scripts/check-release-workflow.ps1 -FailOnIssues`.
- `dotnet build AgentContextKit.sln -c Release --no-restore`.
- Focused tests for changed behavior.
- `dotnet test AgentContextKit.sln -c Release --no-build`.
- Source `ackit scan --ci`.
- Source `ackit doctor`.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues`.
- `git diff --check`.
- `scripts/verify-release.ps1`.

## Risks
- Live package verification can depend on NuGet availability; tests should isolate helper behavior where possible.
- Historical GitHub deployment records may still show failed because this task does not mutate remote deployment status.
- Re-running release workflow would be unsafe without explicit maintainer authorization and remains out of scope.
- Longer workflow artifact retention slightly increases the window where validated package candidates are downloadable by authorized repository users; the package is intended for public release and the retention remains finite.

## Rollback
- Revert the implementation/docs commits with `git revert <commit>`.
- No database, package, tag, deployment, or release rollback is required because the task performs no remote write.

## Completion Notes
Completed locally on 2026-06-18.

Commits:
- Planning: `fa45c0b` (`docs: plan release deployment failure hotfix`).
- Implementation: `7a0e1f8` (`test: guard release deployment verification`).

Read-only deployment audit:
- `5047180313` maps to release #4 run `27470495270`, job `81200598792`, commit `ed9bf78c193381646cec583d079a22c952ab020c`; failure was Ubuntu `publish and create release` invoking Windows-only `powershell`.
- `5047227343` maps to release #5 run `27470659578`, job `81201079722`, commit `f540479a92cbe66097f6796553828ee49ddd5512`; failure was published-package verification with null `Path`.
- `5047239131` maps to release #5 run `27470659578`, job `81201198341`, commit `f540479a92cbe66097f6796553828ee49ddd5512`; failure repeated the published-package verification null `Path`.
- release #4 attempt 2 job `82217924071` failed at `Download validated package` because artifact `7611911273` expired on 2026-06-14 after the original one-day retention window.

Implementation:
- `scripts/verify-published-package.ps1` now resolves temp roots through a writable lazy helper: `RUNNER_TEMP`, `TEMP`, `TMPDIR`, then guarded `.NET` temp fallback.
- `scripts/verify-published-package.ps1` exposes `-TempResolutionSelfTest` for local non-network regression coverage.
- `scripts/verify-existing-release.ps1` uses the same lazy writable temp helper for release asset verification.
- `scripts/check-release-workflow.ps1` rejects Windows-only `powershell` calls inside the Ubuntu publish job and requires verifier temp self-test coverage.
- `.github/workflows/release.yml` retains validated package artifacts for 14 days.
- `ReleaseDeploymentFailureGuardTests` covers runner-temp fallback with `TEMP`/`TMPDIR` cleared, a negative workflow mutation containing `powershell` in the publish job, and a negative one-day artifact-retention mutation.

Validation:
- `dotnet build AgentContextKit.sln -c Release --no-restore` — passed, 0 warnings, 0 errors.
- Focused `ReleaseDeploymentFailureGuardTests` — passed, 3/3.
- `dotnet test AgentContextKit.sln -c Release --no-build` — passed, 296/296.
- Source `ackit scan --ci` — exit 0; existing `.remember` Medium findings only.
- Source `ackit doctor` — 13/13 PASS.
- `scripts/check-release-workflow.ps1 -FailOnIssues` — passed.
- `scripts/verify-published-package.ps1 -Version 0.0.0-test -TempResolutionSelfTest` — passed.
- `scripts/test-release-recovery.ps1` — passed.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` — passed after implementation commit.
- `git diff --check` — passed.
- `scripts/verify-release.ps1` — passed.

Remote note:
- Historical `nuget-release` failed deployment records remain visible because this task did not mutate deployments, releases, tags, or NuGet state.
- Pushed HEAD `85a14d9b9b47a832761befced80399617f56c573` passed hosted `master` workflows before the artifact-retention follow-up: `ci` run `27784382934`, `cross-platform-source-smoke` run `27784382902`, and `cross-platform-smoke` run `27784382871`.
- Hosted verification for the artifact-retention follow-up is pending push.
