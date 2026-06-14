using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class ActionableConfigCheckExamplesGuardTests
{
    [Fact]
    public void WarningExampleProducesWarningButNoError()
    {
        var validator = new AckitConfigValidator();
        var content = ReadRepoFile(
            "docs", "examples", "config", "with-warning.yml");

        var result = validator.Validate(content);

        Assert.False(result.HasErrors);
        Assert.Contains(
            result.Diagnostics,
            diagnostic => diagnostic.Code == ConfigDiagnosticCodes.UnknownKey);
    }

    [Fact]
    public void ErrorExampleProducesInvalidPathAndCriticalSuppressionDiagnostics()
    {
        var validator = new AckitConfigValidator();
        var content = ReadRepoFile(
            "docs", "examples", "config", "with-error.yml");

        var result = validator.Validate(content);

        Assert.True(result.HasErrors);
        Assert.Contains(
            result.Diagnostics,
            diagnostic => diagnostic.Code == ConfigDiagnosticCodes.InvalidPath);
        Assert.Contains(
            result.Diagnostics,
            diagnostic => diagnostic.Code == ConfigDiagnosticCodes.CriticalSuppression);
    }

    [Fact]
    public void ConfigurationDocumentReferencesActionableExamples()
    {
        var content = ReadRepoFile("docs", "CONFIGURATION.md");
        Assert.Contains("with-warning.yml", content, StringComparison.Ordinal);
        Assert.Contains("with-error.yml", content, StringComparison.Ordinal);
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
