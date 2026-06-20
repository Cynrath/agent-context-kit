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

Write-Host "AgentContextKit v0.3 readiness review"
Write-Host "Repository: $repoRoot"

$requiredPaths = @(
    @{ Path = "docs\tasks\TASK-0018-v030-ci-mode.md"; Description = "CI mode task" },
    @{ Path = "docs\tasks\TASK-0019-v030-exit-code-standardization.md"; Description = "Exit code standardization task" },
    @{ Path = "docs\tasks\TASK-0020-v030-html-report-generation.md"; Description = "HTML report task" },
    @{ Path = "docs\tasks\TASK-0021-v030-example-workflows.md"; Description = "Example workflows task" },
    @{ Path = "docs\tasks\TASK-0022-v030-public-release-hardening.md"; Description = "Public release hardening task" },
    @{ Path = "docs\tasks\TASK-0023-v030-final-readiness-consolidation.md"; Description = "v0.3 readiness task" },
    @{ Path = "docs\EXIT_CODES.md"; Description = "Exit code docs" },
    @{ Path = "docs\HTML_REPORTS.md"; Description = "HTML report docs" },
    @{ Path = "docs\EXAMPLE_WORKFLOWS.md"; Description = "Example workflow docs" },
    @{ Path = "docs\PUBLIC_RELEASE_GATES.md"; Description = "Public release gate docs" },
    @{ Path = "docs\RELEASE_VALIDATION.md"; Description = "Release validation docs" },
    @{ Path = "scripts\check-public-release-gates.ps1"; Description = "Public release gate script" },
    @{ Path = "scripts\check-v020-readiness.ps1"; Description = "v0.2 readiness script" },
    @{ Path = ".github\workflows\ci.yml"; Description = "GitHub Actions workflow" },
    @{ Path = "src\AgentContextKit.Cli\Program.cs"; Description = "CLI program" },
    @{ Path = "src\AgentContextKit.Core\Generation.cs"; Description = "Core generation implementation" }
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
    Write-Host "No v0.3 readiness asset issues detected."
}
else {
    Write-Host "v0.3 readiness asset issues:"
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
    Write-Host "v0.3 readiness gate failed."
    exit 1
}

exit 0
