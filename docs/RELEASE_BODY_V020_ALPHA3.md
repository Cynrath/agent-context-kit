# AgentContextKit v0.2.0-alpha.3

`v0.2.0-alpha.3` is a prerelease update for the offline-first `ackit` .NET global tool.

## Highlights
- Ships the published package for MCP stdio transport, `ackit.rules`, `ackit watch`, `ackit diff`, `ackit trim`, and scan include/exclude filters.
- Adds release-hardening scripts and release blocker evidence cleanup accumulated after `0.2.0-alpha.2`.
- Release build and 428 automated tests pass cleanly.
- Cross-platform published-package and source-package smoke verified on Windows, Ubuntu, and macOS.

## Install

```powershell
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.3
```

## Verify

```powershell
ackit --version
ackit doctor
ackit scan --ci
```

Expected version:

```text
AgentContextKit 0.2.0-alpha.3
```

## Notes
- Predecessor: `0.2.0-alpha.2`.
- Published through the authorized OIDC release workflow.
