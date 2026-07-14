$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$verificationScript = Join-Path $PSScriptRoot "verify-existing-release-assets.ps1"
$pwshPath = Get-Command pwsh -CommandType Application -ErrorAction Stop |
    Select-Object -First 1 -ExpandProperty Source
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ackit-existing-release-assets-" + [Guid]::NewGuid().ToString("N"))
$version = "1.0.0-rc.1"
$releaseSha = "258918b33c3d1359aac967604ee524e8b66ddf02"
$nupkgName = "AgentContextKit.$version.nupkg"
$snupkgName = "AgentContextKit.$version.snupkg"
$bodyPath = Join-Path $tempRoot "release-body.md"
$assetRoot = Join-Path $tempRoot "assets"
$fixturePath = Join-Path $tempRoot "release.json"

function Write-ReleaseFixture {
    param(
        [string]$Path,
        [string]$TagName = "v1.0.0-rc.1",
        [string]$TargetCommitish = $releaseSha,
        [string]$Name = "AgentContextKit 1.0.0-rc.1",
        [string]$Body = "Prepared RC1 body",
        [bool]$IsPrerelease = $true,
        [bool]$IsDraft = $false,
        [object[]]$Assets
    )

    $fixture = [ordered]@{
        tagName = $TagName
        targetCommitish = $TargetCommitish
        isPrerelease = $IsPrerelease
        isDraft = $IsDraft
        name = $Name
        body = $Body
        url = "https://github.com/Cynrath/agent-context-kit/releases/tag/v1.0.0-rc.1"
        assets = $Assets
    }
    [System.IO.File]::WriteAllText($Path, ($fixture | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))
}

function Invoke-Verification {
    param(
        [string]$ReleaseFixture = $fixturePath,
        [string]$ExpectedNupkgHash = $script:nupkgHash,
        [string]$ExpectedSnupkgHash = $script:snupkgHash
    )

    & $pwshPath -NoLogo -NoProfile -NonInteractive -File $verificationScript `
        -Version $version `
        -ReleaseCommitSha $releaseSha `
        -ReleaseJsonPath $ReleaseFixture `
        -ReleaseBodyPath $bodyPath `
        -AssetDirectory $assetRoot `
        -ExpectedNupkgSha256 $ExpectedNupkgHash `
        -ExpectedSnupkgSha256 $ExpectedSnupkgHash `
        -Prerelease true *> $null
    return $LASTEXITCODE
}

function Assert-Fails {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    if ((& $Action) -eq 0) {
        throw "Negative existing-release asset fixture unexpectedly passed: $Name"
    }
}

New-Item -ItemType Directory -Force -Path $assetRoot | Out-Null
try {
    [System.IO.File]::WriteAllText($bodyPath, "Prepared RC1 body`n", [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllBytes((Join-Path $assetRoot $nupkgName), [byte[]](1, 2, 3, 4, 5))
    [System.IO.File]::WriteAllBytes((Join-Path $assetRoot $snupkgName), [byte[]](6, 7, 8, 9))
    $script:nupkgHash = (Get-FileHash -LiteralPath (Join-Path $assetRoot $nupkgName) -Algorithm SHA256).Hash.ToLowerInvariant()
    $script:snupkgHash = (Get-FileHash -LiteralPath (Join-Path $assetRoot $snupkgName) -Algorithm SHA256).Hash.ToLowerInvariant()
    $assets = @(
        [ordered]@{
            name = $nupkgName
            size = (Get-Item -LiteralPath (Join-Path $assetRoot $nupkgName)).Length
            digest = "sha256:$script:nupkgHash"
        },
        [ordered]@{
            name = $snupkgName
            size = (Get-Item -LiteralPath (Join-Path $assetRoot $snupkgName)).Length
            digest = "sha256:$script:snupkgHash"
        }
    )

    Write-ReleaseFixture -Path $fixturePath -Assets $assets
    if ((Invoke-Verification) -ne 0) { throw "Positive existing-release asset fixture failed." }

    $wrongTagPath = Join-Path $tempRoot "wrong-tag.json"
    Write-ReleaseFixture -Path $wrongTagPath -TagName "v1.0.0-rc.2" -Assets $assets
    Assert-Fails -Name "wrong tag" -Action { Invoke-Verification -ReleaseFixture $wrongTagPath }

    $wrongTargetPath = Join-Path $tempRoot "wrong-target.json"
    Write-ReleaseFixture -Path $wrongTargetPath -TargetCommitish ("0" * 40) -Assets $assets
    Assert-Fails -Name "wrong tag target" -Action { Invoke-Verification -ReleaseFixture $wrongTargetPath }

    $wrongBodyPath = Join-Path $tempRoot "wrong-body.json"
    Write-ReleaseFixture -Path $wrongBodyPath -Body "Wrong body" -Assets $assets
    Assert-Fails -Name "wrong release body" -Action { Invoke-Verification -ReleaseFixture $wrongBodyPath }

    $wrongTitlePath = Join-Path $tempRoot "wrong-title.json"
    Write-ReleaseFixture -Path $wrongTitlePath -Name "Wrong title" -Assets $assets
    Assert-Fails -Name "wrong release title" -Action { Invoke-Verification -ReleaseFixture $wrongTitlePath }

    $draftPath = Join-Path $tempRoot "draft.json"
    Write-ReleaseFixture -Path $draftPath -IsDraft $true -Assets $assets
    Assert-Fails -Name "draft release" -Action { Invoke-Verification -ReleaseFixture $draftPath }

    Assert-Fails -Name "wrong nupkg hash" -Action {
        Invoke-Verification -ExpectedNupkgHash ("0" * 64)
    }

    $wrongDigestPath = Join-Path $tempRoot "wrong-digest.json"
    $wrongDigestAssets = @($assets | ForEach-Object {
        [ordered]@{ name = $_.name; size = $_.size; digest = $_.digest }
    })
    $wrongDigestAssets[0].digest = "sha256:$('0' * 64)"
    Write-ReleaseFixture -Path $wrongDigestPath -Assets $wrongDigestAssets
    Assert-Fails -Name "wrong API digest" -Action { Invoke-Verification -ReleaseFixture $wrongDigestPath }

    $wrongSizePath = Join-Path $tempRoot "wrong-size.json"
    $wrongSizeAssets = @($assets | ForEach-Object {
        [ordered]@{ name = $_.name; size = $_.size; digest = $_.digest }
    })
    $wrongSizeAssets[1].size = [long]$wrongSizeAssets[1].size + 1
    Write-ReleaseFixture -Path $wrongSizePath -Assets $wrongSizeAssets
    Assert-Fails -Name "wrong asset size" -Action { Invoke-Verification -ReleaseFixture $wrongSizePath }

    $missingAssetPath = Join-Path $tempRoot "missing-asset.json"
    Write-ReleaseFixture -Path $missingAssetPath -Assets @($assets[0])
    Assert-Fails -Name "missing asset" -Action { Invoke-Verification -ReleaseFixture $missingAssetPath }

    $extraAssetPath = Join-Path $tempRoot "extra-asset.json"
    Write-ReleaseFixture -Path $extraAssetPath -Assets @($assets + [ordered]@{
        name = "unexpected.txt"
        size = 1
        digest = "sha256:$('0' * 64)"
    })
    Assert-Fails -Name "extra asset" -Action { Invoke-Verification -ReleaseFixture $extraAssetPath }

    Write-Host "Existing-release body, target, asset, digest, hash, and exact-set fixtures passed."
}
finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
