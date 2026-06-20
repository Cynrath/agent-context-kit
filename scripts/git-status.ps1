function Get-GitWorkingTreeStatus {
    $runningOnWindows = [System.IO.Path]::DirectorySeparatorChar -eq "\"
    if ($runningOnWindows) {
        $output = & cmd.exe /d /c "git status --porcelain=v1 --untracked-files=all 2>NUL"
    }
    else {
        $output = & /bin/sh -c "git status --porcelain=v1 --untracked-files=all 2>/dev/null"
    }

    [PSCustomObject]@{
        ExitCode = $LASTEXITCODE
        Lines = @($output)
    }
}
