# Release Blockers

This document lists release blockers and follow-ups after the current GitHub and NuGet publication.

## Current Status
`v0.2.0-alpha.3` is published and verified.

- GitHub repository public: yes, `https://github.com/Cynrath/agent-context-kit`.
- `master` pushed: yes.
- `v0.2.0-alpha.3` tag pushed: yes.
- GitHub Release page for `v0.2.0-alpha.3`: completed as a pre-release.
- NuGet publish: completed.
- NuGet global tool install verification and package smoke for `0.2.0-alpha.3`: completed.
- Package metadata final URL: yes.
- Codex for OSS application submission: completed per maintainer-provided status.

## Blocking Items
No active release blockers remain for `v0.2.0-alpha.3`.

## Remaining Follow-Ups
- Keep `docs/CODEX_FOR_OSS_APPLICATION.md` as the submitted application pack/reference.
- Continue future roadmap planning from `docs/ROADMAP.md`.

## Resolved Items
- `RepositoryUrl` is `https://github.com/Cynrath/agent-context-kit`.
- `PackageProjectUrl` is `https://github.com/Cynrath/agent-context-kit`.
- `Authors` is `Cynrath`.
- `Company` is `Cynrath`.
- `PackageId` is `AgentContextKit`.
- `ToolCommandName` is `ackit`.
- `PackageLicenseExpression` is `MIT`.
- Public GitHub repository exists.
- `master` is pushed.
- `v0.2.0-alpha.3` is pushed.
- GitHub Actions latest `master` run was green for the release commit.
- Repository description matches the maintained release text.
- Repository topics include the maintained topic set.
- GitHub Release page exists for `v0.2.0-alpha.3`.
- NuGet package `AgentContextKit` version `0.2.0-alpha.3` is published.
- `dotnet tool install --global AgentContextKit --version 0.2.0-alpha.3` was verified.
- `ackit version` returned `AgentContextKit 0.2.0-alpha.3`.
- `ackit --help` was verified.

## Local Validation
The following checks validate local source and package readiness. They do not create GitHub releases or publish NuGet packages:

```powershell
dotnet restore AgentContextKit.sln
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build
dotnet run --project src/AgentContextKit.Cli -- scan --ci
dotnet run --project src/AgentContextKit.Cli -- doctor
powershell -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/audit-public-release.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-release-blockers.ps1 -FailOnBlockers
powershell -ExecutionPolicy Bypass -File scripts/check-public-release-gates.ps1 -FailOnIssues
```

## Install Verification
```powershell
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.3
ackit version
ackit --help
```

If the tool is already installed, use `dotnet tool update --global AgentContextKit --version 0.2.0-alpha.3` or a temporary `--tool-path` install.

## References
- [Create a NuGet package using MSBuild](https://learn.microsoft.com/en-us/nuget/create-packages/creating-a-package-msbuild)
- [Package authoring best practices](https://learn.microsoft.com/nuget/create-packages/package-authoring-best-practices#package-metadata)
- [dotnet tool install command](https://learn.microsoft.com/en-us/dotnet/core/tools/dotnet-tool-install)
