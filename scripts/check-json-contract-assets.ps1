param(
    [switch]$FailOnIssues
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "git-status.ps1")

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$testProject = Join-Path $repoRoot "tests\AgentContextKit.Tests\AgentContextKit.Tests.csproj"
$issues = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$notes = New-Object System.Collections.Generic.List[string]

function Add-Issue { param([string]$Message) $issues.Add($Message) | Out-Null }
function Add-Warning { param([string]$Message) $warnings.Add($Message) | Out-Null }
function Add-Note { param([string]$Message) $notes.Add($Message) | Out-Null }

function Read-JsonAsset {
    param([string]$RelativePath, [string]$Description)

    $path = Join-Path $repoRoot $RelativePath
    if (-not (Test-Path $path)) {
        Add-Issue "$Description missing: $RelativePath"
        return $null
    }

    try {
        $value = Get-Content -Raw $path | ConvertFrom-Json
        Add-Note "$Description parsed: $RelativePath"
        return $value
    }
    catch {
        Add-Issue "$Description is not valid JSON: $RelativePath"
        return $null
    }
}

Write-Host "AgentContextKit machine-readable contract asset review"
Write-Host "Repository: $repoRoot"

$commandSchema = Read-JsonAsset "docs\schemas\ackit-command-output-v2.schema.json" "Command output schema"
$baselineSchema = Read-JsonAsset "docs\schemas\ackit-baseline-v1.schema.json" "Baseline schema"
$sarifSchema = Read-JsonAsset "docs\schemas\ackit-sarif-profile-v1.schema.json" "SARIF profile schema"
$commandGolden = Read-JsonAsset "tests\fixtures\contracts\command-output-v2-golden.json" "Command output golden fixture"
$baselineGolden = Read-JsonAsset "tests\fixtures\contracts\baseline-v1-golden.json" "Baseline golden fixture"
$sarifGolden = Read-JsonAsset "tests\fixtures\contracts\sarif-profile-v1-golden.json" "SARIF golden fixture"

$expectedCommands = @(
    "init", "config-check", "scan", "baseline", "sarif", "report", "webui",
    "prompt-pack", "context-export", "generate", "task", "redact-check", "doctor"
)

if ($null -ne $commandSchema) {
    if ($commandSchema.properties.schemaVersion.const -ne 2) {
        Add-Issue "Command output schema version const is not 2."
    }

    $schemaCommands = @($commandSchema.properties.command.enum)
    $missing = @($expectedCommands | Where-Object { $_ -notin $schemaCommands })
    $unexpected = @($schemaCommands | Where-Object { $_ -notin $expectedCommands })
    if ($missing.Count -gt 0 -or $unexpected.Count -gt 0) {
        Add-Issue "Command schema command catalog does not match the expected JSON-capable commands."
    }
    else {
        Add-Note "Command schema covers all $($expectedCommands.Count) JSON-capable commands."
    }
}

if ($null -ne $commandGolden) {
    $goldenCommands = @($commandGolden.examples | ForEach-Object { $_.command })
    $duplicates = @($goldenCommands | Group-Object | Where-Object Count -ne 1)
    $missing = @($expectedCommands | Where-Object { $_ -notin $goldenCommands })
    if ($duplicates.Count -gt 0 -or $missing.Count -gt 0) {
        Add-Issue "Command golden fixture must contain exactly one example for every JSON-capable command."
    }
    else {
        Add-Note "Command golden fixture contains one example for every JSON-capable command."
    }
}

if ($null -ne $baselineSchema -and $null -ne $baselineGolden) {
    $algorithm = "sha256-rule-path-location-occurrence-v1"
    if ($baselineSchema.properties.schemaVersion.const -ne 1 -or
        $baselineGolden.schemaVersion -ne 1 -or
        $baselineSchema.properties.fingerprintAlgorithm.const -ne $algorithm -or
        $baselineGolden.fingerprintAlgorithm -ne $algorithm) {
        Add-Issue "Baseline schema/golden version or fingerprint algorithm is inconsistent."
    }
    else {
        Add-Note "Baseline schema 1 and fingerprint algorithm are consistent."
    }
}

if ($null -ne $sarifSchema -and $null -ne $sarifGolden) {
    if ($sarifSchema.properties.version.const -ne "2.1.0" -or
        $sarifGolden.version -ne "2.1.0" -or
        $sarifGolden.runs[0].tool.driver.name -ne "AgentContextKit") {
        Add-Issue "SARIF profile/golden version or tool identity is inconsistent."
    }
    else {
        Add-Note "SARIF 2.1.0 profile and AgentContextKit tool identity are consistent."
    }
}

Push-Location $repoRoot
try {
    $testOutput = & dotnet test $testProject -c Release --no-build --filter "FullyQualifiedName~JsonContractAssetTests" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Add-Note "Machine-readable contract asset tests passed."
    }
    else {
        $testOutput | Write-Host
        Add-Issue "Machine-readable contract asset tests failed."
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
    Write-Host "No machine-readable contract asset issues detected."
}
else {
    Write-Host "Machine-readable contract asset issues:"
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
Write-Host "This gate is local-only. It does not upload schemas/SARIF, push, tag, publish, or mutate remote repository state."

if ($FailOnIssues -and $issues.Count -gt 0) {
    exit 1
}

exit 0
