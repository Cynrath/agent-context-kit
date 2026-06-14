param(
    [switch]$FailOnIssues
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

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

Write-Host "AgentContextKit published supply-chain status review"
Write-Host "Repository: $repoRoot"

$status = Read-RequiredFile "docs\PUBLISHED_SUPPLY_CHAIN_STATUS.md" "Published supply-chain status"
$task = Read-RequiredFile "docs\tasks\TASK-0127-alpha2-supply-chain-evidence-refresh.md" "TASK-0127"
$evidence = Read-RequiredFile "docs\SECURITY_SUPPLY_CHAIN_EVIDENCE.md" "Security/supply-chain evidence register"
$policy = Read-RequiredFile "docs\SUPPLY_CHAIN_POLICY.md" "Supply-chain policy"
$decisions = Read-RequiredFile "docs\SUPPLY_CHAIN_DECISIONS.md" "Supply-chain decisions"

foreach ($marker in @(
    'NuGet package `AgentContextKit` `0.2.0-alpha.2`',
    "83348398a2e52b5430456a65c3439f4a8b617760ebe1881e970141fcb5375152",
    "89291454460de7db003b38719df1d58902ae2e8fcf4b8a07814c3785f64ee264",
    "3982128cae4c4c8b6795de1fb064fc81bb962dc06f66a5891e2340987c8c18e3",
    "f540479a92cbe66097f6796553828ee49ddd5512",
    "27478046088",
    'Signature type: `Repository`',
    "No author signature was observed",
    'Repository signature owner `Cyranth`; project persona/author `Cynrath`',
    "no SBOM asset is present",
    "no accessible GitHub artifact attestation",
    "does not sign, publish, attest, upload"
)) {
    Require-Text $status $marker "Published-state marker $marker"
}

Require-Text $task "Signing, republishing" "Task remote-write boundary"
Require-Text $evidence "VERIFIED PUBLISHED STATE" "Published-state evidence vocabulary"
Require-Text $evidence "NuGet owner identity" "NuGet owner identity evidence row"
Require-Text $evidence "Alpha.2 has a valid NuGet repository signature and no author signature" "Package signature published-state evidence"
Require-Text $evidence "Alpha.2 has no SBOM" "SBOM published-state evidence"
Require-Text $evidence "alpha.2 remains unattested" "Provenance published-state evidence"
Require-Text $decisions "## Author Signing" "Author-signing decision section"
Require-Text $decisions "## SBOM" "SBOM decision section"
Require-Text $decisions "**Decision: DEFER / ACCEPTED RISK**" "Author-signing/SBOM accepted-risk decision"
Require-Text $decisions "## GitHub Artifact Provenance" "Provenance decision section"
Require-Text $decisions "**Decision: IMPLEMENT for the next published release.**" "Future provenance decision"
Require-Text $policy "repository-signed by NuGet.org" "Repository-signing truth boundary"
Require-Text $policy "must not be described as author-signed" "Author-signing truth boundary"

if (Get-Command git -ErrorAction SilentlyContinue) {
    Push-Location $repoRoot
    try {
        $workingTree = git status --short 2>$null
        if ($LASTEXITCODE -eq 0 -and $workingTree) {
            Add-Warning "Working tree has uncommitted changes."
        }
    }
    finally {
        Pop-Location
    }
}

Write-Host ""
if ($issues.Count -eq 0) {
    Write-Host "No published supply-chain status issues detected."
}
else {
    Write-Host "Published supply-chain status issues:"
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
Write-Host "This gate validates committed evidence structure only. It does not download, sign, publish, attest, upload, edit releases, modify package ownership, or perform package recovery actions."

if ($FailOnIssues -and $issues.Count -gt 0) {
    exit 1
}

exit 0
