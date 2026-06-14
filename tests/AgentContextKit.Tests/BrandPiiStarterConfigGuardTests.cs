using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class BrandPiiStarterConfigGuardTests
{
    [Fact]
    public void BrandPiiStarterConfigFileIsLoadableAndNonEmpty()
    {
        var content = ReadRepoFile(
            "docs", "examples", "config", "brand-pii-starters.yml");

        Assert.False(string.IsNullOrWhiteSpace(content));
        Assert.Contains("brandKeywords", content, StringComparison.Ordinal);
        Assert.Contains("piiKeywords", content, StringComparison.Ordinal);
        Assert.Contains("Example Brand", content, StringComparison.Ordinal);
    }

    [Fact]
    public void ConfigurationDocumentReferencesBrandPiiStarterConfig()
    {
        var content = ReadRepoFile("docs", "CONFIGURATION.md");
        Assert.Contains("brand-pii-starters.yml", content, StringComparison.Ordinal);
    }

    [Fact]
    public void BrandPiiStarterConfigRoundTripsThroughTheCoreValidator()
    {
        var content = ReadRepoFile(
            "docs", "examples", "config", "brand-pii-starters.yml");
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
