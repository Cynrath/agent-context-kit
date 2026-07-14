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
    "scripts/verify-existing-release-assets.ps1",
    "scripts/verify-existing-package-recovery.ps1",
    "scripts/github-release-state.ps1",
    "scripts/test-existing-package-recovery.ps1",
    "scripts/test-existing-release-assets.ps1",
    "scripts/test-release-recovery.ps1",
    "scripts/test-supply-chain-workflow.ps1",
    "scripts/check-local-markdown-links.ps1",
    "scripts/verify-release.ps1",
    "docs/RELEASE_BODY_V100_RC1.md",
    "- attest-existing",
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
$attestationBlock = Get-JobBlock -Name "attest-existing"
$attestationMatrixBlock = Get-JobBlock -Name "verify-attested-package"
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

foreach ($marker in @(
        "if: inputs.operation == 'attest-existing'",
        "contents: read",
        "id-token: write",
        "attestations: write",
        "inputs.automation_commit_sha",
        "inputs.release_commit_sha",
        "inputs.expected_nupkg_sha256",
        "inputs.expected_snupkg_sha256",
        "docs/RELEASE_BODY_V100_RC1.md",
        "Assert-ExactExistingGitTag",
        "gh release view",
        "tagName,targetCommitish,isPrerelease,isDraft,name,body,assets,url,publishedAt",
        "gh release download",
        "scripts/verify-existing-release-assets.ps1",
        "scripts/verify-existing-package-recovery.ps1",
        "Verify exact existing release assets before attestation",
        "Query exact attestation state",
        "actions/attest@v4",
        "gh attestation verify",
        "Reverify exact existing release after attestation"
    )) {
    if (-not $attestationBlock.Contains($marker)) { $issues.Add("Existing-release attestation marker missing: $marker") | Out-Null }
}

foreach ($forbidden in @(
        "actions: write",
        "contents: write",
        "environment: nuget-release",
        "NuGet/login@",
        "NUGET_API_KEY",
        "dotnet nuget push",
        "--skip-duplicate",
        "gh release create",
        "gh release upload",
        "gh release edit",
        "gh release delete",
        "git push",
        "--force"
    )) {
    if ($attestationBlock.Contains($forbidden)) {
        $issues.Add("Existing-release attestation contains forbidden publication/release mutation marker: $forbidden") | Out-Null
    }
}

foreach ($forbiddenPattern in @(
        '(?mi)^\s*(?:run:\s*)?git\s+tag(?:\s|$)',
        '(?mi)^\s*(?:run:\s*)?git\s+push\s+.*refs/tags/',
        '(?mi)^\s*(?:run:\s*)?gh\s+api\s+(?:(?:--method|-X)\s+(?:POST|PATCH|DELETE)|(?:POST|PATCH|DELETE)\s+).*/git/refs'
    )) {
    if ([regex]::IsMatch($attestationBlock, $forbiddenPattern)) {
        $issues.Add("Existing-release attestation contains forbidden tag mutation pattern: $forbiddenPattern") | Out-Null
    }
}

if ([regex]::Matches($attestationBlock, "uses: actions/attest@v4").Count -ne 2) {
    $issues.Add("Existing-release attestation must define exactly two asset attestation steps.") | Out-Null
}
if ([regex]::Matches($attestationBlock, "gh attestation verify").Count -ne 2) {
    $issues.Add("Existing-release attestation must verify exactly two asset attestations.") | Out-Null
}
if ([regex]::Matches($attestationBlock, '(?m)^\s+Assert-ExactExistingGitTag\s+`?\s*$').Count -ne 2) {
    $issues.Add("Existing-release attestation must verify the immutable exact tag before and after attestation.") | Out-Null
}

foreach ($marker in @(
        '$attestationOutput = gh api --include "repos/${{ github.repository }}/attestations/$Digest"',
        '$attestationExit = $LASTEXITCODE',
        '$attestationExit -eq 0',
        'HTTP/\S+\s+404\b',
        '$global:LASTEXITCODE = 0',
        'return $false',
        'Unable to query exact release asset attestation state',
        "steps.attestation-state.outputs.nupkg_exists != 'true'",
        "steps.attestation-state.outputs.snupkg_exists != 'true'"
    )) {
    if (-not $attestationBlock.Contains($marker)) { $issues.Add("Existing-release attestation idempotency marker missing: $marker") | Out-Null }
}

$attestationVerifyIndex = $attestationBlock.IndexOf("Verify exact existing release assets before attestation", [StringComparison]::Ordinal)
$attestationCreateIndex = $attestationBlock.IndexOf("uses: actions/attest@v4", [StringComparison]::Ordinal)
$attestationCliVerifyIndex = $attestationBlock.IndexOf("Verify both exact existing asset attestations", [StringComparison]::Ordinal)
$attestationFinalVerifyIndex = $attestationBlock.IndexOf("Reverify exact existing release after attestation", [StringComparison]::Ordinal)
if ($attestationVerifyIndex -lt 0 -or $attestationCreateIndex -lt 0 -or $attestationCliVerifyIndex -lt 0 -or $attestationFinalVerifyIndex -lt 0 -or
    $attestationVerifyIndex -gt $attestationCreateIndex -or $attestationCreateIndex -gt $attestationCliVerifyIndex -or
    $attestationCliVerifyIndex -gt $attestationFinalVerifyIndex) {
    $issues.Add("Exact release/package gates must precede attestation, and both CLI attestation checks must precede final immutable revalidation.") | Out-Null
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

$supplyChainTest = Get-Content -Raw (Join-Path $repoRoot "scripts\test-supply-chain-workflow.ps1")
if (-not $supplyChainTest.Contains('Get-Command pwsh -CommandType Application -ErrorAction Stop') -or
    -not $supplyChainTest.Contains('Select-Object -First 1 -ExpandProperty Source') -or
    -not $supplyChainTest.Contains('& $pwshPath -NoLogo -NoProfile -NonInteractive -File')) {
    $issues.Add("Supply-chain workflow tests must resolve and invoke cross-platform pwsh explicitly.") | Out-Null
}
if ([regex]::IsMatch($supplyChainTest, '(?mi)&\s+powershell(?:\.exe)?(?:\s|$)')) {
    $issues.Add("Supply-chain workflow tests must not invoke Windows-only powershell.") | Out-Null
}
if (-not $supplyChainTest.Contains('test-github-release-state.ps1')) {
    $issues.Add("Supply-chain workflow tests must execute the expected-404 regression fixtures under pwsh.") | Out-Null
}

$releaseStateHelper = Get-Content -Raw (Join-Path $repoRoot "scripts\github-release-state.ps1")
foreach ($marker in @(
        'function Assert-ExactExistingGitTag',
        'git fetch --no-tags origin "refs/tags/$Tag"',
        'git rev-list -n 1 FETCH_HEAD',
        'function Assert-GitHubReleaseAbsent',
        'function Assert-GitHubAttestationAbsent',
        'gh api --include',
        'attestations/$Digest',
        '$probeExitCode = $LASTEXITCODE',
        '$probeExitCode -eq 0',
        '(?im)^HTTP/\S+\s+404(?:\s|$)',
        '(?im)^gh:\s+.+\(HTTP 404\)\s*$',
        '$global:LASTEXITCODE = 0'
    )) {
    if (-not $releaseStateHelper.Contains($marker)) {
        $issues.Add("Shared release-absence helper marker missing: $marker") | Out-Null
    }
}
if ($releaseStateHelper.Contains('exit 0')) {
    $issues.Add("Shared release-absence helper must not use a blanket exit 0.") | Out-Null
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
        "Assert-ExactExistingGitTag",
        "Assert-GitHubReleaseAbsent",
        "Assert-GitHubAttestationAbsent",
        "Create GitHub prerelease from verified exact existing tag",
        "gh release create",
        "--verify-tag",
        '--target $releaseSha',
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
        "operation=publish",
        "operation: publish",
        "gh release upload",
        "gh release edit",
        "--force"
    )) {
    if ($recoveryBlock.Contains($forbidden)) {
        $issues.Add("Existing-package recovery contains forbidden publication/mutation marker: $forbidden") | Out-Null
    }
}

foreach ($forbiddenPattern in @(
        '(?mi)^\s*(?:run:\s*)?git\s+tag(?:\s|$)',
        '(?mi)^\s*(?:run:\s*)?git\s+push\s+.*refs/tags/',
        '(?mi)^\s*(?:run:\s*)?gh\s+api\s+(?:(?:--method|-X)\s+(?:POST|PATCH)|(?:POST|PATCH)\s+).*/git/refs'
    )) {
    if ([regex]::IsMatch($recoveryBlock, $forbiddenPattern)) {
        $issues.Add("Existing-package recovery contains forbidden tag mutation pattern: $forbiddenPattern") | Out-Null
    }
}

if ([regex]::Matches($recoveryBlock, "uses: actions/attest@v4").Count -ne 2) {
    $issues.Add("Existing-package recovery must create exactly two asset attestations.") | Out-Null
}
if ([regex]::Matches($recoveryBlock, "gh attestation verify").Count -ne 2) {
    $issues.Add("Existing-package recovery must verify exactly two asset attestations.") | Out-Null
}

$releaseAbsenceCallCount = [regex]::Matches($recoveryBlock, '(?m)^\s+Assert-GitHubReleaseAbsent\s+`?\s*$').Count
$tagVerificationCallCount = [regex]::Matches($recoveryBlock, '(?m)^\s+Assert-ExactExistingGitTag\s+`?\s*$').Count
$attestationAbsenceCallCount = [regex]::Matches($recoveryBlock, '(?m)^\s+Assert-GitHubAttestationAbsent\s+`?\s*$').Count
$releaseStateSourceCount = [regex]::Matches($recoveryBlock, '(?m)^\s+\.\s+\./scripts/github-release-state\.ps1\s*$').Count
if ($releaseAbsenceCallCount -ne 2 -or $tagVerificationCallCount -ne 2 -or
    $attestationAbsenceCallCount -ne 2 -or $releaseStateSourceCount -ne 2) {
    $issues.Add("Both recovery checkpoints must verify the exact tag plus release/asset and both attestation absence states through shared helpers.") | Out-Null
}
if ($recoveryBlock.Contains('gh api --include "repos/${{ github.repository }}/releases/tags/$tagName"')) {
    $issues.Add("Recovery release-absence checks must not bypass the shared helper with inline gh probes.") | Out-Null
}

foreach ($marker in @(
        '$sourceRun.workflowName -ne ''release''',
        '$sourceRun.event -ne ''workflow_dispatch''',
        '$sourceRun.headSha -ne $releaseSha',
        '$artifact.digest.ToLowerInvariant() -ne $artifactDigest',
        '$artifact.workflow_run.head_sha -ne $releaseSha',
        'Recovery requires the exact existing tag before release creation.',
        'Existing recovery tag does not target the exact release commit.',
        'Recovery requires the GitHub Release and its assets to be absent before creation.',
        'Recovery requires both exact release asset attestations to be absent before creation.',
        'Unable to re-prove the exact existing recovery tag.',
        'Recovery release or assets appeared after validation; refusing release creation.',
        'Recovery attestation appeared after validation; refusing release creation.',
        'Recovered release asset hash mismatch.',
        'Recovered prerelease body mismatch.'
    )) {
    if (-not $recoveryBlock.Contains($marker)) { $issues.Add("Existing-package recovery fail-closed marker missing: $marker") | Out-Null }
}

$recoverySafetyIndex = $recoveryBlock.IndexOf("Run exact recovery safety gates", [StringComparison]::Ordinal)
$recoveryVerifyIndex = $recoveryBlock.IndexOf("scripts/verify-existing-package-recovery.ps1", [StringComparison]::Ordinal)
$recoveryRemoteStateIndex = $recoveryBlock.IndexOf("Recheck exact remote recovery state", [StringComparison]::Ordinal)
$recoveryFirstTagVerificationIndex = $recoveryBlock.IndexOf("Assert-ExactExistingGitTag", [StringComparison]::Ordinal)
$recoveryLastTagVerificationIndex = $recoveryBlock.LastIndexOf("Assert-ExactExistingGitTag", [StringComparison]::Ordinal)
$recoveryFirstAbsenceIndex = $recoveryBlock.IndexOf("Assert-GitHubReleaseAbsent", [StringComparison]::Ordinal)
$recoveryLastAbsenceIndex = $recoveryBlock.LastIndexOf("Assert-GitHubReleaseAbsent", [StringComparison]::Ordinal)
$recoveryFirstAttestationAbsenceIndex = $recoveryBlock.IndexOf("Assert-GitHubAttestationAbsent", [StringComparison]::Ordinal)
$recoveryLastAttestationAbsenceIndex = $recoveryBlock.LastIndexOf("Assert-GitHubAttestationAbsent", [StringComparison]::Ordinal)
$recoveryReleaseIndex = $recoveryBlock.IndexOf("gh release create", [StringComparison]::Ordinal)
$recoveryReleaseVerifyIndex = $recoveryBlock.IndexOf("Verify exact tag prerelease body and assets", [StringComparison]::Ordinal)
$recoveryAttestIndex = $recoveryBlock.IndexOf("uses: actions/attest@v4", [StringComparison]::Ordinal)
if ($recoverySafetyIndex -lt 0 -or $recoveryVerifyIndex -lt 0 -or $recoveryRemoteStateIndex -lt 0 -or
    $recoveryFirstTagVerificationIndex -lt 0 -or $recoveryLastTagVerificationIndex -lt 0 -or
    $recoveryFirstAbsenceIndex -lt 0 -or $recoveryLastAbsenceIndex -lt 0 -or
    $recoveryFirstAttestationAbsenceIndex -lt 0 -or $recoveryLastAttestationAbsenceIndex -lt 0 -or
    $recoveryReleaseIndex -lt 0 -or $recoveryReleaseVerifyIndex -lt 0 -or $recoveryAttestIndex -lt 0 -or
    $recoverySafetyIndex -gt $recoveryVerifyIndex -or $recoveryVerifyIndex -gt $recoveryFirstTagVerificationIndex -or
    $recoveryFirstTagVerificationIndex -gt $recoveryFirstAbsenceIndex -or
    $recoveryFirstAbsenceIndex -gt $recoveryFirstAttestationAbsenceIndex -or
    $recoveryFirstAttestationAbsenceIndex -gt $recoveryRemoteStateIndex -or
    $recoveryRemoteStateIndex -gt $recoveryLastTagVerificationIndex -or
    $recoveryLastTagVerificationIndex -gt $recoveryLastAbsenceIndex -or
    $recoveryLastAbsenceIndex -gt $recoveryLastAttestationAbsenceIndex -or
    $recoveryLastAttestationAbsenceIndex -gt $recoveryReleaseIndex -or
    $recoveryReleaseIndex -gt $recoveryReleaseVerifyIndex -or $recoveryReleaseVerifyIndex -gt $recoveryAttestIndex) {
    $issues.Add("Existing-package recovery safety, exact-artifact, exact-tag, and remote absence gates must precede release creation; attestations must follow exact release asset verification.") | Out-Null
}

$sourceSmokeWorkflow = Get-Content -Raw (Join-Path $repoRoot ".github\workflows\cross-platform-source-smoke.yml")
foreach ($marker in @(
        'scripts/test-github-release-state.ps1',
        'scripts/check-release-workflow.ps1 -FailOnIssues',
        'scripts/test-supply-chain-workflow.ps1',
        'scripts/test-existing-package-recovery.ps1',
        'scripts/test-existing-release-assets.ps1'
    )) {
    if (-not $sourceSmokeWorkflow.Contains($marker)) {
        $issues.Add("Cross-platform source smoke recovery test marker missing: $marker") | Out-Null
    }
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

foreach ($marker in @(
        "if: inputs.operation == 'attest-existing'",
        "needs: attest-existing",
        "contents: read",
        "windows-2025",
        "ubuntu-latest",
        "macos-latest",
        "scripts/verify-published-package.ps1",
        "inputs.version"
    )) {
    if (-not $attestationMatrixBlock.Contains($marker)) { $issues.Add("Attested-package matrix marker missing: $marker") | Out-Null }
}
foreach ($forbidden in @("contents: write", "id-token: write", "attestations: write", "NuGet/login@", "dotnet nuget push", "git push", "gh release")) {
    if ($attestationMatrixBlock.Contains($forbidden)) {
        $issues.Add("Attested-package matrix contains forbidden write marker: $forbidden") | Out-Null
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
