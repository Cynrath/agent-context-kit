namespace AgentContextKit.Tests;

public sealed class AgentInstructionSurfaceConsistencyTests
{
    [Fact]
    public void AgentsFileCarriesCanonicalPhrases()
    {
        var content = ReadRepoFile("AGENTS.md");
        AssertCanonicalPhrases(content);
    }

    [Fact]
    public void ClaudeFileCarriesCanonicalPhrases()
    {
        var content = ReadRepoFile("CLAUDE.md");
        AssertCanonicalPhrases(content);
    }

    [Fact]
    public void CopilotInstructionsFileCarriesCanonicalPhrases()
    {
        var content = ReadRepoFile(".github", "copilot-instructions.md");
        AssertCanonicalPhrases(content);
    }

    [Fact]
    public void CursorRulesFileCarriesCanonicalPhrases()
    {
        var content = ReadRepoFile(".cursor", "rules", "project.mdc");
        AssertCanonicalPhrases(content);
    }

    [Fact]
    public void DevelopmentStandardFileCarriesCanonicalPhrases()
    {
        var content = ReadRepoFile("docs", "DEVELOPMENT_STANDARD.md");
        AssertCanonicalPhrases(content);
    }

    private static void AssertCanonicalPhrases(string content)
    {
        Assert.Contains("task-first", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("force-push", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("history", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("1.0.0-rc.1", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("model name", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(".ackit", content, StringComparison.OrdinalIgnoreCase);
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
