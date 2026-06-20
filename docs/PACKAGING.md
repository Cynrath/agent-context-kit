# Packaging

AgentContextKit is designed to be packaged as a .NET tool with command name `ackit`.

## Package Metadata
Current package metadata is defined in `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj`.

Important fields:
- `PackageId`: `AgentContextKit`
- `ToolCommandName`: `ackit`
- `Version`: `0.2.0-alpha.3` local release-preparation candidate; current published package remains `0.2.0-alpha.2`
- `Authors`: `Cynrath`
- `PackageLicenseExpression`: `MIT`
- `PackageReadmeFile`: `README.md`
- `RepositoryType`: `git`
- `RepositoryUrl`: `https://github.com/Cynrath/agent-context-kit`
- `PackageProjectUrl`: `https://github.com/Cynrath/agent-context-kit`

Run the dedicated metadata review before pack or publish checks:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1
```

Use the failing gate before any public publish:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1 -FailOnIssues
```

See [NUGET_METADATA.md](NUGET_METADATA.md) for the field-by-field package metadata review.
See [RELEASE_BLOCKERS.md](RELEASE_BLOCKERS.md) before any public publish.

## Local Pack
```powershell
$pkg = Join-Path $env:TEMP "ackit-nupkg"
New-Item -ItemType Directory -Force -Path $pkg | Out-Null
dotnet pack src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release -o $pkg
```

## Temporary Tool Install
```powershell
$tools = Join-Path $env:TEMP "ackit-tools"
New-Item -ItemType Directory -Force -Path $tools | Out-Null
dotnet tool install AgentContextKit --tool-path $tools --add-source $pkg --version 0.2.0-alpha.3 --ignore-failed-sources
& (Join-Path $tools "ackit.exe") --help
& (Join-Path $tools "ackit.exe") sarif --output .ackit/reports/local-package.sarif
```

## Public NuGet Install
Install the published package from NuGet:

```powershell
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.2
ackit version
ackit --help
ackit scan --ci
```

## Current Published Package
The current published package is `0.2.0-alpha.2`. Public install commands and published-package smoke remain synchronized to that version until an authorized alpha.3 publish completes. Source/package metadata is prepared as the local `0.2.0-alpha.3` candidate for TASK-0203 validation.

## OIDC NuGet Publish
Version `0.2.0-alpha.2` has been published and install-verified. Future versions, including `0.2.0-alpha.3`, are published only from the reviewed exact commit after all gates pass, using the manual `.github/workflows/release.yml` workflow and the preconfigured `nuget-release` environment.

The workflow uses NuGet Trusted Publishing through `NuGet/login@v1`. API keys, repository secrets for package credentials, local environment credentials, and credential-bearing `NuGet.Config` files are prohibited.

See [RELEASE_AUTOMATION.md](RELEASE_AUTOMATION.md) for the dispatch, exact-SHA, idempotency, and recovery contract.

## Release Blockers
- For future releases, do not publish until `scripts/check-package-metadata.ps1 -FailOnIssues` exits `0`.
- For future releases, do not publish until `scripts/check-release-blockers.ps1 -FailOnBlockers` exits `0`.
- For future releases, do not publish until restore/build/test/pack/tool-path validation passes.
- For future releases, do not publish while `ackit scan` reports unaccepted high or critical findings.
- For future releases, do not publish until GitHub Actions are green, the GitHub Release page is ready, and maintainer approval is explicit.

Supply-chain review, package recovery, signing, SBOM, and provenance decisions are tracked in [SUPPLY_CHAIN_POLICY.md](SUPPLY_CHAIN_POLICY.md).
