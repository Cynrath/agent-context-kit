param(
    [Parameter(Mandatory = $true)]
    [string]$Version,
    [Parameter(Mandatory = $true)]
    [string]$AutomationCommitSha,
    [Parameter(Mandatory = $true)]
    [string]$ReleaseCommitSha,
    [string]$Prerelease = "true",
    [string]$Repository = "Cynrath/agent-context-kit",
    [string]$EvidencePath,
    [string]$OutputPath
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Get-StringValue {
    param([object]$Value)
    if ($null -eq $Value) { return "" }
    if ($Value -is [System.Xml.XmlNode]) { return $Value.InnerText.Trim() }
    return ([string]$Value).Trim()
}

function Test-Sha256 {
    param([object]$Value)
    return (Get-StringValue $Value) -match "^[0-9a-fA-F]{64}$"
}

function Resolve-VerificationTempBase {
    $environmentCandidates = @(
        $env:RUNNER_TEMP,
        $env:TEMP,
        $env:TMPDIR
    )

    foreach ($candidate in $environmentCandidates) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }

        try {
            $fullPath = [System.IO.Path]::GetFullPath($candidate)
            New-Item -ItemType Directory -Force -Path $fullPath | Out-Null

            $probePath = Join-Path $fullPath ("ackit-temp-probe-" + [Guid]::NewGuid().ToString("N"))
            [System.IO.File]::WriteAllText($probePath, "ok", [System.Text.UTF8Encoding]::new($false))
            Remove-Item -LiteralPath $probePath -Force
            return $fullPath
        }
        catch {
            continue
        }
    }

    try {
        $dotnetTemp = [System.IO.Path]::GetTempPath()
        if (-not [string]::IsNullOrWhiteSpace($dotnetTemp)) {
            $fullPath = [System.IO.Path]::GetFullPath($dotnetTemp)
            New-Item -ItemType Directory -Force -Path $fullPath | Out-Null

            $probePath = Join-Path $fullPath ("ackit-temp-probe-" + [Guid]::NewGuid().ToString("N"))
            [System.IO.File]::WriteAllText($probePath, "ok", [System.Text.UTF8Encoding]::new($false))
            Remove-Item -LiteralPath $probePath -Force
            return $fullPath
        }
    }
    catch {
    }

    throw "No writable temporary directory is available."
}

function Test-ReleaseEvidence {
    param(
        [Parameter(Mandatory = $true)]
        [object]$Evidence,
        [Parameter(Mandatory = $true)]
        [bool]$ExpectedPrerelease
    )

    $issues = [System.Collections.Generic.List[string]]::new()
    $expectedTag = "v$Version"
    $expectedAssets = @("AgentContextKit.$Version.nupkg", "AgentContextKit.$Version.snupkg")

    $checks = @(
        @{ Actual = $Evidence.version; Expected = $Version; Message = "Evidence version mismatch." },
        @{ Actual = $Evidence.automationCommitSha; Expected = $AutomationCommitSha; Message = "Automation commit mismatch." },
        @{ Actual = $Evidence.originMasterSha; Expected = $AutomationCommitSha; Message = "Automation commit is not current origin/master." },
        @{ Actual = $Evidence.releaseCommitSha; Expected = $ReleaseCommitSha; Message = "Release commit mismatch." },
        @{ Actual = $Evidence.tagCommitSha; Expected = $ReleaseCommitSha; Message = "Tag does not target the release commit." },
        @{ Actual = $Evidence.releaseTargetCommitish; Expected = $ReleaseCommitSha; Message = "GitHub Release target mismatch." },
        @{ Actual = $Evidence.releaseTag; Expected = $expectedTag; Message = "GitHub Release tag mismatch." },
        @{ Actual = $Evidence.packageId; Expected = "AgentContextKit"; Message = "Package ID mismatch." },
        @{ Actual = $Evidence.packageVersion; Expected = $Version; Message = "Package version mismatch." },
        @{ Actual = $Evidence.authors; Expected = "Cynrath"; Message = "Package authors mismatch." },
        @{ Actual = $Evidence.repositoryUrl; Expected = "https://github.com/Cynrath/agent-context-kit"; Message = "Package repository URL mismatch." },
        @{ Actual = $Evidence.repositoryCommit; Expected = $ReleaseCommitSha; Message = "Package repository commit mismatch." },
        @{ Actual = $Evidence.projectUrl; Expected = "https://github.com/Cynrath/agent-context-kit"; Message = "Package project URL mismatch." },
        @{ Actual = $Evidence.license; Expected = "MIT"; Message = "Package license mismatch." }
    )

    foreach ($check in $checks) {
        if ((Get-StringValue $check.Actual) -ne $check.Expected) {
            $issues.Add($check.Message) | Out-Null
        }
    }

    if (-not [bool]$Evidence.packageAccessible) { $issues.Add("NuGet package is not accessible.") | Out-Null }
    if (-not [bool]$Evidence.installedToolVerified) { $issues.Add("Installed-tool smoke was not verified.") | Out-Null }
    if ([bool]$Evidence.isPrerelease -ne $ExpectedPrerelease) { $issues.Add("GitHub Release prerelease state mismatch.") | Out-Null }

    $assetNames = @($Evidence.releaseAssetNames)
    foreach ($assetName in $expectedAssets) {
        if ($assetNames -notcontains $assetName) {
            $issues.Add("Required release asset is missing: $assetName") | Out-Null
        }
    }

    foreach ($hashName in @("nugetNupkg", "releaseNupkg", "releaseSnupkg")) {
        if (-not (Test-Sha256 $Evidence.hashes.$hashName)) {
            $issues.Add("Missing or invalid SHA-256 evidence: $hashName") | Out-Null
        }
    }

    return $issues
}

function Get-NuspecMetadata {
    param([Parameter(Mandatory = $true)][string]$PackagePath)

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($PackagePath)
    try {
        $entry = $archive.Entries | Where-Object { $_.FullName -match "\.nuspec$" } | Select-Object -First 1
        if ($null -eq $entry) { throw "NuGet package does not contain a nuspec." }
        $reader = [System.IO.StreamReader]::new($entry.Open())
        try { [xml]$nuspec = $reader.ReadToEnd() }
        finally { $reader.Dispose() }
    }
    finally {
        $archive.Dispose()
    }

    $metadata = $nuspec.package.metadata
    [pscustomobject]@{
        Id = Get-StringValue $metadata.id
        Version = Get-StringValue $metadata.version
        Authors = Get-StringValue $metadata.authors
        RepositoryUrl = Get-StringValue $metadata.repository.url
        RepositoryCommit = Get-StringValue $metadata.repository.commit
        ProjectUrl = Get-StringValue $metadata.projectUrl
        License = Get-StringValue $metadata.license
    }
}

$expectedPrerelease = [System.Convert]::ToBoolean($Prerelease)
$evidence = $null
$temporaryRoot = $null

try {
    if (-not [string]::IsNullOrWhiteSpace($EvidencePath)) {
        $evidence = Get-Content -LiteralPath $EvidencePath -Raw | ConvertFrom-Json
    }
    else {
        $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
        Push-Location $repoRoot
        try {
            git fetch origin master --tags --quiet
            if ($LASTEXITCODE -ne 0) { throw "Unable to fetch origin/master and tags." }

            $headSha = (git rev-parse HEAD).Trim()
            $originMasterSha = (git rev-parse origin/master).Trim()
            if ($headSha -ne $AutomationCommitSha) { throw "Checked-out HEAD does not match automation_commit_sha." }
            if ($originMasterSha -ne $AutomationCommitSha) { throw "automation_commit_sha is not current origin/master." }

            $tagName = "v$Version"
            $tagCommitSha = (git rev-list -n 1 $tagName 2>$null).Trim()
            if ([string]::IsNullOrWhiteSpace($tagCommitSha)) { throw "Release tag does not exist: $tagName" }

            $release = gh release view $tagName --repo $Repository --json tagName,targetCommitish,isPrerelease,assets,url,publishedAt | ConvertFrom-Json
            if ($LASTEXITCODE -ne 0) { throw "GitHub Release is not accessible: $tagName" }

            $tempBase = Resolve-VerificationTempBase
            $temporaryRoot = Join-Path $tempBase ("ackit-existing-release-" + [Guid]::NewGuid().ToString("N"))
            $releaseAssetRoot = Join-Path $temporaryRoot "release"
            New-Item -ItemType Directory -Force -Path $releaseAssetRoot | Out-Null

            $releaseNupkgName = "AgentContextKit.$Version.nupkg"
            $releaseSnupkgName = "AgentContextKit.$Version.snupkg"
            gh release download $tagName --repo $Repository --dir $releaseAssetRoot --pattern $releaseNupkgName --pattern $releaseSnupkgName --clobber
            if ($LASTEXITCODE -ne 0) { throw "Unable to download GitHub Release assets." }

            $releaseNupkgPath = Join-Path $releaseAssetRoot $releaseNupkgName
            $releaseSnupkgPath = Join-Path $releaseAssetRoot $releaseSnupkgName
            if (-not (Test-Path $releaseNupkgPath) -or -not (Test-Path $releaseSnupkgPath)) {
                throw "Required GitHub Release package assets were not downloaded."
            }

            $nugetNupkgPath = Join-Path $temporaryRoot "nuget-$releaseNupkgName"
            $packageUrl = "https://api.nuget.org/v3-flatcontainer/agentcontextkit/$Version/agentcontextkit.$Version.nupkg"
            Invoke-WebRequest -Uri $packageUrl -OutFile $nugetNupkgPath -UseBasicParsing
            if (-not (Test-Path $nugetNupkgPath)) { throw "NuGet package download failed." }

            dotnet nuget verify $nugetNupkgPath --all | Out-Host
            if ($LASTEXITCODE -ne 0) { throw "NuGet package signature verification failed." }

            & (Join-Path $PSScriptRoot "verify-published-package.ps1") -Version $Version
            if ($LASTEXITCODE -ne 0) { throw "Installed published-package smoke failed." }

            $metadata = Get-NuspecMetadata -PackagePath $nugetNupkgPath
            $releaseNupkgHash = (Get-FileHash -LiteralPath $releaseNupkgPath -Algorithm SHA256).Hash.ToLowerInvariant()
            $releaseSnupkgHash = (Get-FileHash -LiteralPath $releaseSnupkgPath -Algorithm SHA256).Hash.ToLowerInvariant()
            $nugetNupkgHash = (Get-FileHash -LiteralPath $nugetNupkgPath -Algorithm SHA256).Hash.ToLowerInvariant()

            foreach ($asset in @($release.assets)) {
                if ([string]::IsNullOrWhiteSpace([string]$asset.digest)) { continue }
                $actualHash = if ($asset.name -eq $releaseNupkgName) { $releaseNupkgHash } elseif ($asset.name -eq $releaseSnupkgName) { $releaseSnupkgHash } else { $null }
                if ($null -ne $actualHash -and $asset.digest -ne "sha256:$actualHash") {
                    throw "GitHub Release asset digest mismatch: $($asset.name)"
                }
            }

            $evidence = [pscustomobject]@{
                schemaVersion = 1
                verifiedAtUtc = [DateTime]::UtcNow.ToString("o")
                repository = $Repository
                version = $Version
                automationCommitSha = $AutomationCommitSha
                originMasterSha = $originMasterSha
                releaseCommitSha = $ReleaseCommitSha
                tagCommitSha = $tagCommitSha
                releaseTag = $release.tagName
                releaseTargetCommitish = $release.targetCommitish
                isPrerelease = [bool]$release.isPrerelease
                packageAccessible = $true
                installedToolVerified = $true
                packageId = $metadata.Id
                packageVersion = $metadata.Version
                authors = $metadata.Authors
                repositoryUrl = $metadata.RepositoryUrl
                repositoryCommit = $metadata.RepositoryCommit
                projectUrl = $metadata.ProjectUrl
                license = $metadata.License
                releaseAssetNames = @($release.assets | ForEach-Object name | Sort-Object)
                hashes = [ordered]@{
                    nugetNupkg = $nugetNupkgHash
                    releaseNupkg = $releaseNupkgHash
                    releaseSnupkg = $releaseSnupkgHash
                }
            }
        }
        finally {
            Pop-Location
        }
    }

    $issues = @(Test-ReleaseEvidence -Evidence $evidence -ExpectedPrerelease $expectedPrerelease)
    if ($issues.Count -gt 0) {
        foreach ($issue in $issues) { Write-Error $issue }
        throw "Existing release verification failed with $($issues.Count) issue(s)."
    }

    $json = $evidence | ConvertTo-Json -Depth 8
    if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
        $outputDirectory = Split-Path -Parent $OutputPath
        if (-not [string]::IsNullOrWhiteSpace($outputDirectory)) {
            New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
        }
        [System.IO.File]::WriteAllText($OutputPath, $json, [System.Text.UTF8Encoding]::new($false))
    }

    Write-Host "Existing release verification passed for AgentContextKit $Version."
    Write-Host "NuGet SHA-256: $($evidence.hashes.nugetNupkg)"
    Write-Host "Release nupkg SHA-256: $($evidence.hashes.releaseNupkg)"
    Write-Host "Release snupkg SHA-256: $($evidence.hashes.releaseSnupkg)"

    if (-not [string]::IsNullOrWhiteSpace($env:GITHUB_STEP_SUMMARY)) {
        @(
            "## Existing release verification",
            "",
            "| Field | Value |",
            "| --- | --- |",
            "| Version | ``$Version`` |",
            "| Release commit | ``$ReleaseCommitSha`` |",
            "| NuGet nupkg SHA-256 | ``$($evidence.hashes.nugetNupkg)`` |",
            "| Release nupkg SHA-256 | ``$($evidence.hashes.releaseNupkg)`` |",
            "| Release snupkg SHA-256 | ``$($evidence.hashes.releaseSnupkg)`` |"
        ) | Out-File -FilePath $env:GITHUB_STEP_SUMMARY -Encoding utf8 -Append
    }
}
finally {
    if ($null -ne $temporaryRoot -and (Test-Path $temporaryRoot)) {
        Remove-Item -LiteralPath $temporaryRoot -Recurse -Force
    }
}
