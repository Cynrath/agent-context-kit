using System.Diagnostics;

namespace AgentContextKit.Tests;

public sealed class HostedChecksSummaryScriptTests
{
    [Fact]
    public void NoArgsPrintsMarkdownTableHeader()
    {
        using var repo = TempRepository.Create();
        var fakeGh = CreateFakeGh(repo);

        var result = RunScript([], fakeGh);

        Assert.Equal(0, result.ExitCode);
        Assert.Contains("| Workflow | Run ID | Status | Conclusion | URL | Duration |", result.Output);
        Assert.Contains("| ci | 101 | completed | success | https://example.test/runs/101 | 2m 05s |", result.Output);
        Assert.DoesNotContain("head_sha", result.Output, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void CountOnePrintsExactlyOneDataRow()
    {
        using var repo = TempRepository.Create();
        var fakeGh = CreateFakeGh(repo);

        var result = RunScript(["--count", "1"], fakeGh);

        Assert.Equal(0, result.ExitCode);
        Assert.Single(GetTableDataRows(result.Output));
    }

    [Fact]
    public void WorkflowUsesWorkflowSpecificEndpoint()
    {
        using var repo = TempRepository.Create();
        var fakeGh = CreateFakeGh(repo);

        var result = RunScript(["--workflow", "ci.yml"], fakeGh);

        Assert.Equal(0, result.ExitCode);
        Assert.Contains("| ci | 201 | completed | success | https://example.test/runs/201 | 1m 30s |", result.Output);

        var capturedArgs = File.ReadAllText(Path.Combine(fakeGh, "last-args.txt"));
        Assert.Contains("actions/workflows/ci.yml/runs", capturedArgs, StringComparison.Ordinal);
    }

    [Fact]
    public void CountZeroExitsTwoWithArgumentError()
    {
        var result = RunScript(["--count", "0"], fakeGhDirectory: null);

        Assert.Equal(2, result.ExitCode);
        Assert.Contains("Argument error: --count must be a positive integer.", result.Output);
    }

    [Fact]
    public void MissingGhExitsZeroWithClearMessage()
    {
        using var repo = TempRepository.Create();
        var emptyPath = Path.Combine(repo.Path, "empty-path");
        Directory.CreateDirectory(emptyPath);

        var result = RunScript([], emptyPath, replacePath: true);

        Assert.Equal(0, result.ExitCode);
        Assert.Contains("GitHub CLI 'gh' is not installed or not on PATH.", result.Output);
    }

    [Fact]
    public void HelpPrintsUsage()
    {
        var result = RunScript(["--help"], fakeGhDirectory: null);

        Assert.Equal(0, result.ExitCode);
        Assert.Contains("Usage: powershell -ExecutionPolicy Bypass -File scripts/hosted-checks-summary.ps1", result.Output);
    }

    private static string[] GetTableDataRows(string output)
    {
        return output.Split(["\r\n", "\n"], StringSplitOptions.None)
            .Where(line =>
                line.StartsWith("| ", StringComparison.Ordinal) &&
                !line.StartsWith("| Workflow ", StringComparison.Ordinal) &&
                !line.StartsWith("| --- ", StringComparison.Ordinal))
            .ToArray();
    }

    private static string CreateFakeGh(TempRepository repo)
    {
        var directory = Path.Combine(repo.Path, "fake-gh");
        Directory.CreateDirectory(directory);

        File.WriteAllText(Path.Combine(directory, "all.json"), """
            {"workflow_runs":[
              {"name":"ci","id":101,"status":"completed","conclusion":"success","html_url":"https://example.test/runs/101","run_started_at":"2026-06-18T10:00:00Z","created_at":"2026-06-18T09:59:00Z","updated_at":"2026-06-18T10:02:05Z","head_sha":"hidden"},
              {"name":"cross-platform-smoke","id":102,"status":"completed","conclusion":"success","html_url":"https://example.test/runs/102","run_started_at":"2026-06-18T11:00:00Z","created_at":"2026-06-18T10:59:00Z","updated_at":"2026-06-18T11:03:00Z","head_sha":"hidden"}
            ]}
            """);

        File.WriteAllText(Path.Combine(directory, "workflow.json"), """
            {"workflow_runs":[
              {"name":"ci","id":201,"status":"completed","conclusion":"success","html_url":"https://example.test/runs/201","run_started_at":"2026-06-18T12:00:00Z","created_at":"2026-06-18T11:59:00Z","updated_at":"2026-06-18T12:01:30Z","head_sha":"hidden"}
            ]}
            """);

        if (OperatingSystem.IsWindows())
        {
            var cmdPath = Path.Combine(directory, "gh.cmd");
            File.WriteAllText(cmdPath, """
                @echo off
                echo %* > "%~dp0last-args.txt"
                echo %* | findstr /C:"actions/workflows/ci.yml/runs" >nul
                if not errorlevel 1 (
                  type "%~dp0workflow.json"
                  exit /b 0
                )
                type "%~dp0all.json"
                exit /b 0
                """);
        }
        else
        {
            var ghPath = Path.Combine(directory, "gh");
            File.WriteAllText(ghPath, """
                #!/usr/bin/env sh
                dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
                printf '%s\n' "$*" > "$dir/last-args.txt"
                case "$*" in
                  *actions/workflows/ci.yml/runs*) cat "$dir/workflow.json" ;;
                  *) cat "$dir/all.json" ;;
                esac
                exit 0
                """);
            File.SetUnixFileMode(
                ghPath,
                UnixFileMode.UserRead |
                UnixFileMode.UserWrite |
                UnixFileMode.UserExecute |
                UnixFileMode.GroupRead |
                UnixFileMode.GroupExecute |
                UnixFileMode.OtherRead |
                UnixFileMode.OtherExecute);
        }

        return directory;
    }

    private static (int ExitCode, string Output, string Error) RunScript(
        string[] args,
        string? fakeGhDirectory,
        bool replacePath = false)
    {
        var repositoryRoot = LocateRepositoryRoot();
        var scriptPath = Path.Combine(repositoryRoot, "scripts", "hosted-checks-summary.ps1");
        var shell = LocatePowerShell();

        var startInfo = new ProcessStartInfo
        {
            FileName = shell,
            WorkingDirectory = repositoryRoot,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };

        startInfo.ArgumentList.Add("-NoProfile");
        if (OperatingSystem.IsWindows())
        {
            startInfo.ArgumentList.Add("-ExecutionPolicy");
            startInfo.ArgumentList.Add("Bypass");
        }

        startInfo.ArgumentList.Add("-File");
        startInfo.ArgumentList.Add(scriptPath);
        foreach (var arg in args)
        {
            startInfo.ArgumentList.Add(arg);
        }

        if (replacePath)
        {
            startInfo.Environment["PATH"] = fakeGhDirectory ?? string.Empty;
        }
        else if (!string.IsNullOrWhiteSpace(fakeGhDirectory))
        {
            var existingPath = startInfo.Environment.TryGetValue("PATH", out var path) ? path : string.Empty;
            startInfo.Environment["PATH"] = fakeGhDirectory + Path.PathSeparator + existingPath;
        }

        using var process = Process.Start(startInfo)
            ?? throw new InvalidOperationException("PowerShell process could not be started.");
        var output = process.StandardOutput.ReadToEnd();
        var error = process.StandardError.ReadToEnd();
        process.WaitForExit();

        return (process.ExitCode, output, error);
    }

    private static string LocatePowerShell()
    {
        var candidates = OperatingSystem.IsWindows()
            ? new[] { "pwsh.exe", "pwsh", "powershell.exe", "powershell" }
            : ["pwsh", "powershell"];

        var path = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        foreach (var directory in path.Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries))
        {
            foreach (var candidate in candidates)
            {
                var fullPath = Path.Combine(directory, candidate);
                if (File.Exists(fullPath))
                {
                    return fullPath;
                }
            }
        }

        return candidates[0];
    }

    private static string LocateRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "AgentContextKit.sln")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new InvalidOperationException("Repository root could not be located.");
    }
}
