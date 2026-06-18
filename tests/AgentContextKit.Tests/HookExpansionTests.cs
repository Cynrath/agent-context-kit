using System.Text.Json.Nodes;

namespace AgentContextKit.Tests;

public sealed class HookExpansionTests
{
    [Fact]
    public void DefaultCodexHooksInstallCreatesGitHookScripts()
    {
        using var repo = TempRepository.Create();
        CreateGitDirectory(repo);

        var result = RunCli(repo.Path, ["hooks", "--shell", "pwsh", "--install"]);

        Assert.Equal(0, result.ExitCode);
        var preCommit = Read(repo, ".git/hooks/pre-commit");
        var prePush = Read(repo, ".git/hooks/pre-push");
        Assert.Contains("ackit scan --ci", preCommit);
        Assert.Contains("$LASTEXITCODE", preCommit);
        Assert.Contains("ackit scan --ci", prePush);
    }

    [Fact]
    public void ClaudeHooksInstallKeepsGitHookCompatibility()
    {
        using var repo = TempRepository.Create();
        CreateGitDirectory(repo);

        var result = RunCli(repo.Path, ["hooks", "--target", "claude", "--shell", "sh", "--install"]);

        Assert.Equal(0, result.ExitCode);
        var preCommit = Read(repo, ".git/hooks/pre-commit");
        Assert.StartsWith("#!/usr/bin/env sh", preCommit, StringComparison.Ordinal);
        Assert.Contains("ackit scan --ci", preCommit);
    }

    [Fact]
    public void AnthropicHooksInstallCreatesMarkerAndReminderScript()
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, ["hooks", "--target", "anthropic", "--shell", "pwsh", "--install"]);

        Assert.Equal(0, result.ExitCode);
        var marker = Read(repo, ".anthropic/hooks/installed.txt");
        var script = Read(repo, ".anthropic/hooks/pre-commit-reminder.ps1");
        Assert.Contains("AgentContextKit hooks installed", marker);
        Assert.Contains("ackit scan --ci", script);
    }

    [Fact]
    public void ContinueHooksInstallCreatesMarkerAndHooksJson()
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, ["hooks", "--target", "continue", "--shell", "sh", "--install"]);

        Assert.Equal(0, result.ExitCode);
        var marker = Read(repo, ".continue/hooks/installed.txt");
        var hooks = JsonNode.Parse(Read(repo, ".continue/hooks/hooks.json"));
        Assert.Contains("AgentContextKit hooks installed", marker);
        Assert.Equal("pre-prompt", hooks?["hooks"]?[0]?["event"]?.GetValue<string>());
        Assert.Equal("print", hooks?["hooks"]?[0]?["action"]?.GetValue<string>());
    }

    [Fact]
    public void DryRunDoesNotWriteFilesAndReportsContentLength()
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, ["hooks", "--target", "anthropic", "--shell", "pwsh", "--install", "--dry-run", "--json"]);

        Assert.Equal(0, result.ExitCode);
        Assert.False(Directory.Exists(System.IO.Path.Combine(repo.Path, ".anthropic")));
        var json = JsonNode.Parse(result.Output);
        Assert.Equal("dry-run", json?["mode"]?.GetValue<string>());
        Assert.Equal(true, json?["dryRun"]?.GetValue<bool>());
        var file = Assert.Single(json?["files"]?.AsArray() ?? [], node => node?["path"]?.GetValue<string>() == ".anthropic/hooks/installed.txt");
        Assert.True(file?["contentLength"]?.GetValue<int>() > 0);
    }

    [Fact]
    public void OutputDirectoryKeepsExistingGitHookPathCompatibility()
    {
        using var repo = TempRepository.Create();

        var result = RunCli(repo.Path, ["hooks", "--target", "codex", "--shell", "pwsh", "--install", "--output", "out/hooks"]);

        Assert.Equal(0, result.ExitCode);
        Assert.True(File.Exists(System.IO.Path.Combine(repo.Path, "out", "hooks", "pre-commit")));
        Assert.False(File.Exists(System.IO.Path.Combine(repo.Path, "out", "hooks", ".git", "hooks", "pre-commit")));
    }

    private static void CreateGitDirectory(TempRepository repo)
    {
        Directory.CreateDirectory(System.IO.Path.Combine(repo.Path, ".git"));
    }

    private static string Read(TempRepository repo, string relativePath)
    {
        return File.ReadAllText(System.IO.Path.Combine(repo.Path, relativePath.Replace('/', System.IO.Path.DirectorySeparatorChar)));
    }

    private static (int ExitCode, string Output, string Error) RunCli(string workingDirectory, string[] args)
    {
        var originalDirectory = Directory.GetCurrentDirectory();
        var originalOut = Console.Out;
        var originalError = Console.Error;

        using var output = new StringWriter();
        using var error = new StringWriter();

        try
        {
            Directory.SetCurrentDirectory(workingDirectory);
            Console.SetOut(output);
            Console.SetError(error);
            var exitCode = AgentContextKit.Cli.Program.Main(args);
            return (exitCode, output.ToString(), error.ToString());
        }
        finally
        {
            Console.SetOut(originalOut);
            Console.SetError(originalError);
            Directory.SetCurrentDirectory(originalDirectory);
        }
    }
}
