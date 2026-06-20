param(
    [switch]$FailOnIssues
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "git-status.ps1")

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$projectPath = Join-Path $repoRoot "src\AgentContextKit.Cli\AgentContextKit.Cli.csproj"
$issues = New-Object System.Collections.Generic.List[string]
$publicBlockers = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$notes = New-Object System.Collections.Generic.List[string]

function Add-Issue {
    param([string]$Message)
    $issues.Add($Message) | Out-Null
}

function Add-PublicBlocker {
    param([string]$Message)
    $publicBlockers.Add($Message) | Out-Null
}

function Add-Warning {
    param([string]$Message)
    $warnings.Add($Message) | Out-Null
}

function Add-Note {
    param([string]$Message)
    $notes.Add($Message) | Out-Null
}

function Get-MetadataValue {
    param(
        [xml]$Project,
        [string]$Name
    )

    foreach ($group in $Project.Project.PropertyGroup) {
        $value = $group.$Name
        if ($null -ne $value -and -not [string]::IsNullOrWhiteSpace([string]$value)) {
            return [string]$value
        }
    }

    return $null
}

function Require-Path {
    param(
        [string]$RelativePath,
        [string]$Description
    )

    $path = Join-Path $repoRoot $RelativePath
    if (Test-Path $path) {
        Add-Note "$Description present: $RelativePath"
    }
    else {
        Add-Issue "$Description missing: $RelativePath"
    }
}

Write-Host "AgentContextKit v0.2 readiness review"
Write-Host "Repository: $repoRoot"

$requiredPaths = @(
    @{ Path = "docs\tasks\TASK-0011-v020-stack-detector-expansion.md"; Description = "Stack detector task" },
    @{ Path = "docs\tasks\TASK-0012-v020-risk-scanner-precision.md"; Description = "Risk scanner precision task" },
    @{ Path = "docs\tasks\TASK-0013-v020-json-schema-expansion.md"; Description = "JSON schema task" },
    @{ Path = "docs\tasks\TASK-0014-v020-expanded-generated-docs.md"; Description = "Generated docs task" },
    @{ Path = "docs\tasks\TASK-0015-v020-sample-repositories.md"; Description = "Sample repositories task" },
    @{ Path = "docs\tasks\TASK-0016-v020-nuget-metadata-hardening.md"; Description = "NuGet metadata task" },
    @{ Path = "docs\tasks\TASK-0017-v020-final-readiness-consolidation.md"; Description = "v0.2 readiness task" },
    @{ Path = "samples\dotnet-minimal-api\Sample.MinimalApi.csproj"; Description = ".NET Minimal API sample" },
    @{ Path = "samples\node-tooling\package.json"; Description = "Node tooling sample" },
    @{ Path = "docs\JSON_OUTPUT.md"; Description = "JSON output docs" },
    @{ Path = "docs\SAMPLES.md"; Description = "Samples docs" },
    @{ Path = "docs\NUGET_METADATA.md"; Description = "NuGet metadata docs" },
    @{ Path = "docs\RELEASE_BLOCKERS.md"; Description = "Release blockers docs" },
    @{ Path = "docs\RELEASE_VALIDATION.md"; Description = "Release validation docs" },
    @{ Path = "docs\MAINTAINER_RELEASE_HANDOFF.md"; Description = "Maintainer handoff docs" },
    @{ Path = "scripts\check-package-metadata.ps1"; Description = "Package metadata script" },
    @{ Path = "scripts\check-release-blockers.ps1"; Description = "Release blocker script" },
    @{ Path = "scripts\audit-public-release.ps1"; Description = "Public release audit script" },
    @{ Path = "scripts\verify-release.ps1"; Description = "Release verification script" }
)

foreach ($entry in $requiredPaths) {
    Require-Path -RelativePath $entry.Path -Description $entry.Description
}

if (-not (Test-Path $projectPath)) {
    Add-Issue "Package project file was not found: $projectPath"
}
else {
    [xml]$project = Get-Content $projectPath
    $repositoryUrl = Get-MetadataValue -Project $project -Name "RepositoryUrl"
    $packageProjectUrl = Get-MetadataValue -Project $project -Name "PackageProjectUrl"

    if ([string]::IsNullOrWhiteSpace($repositoryUrl) -or $repositoryUrl -match "TODO|example\.com|localhost") {
        Add-PublicBlocker "RepositoryUrl is missing or still a placeholder."
    }

    if ([string]::IsNullOrWhiteSpace($packageProjectUrl) -or $packageProjectUrl -match "TODO|example\.com|localhost") {
        Add-PublicBlocker "PackageProjectUrl is missing or still a placeholder."
    }
}

if (Get-Command git -ErrorAction SilentlyContinue) {
    Push-Location $repoRoot
    try {
        $tags = git tag --points-at HEAD 2>$null
        if ($LASTEXITCODE -eq 0 -and -not $tags) {
            Add-PublicBlocker "Current HEAD has no release tag."
        }

        $status = Get-GitWorkingTreeStatus
        if ($status.ExitCode -eq 0 -and $status.Lines) {
            Add-Warning "Working tree has uncommitted changes."
        }
    }
    finally {
        Pop-Location
    }
}
else {
    Add-Warning "git was not found; tag and working tree checks were skipped."
}

Write-Host ""
if ($issues.Count -eq 0) {
    Write-Host "No v0.2 readiness asset issues detected."
}
else {
    Write-Host "v0.2 readiness asset issues:"
    foreach ($issue in $issues) {
        Write-Host "- $issue"
    }
}

if ($publicBlockers.Count -gt 0) {
    Write-Host ""
    Write-Host "Public release blockers:"
    foreach ($blocker in $publicBlockers) {
        Write-Host "- $blocker"
    }
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "Warnings:"
    foreach ($warning in $warnings) {
        Write-Host "- $warning"
    }
}

if ($notes.Count -gt 0) {
    Write-Host ""
    Write-Host "Notes:"
    foreach ($note in $notes) {
        Write-Host "- $note"
    }
}

Write-Host ""
Write-Host "This review is local-only. It does not push, publish, tag, redact, delete, mutate files, or create remotes."

if ($FailOnIssues -and $issues.Count -gt 0) {
    Write-Host ""
    Write-Host "v0.2 readiness gate failed."
    exit 1
}

exit 0
