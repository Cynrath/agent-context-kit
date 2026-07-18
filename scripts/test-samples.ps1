param(
    [switch]$NoBuild
)

$ErrorActionPreference = "Stop"

$repo = Split-Path -Parent $PSScriptRoot
$cliProject = Join-Path $repo "src/AgentContextKit.Cli/AgentContextKit.Cli.csproj"

$samples = @(
    @{
        Name = "dotnet-console"
        Path = "samples/dotnet-console"
        Commands = @(
            @{ Args = @("scan", "--ci") }
        )
    },
    @{
        Name = "dotnet-minimal-api"
        Path = "samples/dotnet-minimal-api"
        Commands = @(
            @{ Args = @("scan", "--ci") }
        )
    },
    @{
        Name = "node-tooling"
        Path = "samples/node-tooling"
        Commands = @(
            @{ Args = @("scan", "--ci") }
        )
    },
    @{
        Name = "generic-empty-repo"
        Path = "samples/generic-empty-repo"
        Commands = @(
            @{ Args = @("scan", "--ci") }
        )
    },
    @{
        Name = "security-fixture-repo"
        Path = "samples/security-fixture-repo"
        Commands = @(
            @{ Args = @("scan", "--ci") },
            @{ Args = @("redact-check", "--profile", "public-release") }
        )
    },
    @{
        Name = "ackit-optimize-demo"
        Path = "samples/ackit-optimize-demo"
        Commands = @(
            @{ Args = @("optimize", "--json") }
        )
    }
)

if (-not $NoBuild) {
    dotnet build (Join-Path $repo "AgentContextKit.sln") -c Release --no-restore
}

foreach ($sample in $samples) {
    $samplePath = Join-Path $repo $sample.Path
    if (-not (Test-Path -LiteralPath $samplePath)) {
        throw "Missing sample path: $($sample.Path)"
    }

    Push-Location $samplePath
    try {
        foreach ($command in $sample.Commands) {
            $commandArgs = [string[]]$command.Args
            Write-Host "==> $($sample.Name): ackit $($commandArgs -join ' ')"
            dotnet run --project $cliProject -c Release --no-build -- @commandArgs
            if ($LASTEXITCODE -ne 0) {
                throw "Sample command failed for $($sample.Name): $($commandArgs -join ' ')"
            }
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host "Sample smoke checks passed."
