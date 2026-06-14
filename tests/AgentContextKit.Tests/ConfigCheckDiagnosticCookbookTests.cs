namespace AgentContextKit.Tests;

public sealed class ConfigCheckDiagnosticCookbookTests
{
    [Fact]
    public void ConfigurationDocumentMentionsKeyDiagnosticCodes()
    {
        var content = ReadRepoFile("docs", "CONFIGURATION.md");

        Assert.Contains("ACKITCFG001", content, StringComparison.Ordinal);
        Assert.Contains("ACKITCFG003", content, StringComparison.Ordinal);
        Assert.Contains("ACKITCFG006", content, StringComparison.Ordinal);
        Assert.Contains("ACKITCFG010", content, StringComparison.Ordinal);
        Assert.Contains("ACKITCFG011", content, StringComparison.Ordinal);
    }

    [Fact]
    public void ConfigurationDocumentLinksToScannerRulesAndDiagnosticSource()
    {
        var content = ReadRepoFile("docs", "CONFIGURATION.md");

        Assert.Contains("SCANNER_RULES.md", content, StringComparison.Ordinal);
        Assert.Contains("ConfigurationValidation.cs", content, StringComparison.Ordinal);
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
