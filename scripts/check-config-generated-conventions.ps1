param(
    [switch]$FailOnIssues
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "git-status.ps1")

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$cliProject = Join-Path $repoRoot "src\AgentContextKit.Cli\AgentContextKit.Cli.csproj"
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

function Get-FileText {
    param([string]$RelativePath)

    $path = Join-Path $repoRoot $RelativePath
    if (-not (Test-Path $path)) {
        Add-Issue "Required file missing: $RelativePath"
        return ""
    }

    return Get-Content -Raw $path
}

function Require-Text {
    param(
        [string]$Content,
        [string]$Needle,
        [string]$Description
    )

    if ($Content.Contains($Needle)) {
        Add-Note "$Description present."
    }
    else {
        Add-Issue "$Description missing."
    }
}

function Invoke-LocalCli {
    param(
        [string]$WorkingDirectory,
        [string[]]$Arguments
    )

    if (-not (Test-Path $cliProject)) {
        Add-Issue "CLI project missing: $cliProject"
        return ""
    }

    Push-Location $WorkingDirectory
    try {
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $output = & dotnet run --project $cliProject -c Release --no-build -- @Arguments 2>&1
            $exitCode = $LASTEXITCODE
            if ($exitCode -ne 0) {
                Add-Warning "CLI command with --no-build failed; retrying with local build."
                $output = & dotnet run --project $cliProject -c Release --no-restore -- @Arguments 2>&1
                $exitCode = $LASTEXITCODE
            }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }

        $text = ($output | Out-String)
        if ($exitCode -ne 0) {
            Add-Issue "CLI command failed with exit code ${exitCode}: $($Arguments -join ' ')"
        }
        else {
            Add-Note "CLI command exited 0: $($Arguments -join ' ')"
        }

        return $text
    }
    finally {
        Pop-Location
    }
}

Write-Host "AgentContextKit config/generated convention review"
Write-Host "Repository: $repoRoot"

$requiredPaths = @(
    @{ Path = "docs\CONFIG_GENERATED_CONVENTIONS.md"; Description = "Config/generated conventions docs" },
    @{ Path = "docs\CONFIGURATION.md"; Description = "Configuration docs" },
    @{ Path = "docs\CLI_CONTRACT.md"; Description = "CLI contract docs" },
    @{ Path = "docs\CLI_REFERENCE.md"; Description = "CLI reference docs" },
    @{ Path = "README.md"; Description = "English README" },
    @{ Path = "README.tr.md"; Description = "Turkish README" },
    @{ Path = ".gitignore"; Description = "Git ignore rules" },
    @{ Path = "src\AgentContextKit.Core\Models.cs"; Description = "Core models" },
    @{ Path = "src\AgentContextKit.Core\Configuration.cs"; Description = "Core configuration" },
    @{ Path = "src\AgentContextKit.Core\Generation.cs"; Description = "Core generation" }
)

foreach ($entry in $requiredPaths) {
    Require-Path -RelativePath $entry.Path -Description $entry.Description
}

$conventions = Get-FileText "docs\CONFIG_GENERATED_CONVENTIONS.md"
$configurationDocs = Get-FileText "docs\CONFIGURATION.md"
$cliContract = Get-FileText "docs\CLI_CONTRACT.md"
$cliReference = Get-FileText "docs\CLI_REFERENCE.md"
$readmeEn = Get-FileText "README.md"
$readmeTr = Get-FileText "README.tr.md"
$gitignore = Get-FileText ".gitignore"
$models = Get-FileText "src\AgentContextKit.Core\Models.cs"
$configurationSource = Get-FileText "src\AgentContextKit.Core\Configuration.cs"
$generationSource = Get-FileText "src\AgentContextKit.Core\Generation.cs"

$tempRepo = Join-Path ([System.IO.Path]::GetTempPath()) ("ackit-config-convention-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tempRepo | Out-Null
Invoke-LocalCli -WorkingDirectory $tempRepo -Arguments @("init", "--json") | Out-Null
$generatedConfigPath = Join-Path $tempRepo ".ackit\config.yml"
if (Test-Path $generatedConfigPath) {
    $generatedConfig = Get-Content -Raw $generatedConfigPath
    Add-Note "Generated default config present in temp repository."
}
else {
    $generatedConfig = ""
    Add-Issue "Generated default config missing in temp repository."
}

$defaultIgnorePaths = @(
    ".ackit/cache/",
    ".ackit/reports/",
    ".ackit/webui/",
    ".ackit/prompt-packs/",
    ".ackit/context-exports/"
)

foreach ($path in $defaultIgnorePaths) {
    Require-Text -Content $models -Needle $path -Description "Default ignore path in AckitConfig.Default $path"
    Require-Text -Content $configurationSource -Needle $path -Description "Default config writer ignore path $path"
    Require-Text -Content $configurationDocs -Needle $path -Description "Configuration docs ignore path $path"
    Require-Text -Content $conventions -Needle $path -Description "Convention docs ignore path $path"
    Require-Text -Content $generatedConfig -Needle $path -Description "Generated default config ignore path $path"
    Require-Text -Content $gitignore -Needle $path -Description "Git ignore path $path"
}

$riskExtensions = @(".bak", ".tmp", ".log", ".sql")
foreach ($extension in $riskExtensions) {
    Require-Text -Content $models -Needle $extension -Description "Default risk extension in AckitConfig.Default $extension"
    Require-Text -Content $configurationSource -Needle $extension -Description "Default config writer risk extension $extension"
    Require-Text -Content $configurationDocs -Needle $extension -Description "Configuration docs risk extension $extension"
    Require-Text -Content $generatedConfig -Needle $extension -Description "Generated default config risk extension $extension"
}

$generatedPaths = @(
    ".ackit/config.yml",
    ".ackit/reports/scan-report.html",
    ".ackit/webui/index.html",
    ".ackit/prompt-packs/prompt-pack.md",
    ".ackit/context-exports/context-export-manifest.json",
    "AGENTS.md",
    "CLAUDE.md",
    ".cursor/rules/project.mdc",
    ".github/copilot-instructions.md",
    "docs/PROJECT_MAP.md",
    "docs/AI_WORKFLOW.md",
    "docs/SECURITY_NOTES.md",
    "docs/tasks/TASK-0001.md",
    ".codex/HANDOFF.md",
    ".codex/CONTEXT_PACK.md"
)

foreach ($path in $generatedPaths) {
    Require-Text -Content $conventions -Needle $path -Description "Convention docs generated path $path"
}

$sourceGeneratedPathNeedles = @(
    ".ackit/reports/scan-report.html",
    ".ackit/webui/index.html",
    ".ackit/prompt-packs/prompt-pack.md",
    ".ackit/context-exports/context-export-manifest.json",
    "AGENTS.md",
    "CLAUDE.md",
    ".cursor/rules/project.mdc",
    ".github/copilot-instructions.md",
    "docs/tasks/TASK-0001.md",
    ".codex/HANDOFF.md",
    ".codex/CONTEXT_PACK.md"
)

foreach ($path in $sourceGeneratedPathNeedles) {
    Require-Text -Content $generationSource -Needle $path -Description "Generation source path $path"
}

$docPathChecks = @(
    ".ackit/reports/scan-report.html",
    ".ackit/webui/index.html",
    ".ackit/prompt-packs/prompt-pack.md",
    ".ackit/context-exports/context-export-manifest.json",
    "docs/tasks/TASK-####.md"
)

foreach ($path in $docPathChecks) {
    Require-Text -Content $cliContract -Needle $path -Description "CLI contract generated path $path"
}

foreach ($path in $sourceGeneratedPathNeedles) {
    if ($path.StartsWith(".ackit/", [StringComparison]::OrdinalIgnoreCase)) {
        Require-Text -Content $cliReference -Needle $path -Description "CLI reference generated path $path"
    }
}

foreach ($path in $generatedPaths) {
    Require-Text -Content $readmeEn -Needle $path -Description "English README generated path $path"
    Require-Text -Content $readmeTr -Needle $path -Description "Turkish README generated path $path"
}

$behaviorNeedles = @(
    "Existing files are skipped by default",
    "Output paths are repository-relative",
    "Output paths outside the repository are rejected",
    "No command deletes, redacts, uploads, pushes, publishes, tags, or creates remotes"
)

foreach ($needle in $behaviorNeedles) {
    Require-Text -Content $conventions -Needle $needle -Description "Convention behavior $needle"
}

if (Get-Command git -ErrorAction SilentlyContinue) {
    Push-Location $repoRoot
    try {
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
    Add-Warning "git was not found; working tree check was skipped."
}

Write-Host ""
if ($issues.Count -eq 0) {
    Write-Host "No config/generated convention issues detected."
}
else {
    Write-Host "Config/generated convention issues:"
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
Write-Host "This review is local-only. It does not push, publish, tag, redact, delete, upload, call providers, handle API keys, or create remotes."

if ($FailOnIssues -and $issues.Count -gt 0) {
    Write-Host ""
    Write-Host "Config/generated convention gate failed."
    exit 1
}

exit 0
