param(
    [switch]$FailOnIssues
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "git-status.ps1")

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$projectPath = Join-Path $repoRoot "src\AgentContextKit.Cli\AgentContextKit.Cli.csproj"
$releaseTag = "v0.2.0-alpha.2"
$issues = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$notes = New-Object System.Collections.Generic.List[string]

function Add-Issue {
    param([string]$Message)
    $issues.Add($Message) | Out-Null
}

function Add-Warning {
    param([string]$Message)
    $warnings.Add($Message) | Out-Null
}

function Add-Note {
    param([string]$Message)
    $notes.Add($Message) | Out-Null
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

function Test-ForbiddenTrackedFile {
    param([string]$Path)

    $normalized = $Path.Replace('\', '/')
    $fileName = [System.IO.Path]::GetFileName($normalized)
    $extension = [System.IO.Path]::GetExtension($normalized).ToLowerInvariant()

    if ($normalized -match '(^|/)(bin|obj|node_modules|packages|TestResults|coverage)/') {
        return "tracked build/dependency/test artifact path"
    }

    if ($extension -in @(".nupkg", ".snupkg", ".zip", ".bak", ".tmp", ".log", ".dump")) {
        return "tracked release artifact or temporary file extension"
    }

    if ($fileName.Equals(".env", [StringComparison]::OrdinalIgnoreCase) -or
        $fileName.StartsWith(".env.", [StringComparison]::OrdinalIgnoreCase) -or
        $fileName.Equals("secrets.json", [StringComparison]::OrdinalIgnoreCase)) {
        return "tracked secret-like configuration file"
    }

    if ($fileName -in @("appsettings.Production.json", "appsettings.Staging.json", "appsettings.Local.json")) {
        return "tracked environment-specific appsettings file"
    }

    return $null
}

Write-Host "AgentContextKit public release audit"
Write-Host "Repository: $repoRoot"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Add-Issue "git was not found; tracked-file audit cannot run."
}
else {
    Push-Location $repoRoot
    try {
        $trackedFiles = @(git ls-files)
        if ($LASTEXITCODE -ne 0) {
            Add-Issue "git ls-files failed."
            $trackedFiles = @()
        }

        foreach ($file in $trackedFiles) {
            $reason = Test-ForbiddenTrackedFile -Path $file
            if ($null -ne $reason) {
                Add-Issue "$file is a $reason."
            }
        }

        Add-Note "Tracked files audited: $($trackedFiles.Count)"

        $status = Get-GitWorkingTreeStatus
        if ($status.ExitCode -eq 0 -and $status.Lines) {
            Add-Issue "Working tree has uncommitted changes."
        }

        $releaseTagCommit = git rev-parse "$releaseTag^{commit}" 2>$null
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($releaseTagCommit)) {
            Add-Issue "Release tag $releaseTag was not found locally."
        }
        else {
            Add-Note "Release tag ${releaseTag} points to $releaseTagCommit."
        }

        $tags = git tag --points-at HEAD
        if ($LASTEXITCODE -eq 0 -and -not ($tags -contains $releaseTag)) {
            Add-Warning "Current HEAD is not $releaseTag; this can be valid for post-push documentation sync. Remote tag verification is manual."
        }
    }
    finally {
        Pop-Location
    }
}

if (-not (Test-Path $projectPath)) {
    Add-Issue "Package project file was not found: $projectPath"
}
else {
    [xml]$project = Get-Content $projectPath
    $authors = Get-PackageMetadataValue -Project $project -Name "Authors"
    $company = Get-PackageMetadataValue -Project $project -Name "Company"
    $repositoryUrl = Get-PackageMetadataValue -Project $project -Name "RepositoryUrl"
    $packageProjectUrl = Get-PackageMetadataValue -Project $project -Name "PackageProjectUrl"
    $packageReadmeFile = Get-PackageMetadataValue -Project $project -Name "PackageReadmeFile"
    $license = Get-PackageMetadataValue -Project $project -Name "PackageLicenseExpression"

    if ($authors -ne "Cynrath") {
        Add-Issue "Package Authors metadata is not Cynrath."
    }

    if ($company -ne "Cynrath") {
        Add-Issue "Package Company metadata is not Cynrath."
    }

    if ([string]::IsNullOrWhiteSpace($repositoryUrl) -or $repositoryUrl -match "TODO|example\.com|localhost") {
        Add-Issue "RepositoryUrl is missing or still a placeholder."
    }

    if ([string]::IsNullOrWhiteSpace($packageProjectUrl) -or $packageProjectUrl -match "TODO|example\.com|localhost") {
        Add-Issue "PackageProjectUrl is missing or still a placeholder."
    }

    if ($packageReadmeFile -ne "README.md") {
        Add-Warning "PackageReadmeFile is not README.md."
    }

    if ($license -ne "MIT") {
        Add-Warning "PackageLicenseExpression is not MIT."
    }
}

Write-Host ""
if ($issues.Count -eq 0) {
    Write-Host "No public release audit issues detected."
}
else {
    Write-Host "Public release audit issues:"
    foreach ($issue in $issues) {
        Write-Host "- $issue"
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
Write-Host "This audit is local-only. It does not push, tag, publish, redact, delete, or create remotes."

if ($FailOnIssues -and $issues.Count -gt 0) {
    Write-Host ""
    Write-Host "Public release audit gate failed."
    exit 1
}

exit 0
