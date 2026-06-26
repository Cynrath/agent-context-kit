# AgentContextKit v0.2.0-alpha.4

`v0.2.0-alpha.4` is a prerelease update for the offline-first `ackit` .NET global tool.

## Highlights
- Ships the dedicated NuGet package README via `README.nuget.md`.
- Fixes the nuget.org README rendering path without weakening the GitHub README.
- Preserves alpha3 CLI behavior while updating the packaged prerelease version to `0.2.0-alpha.4`.
- Fixes the Windows test-created Unicode temp directory issue identified during validation.
- Keeps release validation, package metadata checks, and cross-platform source smoke coverage green.

## Install

```powershell
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.4
```

## Update

```powershell
dotnet tool update --global AgentContextKit --version 0.2.0-alpha.4
```

## Verify

```powershell
ackit --version
ackit doctor
ackit scan --ci
```

Expected version:

```text
AgentContextKit 0.2.0-alpha.4
```

## Notes
- Predecessor: `0.2.0-alpha.3`.
- Package README metadata points to `README.nuget.md`.
- This release was published through the authorized OIDC release workflow.
- No API-key publish was used.
