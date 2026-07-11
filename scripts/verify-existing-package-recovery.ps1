param(
    [Parameter(Mandatory = $true)][string]$Version,
    [Parameter(Mandatory = $true)][string]$ReleaseCommitSha,
    [Parameter(Mandatory = $true)][string]$CandidateNupkgPath,
    [Parameter(Mandatory = $true)][string]$CandidateSnupkgPath,
    [Parameter(Mandatory = $true)][string]$NuGetNupkgPath,
    [Parameter(Mandatory = $true)][string]$ExpectedNupkgSha256,
    [Parameter(Mandatory = $true)][string]$ExpectedSnupkgSha256,
    [string]$OutputPath,
    [switch]$SkipNuGetSignatureVerification
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Assert-Sha256 {
    param([string]$Name, [string]$Value)
    if ($Value -notmatch '^[a-fA-F0-9]{64}$') {
        throw "$Name must be a 64-character SHA-256 value."
    }
}

function Get-LowerSha256 {
    param([Parameter(Mandatory = $true)][string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Get-ArchiveMetadata {
    param([Parameter(Mandatory = $true)][string]$Path)

    $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $nuspecEntry = $archive.Entries | Where-Object { $_.FullName -match '\.nuspec$' } | Select-Object -First 1
        if ($null -eq $nuspecEntry) { throw "Archive does not contain a nuspec: $Path" }
        $reader = [System.IO.StreamReader]::new($nuspecEntry.Open())
        try { [xml]$nuspec = $reader.ReadToEnd() }
        finally { $reader.Dispose() }

        $metadata = $nuspec.package.metadata
        return [pscustomobject]@{
            Id = [string]$metadata.id
            Version = [string]$metadata.version
            RepositoryUrl = [string]$metadata.repository.url
            RepositoryCommit = [string]$metadata.repository.commit
            HasRepositorySignatureEntry = @($archive.Entries | Where-Object { $_.FullName -eq '.signature.p7s' }).Count -eq 1
        }
    }
    finally {
        $archive.Dispose()
    }
}

function Get-ArchiveContentMap {
    param([Parameter(Mandatory = $true)][string]$Path)

    $result = [ordered]@{}
    $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        foreach ($entry in @($archive.Entries | Where-Object {
                    -not $_.FullName.EndsWith('/') -and $_.FullName -ne '.signature.p7s'
                } | Sort-Object FullName)) {
            $stream = $entry.Open()
            $sha = [System.Security.Cryptography.SHA256]::Create()
            try {
                $hash = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()
            }
            finally {
                $sha.Dispose()
                $stream.Dispose()
            }
            $result[$entry.FullName] = $hash
        }
    }
    finally {
        $archive.Dispose()
    }
    return $result
}

function Assert-ExpectedMetadata {
    param([string]$Name, [object]$Metadata)

    if ($Metadata.Id -ne 'AgentContextKit') { throw "$Name package ID mismatch: $($Metadata.Id)" }
    if ($Metadata.Version -ne $Version) { throw "$Name package version mismatch: $($Metadata.Version)" }
    if ($Metadata.RepositoryUrl -ne 'https://github.com/Cynrath/agent-context-kit') {
        throw "$Name repository URL mismatch: $($Metadata.RepositoryUrl)"
    }
    if ($Metadata.RepositoryCommit -ne $ReleaseCommitSha) {
        throw "$Name repository commit mismatch: $($Metadata.RepositoryCommit)"
    }
}

Assert-Sha256 -Name 'ExpectedNupkgSha256' -Value $ExpectedNupkgSha256
Assert-Sha256 -Name 'ExpectedSnupkgSha256' -Value $ExpectedSnupkgSha256
if ($ReleaseCommitSha -notmatch '^[a-fA-F0-9]{40}$') { throw 'ReleaseCommitSha must be a full 40-character Git SHA.' }

$candidateNupkg = (Resolve-Path -LiteralPath $CandidateNupkgPath).Path
$candidateSnupkg = (Resolve-Path -LiteralPath $CandidateSnupkgPath).Path
$nugetNupkg = (Resolve-Path -LiteralPath $NuGetNupkgPath).Path

$expectedNupkgName = "AgentContextKit.$Version.nupkg"
$expectedSnupkgName = "AgentContextKit.$Version.snupkg"
if ([System.IO.Path]::GetFileName($candidateNupkg) -ne $expectedNupkgName) {
    throw "Candidate nupkg filename mismatch. Expected $expectedNupkgName."
}
if ([System.IO.Path]::GetFileName($candidateSnupkg) -ne $expectedSnupkgName) {
    throw "Candidate snupkg filename mismatch. Expected $expectedSnupkgName."
}

$candidateNupkgHash = Get-LowerSha256 $candidateNupkg
$candidateSnupkgHash = Get-LowerSha256 $candidateSnupkg
if ($candidateNupkgHash -ne $ExpectedNupkgSha256.ToLowerInvariant()) {
    throw "Candidate nupkg SHA-256 mismatch."
}
if ($candidateSnupkgHash -ne $ExpectedSnupkgSha256.ToLowerInvariant()) {
    throw "Candidate snupkg SHA-256 mismatch."
}

$candidateNupkgMetadata = Get-ArchiveMetadata $candidateNupkg
$candidateSnupkgMetadata = Get-ArchiveMetadata $candidateSnupkg
$nugetMetadata = Get-ArchiveMetadata $nugetNupkg
Assert-ExpectedMetadata -Name 'Candidate nupkg' -Metadata $candidateNupkgMetadata
Assert-ExpectedMetadata -Name 'Candidate snupkg' -Metadata $candidateSnupkgMetadata
Assert-ExpectedMetadata -Name 'NuGet-served nupkg' -Metadata $nugetMetadata
if (-not $nugetMetadata.HasRepositorySignatureEntry) {
    throw 'NuGet-served nupkg does not contain the repository signature entry.'
}

if (-not $SkipNuGetSignatureVerification) {
    dotnet nuget verify $nugetNupkg --all
    if ($LASTEXITCODE -ne 0) { throw 'NuGet repository signature verification failed.' }
}

$candidateContents = Get-ArchiveContentMap $candidateNupkg
$nugetContents = Get-ArchiveContentMap $nugetNupkg
$candidateJson = $candidateContents | ConvertTo-Json -Compress
$nugetJson = $nugetContents | ConvertTo-Json -Compress
if ($candidateJson -ne $nugetJson) {
    $candidateNames = @($candidateContents.Keys)
    $nugetNames = @($nugetContents.Keys)
    $missing = @($candidateNames | Where-Object { $_ -notin $nugetNames })
    $extra = @($nugetNames | Where-Object { $_ -notin $candidateNames })
    $changed = @($candidateNames | Where-Object { $_ -in $nugetNames -and $candidateContents[$_] -ne $nugetContents[$_] })
    throw "Candidate/NuGet archive content mismatch excluding .signature.p7s. Missing=$($missing -join ','); Extra=$($extra -join ','); Changed=$($changed -join ',')"
}

$evidence = [ordered]@{
    schemaVersion = 1
    verifiedAtUtc = [DateTime]::UtcNow.ToString('o')
    packageId = 'AgentContextKit'
    version = $Version
    releaseCommitSha = $ReleaseCommitSha
    candidateNupkgSha256 = $candidateNupkgHash
    candidateSnupkgSha256 = $candidateSnupkgHash
    nugetNupkgSha256 = Get-LowerSha256 $nugetNupkg
    nugetRepositorySignatureVerified = -not $SkipNuGetSignatureVerification
    archiveContentEquivalentExcludingRepositorySignature = $true
    archiveEntryCountExcludingRepositorySignature = $candidateContents.Count
}

if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
    $parent = Split-Path -Parent $OutputPath
    if (-not [string]::IsNullOrWhiteSpace($parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    [System.IO.File]::WriteAllText($OutputPath, ($evidence | ConvertTo-Json -Depth 5), [System.Text.UTF8Encoding]::new($false))
}

Write-Host "Exact existing-package recovery verification passed for AgentContextKit $Version."
Write-Host "Candidate nupkg SHA-256: $candidateNupkgHash"
Write-Host "Candidate snupkg SHA-256: $candidateSnupkgHash"
Write-Host "NuGet nupkg SHA-256: $($evidence.nugetNupkgSha256)"
