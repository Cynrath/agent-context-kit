# TASK-0176 Final Validation And Hosted Check Sync

## Purpose
Run the full local validation suite, push the final state commit, and confirm the standard 3/3 hosted checks are green for the PROJECT-CONTROL-0108 final commit.

## Current State
- 257/257 local tests are green at the start of PROJECT-CONTROL-0108.
- Standard 3/3 hosted jobs (ci, cross-platform-smoke, cross-platform-source-smoke) are green for the current HEAD.
- `0.2.0-alpha.3` remains NO-GO.

## Evidence
- Local gates run during PROJECT-CONTROL-0108.
- Hosted Actions results from the implementation commits.

## Scope
- Run the full local validation suite.
- Update the active planning and handoff docs to record the final state.
- Push the final commit.
- Verify hosted 3/3 for the final commit.

## Out Of Scope
- Closing any release blocker.
- Any release write.
- Force-push or history rewrite.

## Affected Files
- `docs/NEXT_TASKS.md`
- `docs/PROJECT_EXECUTION_QUEUE.md`
- `docs/ROADMAP.md`
- `.codex/NEXT_STEPS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `CHANGELOG.md`
- Active task files

## Implementation Steps
1. Run the full local validation suite.
2. Update the planning and handoff docs to record the final state.
3. Commit and push the final state.
4. Inspect `gh run list` for the final commit and confirm 3/3 green.

## Security/Privacy Boundary
- No credential, private report content, raw finding, certificate, or recovery secret may be printed or committed.
- Generated `.ackit/`, SARIF, HTML, Web UI, prompt pack, and context export artifacts remain local-only and untracked.

## Backward Compatibility
- None; docs and gate outputs only.

## Acceptance Criteria
- Full local validation suite is green.
- Final commit message follows the active convention.
- Hosted 3/3 jobs are green for the final commit.
- Planning and handoff docs reference PROJECT-CONTROL-0108 closure and the final test count.

## Tests
- The full local gate set, including the contract, localization, performance, package, documentation, security, readiness, and release gate scripts.

## Validation
- `dotnet restore AgentContextKit.sln --nologo`
- `dotnet build AgentContextKit.sln -c Release --no-restore --nologo`
- `dotnet test AgentContextKit.sln -c Release --no-build --nologo`
- `dotnet run --project src/AgentContextKit.Cli -c Release --no-build -- scan --ci`
- `dotnet run --project src/AgentContextKit.Cli -c Release --no-build -- doctor`
- `powershell -ExecutionPolicy Bypass -File scripts/test-samples.ps1 -NoBuild`
- `powershell -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues`
- `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues`
- `powershell -ExecutionPolicy Bypass -File scripts/check-public-release-gates.ps1 -FailOnIssues`
- `powershell -ExecutionPolicy Bypass -File scripts/check-release-workflow.ps1 -FailOnIssues`
- `powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1 -FailOnIssues`
- `powershell -ExecutionPolicy Bypass -File scripts/check-config-generated-conventions.ps1 -FailOnIssues`
- `powershell -ExecutionPolicy Bypass -File scripts/check-json-contract-assets.ps1 -FailOnIssues`
- `powershell -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1 -FailOnIssues`
- `powershell -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1 -FailOnIssues`
- `powershell -ExecutionPolicy Bypass -File scripts/check-private-vulnerability-reporting.ps1 -FailOnIssues`
- `git diff --check`

## Rollback
Revert ordinary commits; never rewrite published packages or move existing tags.

## Completion Evidence
Pending. Will be filled after the final validation and hosted check sync.

## Commit
- `docs: record project control 0108 final state`

## Push
- Normal `master` push after validation.

## Hosted Checks
- ci
- cross-platform-smoke
- cross-platform-source-smoke
