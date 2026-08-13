# TASK-0263: Remove nightly local check workflow

## Purpose

Retire the redundant scheduled GitHub Actions nightly local-check workflow and its workflow-specific test/dependency surface while keeping the standard push-triggered validation workflows unchanged.

## Current verified state and root cause

- `.github/workflows/nightly-local-check.yml` currently runs daily at `05:17 UTC` and can also be dispatched manually.
- Its build, test, scan, doctor, release-verification, and tracked-file checks overlap the repository's existing push-triggered validation and local verification commands.
- `NightlyWorkflowYamlGuardTests.cs` exists only to parse and assert this workflow's triggers.
- `YamlDotNet` is referenced only by that test, so retaining the package after removing the workflow would leave an unused test dependency.
- `docs/HOSTED_CHECKS.md` still describes the nightly workflow as active.
- Historical TASK-0185/TASK-0186 and handoff evidence truthfully records that the workflow previously existed and must remain historical evidence.

## Scope

- Delete `.github/workflows/nightly-local-check.yml`.
- Delete `tests/AgentContextKit.Tests/NightlyWorkflowYamlGuardTests.cs`.
- Remove the now-unused `YamlDotNet` test package reference.
- Remove the active nightly-workflow section from `docs/HOSTED_CHECKS.md`.
- Record TASK-0263 state and completion evidence in the task and current session handoff.
- Preserve historical task, queue, and handoff statements about TASK-0185/TASK-0186 as dated evidence.

## Out of scope

- Changing `ci.yml`, `cross-platform-smoke.yml`, `cross-platform-source-smoke.yml`, release workflows, or their trigger/security behavior.
- Deleting historical GitHub Actions runs or rewriting historical task evidence.
- Dispatching or rerunning any workflow.
- Publishing, deployment, package/version, tag, release, asset, attestation, settings, secret, or permission changes.

## Affected files

- `.github/workflows/nightly-local-check.yml` — delete.
- `tests/AgentContextKit.Tests/NightlyWorkflowYamlGuardTests.cs` — delete.
- `tests/AgentContextKit.Tests/AgentContextKit.Tests.csproj` — remove `YamlDotNet`.
- `docs/HOSTED_CHECKS.md` — remove the active nightly-workflow documentation.
- `docs/tasks/TASK-0263-remove-nightly-local-check-workflow.md` — task scope and evidence.
- `.codex/SESSION_HANDOFF.md` — current task/result handoff.

## Data/database impact

None. No persistent application data, schema, migration, or production data is involved.

## Security impact

No runtime security, authorization, or secret-handling behavior changes. The dedicated read-only scheduled workflow is removed; the standard push-triggered CI and smoke workflows remain unchanged.

## Permission/auth impact

Normal commit and `master` push were explicitly authorized by the user on 2026-08-13. No GitHub workflow dispatch/rerun, settings, token, environment, or permission mutation is authorized or required.

## Compatibility impact

No CLI, Core API, package, or runtime compatibility change. Test restore no longer downloads the workflow-only `YamlDotNet` dependency.

## Documentation impact

Current hosted-check documentation must stop advertising a workflow that no longer exists. Historical TASK-0185/TASK-0186 evidence remains unchanged.

## Deployment impact

No deployment. After a separately authorized normal push, GitHub will stop scheduling future runs from the removed workflow file; historical GitHub run records remain intact.

## Localization impact

None. No localized product text changes.

## UX impact

Repository maintainers will no longer see or maintain the duplicate nightly workflow. Normal push validation remains available.

## Logging/audit impact

Future nightly scan/doctor artifacts will no longer be generated. Existing hosted run history and historical repository evidence are preserved.

## Acceptance criteria

- `.github/workflows/nightly-local-check.yml` is absent.
- `NightlyWorkflowYamlGuardTests.cs` and all live references to that test are absent.
- `YamlDotNet` is absent from active project/package references.
- `docs/HOSTED_CHECKS.md` no longer describes the nightly workflow as active.
- The three standard push-triggered workflows and all release workflows are unchanged.
- Historical TASK-0185/TASK-0186 evidence is not rewritten.
- Release build succeeds with zero warnings/errors and the remaining full test suite passes.
- Repository release/documentation guards, ACKit doctor/scan, and `git diff --check` pass.
- Before any future push, the tracked-vs-untracked guard must pass after the task files are committed; during this authorized local-only change it may report only the intentionally uncommitted TASK-0263 task file.

## Test steps

- Focused absence/reference checks with `rg` and `git diff`.
- `dotnet restore AgentContextKit.sln`
- `dotnet build AgentContextKit.sln -c Release --no-restore`
- `dotnet test AgentContextKit.sln -c Release --no-build`
- `powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues`
- `ackit doctor`
- `ackit scan --ci`
- `git diff --check`

## Failure handling

Fix only failures caused by this removal and rerun the affected plus full gates. Record unrelated pre-existing failures separately; do not weaken validation or restore the retired workflow merely to make a check pass.

## Risks

- Scheduled validation coverage is intentionally reduced. Standard push-triggered CI, published-package smoke, current-source smoke, and local release checks remain available.
- Removing the package reference could expose an overlooked YAML consumer. Repository-wide reference search and full restore/build/test verify that no such consumer remains.

## Rollback plan

If maintainers later need scheduled validation again, restore the workflow, its focused guard coverage, documentation, and any required parser dependency in a normal reviewed successor change. Do not rewrite history.

## Completion notes

Status: Locally implemented and verified; authorized commit/push and post-push read-only CI verification are the remaining steps. Because this task file is part of that commit, the exact commit SHA and resulting workflow run IDs belong in the final completion report.

Implementation:

- Deleted `.github/workflows/nightly-local-check.yml`.
- Deleted `tests/AgentContextKit.Tests/NightlyWorkflowYamlGuardTests.cs`.
- Removed the workflow-only `YamlDotNet` package reference from the test project.
- Removed the active nightly-workflow section from `docs/HOSTED_CHECKS.md`.
- Preserved dated TASK-0185/TASK-0186 and historical handoff/queue evidence.

Verification on 2026-08-13:

- Active reference/absence check: PASS; no workflow, guard-test, `YamlDotNet`, or active hosted-doc reference remains.
- Workflow diff scope: PASS; `.github/workflows/nightly-local-check.yml` is the only changed workflow file.
- `dotnet restore AgentContextKit.sln`: PASS.
- Release build: PASS, 0 warnings and 0 errors.
- Full test suite: PASS, 461 passed, 0 failed, 0 skipped. The total is two lower because the two retired nightly guard tests were deleted.
- `scripts/verify-release.ps1`: exit 0; restore/build/test/package/install/scan/doctor gates passed. Its release-blocker review correctly reported the intentionally uncommitted working tree.
- Current-source doctor: 13/13 PASS.
- Current-source `scan --ci`: exit 0 over 662 files with only the previously reviewed 4 Medium and 5 Low findings.
- Restored test assets contain no `YamlDotNet` reference.
- `scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues`: expected pre-commit exit 1; its only untracked entry was this TASK-0263 task file. No push was attempted.
- Final installed ACKit doctor: 13/13 PASS.
- Final installed `ackit scan --ci`: exit 0 over 662 files with only the previously reviewed 4 Medium and 5 Low findings.
- Final pre-commit `git diff --check`: PASS. The authorized commit starts from synchronized `master`/`origin/master` at `0ae2418`; exact pushed SHA, remote equality, clean-tree guard, and hosted run evidence are recorded after they exist in the final completion report.

The user explicitly authorized a normal focused commit and `master` push after local verification. Workflow dispatch/rerun, deployment, release, package, tag, settings, secret, permission, or any other remote mutation remains out of scope.
