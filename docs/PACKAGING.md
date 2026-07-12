# Packaging

AgentContextKit is designed to be packaged as a .NET tool with command name `ackit`.

## Package Metadata
Current package metadata is defined in `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj`.

Important fields:
- `PackageId`: `AgentContextKit`
- `ToolCommandName`: `ackit`
- `Version`: `1.0.0-rc.1` (NuGet published; tag/GitHub prerelease/provenance incomplete); latest complete release is `0.2.0-alpha.4`
- `Authors`: `Cynrath`
- `PackageLicenseExpression`: `MIT`
- `PackageReadmeFile`: `README.nuget.md`
- `RepositoryType`: `git`
- `RepositoryUrl`: `https://github.com/Cynrath/agent-context-kit`
- `PackageProjectUrl`: `https://github.com/Cynrath/agent-context-kit`

## README Files

The repository intentionally has two README surfaces:

- `README.md` is the GitHub repository README and may use GitHub-supported layout markup.
- `README.nuget.md` is the NuGet package README and must stay pure Markdown so nuget.org renders it cleanly.

The NuGet README is wired from `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj` through `PackageReadmeFile` and an explicit package-root packing entry. If the nuget.org README page needs a correction, update `README.nuget.md`, the CLI `.csproj`, `scripts/check-package-metadata.ps1`, and `docs/NUGET_METADATA.md` together.

The metadata gate now rejects raw HTML/layout elements, CSS attributes, and relative image paths in `README.nuget.md`. Repository `README.md` and `README.tr.md` may use GitHub-supported presentation markup; that markup must not leak into the packed NuGet README.

Published NuGet versions are immutable for README corrections. A visible nuget.org README fix requires a later authorized package publish; do not move tags, replace release assets, or republish an existing version.

The TASK-0246 source README polish does not change the README embedded in already-published `1.0.0-rc.1`. It prepares a better renderer-safe source for a future separately authorized package version.

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
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.4
ackit version
ackit --help
ackit scan --ci
```

## Current Published Package
The current published package is `0.2.0-alpha.4`.

Publication evidence:
- Publish SHA: `98cdf9723a509a347bd0403f6373dafe81ba03fb`.
- NuGet package verification passed through `scripts/verify-published-package.ps1 -Version 0.2.0-alpha.4`.
- Global tool install from NuGet passed and `ackit --version` returned `AgentContextKit 0.2.0-alpha.4`.
- Tag `v0.2.0-alpha.4` and GitHub prerelease `v0.2.0-alpha.4` target `98cdf9723a509a347bd0403f6373dafe81ba03fb`.

## OIDC NuGet Publish
Version `0.2.0-alpha.4` has been published and install-verified. It is the exact predecessor for prepared candidate `1.0.0-rc.1`. Future publication is allowed only from the reviewed exact commit after all gates pass and a separate authorization, using the manual `.github/workflows/release.yml` workflow and the preconfigured `nuget-release` environment.

The workflow uses NuGet Trusted Publishing through `NuGet/login@v1`. API keys, repository secrets for package credentials, local environment credentials, and credential-bearing `NuGet.Config` files are prohibited.

TASK-0206 publish-path note: `operation=publish` completed package/tag/release creation in staged recovery runs, but the post-publish provenance probe failed before attestation. `release.yml` `operation=verify-existing` run `27870813763` succeeded for the immutable release state. TASK-0208 hardened the provenance probe for future releases without mutating alpha.3 package/tag/release state.

See [RELEASE_AUTOMATION.md](RELEASE_AUTOMATION.md) for the dispatch, exact-SHA, idempotency, and recovery contract.

## Release Blockers
- For future releases, do not publish until `scripts/check-package-metadata.ps1 -FailOnIssues` exits `0`.
- For future releases, do not publish until `scripts/check-release-blockers.ps1 -FailOnBlockers` exits `0`.
- For future releases, do not publish until restore/build/test/pack/tool-path validation passes.
- For future releases, do not publish while `ackit scan` reports unaccepted high or critical findings.
- For future releases, do not publish until GitHub Actions are green, the GitHub Release page is ready, and maintainer approval is explicit.

Supply-chain review, package recovery, signing, SBOM, and provenance decisions are tracked in [SUPPLY_CHAIN_POLICY.md](SUPPLY_CHAIN_POLICY.md).
