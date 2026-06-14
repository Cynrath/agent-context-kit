param(
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")),
    [switch]$FailOnIssues
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = (Resolve-Path $RepositoryRoot).Path
Push-Location $repoRoot
try {
    $statusOutput = & git status --porcelain=v1 --untracked-files=all 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Output "Could not run git status. Guard cannot run."
        if ($FailOnIssues) {
            exit 1
        }
        return
    }

    $untrackedOrStaged = @()
    $untrackedOrStaged += $statusOutput |
        Where-Object { $_ -match '^\?\? ' -or $_ -match '^[AM] ' -or $_ -match '^M ' -or $_ -match '^A ' }

    $untracked = @()
    $untracked += $untrackedOrStaged |
        Where-Object { $_ -match '^\?\? (.+)$' } |
            ForEach-Object { ($_ -replace '^\?\? ', '') }
    $staged = @()
    $staged += $untrackedOrStaged |
        Where-Object { $_ -match '^[AM] (.+)$' } |
            ForEach-Object { ($_ -replace '^[AM] ', '') }

    Write-Output "Markdown completeness guard"
    Write-Output "Repository: $repoRoot"
    Write-Output ""
    Write-Output "Untracked or staged entries: $(@($untrackedOrStaged).Count)"
    if ($untracked.Count -gt 0) {
        Write-Output ""
        Write-Output "Untracked files:"
        $untracked | ForEach-Object { Write-Output "- $_" }
    }
    if ($staged.Count -gt 0) {
        Write-Output ""
        Write-Output "Staged but uncommitted files:"
        $staged | ForEach-Object { Write-Output "- $_" }
    }

    if ($untrackedOrStaged.Count -gt 0) {
        Write-Output ""
        Write-Output "Working tree has uncommitted changes. Commit everything before push."
        if ($FailOnIssues) {
            exit 1
        }
    }
    else {
        Write-Output ""
        Write-Output "Working tree is clean. No missing commits detected."
    }
}
finally {
    Pop-Location
}
