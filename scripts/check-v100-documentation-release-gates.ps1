param(
    [switch]$FailOnIssues
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "git-status.ps1")

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
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

Write-Host "AgentContextKit v1.0 documentation/release gate review"
Write-Host "Repository: $repoRoot"

$criticalDocs = @(
    "docs\CLI_CONTRACT.md",
    "docs\CLI_REFERENCE.md",
    "docs\CONFIGURATION.md",
    "docs\CONFIG_GENERATED_CONVENTIONS.md",
    "docs\JSON_OUTPUT.md",
    "docs\EXIT_CODES.md",
    "docs\V020_READINESS.md",
    "docs\V030_READINESS.md",
    "docs\V040_READINESS.md",
    "docs\V050_READINESS.md",
    "docs\V100_STABILIZATION_PLAN.md",
    "docs\V100_DOCUMENTATION_RELEASE_GATE_FREEZE.md",
    "docs\V100_READINESS.md",
    "docs\V100_GAP_ANALYSIS.md",
    "docs\V100_RC1_RELEASE_PLAN.md",
    "docs\RELEASE_BODY_V100_RC1.md",
    "docs\RELEASE_CANDIDATE_CONTRACT_FREEZE.md",
    "docs\MAINTAINER_RC_DECISION.md",
    "docs\RC_LOCAL_READINESS.md",
    "docs\HOSTED_VALIDATION_STATUS.md",
    "docs\PRIVATE_VULNERABILITY_REPORTING_STATUS.md",
    "docs\PUBLISHED_SUPPLY_CHAIN_STATUS.md",
    "docs\RELEASE_VALIDATION.md",
    "docs\RELEASE_BLOCKERS.md",
    "docs\PUBLIC_RELEASE_AUDIT.md",
    "docs\PUBLIC_RELEASE_GATES.md",
    "docs\NUGET_METADATA.md",
    "docs\MAINTAINER_RELEASE_HANDOFF.md",
    "docs\PACKAGING.md",
    "docs\RELEASE_CHECKLIST.md",
    "docs\RELEASE_CANDIDATE_0.1.0-alpha.1.md"
)

foreach ($doc in $criticalDocs) {
    Require-Path -RelativePath $doc -Description "Release-critical doc"
}

$gateScripts = @(
    "scripts\check-local-markdown-links.ps1",
    "scripts\test-local-markdown-links.ps1",
    "scripts\check-release-workflow.ps1",
    "scripts\check-release-candidate-inputs.ps1",
    "scripts\test-release-candidate-inputs.ps1",
    "scripts\test-release-recovery.ps1",
    "scripts\verify-existing-release.ps1",
    "scripts\prepare-release.ps1",
    "scripts\verify-published-package.ps1",
    "scripts\check-cli-contract.ps1",
    "scripts\check-config-generated-conventions.ps1",
    "scripts\check-v020-readiness.ps1",
    "scripts\check-v030-readiness.ps1",
    "scripts\check-v040-readiness.ps1",
    "scripts\check-v050-readiness.ps1",
    "scripts\check-v100-documentation-release-gates.ps1",
    "scripts\check-v100-readiness.ps1",
    "scripts\check-json-contract-assets.ps1",
    "scripts\check-localization-parity.ps1",
    "scripts\check-security-supply-chain-evidence.ps1",
    "scripts\check-published-supply-chain-status.ps1",
    "scripts\check-rc-local-readiness.ps1",
    "scripts\check-package-metadata.ps1",
    "scripts\audit-public-release.ps1",
    "scripts\check-release-blockers.ps1",
    "scripts\check-public-release-gates.ps1",
    "scripts\verify-release.ps1"
)

foreach ($script in $gateScripts) {
    Require-Path -RelativePath $script -Description "Release gate script"
}

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "test-local-markdown-links.ps1")
if ($LASTEXITCODE -ne 0) {
    Add-Issue "Local Markdown link gate tests failed."
}
else {
    Add-Note "Local Markdown link gate tests passed."
}

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "check-local-markdown-links.ps1") -RepositoryRoot $repoRoot -FailOnIssues
if ($LASTEXITCODE -ne 0) {
    Add-Issue "Local Markdown link audit failed."
}
else {
    Add-Note "Local Markdown link audit passed."
}

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "check-release-workflow.ps1") -FailOnIssues
if ($LASTEXITCODE -ne 0) {
    Add-Issue "Release workflow static safety gate failed."
}
else {
    Add-Note "Release workflow static safety gate passed."
}

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "test-release-recovery.ps1")
if ($LASTEXITCODE -ne 0) {
    Add-Issue "Release recovery behavior tests failed."
}
else {
    Add-Note "Release recovery behavior tests passed."
}

$documentationIndex = Get-FileText "docs\DOCUMENTATION_INDEX.md"
$releaseValidation = Get-FileText "docs\RELEASE_VALIDATION.md"
$releaseBlockers = Get-FileText "docs\RELEASE_BLOCKERS.md"
$publicReleaseAudit = Get-FileText "docs\PUBLIC_RELEASE_AUDIT.md"
$publicReleaseGates = Get-FileText "docs\PUBLIC_RELEASE_GATES.md"
$freezeDoc = Get-FileText "docs\V100_DOCUMENTATION_RELEASE_GATE_FREEZE.md"
$handoffDoc = Get-FileText "docs\MAINTAINER_RELEASE_HANDOFF.md"

foreach ($doc in $criticalDocs) {
    $docName = [System.IO.Path]::GetFileName($doc)
    Require-Text -Content $documentationIndex -Needle $docName -Description "Documentation index reference $docName"
}

foreach ($script in $gateScripts) {
    Require-Text -Content $releaseValidation -Needle $script.Replace("\", "/") -Description "Release validation script reference $script"
}

$releaseValidationDocs = @(
    "CLI_CONTRACT.md",
    "CONFIG_GENERATED_CONVENTIONS.md",
    "V020_READINESS.md",
    "V030_READINESS.md",
    "V040_READINESS.md",
    "V050_READINESS.md",
    "V100_DOCUMENTATION_RELEASE_GATE_FREEZE.md",
    "V100_READINESS.md",
    "V100_GAP_ANALYSIS.md",
    "RELEASE_BLOCKERS.md",
    "NUGET_METADATA.md",
    "PUBLIC_RELEASE_AUDIT.md",
    "PUBLIC_RELEASE_GATES.md",
    "MAINTAINER_RELEASE_HANDOFF.md",
    "RELEASE_CANDIDATE_CONTRACT_FREEZE.md",
    "MAINTAINER_RC_DECISION.md",
    "V100_RC1_RELEASE_PLAN.md",
    "RELEASE_BODY_V100_RC1.md"
)

foreach ($doc in $releaseValidationDocs) {
    Require-Text -Content $releaseValidation -Needle $doc -Description "Release validation doc reference $doc"
}

$blockerNeedles = @(
    "RepositoryUrl",
    "PackageProjectUrl",
    "v0.2.0-alpha.2",
    "No active release blockers remain",
    "Codex for OSS application"
)

foreach ($needle in $blockerNeedles) {
    Require-Text -Content $releaseBlockers -Needle $needle -Description "Release blocker note $needle"
}

$auditNeedles = @(
    "GitHub source publication and NuGet publication are complete",
    "GitHub Release page: completed",
    "NuGet global tool install verification: completed",
    "release tag to exist locally"
)

foreach ($needle in $auditNeedles) {
    Require-Text -Content $publicReleaseAudit -Needle $needle -Description "Public release audit blocker note $needle"
}

$gateNeedles = @(
    "Current Published State",
    "NuGet publish: completed",
    "GitHub Release page: completed",
    "does not",
    "Follow [MAINTAINER_RELEASE_HANDOFF.md]"
)

foreach ($needle in $gateNeedles) {
    Require-Text -Content $publicReleaseGates -Needle $needle -Description "Public gate note $needle"
}

$freezeNeedles = @(
    "Release-Critical Docs",
    "Release Gate Scripts",
    "Public Release Blockers",
    "Local Freeze Validation",
    "Safety Boundary",
    "does not"
)

foreach ($needle in $freezeNeedles) {
    Require-Text -Content $freezeDoc -Needle $needle -Description "Freeze doc section $needle"
}

$handoffNeedles = @(
    "RepositoryUrl",
    "PackageProjectUrl",
    "tag pushed",
    "NuGet publish"
)

foreach ($needle in $handoffNeedles) {
    Require-Text -Content $handoffDoc -Needle $needle -Description "Maintainer handoff note $needle"
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
    Write-Host "No documentation/release gate issues detected."
}
else {
    Write-Host "Documentation/release gate issues:"
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
    Write-Host "Documentation/release gate failed."
    exit 1
}

exit 0
