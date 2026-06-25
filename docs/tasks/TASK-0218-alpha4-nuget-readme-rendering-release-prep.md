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
(To be filled during execution)

## Evidence
(To be filled during execution)
