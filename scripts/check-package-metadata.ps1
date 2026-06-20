param(
    [string]$ExpectedVersion = "0.2.0-alpha.3",
    [switch]$FailOnIssues
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$projectPath = Join-Path $repoRoot "src\AgentContextKit.Cli\AgentContextKit.Cli.csproj"
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

function Require-Value {
    param(
        [xml]$Project,
        [string]$Name,
        [string]$Expected
    )

    $actual = Get-MetadataValue -Project $Project -Name $Name
    if ($actual -ne $Expected) {
        Add-Issue "$Name expected '$Expected' but found '$actual'."
    }
}

function Test-PackedReadme {
    param([xml]$Project)

    $nodes = $Project.SelectNodes("//None")
    foreach ($node in $nodes) {
        if (
            $node.GetAttribute("Include") -eq "..\..\README.md" -and
            $node.GetAttribute("Pack") -eq "true" -and
            $node.GetAttribute("PackagePath") -eq "\"
        ) {
            return $true
        }
    }

    return $false
}

Write-Host "AgentContextKit package metadata review"
Write-Host "Repository: $repoRoot"

if (-not (Test-Path $projectPath)) {
    Add-Issue "Package project file was not found: $projectPath"
}
else {
    [xml]$project = Get-Content $projectPath

    Require-Value -Project $project -Name "PackAsTool" -Expected "true"
    Require-Value -Project $project -Name "ToolCommandName" -Expected "ackit"
    Require-Value -Project $project -Name "PackageId" -Expected "AgentContextKit"
    Require-Value -Project $project -Name "Version" -Expected $ExpectedVersion
    Require-Value -Project $project -Name "Authors" -Expected "Cynrath"
    Require-Value -Project $project -Name "Company" -Expected "Cynrath"
    Require-Value -Project $project -Name "PackageReadmeFile" -Expected "README.md"
    Require-Value -Project $project -Name "PackageLicenseExpression" -Expected "MIT"
    Require-Value -Project $project -Name "RepositoryType" -Expected "git"
    Require-Value -Project $project -Name "PackageRequireLicenseAcceptance" -Expected "false"

    $version = Get-MetadataValue -Project $project -Name "Version"
    if ([string]::IsNullOrWhiteSpace($version) -or $version -notmatch "^\d+\.\d+\.\d+([-.][0-9A-Za-z.-]+)?$") {
        Add-Issue "Version is missing or does not look like a SemVer package version."
    }

    $description = Get-MetadataValue -Project $project -Name "Description"
    if ([string]::IsNullOrWhiteSpace($description) -or $description.Length -lt 20) {
        Add-Issue "Description is missing or too short."
    }

    $tags = Get-MetadataValue -Project $project -Name "PackageTags"
    foreach ($requiredTag in @("ai", "coding-agent", "security", "cli", "oss")) {
        $tagValues = @()
        if (-not [string]::IsNullOrWhiteSpace($tags)) {
            $tagValues = $tags -split "[;\s]+" | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
        }

        if ($tagValues -notcontains $requiredTag) {
            Add-Issue "PackageTags does not include '$requiredTag'."
        }
    }

    $releaseNotes = Get-MetadataValue -Project $project -Name "PackageReleaseNotes"
    if ([string]::IsNullOrWhiteSpace($releaseNotes)) {
        Add-Issue "PackageReleaseNotes is missing."
    }

    $repositoryUrl = Get-MetadataValue -Project $project -Name "RepositoryUrl"
    $packageProjectUrl = Get-MetadataValue -Project $project -Name "PackageProjectUrl"
    if ([string]::IsNullOrWhiteSpace($repositoryUrl) -or $repositoryUrl -match "TODO|example\.com|localhost") {
        Add-Issue "RepositoryUrl is missing or still a placeholder."
    }

    if ([string]::IsNullOrWhiteSpace($packageProjectUrl) -or $packageProjectUrl -match "TODO|example\.com|localhost") {
        Add-Issue "PackageProjectUrl is missing or still a placeholder."
    }

    $readmePath = Join-Path $repoRoot "README.md"
    if (-not (Test-Path $readmePath)) {
        Add-Issue "README.md was not found for package readme."
    }
    elseif (-not (Test-PackedReadme -Project $project)) {
        Add-Issue "README.md exists but is not explicitly packed into the package root."
    }
    else {
        Add-Note "README.md is present and explicitly packed into the package root."
    }

    Add-Note "Package project inspected: $projectPath"
    Add-Note "Metadata guidance checked against Microsoft Learn NuGet package authoring guidance."
}

Write-Host ""
if ($issues.Count -eq 0) {
    Write-Host "No package metadata issues detected."
}
else {
    Write-Host "Package metadata issues:"
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
Write-Host "This review is local-only. It does not pack, push, publish, tag, redact, delete, or create remotes."

if ($FailOnIssues -and $issues.Count -gt 0) {
    Write-Host ""
    Write-Host "Package metadata gate failed."
    exit 1
}

exit 0
