using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class BaselineDiffCookbookTests
{
    [Fact]
    public void BaselineDocumentMentionsExistingAndNew()
    {
        var content = ReadRepoFile("docs", "BASELINE_MODEL.md");
        Assert.Contains("existing", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("new", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("baselineStatus", content, StringComparison.Ordinal);
    }

    [Fact]
    public void BaselineDocumentIncludesCopyReadyCommandSequence()
    {
        var content = ReadRepoFile("docs", "BASELINE_MODEL.md");
        Assert.Contains("ackit baseline", content, StringComparison.Ordinal);
        Assert.Contains("scan --baseline", content, StringComparison.Ordinal);
        Assert.Contains("--ci", content, StringComparison.Ordinal);
    }

    [Fact]
    public void ClassifierProducesExistingAndNewStatesForMixedScan()
    {
        var classifier = new BaselineClassifier();
        var reviewed = new RiskFinding(
            RiskSeverity.Medium,
            RiskCategory.Pii,
            "docs/contact.md",
            "Reviewed PII");
        var added = new RiskFinding(
            RiskSeverity.High,
            RiskCategory.Secret,
            "config/keys.txt",
            "New credential");

        var manifest = classifier.CreateManifest([reviewed]);
        var result = classifier.Classify([reviewed, added], manifest);

        Assert.Single(result.Existing);
        Assert.Single(result.New);
        Assert.Equal("config/keys.txt", result.New[0].Finding.Path);
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
