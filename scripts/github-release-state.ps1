Set-StrictMode -Version Latest

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
