param(
    [string]$CommitSha,
    [string]$CandidateVersion,
    [string]$PredecessorVersion = "0.2.0-alpha.4",
    [switch]$RequireOriginMaster
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$semVerPattern = '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$'

Push-Location $repoRoot
try {
    $headSha = (git rev-parse HEAD).Trim()
    if ($LASTEXITCODE -ne 0) {
        throw "Unable to resolve HEAD."
    }

    if ([string]::IsNullOrWhiteSpace($CommitSha)) {
        $CommitSha = $headSha
    }

    [xml]$project = Get-Content -Raw "src/AgentContextKit.Cli/AgentContextKit.Cli.csproj"
    $sourceVersion = (Select-Xml -Xml $project -XPath "/Project/PropertyGroup/Version" | Select-Object -First 1).Node.InnerText
    if ([string]::IsNullOrWhiteSpace($sourceVersion)) {
        throw "Source package version could not be read."
    }

    if ([string]::IsNullOrWhiteSpace($CandidateVersion)) {
        $CandidateVersion = $sourceVersion
    }

    if ($CommitSha -notmatch '^[0-9a-fA-F]{40}$') {
        throw "commit_sha must be a full 40-character Git commit SHA."
    }
    if ($CandidateVersion -notmatch $semVerPattern) {
        throw "candidate_version must be a valid package SemVer value."
    }
    if ($PredecessorVersion -notmatch $semVerPattern) {
        throw "predecessor_version must be a valid package SemVer value."
    }
    if ($CandidateVersion -eq $PredecessorVersion) {
        throw "candidate_version and predecessor_version must differ."
    }

    if ($headSha -ne $CommitSha) {
        throw "Checked-out HEAD does not match commit_sha."
    }

    if ($sourceVersion -ne $CandidateVersion) {
        throw "candidate_version does not match source package metadata."
    }

    if ($RequireOriginMaster) {
        git fetch origin master --quiet
        if ($LASTEXITCODE -ne 0) { throw "Unable to fetch origin/master." }
        $originMasterSha = (git rev-parse origin/master).Trim()
        if ($originMasterSha -ne $CommitSha) {
            throw "commit_sha is not current origin/master."
        }
    }
}
finally {
    Pop-Location
}

Write-Host "Release-candidate inputs are valid for $CandidateVersion at $CommitSha."
