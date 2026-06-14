namespace AgentContextKit.Tests;

public sealed class CopilotInstructionsGuardTests
{
    [Fact]
    public void CopilotInstructionsFileCarriesCanonicalPhrases()
    {
        var content = ReadRepoFile(".github", "copilot-instructions.md");
        Assert.Contains("Commit And Push Policy", content, StringComparison.Ordinal);
        Assert.Contains("Hard prohibitions", content, StringComparison.Ordinal);
        Assert.Contains("force-push", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("model name", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void CopilotInstructionsFileMentionsManualOnlyNote()
    {
        var content = ReadRepoFile(".github", "copilot-instructions.md");
        Assert.Contains("ackit generate", content, StringComparison.Ordinal);
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
