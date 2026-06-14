using System.Text.RegularExpressions;

namespace AgentContextKit.Tests;

public sealed class ReadmeUsageExamplesGuardTests
{
    [Fact]
    public void EnglishReadmeUsageExamplesUseExplicitProjectPath()
    {
        var content = ReadRepoFile("README.md");
        AssertNoBareDotnetRunInExamples(content);
        Assert.Contains("--project", content, StringComparison.Ordinal);
    }

    [Fact]
    public void TurkishReadmeUsageExamplesUseExplicitProjectPath()
    {
        var content = ReadRepoFile("README.tr.md");
        AssertNoBareDotnetRunInExamples(content);
        Assert.Contains("--project", content, StringComparison.Ordinal);
    }

    [Fact]
    public void EnglishReadmeHasFirstFiveMinutesPointer()
    {
        var content = ReadRepoFile("README.md");
        Assert.Contains("First Five Minutes", content, StringComparison.Ordinal);
    }

    [Fact]
    public void TurkishReadmeHasFirstFiveMinutesPointer()
    {
        var content = ReadRepoFile("README.tr.md");
        Assert.Contains("First Five Minutes", content, StringComparison.Ordinal);
    }

    private static void AssertNoBareDotnetRunInExamples(string content)
    {
        var pattern = new Regex(
            @"dotnet\s+run(?!\s+--project)",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);
        Assert.False(
            pattern.IsMatch(content),
            "README contains a `dotnet run` example without an explicit `--project` argument.");
    }

    private static string ReadRepoFile(params string[] segments)
    {
        var current = AppContext.BaseDirectory;
        while (!string.IsNullOrEmpty(current))
        {
            var probe = Path.Combine(current, "AgentContextKit.sln");
            if (File.Exists(probe))
            {
                return File.ReadAllText(Path.Combine(new[] { current }.Concat(segments).ToArray()));
            }

            current = Directory.GetParent(current)?.FullName;
        }

        throw new DirectoryNotFoundException(
            "Could not locate the AgentContextKit repository root from " + AppContext.BaseDirectory);
    }
}
