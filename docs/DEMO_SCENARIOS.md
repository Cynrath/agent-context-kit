# Demo Scenarios

Optional external-tool demos are not part of the standard scenarios. Any future example must use the synthetic, no-secret, no-PAT, no-commit process in `docs/DISPOSABLE_EXTERNAL_WORKFLOW_LAB.md`.

These scenarios show safe, local ways to try AgentContextKit. They do not push, tag, publish NuGet packages, create GitHub Releases, upload SARIF, or call remote LLM providers.

## Published Package Demo
Use the published NuGet package for stable commands:

```powershell
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.3
ackit version
ackit --help
ackit scan --ci
ackit doctor
```

Published package note: NuGet `0.2.0-alpha.3` includes `ackit sarif`.

## Source Demo
Use the published package or current source for SARIF:

```powershell
dotnet restore AgentContextKit.sln
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet run --project src/AgentContextKit.Cli -- scan --ci
dotnet run --project src/AgentContextKit.Cli -- sarif --output .ackit/reports/demo.sarif
Get-Content .ackit/reports/demo.sarif | ConvertFrom-Json
```

`ackit sarif` is available in current source and the `0.2.0-alpha.3` package.

## Sample Gallery Demo
Run sample scans from each sample directory because the CLI currently scans the current working directory.

```powershell
Push-Location samples/dotnet-console
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci
Pop-Location

Push-Location samples/node-tooling
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci
Pop-Location

Push-Location samples/security-fixture-repo
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- redact-check --profile public-release
Pop-Location
```

See [SAMPLE_GALLERY.md](SAMPLE_GALLERY.md).

## Scanner Rule Catalog Demo
Review the rule catalog and config allowlist behavior:

```powershell
dotnet run --project src/AgentContextKit.Cli -- scan --json
```

Finding objects include stable `ruleId` values when findings are present. See [SCANNER_RULES.md](SCANNER_RULES.md) and [CONFIGURATION.md](CONFIGURATION.md) for `safeDomains`, `ignoredPaths`, and `ignoredFindingIds`.

## Web UI Demo
Create a local-only Web UI file:

```powershell
dotnet run --project src/AgentContextKit.Cli -- webui --output .ackit/webui/demo.html
```

The generated file is local-only, can include local repository paths, and should not be shared as a public release artifact.

For public preview and screenshot rules, see [WEB_UI_PREVIEW.md](WEB_UI_PREVIEW.md) and [VISUAL_ASSETS.md](VISUAL_ASSETS.md).

## Report Demo
Create a local-only HTML report:

```powershell
dotnet run --project src/AgentContextKit.Cli -- report --output .ackit/reports/demo.html
```

Do not commit `.ackit/reports/` output.

If a report screenshot is needed for docs, capture and sanitize the screenshot separately. Do not commit the generated HTML report.

## SARIF Demo
Create SARIF from current source:

```powershell
dotnet run --project src/AgentContextKit.Cli -- sarif --output .ackit/reports/demo.sarif --json
Get-Content .ackit/reports/demo.sarif | ConvertFrom-Json
```

GitHub Code Scanning upload remains documentation-only. See:
- [SARIF_OUTPUT.md](SARIF_OUTPUT.md)
- [examples/github-actions-sarif-upload.yml](examples/github-actions-sarif-upload.yml)

Review SARIF before upload because Code Scanning is a repository integration surface.
