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

function Require-FileContains {
    param(
        [string]$RelativePath,
        [string]$Pattern,
        [string]$Description
    )

    $path = Join-Path $repoRoot $RelativePath
    if (-not (Test-Path $path)) {
        Add-Issue "$Description source missing: $RelativePath"
        return
    }

    $content = Get-Content -Raw $path
    if ($content -match $Pattern) {
        Add-Note "$Description present in: $RelativePath"
    }
    else {
        Add-Issue "$Description missing in: $RelativePath"
    }
}

Write-Host "AgentContextKit v0.5 readiness review"
Write-Host "Repository: $repoRoot"

$requiredPaths = @(
    @{ Path = "docs\tasks\TASK-0030-v050-optional-llm-integration-architecture.md"; Description = "Optional LLM architecture task" },
    @{ Path = "docs\tasks\TASK-0031-v050-llm-provider-abstraction.md"; Description = "LLM provider abstraction task" },
    @{ Path = "docs\tasks\TASK-0032-v050-dry-run-prompt-pack-generation.md"; Description = "Dry-run prompt pack task" },
    @{ Path = "docs\tasks\TASK-0033-v050-user-approved-context-export.md"; Description = "Context export task" },
    @{ Path = "docs\tasks\TASK-0034-v050-final-readiness-consolidation.md"; Description = "v0.5 readiness task" },
    @{ Path = "docs\LLM_INTEGRATION_ARCHITECTURE.md"; Description = "Optional LLM architecture docs" },
    @{ Path = "docs\V050_READINESS.md"; Description = "v0.5 readiness docs" },
    @{ Path = "docs\CLI_REFERENCE.md"; Description = "CLI reference" },
    @{ Path = "docs\EXAMPLES.md"; Description = "Examples docs" },
    @{ Path = "docs\JSON_OUTPUT.md"; Description = "JSON output docs" },
    @{ Path = "docs\CONFIGURATION.md"; Description = "Configuration docs" },
    @{ Path = "docs\PRODUCT_SPEC.md"; Description = "Product spec" },
    @{ Path = "docs\RELEASE_VALIDATION.md"; Description = "Release validation docs" },
    @{ Path = "docs\DOCUMENTATION_INDEX.md"; Description = "Documentation index" },
    @{ Path = "docs\ROADMAP.md"; Description = "Roadmap" },
    @{ Path = "docs\PROJECT_MAP.md"; Description = "Project map" },
    @{ Path = "scripts\check-v040-readiness.ps1"; Description = "v0.4 readiness script" },
    @{ Path = "scripts\check-v050-readiness.ps1"; Description = "v0.5 readiness script" },
    @{ Path = ".gitignore"; Description = "Git ignore rules" },
    @{ Path = "src\AgentContextKit.Cli\Program.cs"; Description = "CLI program" },
    @{ Path = "src\AgentContextKit.Core\Abstractions.cs"; Description = "Core abstractions" },
    @{ Path = "src\AgentContextKit.Core\Models.cs"; Description = "Core models" },
    @{ Path = "src\AgentContextKit.Core\Generation.cs"; Description = "Core generation implementation" },
    @{ Path = "src\AgentContextKit.Core\Configuration.cs"; Description = "Core configuration" },
    @{ Path = "tests\AgentContextKit.Tests\AgentContextKitBehaviorTests.cs"; Description = "Behavior tests" }
)

foreach ($entry in $requiredPaths) {
    Require-Path -RelativePath $entry.Path -Description $entry.Description
}

$contentChecks = @(
    @{ Path = "src\AgentContextKit.Cli\Program.cs"; Pattern = '"prompt-pack"'; Description = "prompt-pack CLI command" },
    @{ Path = "src\AgentContextKit.Cli\Program.cs"; Pattern = '"context-export"'; Description = "context-export CLI command" },
    @{ Path = "src\AgentContextKit.Core\Abstractions.cs"; Pattern = "interface\s+ILLMProvider"; Description = "provider-neutral LLM abstraction" },
    @{ Path = "src\AgentContextKit.Core\Abstractions.cs"; Pattern = "interface\s+IPromptPackGenerator"; Description = "prompt-pack generator abstraction" },
    @{ Path = "src\AgentContextKit.Core\Abstractions.cs"; Pattern = "interface\s+IContextExportManifestGenerator"; Description = "context-export generator abstraction" },
    @{ Path = "src\AgentContextKit.Core\Models.cs"; Pattern = "GeneratedFileResult"; Description = "prompt-pack generated file result model" },
    @{ Path = "src\AgentContextKit.Core\Models.cs"; Pattern = "ContextExportSpec"; Description = "context-export model" },
    @{ Path = "src\AgentContextKit.Core\Generation.cs"; Pattern = "class\s+PromptPackGenerator"; Description = "prompt-pack generator implementation" },
    @{ Path = "src\AgentContextKit.Core\Generation.cs"; Pattern = "class\s+ContextExportManifestGenerator"; Description = "context-export generator implementation" },
    @{ Path = "src\AgentContextKit.Core\Configuration.cs"; Pattern = "\.ackit/prompt-packs/"; Description = "prompt-pack default ignore config" },
    @{ Path = "src\AgentContextKit.Core\Configuration.cs"; Pattern = "\.ackit/context-exports/"; Description = "context-export default ignore config" },
    @{ Path = ".gitignore"; Pattern = "\.ackit/prompt-packs/"; Description = "prompt-pack git ignore rule" },
    @{ Path = ".gitignore"; Pattern = "\.ackit/context-exports/"; Description = "context-export git ignore rule" },
    @{ Path = "docs\LLM_INTEGRATION_ARCHITECTURE.md"; Pattern = "No LLM API calls are implemented"; Description = "no live LLM call architecture note" },
    @{ Path = "docs\LLM_INTEGRATION_ARCHITECTURE.md"; Pattern = "No API key is read"; Description = "no API key handling architecture note" },
    @{ Path = "docs\LLM_INTEGRATION_ARCHITECTURE.md"; Pattern = "No repository content is uploaded"; Description = "no upload architecture note" },
    @{ Path = "docs\PRODUCT_SPEC.md"; Pattern = "prompt-pack"; Description = "prompt-pack product spec command" },
    @{ Path = "docs\PRODUCT_SPEC.md"; Pattern = "context-export"; Description = "context-export product spec command" },
    @{ Path = "docs\CLI_REFERENCE.md"; Pattern = "ackit prompt-pack"; Description = "prompt-pack CLI docs" },
    @{ Path = "docs\CLI_REFERENCE.md"; Pattern = "ackit context-export"; Description = "context-export CLI docs" },
    @{ Path = "docs\JSON_OUTPUT.md"; Pattern = "promptPack"; Description = "prompt-pack JSON metadata docs" },
    @{ Path = "docs\JSON_OUTPUT.md"; Pattern = "contextExport"; Description = "context-export JSON metadata docs" },
    @{ Path = "docs\CONFIGURATION.md"; Pattern = "\.ackit/prompt-packs/"; Description = "prompt-pack config docs" },
    @{ Path = "docs\CONFIGURATION.md"; Pattern = "\.ackit/context-exports/"; Description = "context-export config docs" },
    @{ Path = "tests\AgentContextKit.Tests\AgentContextKitBehaviorTests.cs"; Pattern = "PromptPack"; Description = "prompt-pack focused tests" },
    @{ Path = "tests\AgentContextKit.Tests\AgentContextKitBehaviorTests.cs"; Pattern = "ContextExport"; Description = "context-export focused tests" }
)

foreach ($check in $contentChecks) {
    Require-FileContains -RelativePath $check.Path -Pattern $check.Pattern -Description $check.Description
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
    Write-Host "No v0.5 readiness asset issues detected."
}
else {
    Write-Host "v0.5 readiness asset issues:"
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
Write-Host "This review is local-only. It does not push, publish, tag, redact, delete, upload, mutate files, call providers, handle API keys, or create remotes."

if ($FailOnIssues -and $issues.Count -gt 0) {
    Write-Host ""
    Write-Host "v0.5 readiness gate failed."
    exit 1
}

exit 0
