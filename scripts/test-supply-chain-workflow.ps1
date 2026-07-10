$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$workflowPath = Join-Path $repoRoot ".github\workflows\release.yml"
$gatePath = Join-Path $PSScriptRoot "check-release-workflow.ps1"
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ackit-supply-chain-workflow-" + [guid]::NewGuid().ToString("N"))

function Invoke-Gate {
    param([string]$Path)
    & powershell -NoProfile -ExecutionPolicy Bypass -File $gatePath -WorkflowPath $Path -FailOnIssues *> $null
    return $LASTEXITCODE
}

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
try {
    if ((Invoke-Gate -Path $workflowPath) -ne 0) {
        throw "Positive release workflow fixture failed."
    }

    $content = Get-Content -Raw $workflowPath
    $cases = @(
        @{ Name = "missing attestation permission"; Content = ([regex]::new('(?m)^      attestations: write\r?\n')).Replace($content, '', 1) },
        @{ Name = "missing official attest action"; Content = $content.Replace("actions/attest@v4", "actions/attest@missing") },
        @{ Name = "read-only verifier gains attestation permission"; Content = ([regex]::new('(?m)^  verify-existing:\r?\n')).Replace($content, "  verify-existing:`n    permissions:`n      attestations: write`n", 1) },
        @{ Name = "missing attestation lookup false path"; Content = $content.Replace('$exists = $false', 'throw "Missing attestation lookup failed before attest step."') },
        @{ Name = "missing existing attestation true path"; Content = $content.Replace('$exists = $true', '$exists = $false') },
        @{ Name = "missing provenance query hard failure"; Content = $content.Replace('throw "Unable to query release package attestation state. gh exit code: $attestationExit"', '$exists = $false') },
        @{ Name = "missing status-aware 404 handling"; Content = $content.Replace('HTTP/\S+\s+404\b', 'HTTP 000') },
        @{ Name = "missing release asset download failure"; Content = $content.Replace('if ($LASTEXITCODE -ne 0) { throw "Unable to download the exact GitHub Release package asset." }', '') },
        @{ Name = "missing v100 rc1 release body mapping"; Content = $content.Replace('$notesFile = "docs/RELEASE_BODY_V100_RC1.md"', '$notesFile = "docs/missing-v100-rc1-body.md"') },
        @{ Name = "missing final attestation verify"; Content = $content.Replace('gh attestation verify', 'Write-Host "attestation verify skipped"') }
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
