param(
    [switch]$FailOnIssues,
    [switch]$SkipBenchmark
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot "git-status.ps1")

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$solution = Join-Path $repoRoot "AgentContextKit.sln"
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

Write-Host "AgentContextKit release-candidate evidence review"
Write-Host "Repository: $repoRoot"

$requiredPaths = @(
    @{ Path = "docs\UPGRADE_COMPATIBILITY.md"; Description = "Upgrade compatibility policy" },
    @{ Path = "docs\PERFORMANCE_POLICY.md"; Description = "Performance policy" },
    @{ Path = "docs\SECURITY_RESPONSE_READINESS.md"; Description = "Security response readiness" },
    @{ Path = "docs\SUPPORT_LIFECYCLE.md"; Description = "Support lifecycle" },
    @{ Path = "docs\SUPPLY_CHAIN_POLICY.md"; Description = "Supply-chain policy" },
    @{ Path = "docs\RELEASE_CANDIDATE_EVIDENCE.md"; Description = "Release-candidate evidence matrix" },
    @{ Path = "docs\RELEASE_CANDIDATE_CONTRACT_FREEZE.md"; Description = "Release-candidate contract freeze" },
    @{ Path = "docs\MAINTAINER_RC_DECISION.md"; Description = "Maintainer release-candidate decision" },
    @{ Path = "docs\SECURITY_SUPPLY_CHAIN_EVIDENCE.md"; Description = "Security/supply-chain evidence register" },
    @{ Path = "docs\MAINTAINER_SECURITY_SUPPLY_CHAIN_HANDOFF.md"; Description = "Maintainer security/supply-chain handoff" },
    @{ Path = "docs\schemas\ackit-command-output-v2.schema.json"; Description = "Command output schema" },
    @{ Path = "docs\schemas\ackit-baseline-v1.schema.json"; Description = "Baseline machine-readable schema" },
    @{ Path = "docs\schemas\ackit-sarif-profile-v1.schema.json"; Description = "SARIF machine-readable profile" },
    @{ Path = "tests\fixtures\contracts\command-output-v2-golden.json"; Description = "Command output golden fixture" },
    @{ Path = "tests\fixtures\contracts\baseline-v1-golden.json"; Description = "Baseline golden fixture" },
    @{ Path = "tests\fixtures\contracts\sarif-profile-v1-golden.json"; Description = "SARIF golden fixture" },
    @{ Path = "tests\fixtures\upgrade\v0.2.0-alpha.1-config.yml"; Description = "Published config fixture" },
    @{ Path = "tests\fixtures\upgrade\baseline-schema-v1.json"; Description = "Baseline schema fixture" },
    @{ Path = "tests\AgentContextKit.Tests\ReleaseCandidateEvidenceTests.cs"; Description = "Compatibility tests" },
    @{ Path = "tests\AgentContextKit.Tests\JsonContractAssetTests.cs"; Description = "Machine-readable contract asset tests" },
    @{ Path = "tests\AgentContextKit.Tests\LocalizationParityTests.cs"; Description = "Localization parity tests" },
    @{ Path = "scripts\measure-scan-performance.ps1"; Description = "Synthetic scan benchmark" },
    @{ Path = "scripts\check-json-contract-assets.ps1"; Description = "Machine-readable contract asset gate" },
    @{ Path = "scripts\check-localization-parity.ps1"; Description = "Localization parity gate" },
    @{ Path = "scripts\check-security-supply-chain-evidence.ps1"; Description = "Security/supply-chain evidence gate" }
)

foreach ($entry in $requiredPaths) {
    Require-Path -RelativePath $entry.Path -Description $entry.Description
}

Require-Text -RelativePath "docs\UPGRADE_COMPATIBILITY.md" -Needle "0.2.0-alpha.1" -Description "Supported predecessor"
Require-Text -RelativePath "docs\UPGRADE_COMPATIBILITY.md" -Needle "Rollback" -Description "Upgrade rollback guidance"
Require-Text -RelativePath "docs\PERFORMANCE_POLICY.md" -Needle "not a production SLA" -Description "Performance non-SLA boundary"
Require-Text -RelativePath "docs\SECURITY_RESPONSE_READINESS.md" -Needle "Primary and backup security notification ownership are recorded and freshly reviewed" -Description "Security notification ownership completion"
Require-Text -RelativePath "docs\SUPPORT_LIFECYCLE.md" -Needle ".NET 10" -Description "Runtime lifecycle baseline"
Require-Text -RelativePath "docs\SUPPLY_CHAIN_POLICY.md" -Needle "Signing, SBOM, And Provenance Decision" -Description "Supply-chain decision boundary"
Require-Text -RelativePath "docs\RELEASE_CANDIDATE_EVIDENCE.md" -Needle "Do not call the project 1.0 RC-ready" -Description "RC decision rule"
Require-Text -RelativePath "docs\RELEASE_CANDIDATE_CONTRACT_FREEZE.md" -Needle "Conditional local freeze" -Description "Conditional contract freeze status"
Require-Text -RelativePath "docs\RELEASE_CANDIDATE_CONTRACT_FREEZE.md" -Needle "NO-GO for RC publication" -Description "Contract freeze publication boundary"
Require-Text -RelativePath "docs\RELEASE_CANDIDATE_CONTRACT_FREEZE.md" -Needle "sha256-rule-path-location-occurrence-v1" -Description "Frozen baseline fingerprint algorithm"
Require-Text -RelativePath "docs\MAINTAINER_RC_DECISION.md" -Needle "NO-GO for release-candidate publication" -Description "Maintainer current decision"
Require-Text -RelativePath "docs\MAINTAINER_RC_DECISION.md" -Needle "Remote-Write Boundary" -Description "Maintainer remote-write boundary"

Push-Location $repoRoot
try {
    $testOutput = & dotnet test $solution -c Release --no-build --filter "FullyQualifiedName~ReleaseCandidateEvidenceTests" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Add-Note "Release-candidate compatibility tests passed."
    }
    else {
        $testOutput | Write-Host
        Add-Issue "Release-candidate compatibility tests failed."
    }

    if (-not $SkipBenchmark) {
        & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "measure-scan-performance.ps1") -FileCount 2000 -MaxSeconds 30 -FailOnThreshold
        if ($LASTEXITCODE -eq 0) {
            Add-Note "Synthetic scan benchmark passed."
        }
        else {
            Add-Issue "Synthetic scan benchmark failed."
        }
    }
    else {
        Add-Warning "Synthetic scan benchmark was skipped."
    }

    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "check-json-contract-assets.ps1") -FailOnIssues
    if ($LASTEXITCODE -eq 0) {
        Add-Note "Machine-readable contract asset gate passed."
    }
    else {
        Add-Issue "Machine-readable contract asset gate failed."
    }

    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "check-localization-parity.ps1") -FailOnIssues
    if ($LASTEXITCODE -eq 0) {
        Add-Note "Localization parity gate passed."
    }
    else {
        Add-Issue "Localization parity gate failed."
    }

    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "check-security-supply-chain-evidence.ps1") -FailOnIssues
    if ($LASTEXITCODE -eq 0) {
        Add-Note "Security/supply-chain evidence structure gate passed."
    }
    else {
        Add-Issue "Security/supply-chain evidence structure gate failed."
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
    Write-Host "No local release-candidate evidence issues detected."
}
else {
    Write-Host "Release-candidate evidence issues:"
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
Write-Host "This review is local-only. Hosted workflows, security settings, tags, releases, signing, provenance, SBOM publication, and NuGet publish remain maintainer-only."

if ($FailOnIssues -and $issues.Count -gt 0) {
    exit 1
}

exit 0
