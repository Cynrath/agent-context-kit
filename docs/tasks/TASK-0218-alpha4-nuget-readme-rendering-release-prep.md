# TASK-0218: Alpha4 NuGet README rendering release prep

## Purpose
Prepare, but do not publish, `AgentContextKit 0.2.0-alpha.4` as the next prerelease package candidate whose main purpose is to ship the dedicated `README.nuget.md` package README rendering fix introduced by PR #1 / TASK-0215.

## Scope
- Update source/package version from `0.2.0-alpha.3` to `0.2.0-alpha.4`.
- Update package release notes for alpha4.
- Build and pack local alpha4 candidate.
- Validate local package metadata and contents.
- Validate local install smoke.
- Update docs/handoff to say alpha4 is prepared locally, not published.
- Update source smoke workflow version pin to match new source version.

## Out of scope (absolute prohibitions)
- No NuGet publish.
- No GitHub Release creation or mutation.
- No tag creation, movement, or deletion.
- No release workflow dispatch.
- No release-candidate workflow dispatch.
- No manual workflow dispatch.
- No GitHub Release asset mutation.
- No republish of `0.2.0-alpha.3`.
- No external release state mutation.
- No broad README redesign.
- No unrelated source changes.
- No deletion of release evidence artifacts.

## Affected files

### Source version bump
- `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj` - `<Version>` and `PackageReleaseNotes`
- `src/AgentContextKit.Cli/Program.cs` - `Version` constant
- `src/AgentContextKit.Core/Templates.cs` - generated config version strings
- `.github/workflows/cross-platform-source-smoke.yml` - version pin for source build install

### Test/script version assertions
- `tests/AgentContextKit.Tests/AgentContextKitBehaviorTests.cs` - alpha3 version assertions
- `tests/AgentContextKit.Tests/IssueTemplateVersionPlaceholderTests.cs` - `CurrentVersion` constant
- `scripts/check-package-metadata.ps1` - `ExpectedVersion` default parameter

### Issue template placeholders
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/docs_improvement.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/security_hardening.yml`

### Docs/handoff updates
- `docs/tasks/TASK-0218-alpha4-nuget-readme-rendering-release-prep.md` - this file
- `docs/PACKAGING.md`
- `docs/NUGET_METADATA.md`
- `docs/NEXT_TASKS.md`
- `docs/ISSUE_BACKLOG.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Not affected (protected)
- `README.nuget.md` - no change needed; already uses `<package-version>` placeholder
- `README.md` - describes published version (alpha3); no change
- `README.tr.md` - describes published version (alpha3); no change
- `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/project.mdc`, `.github/copilot-instructions.md` - describe published state; keep alpha3
- `.github/workflows/cross-platform-smoke.yml` - installs published alpha3; keep
- Historical task docs - keep alpha3 references
- `CHANGELOG.md` - historical entries; keep
- `scripts/verify-release.ps1` - default is published version; keep

## Acceptance criteria
- Source/package version is updated to `0.2.0-alpha.4`.
- Local `.nupkg` candidate is built and verified.
- Package contains `README.nuget.md` at package root.
- Package metadata validation passes.
- Local install smoke passes (`ackit --version` reports `0.2.0-alpha.4`).
- `ackit doctor` and `ackit scan --ci` pass.
- Full test suite passes (428/428).
- Documentation clearly states alpha4 is prepared locally, not published.
- `0.2.0-alpha.3` remains the current published version.
- No tag, release, or NuGet mutation occurs.

## Validation commands

```powershell
dotnet restore AgentContextKit.sln
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build
powershell -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1 -FailOnIssues
dotnet pack src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build
```

Package contents inspection, local install smoke, and full validation are defined in the task execution.

## Completion notes

### Source version updated to 0.2.0-alpha.4
- `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj`: `<Version>` changed to `0.2.0-alpha.4`, release notes updated
- `src/AgentContextKit.Cli/Program.cs`: `Version` constant changed to `0.2.0-alpha.4`
- `src/AgentContextKit.Core/Templates.cs`: Continue config version strings updated to `0.2.0-alpha.4`
- `.github/workflows/cross-platform-source-smoke.yml`: source install pin updated to `0.2.0-alpha.4`

### Tests/scripts updated
- `tests/AgentContextKit.Tests/AgentContextKitBehaviorTests.cs`: all version assertions and `PackageReleaseNotes` assertion updated
- `tests/AgentContextKit.Tests/IssueTemplateVersionPlaceholderTests.cs`: `CurrentVersion` constant updated
- `scripts/check-package-metadata.ps1`: default `ExpectedVersion` parameter updated

### Issue templates updated
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/docs_improvement.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/security_hardening.yml`
All version placeholders updated to `0.2.0-alpha.4`.

### Docs/handoff updated
- `docs/tasks/TASK-0218-alpha4-nuget-readme-rendering-release-prep.md` (this file)
- `docs/PACKAGING.md`: version line updated to show alpha4 as prepared candidate
- `docs/NUGET_METADATA.md`: status updated to show alpha4 prepared, alpha3 published
- `docs/NEXT_TASKS.md`: current task set to TASK-0218
- `docs/ISSUE_BACKLOG.md`: items 15-16 updated
- `.codex/SESSION_HANDOFF.md`: current task updated
- `.codex/CONTEXT_PACK.md`: current task updated
- `.codex/NEXT_STEPS.md`: entries 51-53 added for TASK-0216/0217/0218

### Protected files verified unchanged
- `README.nuget.md`: NOT modified
- `README.md`: NOT modified
- `README.tr.md`: NOT modified
- `AGENTS.md`, `CLAUDE.md`: historical alpha3 references kept
- `.github/workflows/cross-platform-smoke.yml`: published alpha3 pin kept
- Historical task docs: alpha3 references kept
- Scripts/verify-release.ps1: alpha3 default kept

### Package validation
| Check | Result |
|-------|--------|
| `dotnet restore` | PASS |
| `dotnet build -c Release --no-restore` | 0 warnings, 0 errors |
| `dotnet test -c Release --no-build` | 428/428 PASS |
| `check-package-metadata.ps1 -FailOnIssues` | PASS (no issues) |
| `dotnet pack -c Release --no-build` | `AgentContextKit.0.2.0-alpha.4.nupkg` + `.snupkg` created |
| Package contains `README.nuget.md` at root | YES (2929 bytes) |
| Nuspec package id | `AgentContextKit` |
| Nuspec version | `0.2.0-alpha.4` |
| Nuspec readme | `README.nuget.md` |
| Local install smoke (`ackit --version`) | `AgentContextKit 0.2.0-alpha.4` |
| Local install smoke (`ackit doctor`) | 13/13 PASS |
| Local install smoke (`ackit scan --ci`) | exit 0, Medium/Low only |
| `git diff --check` | CRLF warnings only |
| `check-tracked-vs-untracked-md.ps1` | PASS (0 untracked) |
| `check-local-markdown-links.ps1 -FailOnIssues` | PASS (no broken targets) |
| `check-localization-parity.ps1` | PASS (exit 0) |
| `check-release-workflow.ps1 -FailOnIssues` | PASS (exit 0) |
| Windows Unicode temp guard | PASS (0 weird dirs) |

### Release status (unchanged)
- `AgentContextKit 0.2.0-alpha.3` remains published and verified
- `v0.2.0-alpha.3` tag and GitHub prerelease target `92984c6448332aa24b7cff94647f627bf944e535`
- No version/tag/GitHub Release/NuGet/workflow dispatch mutation occurred
- `0.2.0-alpha.4` is prepared locally as a candidate, NOT published

## Evidence

### Current state
- Local HEAD: (after implementation and evidence commits)
- Origin HEAD: `840c08ff8450c8302dafb348b3ab35f31aca71c5`
- Working tree: clean (after commits)

### Commits created
1. `217432a` - docs: plan task 0218 alpha4 release prep
2. (implementation) - chore: prepare alpha4 package candidate
3. (evidence) - docs: record task 0218 evidence

### Files changed
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`
- `.codex/SESSION_HANDOFF.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/docs_improvement.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/security_hardening.yml`
- `.github/workflows/cross-platform-source-smoke.yml`
- `docs/ISSUE_BACKLOG.md`
- `docs/NEXT_TASKS.md`
- `docs/NUGET_METADATA.md`
- `docs/PACKAGING.md`
- `docs/tasks/TASK-0218-alpha4-nuget-readme-rendering-release-prep.md`
- `scripts/check-package-metadata.ps1`
- `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj`
- `src/AgentContextKit.Cli/Program.cs`
- `src/AgentContextKit.Core/Templates.cs`
- `tests/AgentContextKit.Tests/AgentContextKitBehaviorTests.cs`
- `tests/AgentContextKit.Tests/IssueTemplateVersionPlaceholderTests.cs`

### Recommended next tasks
- TASK-0219: hosted release-candidate evidence for exact alpha4 candidate commit
- TASK-0220: authorized 0.2.0-alpha.4 publish, only after hosted RC evidence passes and maintainer explicitly approves publish
