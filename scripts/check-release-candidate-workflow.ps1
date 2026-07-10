param(
    [switch]$FailOnIssues
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$workflowPath = Join-Path $repoRoot ".github\workflows\release-candidate-evidence.yml"
$issues = New-Object System.Collections.Generic.List[string]
$notes = New-Object System.Collections.Generic.List[string]

function Add-Issue { param([string]$Message) $issues.Add($Message) | Out-Null }
function Add-Note { param([string]$Message) $notes.Add($Message) | Out-Null }

Write-Host "AgentContextKit release-candidate workflow review"
Write-Host "Repository: $repoRoot"

if (-not (Test-Path $workflowPath)) {
    Add-Issue "Workflow is missing: .github/workflows/release-candidate-evidence.yml"
}
else {
    $content = Get-Content -Raw $workflowPath
    $required = @(
        "workflow_dispatch:",
        "commit_sha:",
        "candidate_version:",
        "predecessor_version:",
        "default: 1.0.0-rc.1",
        "default: 0.2.0-alpha.4",
        "concurrency:",
        "contents: read",
        "windows-2025",
        "ubuntu-latest",
        "macos-latest",
        'PREDECESSOR_VERSION: ${{ inputs.predecessor_version }}',
        'CANDIDATE_VERSION: ${{ inputs.candidate_version }}',
        'ref: ${{ inputs.commit_sha }}',
        "fetch-depth: 0",
        "check-release-candidate-inputs.ps1",
        "-RequireOriginMaster",
        "CANDIDATE_PACKAGE_VERSION",
        "tests/fixtures/upgrade/v0.2.0-alpha.4-config.yml",
        "PREDECESSOR_CONFIG_FIXTURE_MATCH=PASS",
        "config-check --json",
        "baseline --output .ackit-baseline.json",
        "scan --baseline .ackit-baseline.json --ci --json",
        "check-cli-contract.ps1",
        "check-config-generated-conventions.ps1",
        "check-json-contract-assets.ps1",
        "check-localization-parity.ps1",
        "FROZEN_CONTRACT_GATES=PASS",
        "measure-scan-performance.ps1",
        "Get-FileHash",
        "CONFIG_HASH_UNCHANGED=PASS",
        "SARIF_PARSE=PASS",
        "FINAL_SCAN=PASS",
        "Artifact upload: disabled",
        "SARIF upload: disabled"
    )

    foreach ($needle in $required) {
        if ($content.Contains($needle)) {
            Add-Note "Required workflow marker present: $needle"
        }
        else {
            Add-Issue "Required workflow marker missing: $needle"
        }
    }

    $forbiddenPatterns = @(
        "(?m)^\s+push:\s*$",
        "(?m)^\s+pull_request:\s*$",
        "upload-artifact",
        "upload-sarif",
        "security-events:\s*write",
        "secrets\.",
        "contents:\s*write",
        "id-token:\s*write",
        "packages:\s*write",
        "git push",
        "gh release",
        "dotnet nuget push"
    )

    foreach ($pattern in $forbiddenPatterns) {
        if ($content -match $pattern) {
            Add-Issue "Forbidden workflow pattern found: $pattern"
        }
    }

    $inputTest = Join-Path $PSScriptRoot "test-release-candidate-inputs.ps1"
    if (-not (Test-Path $inputTest)) {
        Add-Issue "Release-candidate input tests are missing."
    }
    else {
        Add-Note "Release-candidate input positive/negative test script is present and is run separately by the validation sequence."
    }

    $performanceScript = Get-Content -Raw (Join-Path $PSScriptRoot "measure-scan-performance.ps1")
    foreach ($tempMarker in @('$env:TEMP', '$env:TMPDIR', '$env:RUNNER_TEMP', '[System.IO.Path]::GetTempPath()')) {
        if (-not $performanceScript.Contains($tempMarker)) {
            Add-Issue "Performance tripwire temp fallback missing: $tempMarker"
        }
    }
}

Write-Host ""
if ($issues.Count -eq 0) {
    Write-Host "No release-candidate workflow issues detected."
}
else {
    Write-Host "Release-candidate workflow issues:"
    foreach ($issue in $issues) { Write-Host "- $issue" }
}

if ($notes.Count -gt 0) {
    Write-Host ""
    Write-Host "Notes:"
    foreach ($note in $notes) { Write-Host "- $note" }
}

Write-Host ""
Write-Host "This gate is static and local-only. A maintainer push and manual GitHub Actions dispatch are required for hosted evidence."

if ($FailOnIssues -and $issues.Count -gt 0) {
    exit 1
}

exit 0
