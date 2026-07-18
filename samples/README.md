# Samples

These sample repositories are small, safe fixtures for trying AgentContextKit scans.

They intentionally avoid secrets, environment files, uploads, backups, private keys, package artifacts, and generated build outputs.

## Samples
- `dotnet-console`: minimal .NET console stack detection.
- `dotnet-minimal-api`: .NET Minimal API stack detection.
- `node-tooling`: Node, TypeScript, and Tailwind CSS stack detection.
- `generic-empty-repo`: nearly empty repository health-gap demo.
- `security-fixture-repo`: safe security fixture wording without real secrets.
- `ackit-optimize-demo`: synthetic nested instruction scopes, duplicates, conflict, valid override, stale/vague rules, and proposal metrics.

See `../docs/SAMPLE_GALLERY.md` for expected stacks, health gaps, commands, generated files, and risk behavior.

## Scan Samples
From the repository root:

```powershell
Push-Location samples/dotnet-console
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
Pop-Location

Push-Location samples/dotnet-minimal-api
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
Pop-Location

Push-Location samples/node-tooling
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
Pop-Location

Push-Location samples/generic-empty-repo
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
Pop-Location

Push-Location samples/security-fixture-repo
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- redact-check --profile public-release
Pop-Location

Push-Location samples/ackit-optimize-demo
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- optimize --json --proposal .ackit/reports/optimized-instructions.md
Pop-Location
```
