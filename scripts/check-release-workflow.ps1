param(
    [switch]$FailOnIssues,
    [string]$WorkflowPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$workflowPath = if ([string]::IsNullOrWhiteSpace($WorkflowPath)) {
    Join-Path $repoRoot ".github\workflows\release.yml"
}
else {
    (Resolve-Path $WorkflowPath).Path
}
$issues = [System.Collections.Generic.List[string]]::new()

if (-not (Test-Path $workflowPath)) {
    $issues.Add("Release workflow is missing.") | Out-Null
    $content = ""
}
else {
    $content = Get-Content -Raw $workflowPath
}

function Get-JobBlock {
    param([string]$Name)
    $match = [regex]::Match($content, "(?ms)^  $([regex]::Escape($Name)):\r?\n(?<body>.*?)(?=^  [A-Za-z0-9_-]+:\r?\n|\z)")
    if (-not $match.Success) {
        $issues.Add("Workflow job is missing: $Name") | Out-Null
        return ""
    }
    return $match.Groups["body"].Value
}

$required = @(
    "workflow_dispatch:",
    "operation:",
    "automation_commit_sha:",
    "release_commit_sha:",
    "prerelease:",
    "source_run_id:",
    "source_artifact_digest:",
    "expected_nupkg_sha256:",
    "expected_snupkg_sha256:",
    "concurrency:",
    "FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true",
    "scripts/prepare-release.ps1",
    "scripts/verify-published-package.ps1",
    "scripts/verify-existing-release.ps1",
    "scripts/verify-existing-package-recovery.ps1",
    "scripts/test-existing-package-recovery.ps1",
    "scripts/test-release-recovery.ps1",
    "scripts/test-supply-chain-workflow.ps1",
    "scripts/check-local-markdown-links.ps1",
    "scripts/verify-release.ps1",
    "docs/RELEASE_BODY_V100_RC1.md",
    'git tag --list $tagName',
    "gh release list"
)

foreach ($marker in $required) {
    if (-not $content.Contains($marker)) {
        $issues.Add("Required workflow marker missing: $marker") | Out-Null
    }
}

$validateBlock = Get-JobBlock -Name "validate-publish"
$publishBlock = Get-JobBlock -Name "publish"
$recoveryBlock = Get-JobBlock -Name "recover-existing"
$recoveryMatrixBlock = Get-JobBlock -Name "verify-recovered-package"
$verifyBlock = Get-JobBlock -Name "verify-existing"

foreach ($marker in @("if: inputs.operation == 'publish'", "contents: read", "inputs.automation_commit_sha", "inputs.release_commit_sha")) {
    if (-not $validateBlock.Contains($marker)) { $issues.Add("Publish validation marker missing: $marker") | Out-Null }
}

if (-not $validateBlock.Contains('if ("${{ inputs.automation_commit_sha }}" -ne "${{ inputs.release_commit_sha }}")')) {
    $issues.Add("Publish validation must require identical automation and release commits.") | Out-Null
}

if (-not $validateBlock.Contains('pwsh -NoProfile -File scripts/test-local-markdown-links.ps1') -or
    -not $validateBlock.Contains('pwsh -NoProfile -File scripts/check-local-markdown-links.ps1 -FailOnIssues')) {
    $issues.Add("Markdown link gates must run in isolated pwsh child processes.") | Out-Null
}

$artifactRetention = [regex]::Match($validateBlock, "(?m)^\s+retention-days:\s*(?<days>\d+)\s*$")
if (-not $artifactRetention.Success) {
    $issues.Add("Validated package artifact retention must be declared.") | Out-Null
}
else {
    $retentionDays = [int]$artifactRetention.Groups["days"].Value
    if ($retentionDays -lt 14) {
        $issues.Add("Validated package artifact retention must be at least 14 days for delayed publish reruns.") | Out-Null
    }
}

foreach ($marker in @("if: inputs.operation == 'publish'", "environment: nuget-release", "contents: write", "id-token: write", "attestations: write", "NuGet/login@v1", "user: Cyranth", "steps.login.outputs.NUGET_API_KEY", "dotnet nuget push", "gh release create", "actions/attest@v4", "gh attestation verify", "ackit-attestation-subject")) {
    if (-not $publishBlock.Contains($marker)) { $issues.Add("Publish permission/operation marker missing: $marker") | Out-Null }
}

foreach ($marker in @('$version -eq "1.0.0-rc.1"', '$notesFile = "docs/RELEASE_BODY_V100_RC1.md"')) {
    if (-not $publishBlock.Contains($marker)) { $issues.Add("V100 RC1 release body mapping missing: $marker") | Out-Null }
}

if ([regex]::IsMatch($publishBlock, "(?m)^\s*powershell(\s|$)")) {
    $issues.Add("Publish job must not call Windows-only powershell; use pwsh on Ubuntu release jobs.") | Out-Null
}

foreach ($marker in @("if: inputs.operation == 'verify-existing'", "contents: read", "scripts/verify-existing-release.ps1", "inputs.automation_commit_sha", "inputs.release_commit_sha")) {
    if (-not $verifyBlock.Contains($marker)) { $issues.Add("Read-only verification marker missing: $marker") | Out-Null }
}

foreach ($forbidden in @("contents: write", "id-token: write", "attestations: write", "actions/attest@", "gh attestation", "NuGet/login@", "dotnet nuget push", "gh release create", "gh release upload", "gh release edit", "git push", "environment: nuget-release", "NUGET_API_KEY")) {
    if ($verifyBlock.Contains($forbidden)) {
        $issues.Add("Read-only verification job contains forbidden marker: $forbidden") | Out-Null
    }
}

foreach ($forbidden in @("pull_request:", "push:", "NUGET_API_KEY: `${{ secrets.", "force-with-lease", "--force")) {
    if ($content.Contains($forbidden)) {
        $issues.Add("Forbidden workflow marker present: $forbidden") | Out-Null
    }
}

$prepareRelease = Get-Content -Raw (Join-Path $repoRoot "scripts\prepare-release.ps1")
if (-not $prepareRelease.Contains('git tag --list $tagName')) {
    $issues.Add("Release preparation must treat an absent target tag as an idempotent state.") | Out-Null
}

$publishIndex = $publishBlock.IndexOf("dotnet nuget push", [StringComparison]::Ordinal)
$tagIndex = $publishBlock.IndexOf('git tag "$tagName"', [StringComparison]::Ordinal)
$releaseIndex = $publishBlock.IndexOf("gh release create", [StringComparison]::Ordinal)
if ($publishIndex -lt 0 -or $tagIndex -lt 0 -or $releaseIndex -lt 0 -or $publishIndex -gt $tagIndex -or $tagIndex -gt $releaseIndex) {
    $issues.Add("Publish job must publish and verify NuGet before tag and GitHub Release creation.") | Out-Null
}

$verifyReleaseIndex = $publishBlock.IndexOf("Verify tag and release", [StringComparison]::Ordinal)
$attestIndex = $publishBlock.IndexOf("actions/attest@v4", [StringComparison]::Ordinal)
$verifyAttestationIndex = $publishBlock.IndexOf("gh attestation verify", [StringComparison]::Ordinal)
if ($verifyReleaseIndex -lt 0 -or $attestIndex -lt 0 -or $verifyAttestationIndex -lt 0 -or $verifyReleaseIndex -gt $attestIndex -or $attestIndex -gt $verifyAttestationIndex) {
    $issues.Add("Exact GitHub Release asset must be verified before provenance creation and attestation verification.") | Out-Null
}

foreach ($marker in @(
        'gh release download "v${{ inputs.version }}" --repo "${{ github.repository }}" --pattern "AgentContextKit.${{ inputs.version }}.nupkg"',
        'if ($LASTEXITCODE -ne 0) { throw "Unable to download the exact GitHub Release package asset." }',
        '$attestationOutput = gh api --include "repos/${{ github.repository }}/attestations/sha256:$digest"',
        '$attestationExit = $LASTEXITCODE',
        '$attestationExit -eq 0',
        '$exists = $true',
        'HTTP/\S+\s+404\b',
        '$exists = $false',
        'Unable to query release package attestation state'
    )) {
    if (-not $publishBlock.Contains($marker)) {
        $issues.Add("Publish provenance probe hardening marker missing: $marker") | Out-Null
    }
}

if ($publishBlock.Contains('attestations/sha256:$digest" *> $null')) {
    $issues.Add("Publish provenance probe must not discard missing-attestation lookup failures before setting exists=false.") | Out-Null
}

foreach ($marker in @(
        "if: inputs.operation == 'recover-existing'",
        "actions: read",
        "contents: write",
        "id-token: write",
        "attestations: write",
        "inputs.source_run_id",
        "inputs.source_artifact_digest",
        "inputs.expected_nupkg_sha256",
        "inputs.expected_snupkg_sha256",
        "gh run download",
        "scripts/verify-existing-package-recovery.ps1",
        "scripts/verify-published-package.ps1",
        "docs/RELEASE_BODY_V100_RC1.md",
        'git tag "$tagName" "$releaseSha"',
        'git push origin "refs/tags/$tagName"',
        "gh release create",
        "actions/attest@v4",
        "gh attestation verify",
        "scripts/verify-existing-release.ps1"
    )) {
    if (-not $recoveryBlock.Contains($marker)) { $issues.Add("Existing-package recovery marker missing: $marker") | Out-Null }
}

foreach ($forbidden in @(
        "environment: nuget-release",
        "NuGet/login@",
        "NUGET_API_KEY",
        "dotnet nuget push",
        "--skip-duplicate",
        "gh release upload",
        "gh release edit",
        "--force"
    )) {
    if ($recoveryBlock.Contains($forbidden)) {
        $issues.Add("Existing-package recovery contains forbidden publication/mutation marker: $forbidden") | Out-Null
    }
}

if ([regex]::Matches($recoveryBlock, "uses: actions/attest@v4").Count -ne 2) {
    $issues.Add("Existing-package recovery must create exactly two asset attestations.") | Out-Null
}
if ([regex]::Matches($recoveryBlock, "gh attestation verify").Count -ne 2) {
    $issues.Add("Existing-package recovery must verify exactly two asset attestations.") | Out-Null
}

foreach ($marker in @(
        '$sourceRun.workflowName -ne ''release''',
        '$sourceRun.event -ne ''workflow_dispatch''',
        '$sourceRun.headSha -ne $releaseSha',
        '$artifact.digest.ToLowerInvariant() -ne $artifactDigest',
        '$artifact.workflow_run.head_sha -ne $releaseSha',
        'Recovery requires the exact tag to be absent before mutation.',
        'Recovery requires the GitHub Release to be absent before mutation.',
        'Recovery tag appeared after validation; refusing mutation.',
        'Recovery release appeared after validation; refusing mutation.',
        'Recovered release asset hash mismatch.',
        'Recovered prerelease body mismatch.'
    )) {
    if (-not $recoveryBlock.Contains($marker)) { $issues.Add("Existing-package recovery fail-closed marker missing: $marker") | Out-Null }
}

$recoveryVerifyIndex = $recoveryBlock.IndexOf("scripts/verify-existing-package-recovery.ps1", [StringComparison]::Ordinal)
$recoveryTagIndex = $recoveryBlock.IndexOf('git tag "$tagName" "$releaseSha"', [StringComparison]::Ordinal)
$recoveryReleaseIndex = $recoveryBlock.IndexOf("gh release create", [StringComparison]::Ordinal)
$recoveryAttestIndex = $recoveryBlock.IndexOf("uses: actions/attest@v4", [StringComparison]::Ordinal)
if ($recoveryVerifyIndex -lt 0 -or $recoveryTagIndex -lt 0 -or $recoveryReleaseIndex -lt 0 -or $recoveryAttestIndex -lt 0 -or
    $recoveryVerifyIndex -gt $recoveryTagIndex -or $recoveryTagIndex -gt $recoveryReleaseIndex -or $recoveryReleaseIndex -gt $recoveryAttestIndex) {
    $issues.Add("Existing-package recovery must verify exact artifacts before tag/release creation and attest only after release verification.") | Out-Null
}

foreach ($marker in @(
        "if: inputs.operation == 'recover-existing'",
        "needs: recover-existing",
        "contents: read",
        "windows-2025",
        "ubuntu-latest",
        "macos-latest",
        "scripts/verify-published-package.ps1",
        "inputs.version"
    )) {
    if (-not $recoveryMatrixBlock.Contains($marker)) { $issues.Add("Recovered-package matrix marker missing: $marker") | Out-Null }
}
foreach ($forbidden in @("contents: write", "id-token: write", "attestations: write", "NuGet/login@", "dotnet nuget push", "git push", "gh release")) {
    if ($recoveryMatrixBlock.Contains($forbidden)) {
        $issues.Add("Recovered-package matrix contains forbidden write marker: $forbidden") | Out-Null
    }
}

$publishedVerifier = Get-Content -Raw (Join-Path $repoRoot "scripts\verify-published-package.ps1")
foreach ($tempMarker in @('$env:TEMP', '$env:TMPDIR', '$env:RUNNER_TEMP', '[System.IO.Path]::GetTempPath()')) {
    if (-not $publishedVerifier.Contains($tempMarker)) {
        $issues.Add("Published-package verifier temp fallback missing: $tempMarker") | Out-Null
    }
}

if (-not $publishedVerifier.Contains("TempResolutionSelfTest") -or
    -not $publishedVerifier.Contains("Resolve-VerificationTempBase")) {
    $issues.Add("Published-package verifier must expose local temp resolution self-test coverage.") | Out-Null
}

if ($issues.Count -eq 0) {
    Write-Host "Release workflow static checks passed."
}
else {
    Write-Host "Release workflow issues:"
    foreach ($issue in $issues) { Write-Host "- $issue" }
}

if ($FailOnIssues -and $issues.Count -gt 0) { exit 1 }
exit 0
