using System.Text.RegularExpressions;
using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class ReportHtmlAccessibilityGuardTests
{
    [Fact]
    public void GeneratedHtmlReportHasLangAttributeAndMainLandmark()
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

        generator.Generate(repo.Path, ".ackit/reports/a11y-advanced.html", LanguageCode.English, scan);

        var html = File.ReadAllText(Path.Combine(repo.Path, ".ackit", "reports", "a11y-advanced.html"));

        var htmlTag = Regex.Match(html, @"<html\b([^>]*)>", RegexOptions.IgnoreCase);
        Assert.True(htmlTag.Success, "Generated HTML does not include an <html> root element.");

        var htmlAttributes = htmlTag.Groups[1].Value;
        Assert.Contains("lang=", htmlAttributes, StringComparison.OrdinalIgnoreCase);

        Assert.Matches(
            new Regex(@"<main\b", RegexOptions.IgnoreCase),
            html);
        Assert.Matches(
            new Regex(@"<h1\b", RegexOptions.IgnoreCase),
            html);
    }

    [Fact]
    public void GeneratedHtmlReportDoesNotReferenceExternalResources()
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

        generator.Generate(repo.Path, ".ackit/reports/a11y-still-offline.html", LanguageCode.English, scan);

        var html = File.ReadAllText(Path.Combine(repo.Path, ".ackit", "reports", "a11y-still-offline.html"));

        Assert.False(
            Regex.IsMatch(html, @"(?:src|href)\s*=\s*[""']https?://", RegexOptions.IgnoreCase),
            "Generated HTML report must not reference external network resources.");
    }
}
