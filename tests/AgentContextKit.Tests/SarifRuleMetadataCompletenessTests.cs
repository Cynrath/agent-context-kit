using System.Text.Json;
using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class SarifRuleMetadataCompletenessTests
{
    [Fact]
    public void GeneratedSarifCarriesFullMetadataForEveryCatalogRule()
    {
        using var repo = TempRepository.Create();
        var writer = new SarifReportWriter(new PhysicalFileSystem());
        var scan = new ScanResult(
            repo.Path,
            Array.Empty<string>(),
            Array.Empty<StackInfo>(),
            [
                new RiskFinding(RiskSeverity.Critical, RiskCategory.Secret, "settings.txt", "Fixture secret"),
                new RiskFinding(RiskSeverity.High, RiskCategory.ProductionConfig, "config/prod.json", "Fixture prod config"),
                new RiskFinding(RiskSeverity.Medium, RiskCategory.Documentation, "docs/missing.md", "Fixture doc gap")
            ],
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

        writer.Generate(repo.Path, ".ackit/reports/sarif-meta.sarif", scan, "0.2.0-alpha.2-test");

        var sarifPath = Path.Combine(repo.Path, ".ackit", "reports", "sarif-meta.sarif");
        using var document = JsonDocument.Parse(File.ReadAllText(sarifPath));

        var rules = document.RootElement
            .GetProperty("runs")[0]
            .GetProperty("tool")
            .GetProperty("driver")
            .GetProperty("rules");

        foreach (var rule in rules.EnumerateArray())
        {
            Assert.True(rule.TryGetProperty("id", out var id) && !string.IsNullOrWhiteSpace(id.GetString()));
            Assert.True(rule.TryGetProperty("name", out var name) && !string.IsNullOrWhiteSpace(name.GetString()));
            Assert.True(rule.TryGetProperty("shortDescription", out var shortDescription)
                && shortDescription.TryGetProperty("text", out var shortText)
                && !string.IsNullOrWhiteSpace(shortText.GetString()));
            Assert.True(rule.TryGetProperty("fullDescription", out var fullDescription)
                && fullDescription.TryGetProperty("text", out var fullText)
                && !string.IsNullOrWhiteSpace(fullText.GetString()));
            Assert.True(rule.TryGetProperty("help", out var help)
                && help.TryGetProperty("text", out var helpText)
                && !string.IsNullOrWhiteSpace(helpText.GetString()));
        }
    }

    [Fact]
    public void GeneratedSarifAdvertisesAckit006AndAckit007()
    {
        using var repo = TempRepository.Create();
        var writer = new SarifReportWriter(new PhysicalFileSystem());
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

        writer.Generate(repo.Path, ".ackit/reports/sarif-new.sarif", scan, "0.2.0-alpha.2-test");

        var sarifPath = Path.Combine(repo.Path, ".ackit", "reports", "sarif-new.sarif");
        using var document = JsonDocument.Parse(File.ReadAllText(sarifPath));

        var ids = document.RootElement
            .GetProperty("runs")[0]
            .GetProperty("tool")
            .GetProperty("driver")
            .GetProperty("rules")
            .EnumerateArray()
            .Select(element => element.GetProperty("id").GetString())
            .ToArray();

        Assert.Contains("ACKIT006", ids);
        Assert.Contains("ACKIT007", ids);
    }
}
