$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

. (Join-Path $PSScriptRoot 'github-release-state.ps1')

function New-ProbeFixture {
    param(
        [Parameter(Mandatory = $true)][int]$ExitCode,
        [Parameter(Mandatory = $true)][string[]]$Output
    )

    return {
        param([string]$Repository, [string]$Tag)
        if ($Repository -ne 'Cynrath/agent-context-kit' -or $Tag -ne 'v1.0.0-rc.1') {
            throw 'Probe fixture received unexpected identity inputs.'
        }
        [pscustomobject]@{
            ExitCode = $ExitCode
            Output = $Output
        }
    }.GetNewClosure()
}

function Assert-ProbeFailsClosed {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Probe,
        [Parameter(Mandatory = $true)][string]$ExpectedMessage
    )

    $threw = $false
    try {
        Assert-GitHubReleaseAbsent `
            -Repository 'Cynrath/agent-context-kit' `
            -Tag 'v1.0.0-rc.1' `
            -ExistingReleaseMessage 'Release unexpectedly exists.' `
            -UnprovenAbsenceMessage 'Unable to prove release absence.' `
            -Probe $Probe
    }
    catch {
        $threw = $true
        if ($_.Exception.Message -notlike "*$ExpectedMessage*") {
            throw "$Name returned the wrong failure: $($_.Exception.Message)"
        }
    }

    if (-not $threw) { throw "$Name did not fail closed." }
}

$global:LASTEXITCODE = 73
$continuedAfter404 = $false
Assert-GitHubReleaseAbsent `
    -Repository 'Cynrath/agent-context-kit' `
    -Tag 'v1.0.0-rc.1' `
    -ExistingReleaseMessage 'Release unexpectedly exists.' `
    -UnprovenAbsenceMessage 'Unable to prove release absence.' `
    -Probe (New-ProbeFixture -ExitCode 1 -Output @(
        'HTTP/2.0 404 Not Found',
        'gh: Not Found (HTTP 404)'
    ))
$continuedAfter404 = $true
if (-not $continuedAfter404) { throw 'Expected 404 prevented subsequent code from running.' }
if ($LASTEXITCODE -ne 0) { throw "Expected 404 leaked LASTEXITCODE=$LASTEXITCODE." }

Assert-ProbeFailsClosed -Name 'HTTP 200 / existing release' `
    -Probe (New-ProbeFixture -ExitCode 0 -Output @('HTTP/2.0 200 OK')) `
    -ExpectedMessage 'Release unexpectedly exists.'
Assert-ProbeFailsClosed -Name 'HTTP 401' `
    -Probe (New-ProbeFixture -ExitCode 1 -Output @('HTTP/2.0 401 Unauthorized', 'gh: Requires authentication (HTTP 401)')) `
    -ExpectedMessage 'Unable to prove release absence.'
Assert-ProbeFailsClosed -Name 'HTTP 403' `
    -Probe (New-ProbeFixture -ExitCode 1 -Output @('HTTP/2.0 403 Forbidden', 'gh: Resource not accessible (HTTP 403)')) `
    -ExpectedMessage 'Unable to prove release absence.'
Assert-ProbeFailsClosed -Name 'HTTP 429' `
    -Probe (New-ProbeFixture -ExitCode 1 -Output @('HTTP/2.0 429 Too Many Requests', 'gh: rate limit exceeded (HTTP 429)')) `
    -ExpectedMessage 'Unable to prove release absence.'
Assert-ProbeFailsClosed -Name 'HTTP 500' `
    -Probe (New-ProbeFixture -ExitCode 1 -Output @('HTTP/2.0 500 Internal Server Error', 'gh: server error (HTTP 500)')) `
    -ExpectedMessage 'Unable to prove release absence.'
Assert-ProbeFailsClosed -Name 'Network/unknown error' `
    -Probe (New-ProbeFixture -ExitCode 1 -Output @('gh: error connecting to api.github.com')) `
    -ExpectedMessage 'Unable to prove release absence.'

$global:LASTEXITCODE = 19
Assert-GitHubReleaseAbsent `
    -Repository 'Cynrath/agent-context-kit' `
    -Tag 'v1.0.0-rc.1' `
    -ExistingReleaseMessage 'Release unexpectedly exists.' `
    -UnprovenAbsenceMessage 'Unable to prove release absence.' `
    -Probe (New-ProbeFixture -ExitCode 1 -Output @('gh: Not Found (HTTP 404)'))
if ($LASTEXITCODE -ne 0) { throw 'Accepted gh-style 404 did not clear the native exit state.' }

Write-Host 'GitHub Release expected-404 exit-state positive and fail-closed fixtures passed.'
