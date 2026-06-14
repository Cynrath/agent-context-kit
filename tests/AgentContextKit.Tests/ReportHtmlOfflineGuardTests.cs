using System.Text.RegularExpressions;
using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class ReportHtmlOfflineGuardTests
{
    [Fact]
    public void GeneratedHtmlReportHasNoExternalNetworkReferences()
    {
        using var repo = TempRepository.Create();
        var generator = new HtmlReportGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(
            repo.Path,
            Array.Empty<string>(),
            Array.Empty<StackInfo>(),
            Array.Empty<RiskFinding>(),
            HasReadme: true,
            HasLicense: true,
            HasSecurityPolicy: true,
            HasContributing: true,
            HasCodeOfConduct: true,
            HasChangelog: true,
            HasTests: true,
            HasCi: true,
            HasDocker: false,
            HasAgentInstructions: true);

        generator.Generate(repo.Path, ".ackit/reports/offline-guard.html", LanguageCode.English, scan);

        var html = File.ReadAllText(Path.Combine(repo.Path, ".ackit", "reports", "offline-guard.html"));

        Assert.False(
            HasExternalReference(html),
            "Generated HTML report contains a network reference that would require an online resource.");
    }

    [Fact]
    public void GeneratedHtmlReportIncludesAccessibilityLandmarks()
    {
        using var repo = TempRepository.Create();
        var generator = new HtmlReportGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(
            repo.Path,
            Array.Empty<string>(),
            Array.Empty<StackInfo>(),
            Array.Empty<RiskFinding>(),
            HasReadme: true,
            HasLicense: true,
            HasSecurityPolicy: true,
            HasContributing: true,
            HasCodeOfConduct: true,
            HasChangelog: true,
            HasTests: true,
            HasCi: true,
            HasDocker: false,
            HasAgentInstructions: true);

        generator.Generate(repo.Path, ".ackit/reports/a11y-guard.html", LanguageCode.English, scan);

        var html = File.ReadAllText(Path.Combine(repo.Path, ".ackit", "reports", "a11y-guard.html"));

        Assert.Contains("<html", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("<head", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("<body", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("</html>", html, StringComparison.OrdinalIgnoreCase);
    }

    private static bool HasExternalReference(string html)
    {
        var pattern = new Regex(
            @"(?:src|href)\s*=\s*[""']https?://",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        return pattern.IsMatch(html);
    }
}
