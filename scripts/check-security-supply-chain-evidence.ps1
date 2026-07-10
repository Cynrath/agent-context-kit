param(
    [switch]$FailOnIssues,
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

function Read-RequiredFile {
    param([string]$RelativePath, [string]$Description)

    $path = Join-Path $repoRoot $RelativePath
    if (-not (Test-Path $path)) {
        Add-Issue "$Description missing: $RelativePath"
        return ""
    }

    Add-Note "$Description present: $RelativePath"
    return Get-Content -Raw $path
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

Write-Host "AgentContextKit security and supply-chain evidence review"
Write-Host "Repository: $repoRoot"

$evidence = Read-RequiredFile "docs\SECURITY_SUPPLY_CHAIN_EVIDENCE.md" "Security/supply-chain evidence register"
$handoff = Read-RequiredFile "docs\MAINTAINER_SECURITY_SUPPLY_CHAIN_HANDOFF.md" "Maintainer security/supply-chain handoff"
$securityPolicy = Read-RequiredFile "SECURITY.md" "Public security policy"
$responseReadiness = Read-RequiredFile "docs\SECURITY_RESPONSE_READINESS.md" "Security response readiness"
$supplyChain = Read-RequiredFile "docs\SUPPLY_CHAIN_POLICY.md" "Supply-chain policy"
$maintainerDecision = Read-RequiredFile "docs\MAINTAINER_RC_DECISION.md" "Maintainer RC decision"
$task = Read-RequiredFile "docs\tasks\TASK-0095-security-supply-chain-maintainer-evidence.md" "TASK-0095"
$privateReportingStatus = Read-RequiredFile "docs\PRIVATE_VULNERABILITY_REPORTING_STATUS.md" "Private vulnerability reporting status"
$privateReportingTask = Read-RequiredFile "docs\tasks\TASK-0098-private-vulnerability-reporting-status.md" "TASK-0098"
$publishedSupplyChainStatus = Read-RequiredFile "docs\PUBLISHED_SUPPLY_CHAIN_STATUS.md" "Published supply-chain status"
$publishedSupplyChainTask = Read-RequiredFile "docs\tasks\TASK-0127-alpha2-supply-chain-evidence-refresh.md" "TASK-0127"
$privateReportingVerificationScript = Read-RequiredFile "scripts\check-private-vulnerability-reporting.ps1" "Private-reporting verification script"
$notificationOwnership = Read-RequiredFile "docs\SECURITY_NOTIFICATION_OWNERSHIP.md" "Security notification ownership"
$packageRecovery = Read-RequiredFile "docs\PACKAGE_RECOVERY.md" "Package recovery procedure"
$supplyChainDecisions = Read-RequiredFile "docs\SUPPLY_CHAIN_DECISIONS.md" "Signing/SBOM/provenance decisions"
$v100DecisionPacket = Read-RequiredFile "docs\V100_MAINTAINER_DECISION_PACKET.md" "V100 maintainer decision packet"

foreach ($marker in @(
    "Local evidence register prepared on 2026-06-12",
    "PENDING MAINTAINER",
    "VERIFIED LOCAL",
    "ACCEPTED RISK",
    "VERIFIED REMOTE STATE",
    "VERIFIED PUBLISHED STATE",
    "Private vulnerability reporting | VERIFIED MAINTAINER: ENABLED on 2026-06-14",
    "NuGet owner identity | ACCEPTED RISK on 2026-06-14",
    "NuGet package signature | ACCEPTED RISK: author signing deferred on 2026-06-14",
    "SBOM | ACCEPTED RISK: publication deferred on 2026-06-14",
    "Build/package provenance | IMPLEMENTED LOCALLY / HOSTED PENDING",
    "Candidate commit:",
    "Decision date:",
    "Maintainer: Cynrath",
    "Next review date:"
)) {
    Require-Text $evidence $marker "Evidence register marker $marker"
}

foreach ($marker in @(
    "Private Vulnerability Reporting",
    "Final-Candidate Dependency Review",
    "NuGet Signing Decision",
    "SBOM Decision",
    "Provenance Decision",
    "Bad-Package Recovery Acceptance",
    "scripts/check-security-supply-chain-evidence.ps1"
)) {
    Require-Text $handoff $marker "Maintainer handoff section $marker"
}

Require-Text $securityPolicy "Private GitHub vulnerability reporting was enabled and verified on 2026-06-14" "Public security policy private-reporting state"
Require-Text $responseReadiness "Primary and backup security notification ownership are recorded and freshly reviewed" "Security response ownership completion"
Require-Text $supplyChain "repository-signed by NuGet.org" "Repository-signing truth boundary"
Require-Text $supplyChain "must not be described as author-signed" "Author-signing truth boundary"
Require-Text $maintainerDecision "NO-GO for release-candidate publication" "Maintainer NO-GO decision"
Require-Text $task "does not approve an RC" "Task non-approval boundary"
Require-Text $privateReportingStatus 'Result: `enabled: true`' "Verified enabled private-reporting state"
Require-Text $privateReportingStatus "private-reporting P0 blocker closed" "Private-reporting blocker closure"
Require-Text $privateReportingStatus "repos/Cynrath/agent-context-kit/private-vulnerability-reporting" "Private-reporting read-only endpoint"
Require-Text $privateReportingVerificationScript "RequireEnabled" "Private-reporting enabled-state assertion"
Require-Text $notificationOwnership "Primary security triage owner" "Primary security notification owner"
Require-Text $notificationOwnership "Backup security triage owner" "Backup security notification boundary"
Require-Text $notificationOwnership "DONE_CRITERIA_FRESHLY_VERIFIED" "Fresh V100-06 ownership verification"
Require-Text $packageRecovery 'Decision owner: `Cynrath`' "Package recovery decision owner"
Require-Text $packageRecovery "NuGet unlist/deprecate/account-recovery authority: unverified" "Package recovery authority blocker"
Require-Text $packageRecovery "never overwrite or reuse the published version" "Immutable package recovery boundary"
Require-Text (Read-RequiredFile "docs\NUGET_OWNER_IDENTITY.md" "NuGet owner identity disposition") "ACCEPTED RISK through the next pre-release decision or 2026-09-30" "Bounded NuGet identity disposition"
Require-Text $supplyChainDecisions "Author Signing" "Author-signing decision"
Require-Text $supplyChainDecisions "SBOM" "SBOM decision"
Require-Text $supplyChainDecisions "GitHub Artifact Provenance" "Provenance decision"
Require-Text $supplyChainDecisions "actions/attest@v4" "Official attestation action boundary"
Require-Text $v100DecisionPacket "OPEN_PENDING_FINAL_CANDIDATE_ACCEPTANCE" "V100-02 final-candidate boundary"
Require-Text $v100DecisionPacket "DONE_CRITERIA_FRESHLY_VERIFIED" "V100-06 closure evidence"
Require-Text $v100DecisionPacket "OPEN_PENDING_FINAL_RC_CROSS_PLATFORM_CONFIRMATION" "V100-08 hosted boundary"
Require-Text $v100DecisionPacket "OPEN_PENDING_HOSTED_PROVENANCE_EVIDENCE" "V100-09 provenance boundary"
Require-Text $privateReportingTask "No GitHub setting change" "Private-reporting task remote-write boundary"
Require-Text $publishedSupplyChainStatus "No author signature was observed" "Published author-signature boundary"
Require-Text $publishedSupplyChainStatus "no accessible GitHub artifact attestation" "Published provenance boundary"
Require-Text $publishedSupplyChainStatus 'Repository signature owner `Cyranth`; project persona/author `Cynrath`' "Published owner-identity mismatch"
Require-Text $publishedSupplyChainTask "Signing, republishing" "Published supply-chain task remote-write boundary"

if ($RunDependencyReview) {
    Push-Location $repoRoot
    try {
        $vulnerableOutput = & dotnet list AgentContextKit.sln package --vulnerable --include-transitive 2>&1
        if ($LASTEXITCODE -eq 0) {
            Add-Note "Dependency vulnerability review command completed successfully."
        }
        else {
            $vulnerableOutput | Write-Host
            Add-Issue "Dependency vulnerability review command failed or package sources were unavailable."
        }

        $deprecatedOutput = & dotnet list AgentContextKit.sln package --deprecated --include-transitive 2>&1
        if ($LASTEXITCODE -eq 0) {
            Add-Note "Dependency deprecation review command completed successfully."
        }
        else {
            $deprecatedOutput | Write-Host
            Add-Issue "Dependency deprecation review command failed or package sources were unavailable."
        }
    }
    finally {
        Pop-Location
    }
}
else {
    Add-Warning "Dependency review commands were not run by this gate invocation."
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

Write-Host ""
if ($issues.Count -eq 0) {
    Write-Host "No security/supply-chain evidence structure issues detected."
}
else {
    Write-Host "Security/supply-chain evidence structure issues:"
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
Write-Host "This gate validates local evidence structure only. It does not verify or change GitHub settings, handle certificates, sign packages, generate/upload SBOM or provenance, push, tag, release, or publish."

if ($FailOnIssues -and $issues.Count -gt 0) {
    exit 1
}

exit 0
