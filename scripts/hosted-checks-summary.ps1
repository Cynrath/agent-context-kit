$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Show-Usage {
    Write-Output "Usage: powershell -ExecutionPolicy Bypass -File scripts/hosted-checks-summary.ps1 [--count N] [--workflow <name>] [--help]"
    Write-Output ""
    Write-Output "Summarizes recent GitHub Actions workflow runs as a Markdown table."
    Write-Output ""
    Write-Output "Options:"
    Write-Output "  --count N          Number of runs to print. Default: 10. Must be a positive integer."
    Write-Output "  --workflow <name>  Workflow id or workflow file name accepted by GitHub Actions."
    Write-Output "  --help            Show this help."
}

function Write-ArgumentError {
    param([string]$Message)

    Write-Output "Argument error: $Message"
    Write-Output "Run with --help for usage."
}

function Get-PropertyValue {
    param(
        [object]$InputObject,
        [string]$Name
    )

    if ($null -eq $InputObject) {
        return $null
    }

    $property = $InputObject.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Format-MarkdownValue {
    param([object]$Value)

    if ($null -eq $Value) {
        return "-"
    }

    $text = [string]$Value
    if ([string]::IsNullOrWhiteSpace($text)) {
        return "-"
    }

    $text = $text.Replace("`r", " ").Replace("`n", " ")
    return $text.Replace("|", "\|")
}

function Format-RunDuration {
    param([object]$Run)

    $startText = Get-PropertyValue $Run "run_started_at"
    if ([string]::IsNullOrWhiteSpace([string]$startText)) {
        $startText = Get-PropertyValue $Run "created_at"
    }

    $endText = Get-PropertyValue $Run "updated_at"
    if ([string]::IsNullOrWhiteSpace([string]$startText) -or [string]::IsNullOrWhiteSpace([string]$endText)) {
        return "n/a"
    }

    $styles = [System.Globalization.DateTimeStyles]::AssumeUniversal
    $culture = [System.Globalization.CultureInfo]::InvariantCulture
    $start = [System.DateTimeOffset]::MinValue
    $end = [System.DateTimeOffset]::MinValue

    if (-not [System.DateTimeOffset]::TryParse([string]$startText, $culture, $styles, [ref]$start)) {
        return "n/a"
    }

    if (-not [System.DateTimeOffset]::TryParse([string]$endText, $culture, $styles, [ref]$end)) {
        return "n/a"
    }

    if ($end -lt $start) {
        return "n/a"
    }

    $totalSeconds = [int][System.Math]::Round(($end - $start).TotalSeconds)
    if ($totalSeconds -lt 0) {
        return "n/a"
    }

    $hours = [int][System.Math]::Floor($totalSeconds / 3600)
    $minutes = [int][System.Math]::Floor(($totalSeconds % 3600) / 60)
    $seconds = [int]($totalSeconds % 60)

    if ($hours -gt 0) {
        return ("{0}h {1:D2}m {2:D2}s" -f $hours, $minutes, $seconds)
    }

    if ($minutes -gt 0) {
        return ("{0}m {1:D2}s" -f $minutes, $seconds)
    }

    return ("{0}s" -f $seconds)
}

function New-RunsEndpoint {
    param(
        [string]$Workflow
    )

    if ([string]::IsNullOrWhiteSpace($Workflow)) {
        return "repos/{owner}/{repo}/actions/runs"
    }

    $encodedWorkflow = [System.Uri]::EscapeDataString($Workflow)
    return "repos/{owner}/{repo}/actions/workflows/$encodedWorkflow/runs"
}

function Invoke-GhApiJson {
    param(
        [object]$GhCommand,
        [string]$Endpoint,
        [int]$PerPage,
        [int]$Page
    )

    $stderrPath = [System.IO.Path]::GetTempFileName()
    try {
        $raw = & $GhCommand.Source api --method GET $Endpoint -F "per_page=$PerPage" -F "page=$Page" 2> $stderrPath
        if ($LASTEXITCODE -ne 0) {
            Write-Output "GitHub Actions run data unavailable. Ensure gh is authenticated and this directory belongs to a GitHub repository."
            return $null
        }

        $jsonText = ($raw | Out-String).Trim()
        if ([string]::IsNullOrWhiteSpace($jsonText)) {
            Write-Output "GitHub Actions run data unavailable. gh api returned no data."
            return $null
        }

        try {
            return $jsonText | ConvertFrom-Json
        }
        catch {
            Write-Output "GitHub Actions run data unavailable. gh api returned data that could not be parsed."
            return $null
        }
    }
    finally {
        Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
    }
}

function Write-RunsTable {
    param(
        [object[]]$Runs,
        [int]$Count
    )

    Write-Output "| Workflow | Run ID | Status | Conclusion | URL | Duration |"
    Write-Output "| --- | --- | --- | --- | --- | --- |"

    $selectedRuns = @($Runs | Select-Object -First $Count)
    foreach ($run in $selectedRuns) {
        $workflowName = Get-PropertyValue $run "name"
        if ([string]::IsNullOrWhiteSpace([string]$workflowName)) {
            $workflowName = Get-PropertyValue $run "workflow_name"
        }

        $runId = Get-PropertyValue $run "id"
        $status = Get-PropertyValue $run "status"
        $conclusion = Get-PropertyValue $run "conclusion"
        $url = Get-PropertyValue $run "html_url"
        $duration = Format-RunDuration $run

        Write-Output ("| {0} | {1} | {2} | {3} | {4} | {5} |" -f `
            (Format-MarkdownValue $workflowName),
            (Format-MarkdownValue $runId),
            (Format-MarkdownValue $status),
            (Format-MarkdownValue $conclusion),
            (Format-MarkdownValue $url),
            (Format-MarkdownValue $duration))
    }
}

$count = 10
$workflow = $null
$index = 0

while ($index -lt $args.Count) {
    $argument = $args[$index]
    switch ($argument) {
        "--help" {
            Show-Usage
            exit 0
        }
        "--count" {
            if (($index + 1) -ge $args.Count) {
                Write-ArgumentError "--count requires a value."
                exit 2
            }

            $value = $args[$index + 1]
            if ($value.StartsWith("--", [System.StringComparison]::Ordinal)) {
                Write-ArgumentError "--count requires a value."
                exit 2
            }

            $parsed = 0
            if (-not [int]::TryParse($value, [ref]$parsed) -or $parsed -lt 1) {
                Write-ArgumentError "--count must be a positive integer."
                exit 2
            }

            $count = $parsed
            $index += 2
            continue
        }
        "--workflow" {
            if (($index + 1) -ge $args.Count) {
                Write-ArgumentError "--workflow requires a value."
                exit 2
            }

            $value = $args[$index + 1]
            if ($value.StartsWith("--", [System.StringComparison]::Ordinal) -or [string]::IsNullOrWhiteSpace($value)) {
                Write-ArgumentError "--workflow requires a value."
                exit 2
            }

            $workflow = $value
            $index += 2
            continue
        }
        default {
            Write-ArgumentError "Unknown argument '$argument'."
            exit 2
        }
    }
}

$ghCommand = @(Get-Command gh -CommandType Application -ErrorAction SilentlyContinue) | Select-Object -First 1
if ($null -eq $ghCommand) {
    Write-Output "GitHub CLI 'gh' is not installed or not on PATH. Install and authenticate gh, then retry."
    exit 0
}

$runs = @()
$page = 1

while ($runs.Count -lt $count) {
    $remaining = $count - $runs.Count
    $perPage = [System.Math]::Min($remaining, 100)
    $endpoint = New-RunsEndpoint -Workflow $workflow
    $response = Invoke-GhApiJson -GhCommand $ghCommand -Endpoint $endpoint -PerPage $perPage -Page $page

    if ($null -eq $response) {
        exit 0
    }

    $pageRuns = @()
    $pageRuns += @(Get-PropertyValue $response "workflow_runs")
    if ($pageRuns.Count -eq 0) {
        break
    }

    $runs += $pageRuns
    if ($pageRuns.Count -lt $perPage) {
        break
    }

    $page += 1
}

Write-RunsTable -Runs $runs -Count $count
exit 0
