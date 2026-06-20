# TASK-0210: xunit analyzer warning cleanup

## Purpose
Clean up the remaining xUnit analyzer warnings observed during hosted RC/release validation after the successful `0.2.0-alpha.3` release, without changing product behavior or release state.

## Scope
- Start from the mandatory `ackit --help`, `ackit --version`, fetch/status, HEAD/origin, and recent-log checks.
- Read current state docs, TASK-0209, and the targeted test files before editing.
- Fix `xUnit1051` in `tests/AgentContextKit.Tests/McpStdioTransportTests.cs` by passing `TestContext.Current.CancellationToken` to async calls that accept cancellation tokens.
- Preserve any existing explicit timeout/cancellation semantics. If a test owns a `CancellationTokenSource`, keep that behavior and link to `TestContext.Current.CancellationToken` only where needed.
- Fix `xUnit2013` in `tests/AgentContextKit.Tests/WatchCommandTests.cs` by replacing the single collection-size `Assert.Equal(...)` assertion with the xUnit-preferred assertion while preserving the same semantic check.
- Run targeted tests first, then full local validation.
- Update this task and current-state docs with final evidence and the next recommended maintenance task.

## Out of scope
- No NuGet publish.
- No GitHub Release mutation.
- No tag creation, movement, or deletion.
- No release workflow dispatch.
- No release-candidate workflow dispatch.
- No version bump.
- No package metadata change.
- No release workflow, release asset, package validation artifact, or provenance evidence mutation.
- No unrelated source feature work.
- No large refactor.
- No automatic scan-finding redaction, deletion, or baseline acceptance.

## Affected files
- `docs/tasks/TASK-0210-xunit-analyzer-warning-cleanup.md`
- `tests/AgentContextKit.Tests/McpStdioTransportTests.cs`
- `tests/AgentContextKit.Tests/WatchCommandTests.cs`
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`
- Optional, only if the analyzer-warning backlog item is closed there:
  - `docs/ISSUE_BACKLOG.md`

## Data/database impact
None. The repository has no database or migrations in this task scope.

## Admin impact
None. No admin UI, repository settings, package ownership, security settings, or release settings are changed.

## Security impact
Neutral. This is focused test-source cleanup and documentation evidence. It does not alter scanner logic, redaction policy, release evidence, package state, or security settings.

## Permission/auth impact
No privileged operation is required beyond normal authenticated Git fetch/push if validation passes. No package, release, tag, workflow, owner, secret, security-setting, or recovery mutation is authorized.

## Localization impact
None. No runtime text, localized resources, or CLI output strings should change.

## SEO/i18n impact
None. Public package/readme status remains `0.2.0-alpha.3` published and unchanged.

## UX impact
No product UX change. The expected user-visible outcome is cleaner hosted/local validation output with the targeted xUnit analyzer warnings removed.

## Logging/audit impact
Adds task evidence for local/current remote HEAD, files changed, analyzer-warning cleanup, targeted/full validation, release-state immutability, and the next recommended task.

## Acceptance criteria
- TASK-0210 plan is committed before source/test implementation.
- Required first checks complete, or the task stops before edits if `git fetch origin` fails with a `.git` write error.
- `McpStdioTransportTests.cs` no longer emits the targeted `xUnit1051` warnings.
- `WatchCommandTests.cs` no longer emits the targeted `xUnit2013` warning.
- Existing test semantics are preserved, including cancellation behavior.
- Only focused test files are changed for implementation.
- Full local validation passes.
- State docs and this task record exact evidence.
- No release assets, tags, GitHub Release, NuGet package state, workflow dispatches, version, or package metadata are changed.
- Final raw porcelain is clean before push.

## Test steps
- Required first checks:

```powershell
ackit --help
ackit --version
git fetch origin
git status --porcelain=v1 --untracked-files=all 2>$null
git status --short
git rev-parse --short HEAD
git rev-parse HEAD
git rev-parse --short origin/master
git rev-parse origin/master
git log --oneline -n 40
```

- Warning-site inspection:

```powershell
rg -n "RunAsync|CancellationToken|TestContext\.Current\.CancellationToken|Assert\.Equal\(1|Assert\.Equal\(.*Count|Assert\.Single" tests/AgentContextKit.Tests/McpStdioTransportTests.cs tests/AgentContextKit.Tests/WatchCommandTests.cs
```

- Targeted tests:

```powershell
dotnet test tests/AgentContextKit.Tests/AgentContextKit.Tests.csproj -c Release --no-build --filter "FullyQualifiedName~McpStdioTransportTests|FullyQualifiedName~WatchCommandTests"
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test tests/AgentContextKit.Tests/AgentContextKit.Tests.csproj -c Release --no-build --filter "FullyQualifiedName~McpStdioTransportTests|FullyQualifiedName~WatchCommandTests"
```

- Full validation:

```powershell
dotnet restore AgentContextKit.sln
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build
ackit doctor
ackit scan --ci
git diff --check
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1
```

- Pattern verification:

```powershell
rg -n "Assert\.Equal\(1,\s*.*\.Count|Assert\.Equal\(.*\.Count" tests/AgentContextKit.Tests/WatchCommandTests.cs
rg -n "RunAsync\([^)]*\)" tests/AgentContextKit.Tests/McpStdioTransportTests.cs
```

## Risks
- Accidentally weakening cancellation/timeout coverage while satisfying `xUnit1051`.
- Replacing the collection-size assertion without preserving the same semantic check.
- Letting a stale `--no-build` targeted test appear to validate source edits before rebuilding.
- Expanding beyond focused analyzer-warning cleanup.
- Accidentally touching release, version, package, tag, GitHub Release, NuGet, or workflow state.

## Rollback plan
Before push, correct or revert the focused test/docs edits with normal commits. After push, use normal `git revert <sha>` for TASK-0210 commits if the cleanup is wrong. Do not move tags, replace release assets, republish NuGet packages, dispatch release workflows, or mutate GitHub Release/NuGet state.

## Completion notes
Completed as focused test-source cleanup plus evidence/state documentation.

Commits:
- Plan: `550506c` (`docs: plan task 0210 xunit analyzer cleanup`)
- Implementation: `3c38057` (`test: clean up xunit analyzer warnings`)
- Final evidence: this commit

Current HEAD/origin at final evidence collection:
- Local HEAD before this final evidence commit: `3c380573dd793f61c1d60dc43c1bb29add07fc30`
- Local HEAD short before this final evidence commit: `3c38057`
- `origin/master`: `f6b5c88091f3ae7d9b8b480999e5af5051270fea`
- `origin/master` short: `f6b5c88`

Files changed:
- `tests/AgentContextKit.Tests/McpStdioTransportTests.cs`
- `tests/AgentContextKit.Tests/WatchCommandTests.cs`
- `docs/tasks/TASK-0210-xunit-analyzer-warning-cleanup.md`
- `docs/NEXT_TASKS.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`
- `docs/ISSUE_BACKLOG.md`

xUnit1051 cleanup:
- Passed `TestContext.Current.CancellationToken` to `McpStdioTransport.RunAsync(...)` calls in `McpStdioTransportTests.cs`.
- Preserved the explicit cancellation test by using `CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken)`, canceling that linked source, and still passing the canceled token to `RunAsync`.
- `rg -n "RunAsync\([^)]*\)" tests/AgentContextKit.Tests/McpStdioTransportTests.cs` shows all ordinary calls use `TestContext.Current.CancellationToken`; the intentional cancellation test uses the linked `cts.Token`.

xUnit2013 cleanup:
- Replaced the targeted `Assert.Equal(1, report.SeverityChangedSample.Count)` with `Assert.Single(report.SeverityChangedSample)`.
- Replaced the remaining `Assert.Equal(25, report.AddedSample.Count)` collection-size assertion with `Assert.Collection(...)` so the requested pattern verification is clean while preserving the exact sample-size assertion.
- `rg -n "Assert\.Equal\(1,\s*.*\.Count|Assert\.Equal\(.*\.Count" tests/AgentContextKit.Tests/WatchCommandTests.cs` returned no matches.

Targeted test results:
- Initial requested no-build targeted run: passed, `43/43`.
- After Release build: `dotnet test tests/AgentContextKit.Tests/AgentContextKit.Tests.csproj -c Release --no-build --filter "FullyQualifiedName~McpStdioTransportTests|FullyQualifiedName~WatchCommandTests"` passed, `43/43`.

Full validation results:
- `dotnet restore AgentContextKit.sln`: passed; all projects up to date.
- `dotnet build AgentContextKit.sln -c Release --no-restore`: passed with `0` warnings and `0` errors.
- `dotnet test AgentContextKit.sln -c Release --no-build`: passed, `428/428`.
- `ackit doctor`: passed all checks.
- `ackit scan --ci`: exited `0`; existing Medium/Low review findings remain for `.remember` logs, retained `0.2.0-alpha.3` package-validation artifacts, and Low local-path references.
- `git diff --check`: passed; Git printed CRLF normalization notices for the modified test files.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1`: passed.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1`: passed; warned only that the working tree had uncommitted changes during evidence collection.
- `pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1`: passed; warned only that the working tree had uncommitted changes during evidence collection.

Release status:
- `AgentContextKit` `0.2.0-alpha.3` remains the current published GitHub/NuGet prerelease.
- NuGet package, tag `v0.2.0-alpha.3`, and GitHub prerelease remain unchanged.

Out-of-scope confirmation:
- No NuGet publish.
- No GitHub Release mutation.
- No tag creation, movement, or deletion.
- No release workflow dispatch.
- No release-candidate workflow dispatch.
- No version bump.
- No package metadata change.
- No release workflow, release asset, package validation artifact, or provenance evidence mutation.
- No automatic scan-finding redaction, destructive cleanup, or baseline acceptance.

Recommended next task:
- TASK-0211 scan-finding classification.
- Scope: classify current `ackit scan --ci` Medium/Low findings as real follow-up work, accepted local artifact review findings, or false positives without auto-redaction, destructive artifact cleanup, or baseline acceptance.
