# TASK-0215: NuGet README rendering cleanup

## Purpose
Fix the nuget.org package README rendering problem caused by using the GitHub README as the package README, and make the file ownership obvious to future coding agents.

## Problem
The GitHub README can use GitHub-supported HTML/layout markup. nuget.org does not render that surface the same way, so raw HTML can appear on the NuGet package page.

## Scope
- Add a dedicated root `README.nuget.md` for the NuGet package page.
- Keep root `README.md` as the GitHub repository README.
- Update `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj` so `PackageReadmeFile` points at `README.nuget.md` and packs that file into the package root.
- Update `scripts/check-package-metadata.ps1` so the metadata gate validates `README.nuget.md`.
- Update agent-facing documentation so agents understand that NuGet README changes live in `README.nuget.md` plus the CLI package project metadata.
- Update packaging and NuGet metadata docs.

## Out of scope
- No NuGet publish.
- No GitHub Release mutation.
- No tag creation, deletion, or movement.
- No republish of `0.2.0-alpha.3`.
- No release workflow dispatch.
- No broad GitHub README redesign.

## Affected files
- `README.nuget.md`
- `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj`
- `scripts/check-package-metadata.ps1`
- `AGENTS.md`
- `.cursor/rules/project.mdc`
- `docs/PACKAGING.md`
- `docs/NUGET_METADATA.md`
- `docs/tasks/TASK-0215-nuget-readme-rendering.md`

## Acceptance criteria
- NuGet package README content is pure Markdown and contains no raw HTML layout blocks.
- `PackageReadmeFile` points to `README.nuget.md`.
- `README.nuget.md` is explicitly packed into the package root.
- Package metadata gate expects `README.nuget.md`.
- Agent documentation names the exact files/folder paths to edit for NuGet package page changes.
- Existing published package, tag, and GitHub Release state are not mutated.

## Validation commands

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1 -FailOnIssues
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build
dotnet pack src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release
```

Package inspection should confirm `README.nuget.md` exists at package root.

## Completion notes
Pending validation on a local checkout or hosted PR checks. This task intentionally prepares source metadata only; the visible nuget.org page will change after a later authorized package publish.
