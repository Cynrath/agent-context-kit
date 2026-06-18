using System.Text.RegularExpressions;
using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class WebUiNoBuildStaticGuardTests
{
    [Fact]
    public void GeneratedWebUiHasContentSecurityPolicyMeta()
    {
        var html = GenerateWebUiHtml();

        Assert.Contains(
            "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; style-src 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'none'\">",
            html);
    }

    [Fact]
    public void GeneratedWebUiHasNoNetworkRootAndStaticCurrentNavigation()
    {
        var html = GenerateWebUiHtml();

        Assert.Contains("<body data-no-network=\"true\">", html);
        Assert.Contains("<a href=\"#dashboard\" aria-current=\"page\">Dashboard</a>", html);
        Assert.DoesNotContain(" title=", html, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void GeneratedWebUiHasNoindexRobotsMeta()
    {
        var html = GenerateWebUiHtml();

        Assert.Contains("<meta name=\"robots\" content=\"noindex,nofollow\">", html);
    }

    [Fact]
    public void GeneratedWebUiDoesNotReferenceExternalScriptsOrStyles()
    {
        var html = GenerateWebUiHtml();

        Assert.DoesNotMatch(
            new Regex(@"<(?:script|link)\b[^>]*(?:src|href)\s*=\s*[""']https?://", RegexOptions.IgnoreCase),
            html);
    }

    private static string GenerateWebUiHtml()
    {
        using var repo = TempRepository.Create();
        var generator = new WebUiGenerator(new PhysicalFileSystem(), new FixedClock());
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

        generator.Generate(repo.Path, ".ackit/webui/no-build.html", LanguageCode.English, scan);

        return File.ReadAllText(Path.Combine(repo.Path, ".ackit", "webui", "no-build.html"));
    }
}
