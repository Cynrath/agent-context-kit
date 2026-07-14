param(
    [switch]$FailOnBlockers
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "git-status.ps1")

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$projectPath = Join-Path $repoRoot "src\AgentContextKit.Cli\AgentContextKit.Cli.csproj"
$releaseTag = "v1.0.0-rc.1"
$blockers = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]

function Add-Blocker {
    param([string]$Message)
    $blockers.Add($Message) | Out-Null
}

function Add-Warning {
    param([string]$Message)
    $warnings.Add($Message) | Out-Null
}

function Get-PackageMetadataValue {
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

Write-Host "AgentContextKit release blocker review"
Write-Host "Repository: $repoRoot"

if (-not (Test-Path $projectPath)) {
    Add-Blocker "Package project file was not found: $projectPath"
}
else {
    [xml]$project = Get-Content $projectPath
    $repositoryUrl = Get-PackageMetadataValue -Project $project -Name "RepositoryUrl"
    $packageProjectUrl = Get-PackageMetadataValue -Project $project -Name "PackageProjectUrl"

    if ([string]::IsNullOrWhiteSpace($repositoryUrl)) {
        Add-Blocker "RepositoryUrl is missing."
    }
    elseif ($repositoryUrl -match "TODO|example\.com|localhost") {
        Add-Blocker "RepositoryUrl is still a placeholder: $repositoryUrl"
    }

    if ([string]::IsNullOrWhiteSpace($packageProjectUrl)) {
        Add-Blocker "PackageProjectUrl is missing."
    }
    elseif ($packageProjectUrl -match "TODO|example\.com|localhost") {
        Add-Blocker "PackageProjectUrl is still a placeholder: $packageProjectUrl"
    }
}

if (Get-Command git -ErrorAction SilentlyContinue) {
    Push-Location $repoRoot
    try {
        $status = Get-GitWorkingTreeStatus
        if ($status.ExitCode -eq 0 -and $status.Lines) {
            Add-Blocker "Working tree has uncommitted changes."
        }

        $releaseTagCommit = git rev-parse "$releaseTag^{commit}" 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($releaseTagCommit)) {
            Add-Blocker "Release tag $releaseTag was not found locally."
        }

        $tags = git tag --points-at HEAD 2>$null
        if ($LASTEXITCODE -eq 0 -and -not ($tags -contains $releaseTag)) {
            Add-Warning "Current HEAD is not $releaseTag; this can be valid for post-push documentation sync. Remote tag verification is manual."
        }
    }
    finally {
        Pop-Location
    }
}
else {
    Add-Warning "git was not found; working tree and tag checks were skipped."
}

Write-Host ""
if ($blockers.Count -eq 0) {
    Write-Host "No blocking items detected."
}
else {
    Write-Host "Blocking items:"
    foreach ($blocker in $blockers) {
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

Write-Host ""
Write-Host "Post-publication follow-ups:"
Write-Host "- Keep the submitted Codex for OSS application material as the local reference."
Write-Host "- Continue future roadmap planning."
Write-Host "- Re-run release gates before future release announcements."

if ($FailOnBlockers -and $blockers.Count -gt 0) {
    Write-Host ""
    Write-Host "Release blocker gate failed."
    exit 1
}

exit 0
