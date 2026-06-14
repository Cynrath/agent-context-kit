using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class TurkishCliOutputLocaleFallbackGuardTests
{
    [Fact]
    public void EveryKnownTextKeyHasNonEmptyTurkishAndEnglishValues()
    {
        var provider = new TextProvider();

        var knownKeys = new[]
        {
            "help",
            "usage",
            "created",
            "skipped",
            "scanSummary",
            "doctor",
            "noFindings",
            "detectedAgentInstructionFiles",
            "found",
            "missing"
        };

        foreach (var key in knownKeys)
        {
            var english = provider.Get(key, LanguageCode.English);
            var turkish = provider.Get(key, LanguageCode.Turkish);

            Assert.False(
                string.IsNullOrWhiteSpace(english),
                $"Text key '{key}' has no English value.");
            Assert.False(
                string.IsNullOrWhiteSpace(turkish),
                $"Text key '{key}' has no Turkish value.");
        }
    }

    [Fact]
    public void TurkishAndEnglishValuesDifferForDocumentedHumanKeys()
    {
        var provider = new TextProvider();

        var differentiatedKeys = new[]
        {
            "usage",
            "created",
            "skipped",
            "scanSummary",
            "doctor",
            "noFindings",
            "detectedAgentInstructionFiles",
            "found",
            "missing"
        };

        foreach (var key in differentiatedKeys)
        {
            var english = provider.Get(key, LanguageCode.English);
            var turkish = provider.Get(key, LanguageCode.Turkish);

            Assert.NotEqual(
                english,
                turkish,
                StringComparer.Ordinal);
        }
    }
}
