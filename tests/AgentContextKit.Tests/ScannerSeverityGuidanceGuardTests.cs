namespace AgentContextKit.Tests;

public sealed class ScannerSeverityGuidanceGuardTests
{
    [Fact]
    public void ScannerRulesDocumentHasUserActionTable()
    {
        var content = ReadRepoFile("docs", "SCANNER_RULES.md");
        Assert.Contains("User Action Per Severity", content, StringComparison.Ordinal);
        Assert.Contains("Critical", content, StringComparison.Ordinal);
        Assert.Contains("High", content, StringComparison.Ordinal);
        Assert.Contains("Medium", content, StringComparison.Ordinal);
        Assert.Contains("Low", content, StringComparison.Ordinal);
    }

    [Fact]
    public void SecurityModelDefersToScannerRulesUserActionTable()
    {
        var content = ReadRepoFile("docs", "SECURITY_MODEL.md");
        Assert.Contains("User Action Per Severity", content, StringComparison.Ordinal);
        Assert.Contains("SCANNER_RULES.md", content, StringComparison.Ordinal);
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
