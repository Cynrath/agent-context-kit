using System.Diagnostics;

namespace AgentContextKit.Tests;

public sealed class ReleaseDeploymentFailureGuardTests
{
    [Fact]
    public void PublishedPackageVerifierResolvesRunnerTempWhenTempIsMissing()
    {
        using var repo = TempRepository.Create();
        var runnerTemp = Path.Combine(repo.Path, "runner-temp");
        Directory.CreateDirectory(runnerTemp);

        var result = RunPowerShellScript(
            Path.Combine(LocateRepositoryRoot(), "scripts", "verify-published-package.ps1"),
            ["-Version", "0.0.0-test", "-TempResolutionSelfTest"],
            environment =>
            {
                environment["RUNNER_TEMP"] = runnerTemp;
                environment["TEMP"] = string.Empty;
                environment["TMP"] = string.Empty;
                environment["TMPDIR"] = string.Empty;
            });

        Assert.Equal(0, result.ExitCode);
        Assert.Contains(runnerTemp, result.Output, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ReleaseWorkflowCheckRejectsWindowsPowerShellInPublishJob()
    {
        using var repo = TempRepository.Create();
        var root = LocateRepositoryRoot();
        var originalWorkflow = File.ReadAllText(Path.Combine(root, ".github", "workflows", "release.yml"));
        var mutatedWorkflow = originalWorkflow.Replace(
            "pwsh -NoProfile -File scripts/prepare-release.ps1 -Version $version -CommitSha $commit -RequireOriginMaster -FailOnIssues",
            "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare-release.ps1 -Version $version -CommitSha $commit -RequireOriginMaster -FailOnIssues",
            StringComparison.Ordinal);

        var workflowPath = Path.Combine(repo.Path, "release.yml");
        File.WriteAllText(workflowPath, mutatedWorkflow);

        var result = RunPowerShellScript(
            Path.Combine(root, "scripts", "check-release-workflow.ps1"),
            ["-WorkflowPath", workflowPath, "-FailOnIssues"]);

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("Publish job must not call Windows-only powershell", result.Output);
    }

    [Fact]
    public void ReleaseWorkflowCheckRejectsShortValidatedPackageArtifactRetention()
    {
        using var repo = TempRepository.Create();
        var root = LocateRepositoryRoot();
        var originalWorkflow = File.ReadAllText(Path.Combine(root, ".github", "workflows", "release.yml"));
        var mutatedWorkflow = originalWorkflow.Replace(
            "retention-days: 14",
            "retention-days: 1",
            StringComparison.Ordinal);

        var workflowPath = Path.Combine(repo.Path, "release.yml");
        File.WriteAllText(workflowPath, mutatedWorkflow);

        var result = RunPowerShellScript(
            Path.Combine(root, "scripts", "check-release-workflow.ps1"),
            ["-WorkflowPath", workflowPath, "-FailOnIssues"]);

        Assert.Equal(1, result.ExitCode);
        Assert.Contains("Validated package artifact retention must be at least 14 days", result.Output);
    }

    private static (int ExitCode, string Output, string Error) RunPowerShellScript(
        string scriptPath,
        string[] args,
        Action<IDictionary<string, string?>>? configureEnvironment = null)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = LocatePowerShell(),
            WorkingDirectory = LocateRepositoryRoot(),
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

        configureEnvironment?.Invoke(startInfo.Environment);

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
