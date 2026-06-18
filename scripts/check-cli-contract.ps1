param(
    [switch]$FailOnIssues
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

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

function Get-CliHelp {
    if (-not (Test-Path $cliProject)) {
        Add-Issue "CLI project missing: $cliProject"
        return ""
    }

    Push-Location $repoRoot
    try {
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        try {
            $output = & dotnet run --project $cliProject -c Release --no-build -- --help 2>&1
            $exitCode = $LASTEXITCODE
            if ($exitCode -ne 0) {
                Add-Warning "CLI help command with --no-build failed; retrying with local build."
                $output = & dotnet run --project $cliProject -c Release --no-restore -- --help 2>&1
                $exitCode = $LASTEXITCODE
            }
        }
        finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }

        $text = ($output | Out-String)
        if ($exitCode -ne 0) {
            Add-Issue "CLI help command failed with exit code $exitCode."
        }
        else {
            Add-Note "CLI help command exited 0."
        }

        return $text
    }
    finally {
        Pop-Location
    }
}

Write-Host "AgentContextKit CLI contract review"
Write-Host "Repository: $repoRoot"

$requiredPaths = @(
    @{ Path = "docs\CLI_CONTRACT.md"; Description = "CLI contract docs" },
    @{ Path = "docs\CLI_REFERENCE.md"; Description = "CLI reference docs" },
    @{ Path = "docs\JSON_OUTPUT.md"; Description = "JSON output docs" },
    @{ Path = "docs\EXIT_CODES.md"; Description = "Exit code docs" },
    @{ Path = "docs\RELEASE_VALIDATION.md"; Description = "Release validation docs" },
    @{ Path = "README.md"; Description = "English README" },
    @{ Path = "README.tr.md"; Description = "Turkish README" },
    @{ Path = "src\AgentContextKit.Cli\Program.cs"; Description = "CLI program" }
)

foreach ($entry in $requiredPaths) {
    Require-Path -RelativePath $entry.Path -Description $entry.Description
}

$helpText = Get-CliHelp
$helpLines = @(
    "ackit init [--lang en|tr] [--json]",
    "ackit config-check [--lang en|tr] [--json]",
    "ackit scan [--baseline <repo-relative.json>] [--lang en|tr] [--json] [--ci]",
    "ackit baseline [--output <repo-relative.json>] [--update] [--lang en|tr] [--json]",
    "ackit sarif --output <repo-relative.sarif> [--baseline <repo-relative.json>] [--lang en|tr] [--json]",
    "ackit report [--output <repo-relative.html>] [--baseline <repo-relative.json>] [--lang en|tr] [--json]",
    "ackit webui [--output <repo-relative.html>] [--baseline <repo-relative.json>] [--lang en|tr] [--json]",
    "ackit prompt-pack [--output <repo-relative.md>] [--lang en|tr] [--json]",
    "ackit context-export --prompt-pack <repo-relative.md> --approve [--output <repo-relative.json>] [--lang en|tr] [--json]",
    "ackit generate [--target codex|claude|anthropic|cursor|copilot|continue|all] [--lang en|tr] [--json]",
    'ackit task "<title>" [--lang en|tr] [--json]',
    "ackit redact-check [--profile public-release] [--lang en|tr] [--json]",
    "ackit doctor [--lang en|tr] [--json]",
    "ackit hooks [--target codex|claude|anthropic|continue] [--shell pwsh|sh] [--install|--dry-run] [--output <repo-relative-dir>] [--lang en|tr] [--json]",
    "ackit diff --from <from.json> --to <to.json> [--lang en|tr] [--json]",
    "ackit trim --input <repo-relative.md|json> --output <repo-relative.md|json> --max-chars <N> [--lang en|tr] [--json]",
    "ackit version"
)

foreach ($line in $helpLines) {
    Require-Text -Content $helpText -Needle $line -Description "CLI help line $line"
}

$cliReference = Get-FileText "docs\CLI_REFERENCE.md"
$jsonOutput = Get-FileText "docs\JSON_OUTPUT.md"
$exitCodes = Get-FileText "docs\EXIT_CODES.md"
$releaseValidation = Get-FileText "docs\RELEASE_VALIDATION.md"
$readmeEn = Get-FileText "README.md"
$readmeTr = Get-FileText "README.tr.md"
$contract = Get-FileText "docs\CLI_CONTRACT.md"

$allCommands = @(
    "ackit init",
    "ackit config-check",
    "ackit scan",
    "ackit baseline",
    "ackit sarif",
    "ackit report",
    "ackit webui",
    "ackit prompt-pack",
    "ackit context-export",
    "ackit generate",
    "ackit task",
    "ackit redact-check",
    "ackit doctor",
    "ackit version",
    "ackit help"
)

foreach ($command in $allCommands) {
    Require-Text -Content $cliReference -Needle $command -Description "CLI reference command $command"
    Require-Text -Content $contract -Needle $command -Description "CLI contract command $command"
}

$jsonCommands = @(
    "ackit init --json",
    "ackit config-check --json",
    "ackit scan --json",
    "ackit baseline --json",
    "ackit sarif --json",
    "ackit report --json",
    "ackit webui --json",
    "ackit prompt-pack --json",
    "ackit context-export --json",
    "ackit generate --json",
    'ackit task "<title>" --json',
    "ackit redact-check --json",
    "ackit doctor --json",
    "ackit hooks --json"
)

foreach ($command in $jsonCommands) {
    Require-Text -Content $jsonOutput -Needle $command -Description "JSON output command $command"
}

$releaseValidationNeedles = @(
    "dotnet run --project src/AgentContextKit.Cli -- config-check --json",
    "dotnet run --project src/AgentContextKit.Cli -- scan",
    "dotnet run --project src/AgentContextKit.Cli -- scan --ci",
    "dotnet run --project src/AgentContextKit.Cli -- report --json",
    "dotnet run --project src/AgentContextKit.Cli -- webui --json",
    "dotnet run --project src/AgentContextKit.Cli -- prompt-pack",
    "dotnet run --project src/AgentContextKit.Cli -- context-export",
    "dotnet run --project src/AgentContextKit.Cli -- doctor"
)

foreach ($needle in $releaseValidationNeedles) {
    Require-Text -Content $releaseValidation -Needle $needle -Description "Release validation command $needle"
}

foreach ($command in $allCommands) {
    if ($command -eq "ackit help") {
        continue
    }

    Require-Text -Content $readmeEn -Needle $command -Description "English README command $command"
    Require-Text -Content $readmeTr -Needle $command -Description "Turkish README command $command"
}

$exitCodeNeedles = @(
    "ackit help",
    "ackit version",
    "ackit init",
    "ackit config-check",
    "ackit scan",
    "ackit scan --ci",
    "ackit baseline",
    "ackit sarif",
    "ackit report",
    "ackit webui",
    "ackit prompt-pack",
    "ackit context-export",
    "ackit generate",
    "ackit task",
    "ackit redact-check",
    "ackit doctor",
    "Unknown command",
    "Unhandled runtime error"
)

foreach ($needle in $exitCodeNeedles) {
    Require-Text -Content $exitCodes -Needle $needle -Description "Exit code entry $needle"
}

$contractNeedles = @(
    "Stable Command Surface",
    "Stability Rules",
    "Global Options",
    "Exit Behavior",
    "JSON Contract",
    "Safety Boundary",
    "does not push, publish, tag, upload, redact, delete, call providers, handle API keys, or create remotes"
)

foreach ($needle in $contractNeedles) {
    Require-Text -Content $contract -Needle $needle -Description "CLI contract section $needle"
}

if (Get-Command git -ErrorAction SilentlyContinue) {
    Push-Location $repoRoot
    try {
        $status = git status --short 2>$null
        if ($LASTEXITCODE -eq 0 -and $status) {
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
    Write-Host "No CLI contract issues detected."
}
else {
    Write-Host "CLI contract issues:"
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
    Write-Host "CLI contract gate failed."
    exit 1
}

exit 0
