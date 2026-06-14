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
        @{ Name = "read-only verifier gains attestation permission"; Content = ([regex]::new('(?m)^  verify-existing:\r?\n')).Replace($content, "  verify-existing:`n    permissions:`n      attestations: write`n", 1) }
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
