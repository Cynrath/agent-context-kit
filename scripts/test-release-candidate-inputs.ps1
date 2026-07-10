param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$checker = Join-Path $PSScriptRoot "check-release-candidate-inputs.ps1"
$pwsh = (Get-Command pwsh -ErrorAction Stop).Source
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("ackit-rc-input-tests-" + [Guid]::NewGuid().ToString("N"))

function Invoke-Case {
    param(
        [string]$Name,
        [string]$CommitSha,
        [string]$CandidateVersion,
        [string]$PredecessorVersion,
        [bool]$ShouldPass
    )

    $stdoutPath = Join-Path $tempRoot "$Name.stdout"
    $stderrPath = Join-Path $tempRoot "$Name.stderr"
    $process = Start-Process -FilePath $pwsh -ArgumentList @(
        "-NoProfile", "-File", $checker,
        "-CommitSha", $CommitSha,
        "-CandidateVersion", $CandidateVersion,
        "-PredecessorVersion", $PredecessorVersion
    ) -Wait -PassThru -NoNewWindow -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath

    if (($process.ExitCode -eq 0) -ne $ShouldPass) {
        $details = @(
            (Get-Content -LiteralPath $stdoutPath -Raw -ErrorAction SilentlyContinue),
            (Get-Content -LiteralPath $stderrPath -Raw -ErrorAction SilentlyContinue)
        ) -join [Environment]::NewLine
        throw "RC input case '$Name' result mismatch. Exit code: $($process.ExitCode). $details"
    }
}

try {
    New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
    Push-Location $repoRoot
    try {
        $headSha = (git rev-parse HEAD).Trim()
        [xml]$project = Get-Content -Raw "src/AgentContextKit.Cli/AgentContextKit.Cli.csproj"
        $sourceVersion = (Select-Xml -Xml $project -XPath "/Project/PropertyGroup/Version" | Select-Object -First 1).Node.InnerText
    }
    finally { Pop-Location }

    Invoke-Case -Name "valid" -CommitSha $headSha -CandidateVersion $sourceVersion -PredecessorVersion "0.2.0-alpha.4" -ShouldPass $true
    Invoke-Case -Name "short-sha" -CommitSha "abcdef0" -CandidateVersion $sourceVersion -PredecessorVersion "0.2.0-alpha.4" -ShouldPass $false
    Invoke-Case -Name "wrong-version" -CommitSha $headSha -CandidateVersion "9.9.9-alpha.999" -PredecessorVersion "0.2.0-alpha.4" -ShouldPass $false
    Invoke-Case -Name "same-version" -CommitSha $headSha -CandidateVersion $sourceVersion -PredecessorVersion $sourceVersion -ShouldPass $false

    Write-Host "Release-candidate input positive and negative tests passed."
}
finally {
    if (Test-Path $tempRoot) { Remove-Item -LiteralPath $tempRoot -Recurse -Force }
}
