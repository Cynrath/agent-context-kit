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

Write-Host "AgentContextKit v0.4 readiness review"
Write-Host "Repository: $repoRoot"

$requiredPaths = @(
    @{ Path = "docs\tasks\TASK-0024-v040-local-web-ui-prototype.md"; Description = "Local Web UI prototype task" },
    @{ Path = "docs\tasks\TASK-0025-v040-scan-result-dashboard-refinement.md"; Description = "Scan result dashboard task" },
    @{ Path = "docs\tasks\TASK-0026-v040-generated-file-preview-refinement.md"; Description = "Generated file preview task" },
    @{ Path = "docs\tasks\TASK-0027-v040-risk-finding-browser-refinement.md"; Description = "Risk finding browser task" },
    @{ Path = "docs\tasks\TASK-0028-v040-task-preview-refinement.md"; Description = "Task preview refinement task" },
    @{ Path = "docs\tasks\TASK-0029-v040-final-readiness-consolidation.md"; Description = "v0.4 readiness task" },
    @{ Path = "docs\WEB_UI_PROTOTYPE.md"; Description = "Web UI prototype docs" },
    @{ Path = "docs\V040_READINESS.md"; Description = "v0.4 readiness docs" },
    @{ Path = "docs\RELEASE_VALIDATION.md"; Description = "Release validation docs" },
    @{ Path = "docs\DOCUMENTATION_INDEX.md"; Description = "Documentation index" },
    @{ Path = "docs\ROADMAP.md"; Description = "Roadmap" },
    @{ Path = "docs\PROJECT_MAP.md"; Description = "Project map" },
    @{ Path = "scripts\check-v030-readiness.ps1"; Description = "v0.3 readiness script" },
    @{ Path = "scripts\check-v040-readiness.ps1"; Description = "v0.4 readiness script" },
    @{ Path = ".gitignore"; Description = "Git ignore rules" },
    @{ Path = "src\AgentContextKit.Cli\Program.cs"; Description = "CLI program" },
    @{ Path = "src\AgentContextKit.Core\Generation.cs"; Description = "Core Web UI implementation" },
    @{ Path = "tests\AgentContextKit.Tests\AgentContextKitBehaviorTests.cs"; Description = "Behavior tests" }
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
    Write-Host "No v0.4 readiness asset issues detected."
}
else {
    Write-Host "v0.4 readiness asset issues:"
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
    Write-Host "v0.4 readiness gate failed."
    exit 1
}

exit 0
