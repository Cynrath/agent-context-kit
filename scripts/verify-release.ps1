param(
    [string]$Configuration = "Release",
    [string]$Version = "1.0.0-rc.1"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$packageDir = Join-Path $env:TEMP "ackit-release-nupkg-$stamp"
$toolDir = Join-Path $env:TEMP "ackit-release-tools-$stamp"

function Invoke-Step {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "==> $Name"
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Name (exit code $LASTEXITCODE)"
    }
}

Push-Location $repoRoot
try {
    New-Item -ItemType Directory -Force -Path $packageDir, $toolDir | Out-Null

    Write-Host "AgentContextKit local release verification"
    Write-Host "Repository: $repoRoot"
    Write-Host "Package temp: $packageDir"
    Write-Host "Tool temp: $toolDir"

    Invoke-Step "dotnet restore" {
        dotnet restore AgentContextKit.sln
    }

    Invoke-Step "dotnet build" {
        dotnet build AgentContextKit.sln -c $Configuration --no-restore
    }

    Invoke-Step "dotnet test" {
        dotnet test AgentContextKit.sln -c $Configuration --no-build
    }

    Invoke-Step "ackit scan" {
        dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c $Configuration --no-build -- scan
    }

    Invoke-Step "ackit doctor" {
        dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c $Configuration --no-build -- doctor
    }

    Invoke-Step "release blocker review" {
        powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "check-release-blockers.ps1")
    }

    Invoke-Step "dotnet pack" {
        dotnet pack src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c $Configuration --no-build -o $packageDir
    }

    Invoke-Step "temporary tool install" {
        dotnet tool install AgentContextKit --tool-path $toolDir --add-source $packageDir --version $Version --ignore-failed-sources
    }

    $ackit = Join-Path $toolDir "ackit.exe"
    Invoke-Step "installed ackit help" {
        & $ackit --help
    }

    Invoke-Step "installed ackit scan json" {
        & $ackit scan --json
    }

    Write-Host ""
    Write-Host "Local release verification passed."
    Write-Host "Public release can still be blocked; review docs/RELEASE_BLOCKERS.md."
    Write-Host "Temporary folders were left in place for inspection:"
    Write-Host "- $packageDir"
    Write-Host "- $toolDir"
}
finally {
    Pop-Location
}
