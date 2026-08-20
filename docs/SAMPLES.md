# Samples

AgentContextKit includes small sample repositories under `samples/`.

The samples are designed for local scan and generated-doc experiments. They intentionally avoid secrets, environment files, uploads, backups, private keys, package artifacts, and generated build outputs.

## Available Samples
- `samples/dotnet-console`: .NET console stack detection.
- `samples/dotnet-minimal-api`: .NET Minimal API stack detection.
- `samples/node-tooling`: Node, TypeScript, and Tailwind CSS stack detection.
- `samples/generic-empty-repo`: minimal repository health-gap demo.
- `samples/security-fixture-repo`: safe security fixture wording and redact-check demo.
- `samples/ackit-optimize-demo`: synthetic nested instruction scopes, duplicates, safety conflict, valid override, stale/vague rules, and non-destructive proposal demo.

See [SAMPLE_GALLERY.md](SAMPLE_GALLERY.md) for detailed expected stacks, health gaps, generated files, and risk behavior.

## Scan The .NET Console Sample
```powershell
Push-Location samples/dotnet-console
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
Pop-Location
```

Expected stack signals:
- `.NET`

## Scan The Minimal API Sample
```powershell
Push-Location samples/dotnet-minimal-api
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
Pop-Location
```

Expected stack signals:
- `.NET`
- `ASP.NET Core`
- `ASP.NET Core Minimal API`

## Scan The Node Tooling Sample
```powershell
Push-Location samples/node-tooling
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
Pop-Location
```

Expected stack signals:
- `Node`
- `TypeScript`
- `Tailwind CSS`

## Scan The Empty Repository Sample
```powershell
Push-Location samples/generic-empty-repo
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor
Pop-Location
```

`doctor` can fail here because the sample intentionally lacks release-quality repository metadata.

## Scan The Security Fixture Sample
```powershell
Push-Location samples/security-fixture-repo
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- redact-check --profile public-release
Pop-Location
```

This sample contains no real secrets and avoids exact sensitive token-like prefixes.

## Audit The ACKit Optimize Demo

```powershell
Push-Location samples/ackit-optimize-demo
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- optimize --json --proposal .ackit/reports/optimized-instructions.md
Pop-Location
```

Expected behavior is recorded in [SAMPLE_GALLERY.md](SAMPLE_GALLERY.md). Generated `.ackit/` output remains local and ignored.

## Safety
Do not add secrets, `.env` files, dumps, backups, uploads, private keys, package outputs, `node_modules`, `bin`, or `obj` directories to samples.