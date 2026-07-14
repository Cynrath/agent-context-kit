$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$workflowPath = Join-Path $repoRoot ".github\workflows\release.yml"
$gatePath = Join-Path $PSScriptRoot "check-release-workflow.ps1"
$releaseStateTestPath = Join-Path $PSScriptRoot "test-github-release-state.ps1"
$existingReleaseAssetsTestPath = Join-Path $PSScriptRoot "test-existing-release-assets.ps1"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ackit-supply-chain-workflow-" + [guid]::NewGuid().ToString("N"))
$pwshPath = Get-Command pwsh -CommandType Application -ErrorAction Stop |
    Select-Object -First 1 -ExpandProperty Source

function Invoke-Gate {
    param([string]$Path)
    & $pwshPath -NoLogo -NoProfile -NonInteractive -File $gatePath -WorkflowPath $Path -FailOnIssues *> $null
    return $LASTEXITCODE
}

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
try {
    & $pwshPath -NoLogo -NoProfile -NonInteractive -File $releaseStateTestPath
    if ($LASTEXITCODE -ne 0) {
        throw "Expected-404 release-state regression fixtures failed."
    }

    & $pwshPath -NoLogo -NoProfile -NonInteractive -File $existingReleaseAssetsTestPath
    if ($LASTEXITCODE -ne 0) {
        throw "Exact existing-release asset regression fixtures failed."
    }

    if ((Invoke-Gate -Path $workflowPath) -ne 0) {
        throw "Positive release workflow fixture failed."
    }

    $content = Get-Content -Raw $workflowPath
    $lateSafetyGate = $content.Replace(
        "      - name: Run exact recovery safety gates",
        "      - name: Deferred recovery safety gates").Replace(
        "      - name: Verify completed immutable recovery",
        "      - name: Run exact recovery safety gates`n        shell: pwsh`n        run: Write-Host `"too late`"`n`n      - name: Verify completed immutable recovery")

    $cases = @(
        @{ Name = "missing attestation permission"; Content = ([regex]::new('(?m)^      attestations: write\r?\n')).Replace($content, '', 1) },
        @{ Name = "missing official attest action"; Content = $content.Replace("actions/attest@v4", "actions/attest@missing") },
        @{ Name = "read-only verifier gains attestation permission"; Content = ([regex]::new('(?m)^  verify-existing:\r?\n')).Replace($content, "  verify-existing:`n    permissions:`n      attestations: write`n", 1) },
        @{ Name = "missing attestation lookup false path"; Content = $content.Replace('$exists = $false', 'throw "Missing attestation lookup failed before attest step."') },
        @{ Name = "missing existing attestation true path"; Content = $content.Replace('$exists = $true', '$exists = $false') },
        @{ Name = "missing provenance query hard failure"; Content = $content.Replace('throw "Unable to query release package attestation state. gh exit code: $attestationExit"', '$exists = $false') },
        @{ Name = "missing shared release absence helper"; Content = $content.Replace('Assert-GitHubReleaseAbsent `', 'Write-Host "release absence skipped" #') },
        @{ Name = "missing exact existing tag verifier"; Content = $content.Replace('Assert-ExactExistingGitTag `', 'Write-Host "exact tag verification skipped" #') },
        @{ Name = "missing attestation absence verifier"; Content = $content.Replace('Assert-GitHubAttestationAbsent `', 'Write-Host "attestation absence skipped" #') },
        @{ Name = "missing release asset download failure"; Content = $content.Replace('if ($LASTEXITCODE -ne 0) { throw "Unable to download the exact GitHub Release package asset." }', '') },
        @{ Name = "missing v100 rc1 release body mapping"; Content = $content.Replace('$notesFile = "docs/RELEASE_BODY_V100_RC1.md"', '$notesFile = "docs/missing-v100-rc1-body.md"') },
        @{ Name = "missing final attestation verify"; Content = $content.Replace('gh attestation verify', 'Write-Host "attestation verify skipped"') },
        @{ Name = "recovery gains NuGet push"; Content = $content.Replace("      - name: Recheck exact remote recovery state", "      - name: Forbidden recovery NuGet push`n        run: dotnet nuget push forbidden.nupkg`n`n      - name: Recheck exact remote recovery state") },
        @{ Name = "recovery gains NuGet login"; Content = $content.Replace("      - name: Recheck exact remote recovery state", "      - name: Forbidden recovery login`n        uses: NuGet/login@v1`n`n      - name: Recheck exact remote recovery state") },
        @{ Name = "recovery gains tag creation"; Content = $content.Replace("      - name: Recheck exact remote recovery state", "      - name: Forbidden recovery tag creation`n        run: git tag v1.0.0-rc.1 forbidden`n`n      - name: Recheck exact remote recovery state") },
        @{ Name = "recovery gains tag push"; Content = $content.Replace("      - name: Recheck exact remote recovery state", "      - name: Forbidden recovery tag push`n        run: git push origin refs/tags/v1.0.0-rc.1`n`n      - name: Recheck exact remote recovery state") },
        @{ Name = "recovery gains tag ref API mutation"; Content = $content.Replace("      - name: Recheck exact remote recovery state", "      - name: Forbidden recovery tag API mutation`n        run: gh api --method POST repos/example/example/git/refs`n`n      - name: Recheck exact remote recovery state") },
        @{ Name = "missing exact recovery verifier"; Content = $content.Replace('scripts/verify-existing-package-recovery.ps1', 'scripts/missing-existing-package-recovery.ps1') },
        @{ Name = "missing second recovery attestation"; Content = ([regex]::new('(?ms)^      - name: Attest exact recovered snupkg\r?\n        uses: actions/attest@v4\r?\n        with:\r?\n          subject-path:.*?\r?\n')).Replace($content, '', 1) },
        @{ Name = "release creation loses verify tag"; Content = $content.Replace('            --verify-tag `', '            --fail-no-tag-check `') },
        @{ Name = "release creation loses exact target"; Content = $content.Replace('            --target $releaseSha `', '            --target forbidden `') },
        @{ Name = "recovery manual release upload"; Content = $content.Replace("      - name: Verify exact tag prerelease body and assets", "      - name: Forbidden manual upload`n        run: gh release upload forbidden forbidden.nupkg`n`n      - name: Verify exact tag prerelease body and assets") },
        @{ Name = "recovery safety gate moved after remote mutation"; Content = $lateSafetyGate },
        @{ Name = "attestation-only gains NuGet push"; Content = $content.Replace("      - name: Query exact attestation state", "      - name: Forbidden attestation NuGet push`n        run: dotnet nuget push forbidden.nupkg`n`n      - name: Query exact attestation state") },
        @{ Name = "attestation-only gains release creation"; Content = $content.Replace("      - name: Query exact attestation state", "      - name: Forbidden attestation release creation`n        run: gh release create forbidden`n`n      - name: Query exact attestation state") },
        @{ Name = "attestation-only gains tag mutation"; Content = $content.Replace("      - name: Query exact attestation state", "      - name: Forbidden attestation tag mutation`n        run: git tag forbidden`n`n      - name: Query exact attestation state") },
        @{ Name = "attestation-only loses exact asset verifier"; Content = $content.Replace("scripts/verify-existing-release-assets.ps1", "scripts/missing-existing-release-assets.ps1") },
        @{ Name = "attestation-only loses second attestation"; Content = ([regex]::new('(?ms)^      - name: Attest exact existing snupkg\r?\n.*?(?=^      - name: Verify both exact existing asset attestations)')).Replace($content, '', 1) },
        @{ Name = "attestation-only loses attestation verification"; Content = $content.Replace("      - name: Verify both exact existing asset attestations", "      - name: Attestation verification removed").Replace('          gh attestation verify (Join-Path $root "AgentContextKit.${{ inputs.version }}.nupkg")', '          Write-Host "nupkg attestation verification removed"').Replace('          gh attestation verify (Join-Path $root "AgentContextKit.${{ inputs.version }}.snupkg")', '          Write-Host "snupkg attestation verification removed"') },
        @{ Name = "attestation-only loses macOS smoke"; Content = $content.Replace("  verify-attested-package:`n    if: inputs.operation == 'attest-existing'`n", "  verify-attested-package:`n    if: inputs.operation == 'attest-existing'`n").Replace("          - macos-latest`n`n    steps:`n      - name: Checkout exact attestation automation commit", "`n    steps:`n      - name: Checkout exact attestation automation commit") },
        @{ Name = "source smoke loses exact release asset fixtures"; Content = $content.Replace("          pwsh -NoProfile -File scripts/test-existing-release-assets.ps1", "          Write-Host exact-release-asset-fixtures-removed") }
    )

    foreach ($case in $cases) {
        $path = Join-Path $tempRoot (($case.Name -replace '[^a-zA-Z0-9]+', '-') + ".yml")
        Set-Content -LiteralPath $path -Value $case.Content -Encoding utf8
        if ((Invoke-Gate -Path $path) -eq 0) {
            throw "Negative release workflow fixture unexpectedly passed: $($case.Name)"
        }
    }

    Write-Host "Supply-chain workflow positive and negative tests passed."
}
finally {
    Remove-Item $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
