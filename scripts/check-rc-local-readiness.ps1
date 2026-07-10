param(
    [switch]$FailOnIssues,
    [switch]$SkipBenchmark,
    [switch]$RunDependencyReview
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "git-status.ps1")

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$issues = New-Object System.Collections.Generic.List[string]
$warnings = New-Object System.Collections.Generic.List[string]
$notes = New-Object System.Collections.Generic.List[string]

function Add-Issue { param([string]$Message) $issues.Add($Message) | Out-Null }
function Add-Warning { param([string]$Message) $warnings.Add($Message) | Out-Null }
function Add-Note { param([string]$Message) $notes.Add($Message) | Out-Null }

function Require-Path {
    param([string]$RelativePath, [string]$Description)

    if (Test-Path (Join-Path $repoRoot $RelativePath)) {
        Add-Note "$Description present: $RelativePath"
    }
    else {
        Add-Issue "$Description missing: $RelativePath"
    }
}

function Require-Text {
    param([string]$RelativePath, [string]$Needle, [string]$Description)

    $path = Join-Path $repoRoot $RelativePath
    if (-not (Test-Path $path)) {
        Add-Issue "$Description file missing: $RelativePath"
        return
    }

    $content = Get-Content -Raw $path
    if ($content.Contains($Needle)) {
        Add-Note "$Description present."
    }
    else {
        Add-Issue "$Description missing."
    }
}

function Invoke-Gate {
    param(
        [string]$ScriptName,
        [string[]]$Arguments,
        [string]$Description
    )

    $scriptPath = Join-Path $PSScriptRoot $ScriptName
    if (-not (Test-Path $scriptPath)) {
        Add-Issue "$Description script missing: scripts\$ScriptName"
        return
    }

    & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath @Arguments
    if ($LASTEXITCODE -eq 0) {
        Add-Note "$Description passed."
    }
    else {
        Add-Issue "$Description failed with exit code $LASTEXITCODE."
    }
}

Write-Host "AgentContextKit final RC local-readiness review"
Write-Host "Repository: $repoRoot"

$requiredPaths = @(
    @{ Path = "docs\RC_LOCAL_READINESS.md"; Description = "RC local-readiness decision" },
    @{ Path = "docs\RELEASE_CANDIDATE_EVIDENCE.md"; Description = "Release-candidate evidence" },
    @{ Path = "docs\RELEASE_CANDIDATE_CONTRACT_FREEZE.md"; Description = "Conditional contract freeze" },
    @{ Path = "docs\MAINTAINER_RC_DECISION.md"; Description = "Maintainer RC decision" },
    @{ Path = "docs\V100_GAP_ANALYSIS.md"; Description = "v1.0 gap register" },
    @{ Path = "docs\SECURITY_SUPPLY_CHAIN_EVIDENCE.md"; Description = "Security/supply-chain evidence register" },
    @{ Path = "docs\MAINTAINER_SECURITY_SUPPLY_CHAIN_HANDOFF.md"; Description = "Maintainer security/supply-chain handoff" },
    @{ Path = "docs\RC_HOSTED_EVIDENCE.md"; Description = "Hosted RC evidence guide" },
    @{ Path = "docs\HOSTED_VALIDATION_STATUS.md"; Description = "Hosted validation status" },
    @{ Path = "docs\PRIVATE_VULNERABILITY_REPORTING_STATUS.md"; Description = "Private vulnerability reporting status" },
    @{ Path = "docs\PUBLISHED_SUPPLY_CHAIN_STATUS.md"; Description = "Published supply-chain status" },
    @{ Path = "docs\V100_MAINTAINER_DECISION_PACKET.md"; Description = "V100 maintainer decision packet" },
    @{ Path = "docs\tasks\TASK-0096-final-rc-local-readiness-consolidation.md"; Description = "TASK-0096" }
)

foreach ($entry in $requiredPaths) {
    Require-Path -RelativePath $entry.Path -Description $entry.Description
}

Require-Text -RelativePath "docs\RC_LOCAL_READINESS.md" -Needle "LOCAL READY / REMOTE NO-GO" -Description "Local-versus-remote decision"
Require-Text -RelativePath "docs\RC_LOCAL_READINESS.md" -Needle "428/428 tests" -Description "Validated test count"
Require-Text -RelativePath "docs\RC_LOCAL_READINESS.md" -Needle "PENDING MAINTAINER" -Description "Maintainer evidence boundary"
Require-Text -RelativePath "docs\RC_LOCAL_READINESS.md" -Needle "docs/V100_GAP_ANALYSIS.md" -Description "Open gap source of truth"
Require-Text -RelativePath "docs\MAINTAINER_RC_DECISION.md" -Needle "NO-GO for release-candidate publication" -Description "Maintainer NO-GO decision"
Require-Text -RelativePath "docs\V100_GAP_ANALYSIS.md" -Needle "AgentContextKit is **not ready for 1.0 general availability**" -Description "1.0 GA blocker statement"
Require-Text -RelativePath "docs\HOSTED_VALIDATION_STATUS.md" -Needle "4c4fa64ff34287dff01818d52f49b521efb3176d" -Description "Hosted evidence commit"
Require-Text -RelativePath "docs\HOSTED_VALIDATION_STATUS.md" -Needle "27478635057" -Description "Successful manual RC workflow run"
Require-Text -RelativePath "docs\PRIVATE_VULNERABILITY_REPORTING_STATUS.md" -Needle "enabled: true" -Description "Verified enabled private-reporting state"
Require-Text -RelativePath "docs\PUBLISHED_SUPPLY_CHAIN_STATUS.md" -Needle "No author signature was observed" -Description "Published author-signature boundary"
Require-Text -RelativePath "docs\V100_MAINTAINER_DECISION_PACKET.md" -Needle "V100-06 is closed" -Description "Fresh V100-06 decision"

Push-Location $repoRoot
try {
    $evidenceArguments = @("-FailOnIssues")
    if ($SkipBenchmark) {
        $evidenceArguments += "-SkipBenchmark"
        Add-Warning "Synthetic benchmark was skipped for this invocation."
    }

    Invoke-Gate -ScriptName "check-release-candidate-evidence.ps1" -Arguments $evidenceArguments -Description "Release-candidate evidence gate"
    Invoke-Gate -ScriptName "check-release-candidate-workflow.ps1" -Arguments @("-FailOnIssues") -Description "Release-candidate workflow gate"
    Invoke-Gate -ScriptName "check-v100-documentation-release-gates.ps1" -Arguments @("-FailOnIssues") -Description "v1.0 documentation gate"
    Invoke-Gate -ScriptName "check-v100-readiness.ps1" -Arguments @("-FailOnIssues") -Description "v1.0 asset-readiness gate"
    Invoke-Gate -ScriptName "check-published-supply-chain-status.ps1" -Arguments @("-FailOnIssues") -Description "Published supply-chain status gate"

    if ($RunDependencyReview) {
        Invoke-Gate -ScriptName "check-security-supply-chain-evidence.ps1" -Arguments @("-RunDependencyReview", "-FailOnIssues") -Description "Security/supply-chain dependency evidence gate"
    }
    else {
        Add-Warning "Dependency review was not rerun; use -RunDependencyReview for final evidence."
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
    Write-Host "LOCAL READY / REMOTE NO-GO: no local readiness structure or gate issues detected."
}
else {
    Write-Host "RC local-readiness issues:"
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
Write-Host "This gate is local and read-only. Hosted evidence, GitHub security settings, signing, SBOM/provenance publication, candidate approval, push, tag, release, and NuGet publish remain maintainer-only."

if ($FailOnIssues -and $issues.Count -gt 0) {
    exit 1
}

exit 0
