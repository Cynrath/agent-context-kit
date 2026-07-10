param(
    [ValidateRange(100, 20000)]
    [int]$FileCount = 2000,
    [ValidateRange(1, 300)]
    [double]$MaxSeconds = 30,
    [ValidateRange(64, 4096)]
    [int]$MaxPeakWorkingSetMb = 512,
    [ValidateSet("mixed", "uniform")]
    [string]$CorpusProfile = "mixed",
    [switch]$VerifyInterruption,
    [ValidateRange(10, 5000)]
    [int]$InterruptAfterMilliseconds = 100,
    [switch]$FailOnThreshold
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$cliAssembly = Join-Path $repoRoot "src\AgentContextKit.Cli\bin\Release\net10.0\AgentContextKit.Cli.dll"
if (-not (Test-Path -LiteralPath $cliAssembly)) {
    throw "Release CLI assembly is missing. Run dotnet build AgentContextKit.sln -c Release first."
}

$tempBase = @($env:TEMP, $env:TMPDIR, $env:RUNNER_TEMP, [System.IO.Path]::GetTempPath()) |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -First 1
if ([string]::IsNullOrWhiteSpace($tempBase)) {
    throw "No temporary directory is available for the synthetic benchmark."
}

$tempRoot = Join-Path $tempBase ("ackit-performance-" + [guid]::NewGuid().ToString("N"))
$sentinelContent = "synthetic benchmark sentinel"

function New-ScanProcess {
    param([string]$WorkingDirectory)

    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = "dotnet"
    $startInfo.Arguments = '"' + $cliAssembly + '" scan --ci'
    $startInfo.WorkingDirectory = $WorkingDirectory
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo
    return $process
}

function Invoke-MeasuredScan {
    param([string]$WorkingDirectory)

    $process = New-ScanProcess -WorkingDirectory $WorkingDirectory
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        if (-not $process.Start()) {
            throw "Unable to start the source CLI for the synthetic benchmark."
        }

        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        [long]$peakWorkingSetBytes = 0
        while (-not $process.WaitForExit(50)) {
            $process.Refresh()
            if ($process.WorkingSet64 -gt $peakWorkingSetBytes) {
                $peakWorkingSetBytes = $process.WorkingSet64
            }
        }

        $process.WaitForExit()
        $stopwatch.Stop()

        $stdout = $stdoutTask.GetAwaiter().GetResult()
        $stderr = $stderrTask.GetAwaiter().GetResult()
        return [pscustomobject]@{
            ExitCode = $process.ExitCode
            ElapsedSeconds = [Math]::Round($stopwatch.Elapsed.TotalSeconds, 3)
            PeakWorkingSetMb = [Math]::Round($peakWorkingSetBytes / 1MB, 1)
            StandardOutput = $stdout
            StandardError = $stderr
        }
    }
    finally {
        $stopwatch.Stop()
        $process.Dispose()
    }
}

function Test-InterruptedScan {
    param([string]$WorkingDirectory)

    $process = New-ScanProcess -WorkingDirectory $WorkingDirectory
    try {
        if (-not $process.Start()) {
            throw "Unable to start the interruption probe."
        }

        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        Start-Sleep -Milliseconds $InterruptAfterMilliseconds

        if ($process.HasExited) {
            throw "The interruption probe completed before it could be interrupted. Increase FileCount or reduce InterruptAfterMilliseconds."
        }

        $process.Kill()
        $process.WaitForExit()
        $null = $stdoutTask.GetAwaiter().GetResult()
        $null = $stderrTask.GetAwaiter().GetResult()

        if (Test-Path -LiteralPath (Join-Path $WorkingDirectory ".ackit")) {
            throw "Interrupted read-only scan left a generated .ackit directory."
        }

        $sentinelPath = Join-Path $WorkingDirectory "sentinel.txt"
        if ((Get-Content -LiteralPath $sentinelPath -Raw) -ne $sentinelContent) {
            throw "Interrupted scan changed the synthetic source sentinel."
        }

        return $true
    }
    finally {
        if (-not $process.HasExited) {
            $process.Kill()
            $process.WaitForExit()
        }

        $process.Dispose()
    }
}

function Write-MixedCorpusFile {
    param(
        [string]$Bucket,
        [int]$Index
    )

    if (($Index % 500) -eq 0) {
        $path = Join-Path $Bucket ("Large{0:D5}.txt" -f $Index)
        [System.IO.File]::WriteAllText($path, ("x" * 1050000))
        return "oversized"
    }

    switch ($Index % 8) {
        0 {
            $path = Join-Path $Bucket ("File{0:D5}.cs" -f $Index)
            [System.IO.File]::WriteAllText($path, ("namespace Synthetic; public sealed class File{0:D5} {{ }}" -f $Index))
            return "small-text"
        }
        1 {
            $path = Join-Path $Bucket ("Module{0:D5}.ts" -f $Index)
            [System.IO.File]::WriteAllText($path, ("export const item{0:D5} = 'synthetic';" -f $Index))
            return "small-text"
        }
        2 {
            $path = Join-Path $Bucket ("Document{0:D5}.md" -f $Index)
            [System.IO.File]::WriteAllText($path, ("# Synthetic document`n`n" + ("review-safe text " * 256)))
            return "medium-text"
        }
        3 {
            $path = Join-Path $Bucket ("Data{0:D5}.json" -f $Index)
            [System.IO.File]::WriteAllText($path, ('{"kind":"synthetic","enabled":true,"items":[' + ((1..64) -join ',') + ']}'))
            return "medium-text"
        }
        4 {
            $path = Join-Path $Bucket ("Settings{0:D5}.yml" -f $Index)
            [System.IO.File]::WriteAllText($path, ("name: synthetic`nmode: local`ncount: {0}" -f $Index))
            return "small-text"
        }
        5 {
            $path = Join-Path $Bucket ("Rows{0:D5}.csv" -f $Index)
            [System.IO.File]::WriteAllText($path, ("id,label`n" + ((1..128 | ForEach-Object { "$_,synthetic" }) -join "`n")))
            return "medium-text"
        }
        6 {
            $path = Join-Path $Bucket ("Asset{0:D5}.png" -f $Index)
            [System.IO.File]::WriteAllBytes($path, [byte[]](0..255))
            return "binary"
        }
        default {
            $path = Join-Path $Bucket ("Notes{0:D5}.txt" -f $Index)
            [System.IO.File]::WriteAllText($path, ("synthetic local note " * 1024))
            return "medium-text"
        }
    }
}

Write-Host "AgentContextKit synthetic scan benchmark"
Write-Host "Files requested: $FileCount"
Write-Host "Corpus profile: $CorpusProfile"
Write-Host "Time threshold: $MaxSeconds seconds"
Write-Host "Peak working set threshold: $MaxPeakWorkingSetMb MiB"

try {
    New-Item -ItemType Directory -Path $tempRoot | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot "src") | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot "tests") | Out-Null
    New-Item -ItemType Directory -Path (Join-Path $tempRoot ".github\workflows") -Force | Out-Null

    Set-Content -LiteralPath (Join-Path $tempRoot "README.md") -Value "# Synthetic benchmark"
    Set-Content -LiteralPath (Join-Path $tempRoot "LICENSE") -Value "MIT"
    Set-Content -LiteralPath (Join-Path $tempRoot "SECURITY.md") -Value "# Security"
    Set-Content -LiteralPath (Join-Path $tempRoot ".gitignore") -Value "bin/`nobj/"
    Set-Content -LiteralPath (Join-Path $tempRoot "AGENTS.md") -Value "# Agent instructions"
    Set-Content -LiteralPath (Join-Path $tempRoot "tests\FixtureTests.cs") -Value "// synthetic tests"
    Set-Content -LiteralPath (Join-Path $tempRoot ".github\workflows\ci.yml") -Value "name: synthetic-ci"
    Set-Content -LiteralPath (Join-Path $tempRoot "sentinel.txt") -Value $sentinelContent -NoNewline

    $distribution = @{
        "small-text" = 0
        "medium-text" = 0
        "oversized" = 0
        "binary" = 0
    }

    for ($index = 1; $index -le $FileCount; $index++) {
        $bucket = Join-Path $tempRoot ("src\bucket-{0:D3}" -f ($index % 100))
        if (-not (Test-Path -LiteralPath $bucket)) {
            New-Item -ItemType Directory -Path $bucket | Out-Null
        }

        if ($CorpusProfile -eq "uniform") {
            $path = Join-Path $bucket ("File{0:D5}.cs" -f $index)
            Set-Content -LiteralPath $path -Value ("namespace Synthetic; public sealed class File{0:D5} {{ }}" -f $index)
            $distribution["small-text"]++
        }
        else {
            $kind = Write-MixedCorpusFile -Bucket $bucket -Index $index
            $distribution[$kind]++
        }
    }

    Write-Host ("Corpus distribution: small-text={0}, medium-text={1}, oversized={2}, binary={3}" -f
        $distribution["small-text"],
        $distribution["medium-text"],
        $distribution["oversized"],
        $distribution["binary"])

    $result = Invoke-MeasuredScan -WorkingDirectory $tempRoot
    if ($result.ExitCode -ne 0) {
        if (-not [string]::IsNullOrWhiteSpace($result.StandardOutput)) { Write-Host $result.StandardOutput }
        if (-not [string]::IsNullOrWhiteSpace($result.StandardError)) { Write-Host $result.StandardError }
        throw "Synthetic scan failed with exit code $($result.ExitCode)."
    }

    $withinTimeThreshold = $result.ElapsedSeconds -le $MaxSeconds
    $withinMemoryThreshold = $result.PeakWorkingSetMb -le $MaxPeakWorkingSetMb
    $withinThreshold = $withinTimeThreshold -and $withinMemoryThreshold

    Write-Host "Elapsed seconds: $($result.ElapsedSeconds)"
    Write-Host "Peak working set MiB: $($result.PeakWorkingSetMb)"
    Write-Host "Time threshold result: $(if ($withinTimeThreshold) { 'PASS' } else { 'FAIL' })"
    Write-Host "Memory threshold result: $(if ($withinMemoryThreshold) { 'PASS' } else { 'FAIL' })"

    if ($VerifyInterruption) {
        $interruptionPassed = Test-InterruptedScan -WorkingDirectory $tempRoot
        Write-Host "Interruption result: $(if ($interruptionPassed) { 'PASS' } else { 'FAIL' })"
    }
    else {
        Write-Host "Interruption result: NOT_REQUESTED"
    }

    Write-Host "Threshold result: $(if ($withinThreshold) { 'PASS' } else { 'FAIL' })"
    Write-Host "This synthetic benchmark is local evidence, not a production SLA."

    if ($FailOnThreshold -and -not $withinThreshold) {
        exit 1
    }
}
finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}

exit 0
