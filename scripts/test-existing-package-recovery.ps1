param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$verifier = Join-Path $PSScriptRoot 'verify-existing-package-recovery.ps1'
$pwsh = (Get-Command pwsh -ErrorAction Stop).Source
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ackit-existing-package-recovery-" + [Guid]::NewGuid().ToString('N'))
$version = '1.0.0-rc.1'
$releaseSha = '258918b33c3d1359aac967604ee524e8b66ddf02'

function New-TestArchive {
    param(
        [string]$Path,
        [string]$Commit,
        [string]$Payload,
        [switch]$RepositorySigned,
        [switch]$Symbols
    )

    if (Test-Path $Path) { Remove-Item -LiteralPath $Path -Force }
    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::CreateNew)
    $archive = $null
    try {
        $archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create, $true)
        $nuspec = @"
<?xml version="1.0"?>
<package><metadata><id>AgentContextKit</id><version>$version</version><authors>Cynrath</authors><repository type="git" url="https://github.com/Cynrath/agent-context-kit" commit="$Commit" /></metadata></package>
"@.Trim()
        $entries = [ordered]@{
            'AgentContextKit.nuspec' = $nuspec
            $(if ($Symbols) { 'lib/net10.0/AgentContextKit.Cli.pdb' } else { 'tools/net10.0/any/AgentContextKit.Cli.dll' }) = $Payload
        }
        if ($RepositorySigned) { $entries['.signature.p7s'] = 'synthetic repository signature fixture' }
        foreach ($entryName in $entries.Keys) {
            $entry = $archive.CreateEntry($entryName)
            $writer = [System.IO.StreamWriter]::new($entry.Open(), [System.Text.UTF8Encoding]::new($false))
            try { $writer.Write($entries[$entryName]) }
            finally { $writer.Dispose() }
        }
    }
    finally {
        if ($null -ne $archive) { $archive.Dispose() }
        $stream.Dispose()
    }
}

function Invoke-Verifier {
    param(
        [string]$CandidateNupkg,
        [string]$CandidateSnupkg,
        [string]$NuGetNupkg,
        [string]$ExpectedNupkgHash,
        [string]$ExpectedSnupkgHash,
        [bool]$ShouldPass,
        [string]$Commit = $releaseSha
    )

    $stdout = Join-Path $tempRoot ([System.IO.Path]::GetRandomFileName())
    $stderr = Join-Path $tempRoot ([System.IO.Path]::GetRandomFileName())
    $arguments = @(
        '-NoProfile', '-File', $verifier,
        '-Version', $version,
        '-ReleaseCommitSha', $Commit,
        '-CandidateNupkgPath', $CandidateNupkg,
        '-CandidateSnupkgPath', $CandidateSnupkg,
        '-NuGetNupkgPath', $NuGetNupkg,
        '-ExpectedNupkgSha256', $ExpectedNupkgHash,
        '-ExpectedSnupkgSha256', $ExpectedSnupkgHash,
        '-SkipNuGetSignatureVerification'
    )
    $process = Start-Process -FilePath $pwsh -ArgumentList $arguments -Wait -PassThru -NoNewWindow -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    $passed = $process.ExitCode -eq 0
    if ($passed -ne $ShouldPass) {
        $details = @(
            Get-Content -LiteralPath $stdout -Raw -ErrorAction SilentlyContinue
            Get-Content -LiteralPath $stderr -Raw -ErrorAction SilentlyContinue
        ) -join [Environment]::NewLine
        throw "Recovery verifier fixture mismatch. Expected pass=$ShouldPass, exit=$($process.ExitCode). $details"
    }
}

try {
    New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
    $candidateNupkg = Join-Path $tempRoot "AgentContextKit.$version.nupkg"
    $candidateSnupkg = Join-Path $tempRoot "AgentContextKit.$version.snupkg"
    $nugetNupkg = Join-Path $tempRoot 'nuget-signed.nupkg'
    New-TestArchive -Path $candidateNupkg -Commit $releaseSha -Payload 'exact package payload'
    New-TestArchive -Path $candidateSnupkg -Commit $releaseSha -Payload 'exact symbols payload' -Symbols
    New-TestArchive -Path $nugetNupkg -Commit $releaseSha -Payload 'exact package payload' -RepositorySigned
    $nupkgHash = (Get-FileHash $candidateNupkg -Algorithm SHA256).Hash.ToLowerInvariant()
    $snupkgHash = (Get-FileHash $candidateSnupkg -Algorithm SHA256).Hash.ToLowerInvariant()

    Invoke-Verifier $candidateNupkg $candidateSnupkg $nugetNupkg $nupkgHash $snupkgHash $true
    Invoke-Verifier $candidateNupkg $candidateSnupkg $nugetNupkg $nupkgHash $snupkgHash $true
    Invoke-Verifier $candidateNupkg $candidateSnupkg $nugetNupkg ('0' * 64) $snupkgHash $false

    $wrongCommitNupkg = Join-Path $tempRoot "wrong-commit-$version.nupkg"
    New-TestArchive -Path $wrongCommitNupkg -Commit ('a' * 40) -Payload 'exact package payload'
    Copy-Item $wrongCommitNupkg $candidateNupkg -Force
    $wrongHash = (Get-FileHash $candidateNupkg -Algorithm SHA256).Hash.ToLowerInvariant()
    Invoke-Verifier $candidateNupkg $candidateSnupkg $nugetNupkg $wrongHash $snupkgHash $false

    New-TestArchive -Path $candidateNupkg -Commit $releaseSha -Payload 'exact package payload'
    $nupkgHash = (Get-FileHash $candidateNupkg -Algorithm SHA256).Hash.ToLowerInvariant()
    New-TestArchive -Path $nugetNupkg -Commit $releaseSha -Payload 'different NuGet payload' -RepositorySigned
    Invoke-Verifier $candidateNupkg $candidateSnupkg $nugetNupkg $nupkgHash $snupkgHash $false

    Write-Host 'Existing-package recovery positive, repeated, and negative fixture tests passed.'
}
finally {
    if (Test-Path $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}
