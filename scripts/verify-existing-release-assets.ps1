param(
    [Parameter(Mandatory = $true)]
    [string]$Version,
    [Parameter(Mandatory = $true)]
    [string]$ReleaseCommitSha,
    [Parameter(Mandatory = $true)]
    [string]$ReleaseJsonPath,
    [Parameter(Mandatory = $true)]
    [string]$ReleaseBodyPath,
    [Parameter(Mandatory = $true)]
    [string]$AssetDirectory,
    [Parameter(Mandatory = $true)]
    [string]$ExpectedNupkgSha256,
    [Parameter(Mandatory = $true)]
    [string]$ExpectedSnupkgSha256,
    [string]$Prerelease = "true",
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Get-NormalizedText {
    param([object]$Value)
    if ($null -eq $Value) { return "" }
    return ([string]$Value).Replace("`r`n", "`n").TrimEnd()
}

function Get-LowerSha256 {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

if ($Version -ne "1.0.0-rc.1") {
    throw "Exact existing-release verification is restricted to 1.0.0-rc.1."
}

$releaseSha = $ReleaseCommitSha.ToLowerInvariant()
$expectedNupkgHash = $ExpectedNupkgSha256.ToLowerInvariant()
$expectedSnupkgHash = $ExpectedSnupkgSha256.ToLowerInvariant()
foreach ($hash in @($releaseSha, $expectedNupkgHash, $expectedSnupkgHash)) {
    if ($hash -notmatch '^[a-f0-9]{40}$' -and $hash -notmatch '^[a-f0-9]{64}$') {
        throw "Release commit and asset hashes must be exact hexadecimal values."
    }
}
if ($releaseSha.Length -ne 40) { throw "ReleaseCommitSha must be an exact 40-character Git SHA." }
if ($expectedNupkgHash.Length -ne 64 -or $expectedSnupkgHash.Length -ne 64) {
    throw "Expected asset hashes must be exact SHA-256 values."
}

foreach ($requiredPath in @($ReleaseJsonPath, $ReleaseBodyPath)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required release verification file is missing: $requiredPath"
    }
}
if (-not (Test-Path -LiteralPath $AssetDirectory -PathType Container)) {
    throw "Release asset directory is missing: $AssetDirectory"
}

$release = Get-Content -LiteralPath $ReleaseJsonPath -Raw | ConvertFrom-Json
$expectedTag = "v$Version"
$expectedTitle = "AgentContextKit $Version"
$expectedPrerelease = [System.Convert]::ToBoolean($Prerelease)

if ([string]$release.tagName -ne $expectedTag) { throw "GitHub Release tag mismatch." }
if ([string]$release.targetCommitish -ne $releaseSha) { throw "GitHub Release target mismatch." }
if ([string]$release.name -ne $expectedTitle) { throw "GitHub Release title mismatch." }
if ([bool]$release.isPrerelease -ne $expectedPrerelease) { throw "GitHub Release prerelease state mismatch." }
if ([bool]$release.isDraft) { throw "GitHub Release must not be a draft." }

$expectedBody = Get-NormalizedText (Get-Content -LiteralPath $ReleaseBodyPath -Raw)
$actualBody = Get-NormalizedText $release.body
if ($actualBody -ne $expectedBody) { throw "GitHub Release body mismatch." }

$nupkgName = "AgentContextKit.$Version.nupkg"
$snupkgName = "AgentContextKit.$Version.snupkg"
$expectedNames = @($nupkgName, $snupkgName)
$assets = @($release.assets)
$assetNames = @($assets | ForEach-Object { [string]$_.name } | Sort-Object)
if ($assets.Count -ne 2 -or ($assetNames -join '|') -ne (($expectedNames | Sort-Object) -join '|')) {
    throw "GitHub Release must contain exactly the expected nupkg and snupkg assets."
}

$files = @(Get-ChildItem -LiteralPath $AssetDirectory -File)
$fileNames = @($files | ForEach-Object Name | Sort-Object)
if ($files.Count -ne 2 -or ($fileNames -join '|') -ne (($expectedNames | Sort-Object) -join '|')) {
    throw "Downloaded release directory must contain exactly the expected nupkg and snupkg assets."
}

$nupkgPath = Join-Path $AssetDirectory $nupkgName
$snupkgPath = Join-Path $AssetDirectory $snupkgName
$actualNupkgHash = Get-LowerSha256 -Path $nupkgPath
$actualSnupkgHash = Get-LowerSha256 -Path $snupkgPath
if ($actualNupkgHash -ne $expectedNupkgHash) { throw "Downloaded nupkg SHA-256 mismatch." }
if ($actualSnupkgHash -ne $expectedSnupkgHash) { throw "Downloaded snupkg SHA-256 mismatch." }

$assetEvidence = [ordered]@{}
foreach ($asset in $assets) {
    $assetName = [string]$asset.name
    $assetPath = Join-Path $AssetDirectory $assetName
    $assetHash = if ($assetName -eq $nupkgName) { $actualNupkgHash } else { $actualSnupkgHash }
    $fileInfo = Get-Item -LiteralPath $assetPath

    if ([long]$asset.size -ne $fileInfo.Length) {
        throw "GitHub Release asset size mismatch: $assetName"
    }
    if ([string]$asset.digest -ne "sha256:$assetHash") {
        throw "GitHub Release asset API digest mismatch: $assetName"
    }

    $assetEvidence[$assetName] = [ordered]@{
        size = $fileInfo.Length
        sha256 = $assetHash
        apiDigest = [string]$asset.digest
    }
}

$evidence = [ordered]@{
    schemaVersion = 1
    verifiedAtUtc = [DateTime]::UtcNow.ToString("o")
    version = $Version
    releaseCommitSha = $releaseSha
    releaseTag = [string]$release.tagName
    releaseTargetCommitish = [string]$release.targetCommitish
    releaseTitle = [string]$release.name
    releaseUrl = [string]$release.url
    isPrerelease = [bool]$release.isPrerelease
    isDraft = [bool]$release.isDraft
    assets = $assetEvidence
}

if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
    $outputDirectory = Split-Path -Parent $OutputPath
    if (-not [string]::IsNullOrWhiteSpace($outputDirectory)) {
        New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
    }
    [System.IO.File]::WriteAllText(
        $OutputPath,
        ($evidence | ConvertTo-Json -Depth 8),
        [System.Text.UTF8Encoding]::new($false))
}

Write-Host "Exact existing GitHub Release body and asset verification passed for AgentContextKit $Version."
Write-Host "nupkg SHA-256: $actualNupkgHash"
Write-Host "snupkg SHA-256: $actualSnupkgHash"
