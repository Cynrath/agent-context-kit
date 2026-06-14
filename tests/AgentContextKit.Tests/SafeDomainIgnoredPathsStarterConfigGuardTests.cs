using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class SafeDomainIgnoredPathsStarterConfigGuardTests
{
    [Fact]
    public void SafeDomainIgnoredPathsStarterConfigIsLoadableAndNonEmpty()
    {
        var content = ReadRepoFile(
            "docs", "examples", "config", "safe-domains-and-ignored-paths.yml");

        Assert.False(string.IsNullOrWhiteSpace(content));
        Assert.Contains("safeDomains", content, StringComparison.Ordinal);
        Assert.Contains("ignoredPaths", content, StringComparison.Ordinal);
        Assert.Contains("docs.example.invalid", content, StringComparison.Ordinal);
    }

    [Fact]
    public void ConfigurationDocumentReferencesSafeDomainIgnoredPathsStarterConfig()
    {
        var content = ReadRepoFile("docs", "CONFIGURATION.md");
        Assert.Contains("safe-domains-and-ignored-paths.yml", content, StringComparison.Ordinal);
    }

    [Fact]
    public void SafeDomainIgnoredPathsStarterConfigRoundTripsThroughTheCoreValidator()
    {
        var content = ReadRepoFile(
            "docs", "examples", "config", "safe-domains-and-ignored-paths.yml");
        var validator = new AckitConfigValidator();
        var result = validator.Validate(content);

        Assert.False(result.HasErrors);
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
