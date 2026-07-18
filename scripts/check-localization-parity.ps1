param(
    [switch]$FailOnIssues
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "git-status.ps1")

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$testProject = Join-Path $repoRoot "tests\AgentContextKit.Tests\AgentContextKit.Tests.csproj"
$cliProject = Join-Path $repoRoot "src\AgentContextKit.Cli\AgentContextKit.Cli.csproj"
$issues = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$notes = New-Object System.Collections.Generic.List[string]

function Add-Issue { param([string]$Message) $issues.Add($Message) | Out-Null }
function Add-Warning { param([string]$Message) $warnings.Add($Message) | Out-Null }
function Add-Note { param([string]$Message) $notes.Add($Message) | Out-Null }

function Require-Path {
    param([string]$RelativePath, [string]$Description)

    $path = Join-Path $repoRoot $RelativePath
    if (Test-Path $path) {
        Add-Note "$Description present: $RelativePath"
        return $path
    }

    Add-Issue "$Description missing: $RelativePath"
    return $null
}

function Require-Text {
    param([string]$Content, [string]$Marker, [string]$Description)

    if ($Content.IndexOf($Marker, [StringComparison]::Ordinal) -ge 0) {
        Add-Note "$Description present."
    }
    else {
        Add-Issue "$Description missing."
    }
}

Write-Host "AgentContextKit localization parity review"
Write-Host "Repository: $repoRoot"

$programPath = Require-Path "src\AgentContextKit.Cli\Program.cs" "CLI program"
$textsPath = Require-Path "src\AgentContextKit.Core\Templates.cs" "Text provider"
$testsPath = Require-Path "tests\AgentContextKit.Tests\LocalizationParityTests.cs" "Localization parity tests"
$docsPath = Require-Path "docs\LOCALIZATION.md" "Localization contract docs"

$program = if ($null -ne $programPath) { Get-Content -Raw $programPath } else { "" }
$texts = if ($null -ne $textsPath) { Get-Content -Raw $textsPath } else { "" }
$tests = if ($null -ne $testsPath) { Get-Content -Raw $testsPath } else { "" }
$docs = if ($null -ne $docsPath) { Get-Content -Raw $docsPath } else { "" }

$commands = @(
    "init", "config-check", "scan", "optimize", "baseline", "sarif", "report", "webui",
    "prompt-pack", "context-export", "generate", "task", "redact-check", "doctor"
)

foreach ($command in $commands) {
    Require-Text $program "ackit $command" "Help signature for ackit $command"
    Require-Text $tests "new(`"$command`"" "Localization matrix entry for $command"
}

foreach ($marker in @(
    '["usage"] = new()',
    '["scanSummary"] = new()',
    '["optimizeSummary"] = new()',
    '["optimizeReviewOnly"] = new()',
    '["optimizeInvalidFormat"] = new()',
    '["repositoryHealth"] = new()',
    '["baselineClassification"] = new()',
    '["suppressedFindings"] = new()',
    '["unknownCommand"] = new()'
)) {
    Require-Text $texts $marker "Localized text-provider key $marker"
}

Require-Text $docs "JSON field names, command names, status tokens, rule IDs, diagnostic codes, and exit codes remain language-independent" "Machine-readable localization boundary"
Require-Text $docs "scripts/check-localization-parity.ps1" "Localization gate usage"

Push-Location $repoRoot
try {
    $testOutput = & dotnet test $testProject -c Release --no-build --filter "FullyQualifiedName~LocalizationParityTests" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Add-Note "Localization parity tests passed."
    }
    else {
        $testOutput | Write-Host
        Add-Issue "Localization parity tests failed."
    }

    $helpOutput = & dotnet run --project $cliProject -c Release --no-build -- --help --lang tr 2>&1
    $helpText = $helpOutput -join "`n"
    if ($LASTEXITCODE -eq 0 -and
        $helpText.IndexOf("ackit init", [StringComparison]::Ordinal) -ge 0 -and
        $helpText.IndexOf("Usage:", [StringComparison]::Ordinal) -lt 0) {
        Add-Note "Turkish help smoke passed."
    }
    else {
        $helpOutput | Write-Host
        Add-Issue "Turkish help smoke failed."
    }

    $jsonOutput = & dotnet run --project $cliProject -c Release --no-build -- scan --lang tr --json 2>&1
    try {
        $json = ($jsonOutput -join "`n") | ConvertFrom-Json
        if ($LASTEXITCODE -eq 0 -and $json.schemaVersion -eq 2 -and $json.command -eq "scan") {
            Add-Note "Turkish JSON invariance smoke passed."
        }
        else {
            Add-Issue "Turkish JSON invariance smoke returned an unexpected contract or exit code."
        }
    }
    catch {
        $jsonOutput | Write-Host
        Add-Issue "Turkish JSON invariance smoke did not produce valid JSON."
    }

    if (Get-Command git -ErrorAction SilentlyContinue) {
        $status = Get-GitWorkingTreeStatus
        if ($status.ExitCode -eq 0 -and $status.Lines) {
            Add-Warning "Working tree has uncommitted changes."
        }
    }
}
finally {
    Pop-Location
}

Write-Host ""
if ($issues.Count -eq 0) {
    Write-Host "No localization parity issues detected."
}
else {
    Write-Host "Localization parity issues:"
    foreach ($issue in $issues) { Write-Host "- $issue" }
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "Warnings:"
    foreach ($warning in $warnings) { Write-Host "- $warning" }
}

if ($notes.Count -gt 0) {
    Write-Host ""
    Write-Host "Notes:"
    foreach ($note in $notes) { Write-Host "- $note" }
}

Write-Host ""
Write-Host "This gate is local-only. It does not translate JSON contracts, push, tag, publish, upload, or mutate remote repository state."

if ($FailOnIssues -and $issues.Count -gt 0) {
    exit 1
}

exit 0
