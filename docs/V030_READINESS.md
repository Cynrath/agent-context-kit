# Historical v0.3 Milestone Readiness

This document records an early internal milestone that used the v0.3 label for CI mode, exit code standardization, HTML reports, example workflows, and local readiness orchestration. Those capabilities were first published before alpha.3 and are included in the current `v0.2.0-alpha.3` package.

The future v0.3 package direction is a separate product decision focused on baseline-aware CI policy and configuration diagnostics. See `docs/V030_ROADMAP_DECISION.md`.

This page consolidates the local review after these completed work areas:
- CI mode with `ackit scan --ci`.
- Exit code standardization.
- Offline static HTML reports with `ackit report`.
- Example workflow documentation.
- Public release gate orchestration.

## Local Readiness Review
Run the v0.3 readiness check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v030-readiness.ps1
```

Run it as a failing gate for missing v0.3 assets:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v030-readiness.ps1 -FailOnIssues
```

`-FailOnIssues` fails only for missing v0.3 readiness assets. It reports public-release blockers separately because those require maintainer-only decisions.

## Current Public State
- Repository and package URLs are finalized at `https://github.com/Cynrath/agent-context-kit`.
- Current published release is `v0.2.0-alpha.4` on GitHub and NuGet. Predecessor `v0.2.0-alpha.3` remains published and immutable.
- Future package publication, tags, and GitHub Release changes remain maintainer-only actions.

## Required Validation
Use these commands before treating v0.3 local readiness as reviewed:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v030-readiness.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-public-release-gates.ps1
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build
dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci
dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- report --output .ackit/reports/v030-readiness.html --json
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
```

Use the failing public gate to verify the current local tree remains release-clean:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-public-release-gates.ps1 -FailOnIssues
```

## Status
The historical milestone is complete. New v0.3 implementation work must follow `docs/V030_ROADMAP_DECISION.md` and use new task files rather than reopening TASK-0018 through TASK-0023.
