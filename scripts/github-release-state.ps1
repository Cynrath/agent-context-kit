Set-StrictMode -Version Latest

function Assert-ExactExistingGitTag {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string]$Tag,
        [Parameter(Mandatory = $true)][string]$ExpectedCommitSha,
        [Parameter(Mandatory = $true)][string]$UnprovenTagMessage,
        [Parameter(Mandatory = $true)][string]$WrongTagMessage,
        [scriptblock]$Probe
    )

    if ([string]::IsNullOrWhiteSpace($Tag)) { throw 'Tag must not be empty.' }
    if ($ExpectedCommitSha -notmatch '^[a-fA-F0-9]{40}$') { throw 'ExpectedCommitSha must be a full Git SHA.' }

    if ($null -eq $Probe) {
        $previousNativeErrorPreference = $PSNativeCommandUseErrorActionPreference
        try {
            $PSNativeCommandUseErrorActionPreference = $false
            $probeOutput = @(git fetch --no-tags origin "refs/tags/$Tag" 2>&1)
            $probeExitCode = $LASTEXITCODE
            $commitSha = ''
            if ($probeExitCode -eq 0) {
                $commitOutput = @(git rev-list -n 1 FETCH_HEAD 2>&1)
                $commitExitCode = $LASTEXITCODE
                if ($commitExitCode -eq 0) {
                    $commitSha = ($commitOutput | Select-Object -First 1).Trim()
                }
                else {
                    $probeExitCode = $commitExitCode
                    $probeOutput += $commitOutput
                }
            }
        }
        finally {
            $PSNativeCommandUseErrorActionPreference = $previousNativeErrorPreference
        }
    }
    else {
        $probeResult = & $Probe -Tag $Tag
        if ($null -eq $probeResult -or
            $null -eq $probeResult.PSObject.Properties['ExitCode'] -or
            $null -eq $probeResult.PSObject.Properties['CommitSha'] -or
            $null -eq $probeResult.PSObject.Properties['Output']) {
            throw 'Tag-state probe returned an invalid result.'
        }
        $probeExitCode = [int]$probeResult.ExitCode
        $commitSha = [string]$probeResult.CommitSha
        $probeOutput = @($probeResult.Output)
    }

    if ($probeExitCode -ne 0 -or $commitSha -notmatch '^[a-fA-F0-9]{40}$') {
        throw "$UnprovenTagMessage git exit code: $probeExitCode."
    }
    if ($commitSha.ToLowerInvariant() -ne $ExpectedCommitSha.ToLowerInvariant()) {
        throw "$WrongTagMessage Actual: $commitSha."
    }

    $global:LASTEXITCODE = 0
}

function Assert-GitHubReleaseAbsent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string]$Repository,
        [Parameter(Mandatory = $true)][string]$Tag,
        [Parameter(Mandatory = $true)][string]$ExistingReleaseMessage,
        [Parameter(Mandatory = $true)][string]$UnprovenAbsenceMessage,
        [scriptblock]$Probe
    )

    if ([string]::IsNullOrWhiteSpace($Repository)) { throw 'Repository must not be empty.' }
    if ([string]::IsNullOrWhiteSpace($Tag)) { throw 'Tag must not be empty.' }

    if ($null -eq $Probe) {
        $previousNativeErrorPreference = $PSNativeCommandUseErrorActionPreference
        try {
            $PSNativeCommandUseErrorActionPreference = $false
            $probeOutput = @(gh api --include "repos/$Repository/releases/tags/$Tag" 2>&1)
            $probeExitCode = $LASTEXITCODE
        }
        finally {
            $PSNativeCommandUseErrorActionPreference = $previousNativeErrorPreference
        }
    }
    else {
        $probeResult = & $Probe -Repository $Repository -Tag $Tag
        if ($null -eq $probeResult -or
            $null -eq $probeResult.PSObject.Properties['ExitCode'] -or
            $null -eq $probeResult.PSObject.Properties['Output']) {
            throw 'Release-state probe returned an invalid result.'
        }
        $probeExitCode = [int]$probeResult.ExitCode
        $probeOutput = @($probeResult.Output)
    }

    if ($probeExitCode -eq 0) {
        throw $ExistingReleaseMessage
    }

    $probeText = $probeOutput | Out-String
    $has404StatusLine = $probeText -match '(?im)^HTTP/\S+\s+404(?:\s|$)'
    $hasGh404Error = $probeText -match '(?im)^gh:\s+.+\(HTTP 404\)\s*$'
    if (-not $has404StatusLine -and -not $hasGh404Error) {
        throw "$UnprovenAbsenceMessage gh exit code: $probeExitCode."
    }

    # GitHub Actions appends a pwsh LASTEXITCODE check. Clear only the native
    # failure that was explicitly classified as the expected absent-release 404.
    $global:LASTEXITCODE = 0
}

function Assert-GitHubAttestationAbsent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)][string]$Repository,
        [Parameter(Mandatory = $true)][string]$Digest,
        [Parameter(Mandatory = $true)][string]$ExistingAttestationMessage,
        [Parameter(Mandatory = $true)][string]$UnprovenAbsenceMessage,
        [scriptblock]$Probe
    )

    if ([string]::IsNullOrWhiteSpace($Repository)) { throw 'Repository must not be empty.' }
    if ($Digest -notmatch '^sha256:[a-fA-F0-9]{64}$') { throw 'Digest must be an exact sha256 digest.' }

    if ($null -eq $Probe) {
        $previousNativeErrorPreference = $PSNativeCommandUseErrorActionPreference
        try {
            $PSNativeCommandUseErrorActionPreference = $false
            $probeOutput = @(gh api --include "repos/$Repository/attestations/$Digest" 2>&1)
            $probeExitCode = $LASTEXITCODE
        }
        finally {
            $PSNativeCommandUseErrorActionPreference = $previousNativeErrorPreference
        }
    }
    else {
        $probeResult = & $Probe -Repository $Repository -Digest $Digest
        if ($null -eq $probeResult -or
            $null -eq $probeResult.PSObject.Properties['ExitCode'] -or
            $null -eq $probeResult.PSObject.Properties['Output']) {
            throw 'Attestation-state probe returned an invalid result.'
        }
        $probeExitCode = [int]$probeResult.ExitCode
        $probeOutput = @($probeResult.Output)
    }

    if ($probeExitCode -eq 0) {
        throw $ExistingAttestationMessage
    }

    $probeText = $probeOutput | Out-String
    $has404StatusLine = $probeText -match '(?im)^HTTP/\S+\s+404(?:\s|$)'
    $hasGh404Error = $probeText -match '(?im)^gh:\s+.+\(HTTP 404\)\s*$'
    if (-not $has404StatusLine -and -not $hasGh404Error) {
        throw "$UnprovenAbsenceMessage gh exit code: $probeExitCode."
    }

    $global:LASTEXITCODE = 0
}
