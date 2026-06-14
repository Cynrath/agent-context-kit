using System.Text.Json;
using System.Text.Json.Nodes;
using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class Ackit006Ackit007EndToEndTests
{
    [Fact]
    public void ScanEmitsAckit006ForProductionConfigFixture()
    {
        using var repo = TempRepository.Create();
        repo.Write("config/appsettings.Production.json", """
        {
          "ConnectionStrings": {
            "Database": "Server=prod-db.example.invalid;Database=app;Trusted_Connection=True;"
          }
        }
        """);

        var scan = TestServices.CreateRepositoryScanner().Scan(repo.Path);

        var productionFinding = Assert.Single(
            scan.Findings,
            finding => finding.Category == RiskCategory.ProductionConfig);

        Assert.Equal("ACKIT006", RiskRuleCatalog.GetRuleId(productionFinding));
        Assert.Equal("ACKIT006", RiskRuleCatalog.GetRule(productionFinding).Id);
    }

    [Fact]
    public void ScanRedactCheckStyleFilterKeepsAckit006ProductionFinding()
    {
        using var repo = TempRepository.Create();
        repo.Write("config/appsettings.Production.json", """
        { "ConnectionStrings": { "Database": "Server=prod-db.example.invalid" } }
        """);

        var scan = TestServices.CreateRepositoryScanner().Scan(repo.Path);

        var redactProfile = scan.Findings
            .Where(finding => finding.Category is RiskCategory.Secret
                or RiskCategory.Pii
                or RiskCategory.Brand
                or RiskCategory.LocalPath
                or RiskCategory.ProductionConfig)
            .Select(finding => RiskRuleCatalog.GetRuleId(finding))
            .ToArray();

        Assert.Contains("ACKIT006", redactProfile);
    }

    [Fact]
    public void ScanJsonOutputExposesAckit006RuleId()
    {
        using var repo = TempRepository.Create();
        repo.Write("config/appsettings.Production.json", """
        { "ConnectionStrings": { "Database": "Server=prod-db.example.invalid" } }
        """);

        var scan = TestServices.CreateRepositoryScanner().Scan(repo.Path);
        var json = BuildScanJson(scan);
        var ruleIds = ExtractRuleIds(json);

        Assert.Contains("ACKIT006", ruleIds);
    }

    [Fact]
    public void Ackit007CatalogMappingProducesStableRuleId()
    {
        var finding = new RiskFinding(
            RiskSeverity.Medium,
            RiskCategory.Documentation,
            "docs/missing-section.md",
            "Documentation gap example");

        var rule = RiskRuleCatalog.GetRule(finding);
        Assert.Equal("ACKIT007", rule.Id);
        Assert.Equal(RiskCategory.Documentation, rule.Category);
        Assert.Equal(RiskSeverity.Medium, rule.DefaultSeverity);
    }

    [Fact]
    public void Ackit007AppearsInCentralCatalogForSarifAndJson()
    {
        Assert.Contains(
            RiskRuleCatalog.All,
            rule => rule.Id == "ACKIT007" && rule.Category == RiskCategory.Documentation);

        var writer = new SarifReportWriter(new PhysicalFileSystem());
        using var repo = TempRepository.Create();
        var scan = CreateScan(repo.Path,
        [
            new RiskFinding(RiskSeverity.Medium, RiskCategory.Documentation, "docs/missing.md", "Documentation gap")
        ]);

        writer.Generate(repo.Path, ".ackit/reports/ackit007.sarif", scan, "0.2.0-alpha.2-test");

        var sarifPath = Path.Combine(repo.Path, ".ackit", "reports", "ackit007.sarif");
        var sarifText = File.ReadAllText(sarifPath);
        using var document = JsonDocument.Parse(sarifText);

        var rules = document.RootElement
            .GetProperty("runs")[0]
            .GetProperty("tool")
            .GetProperty("driver")
            .GetProperty("rules");

        var hasAckit007 = false;
        foreach (var rule in rules.EnumerateArray())
        {
            if (string.Equals(rule.GetProperty("id").GetString(), "ACKIT007", StringComparison.Ordinal))
            {
                hasAckit007 = true;
                break;
            }
        }

        Assert.True(hasAckit007, "SARIF report does not advertise ACKIT007 in its rule catalog.");
    }

    private static ScanResult CreateScan(string repositoryPath, IReadOnlyList<RiskFinding> findings)
    {
        return new ScanResult(
            repositoryPath,
            Array.Empty<string>(),
            Array.Empty<StackInfo>(),
            findings,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            false,
            true);
    }

    private static string BuildScanJson(ScanResult scan)
    {
        var payload = new
        {
            schemaVersion = 2,
            toolVersion = "0.2.0-alpha.2-test",
            generatedAtUtc = DateTime.UtcNow,
            command = "scan",
            repositoryPath = scan.RepositoryPath,
            files = scan.Files,
            stacks = scan.Stacks,
            riskSummary = new
            {
                total = scan.Findings.Count
            },
            findings = scan.Findings.Select(finding => new
            {
                ruleId = RiskRuleCatalog.GetRuleId(finding),
                severity = finding.Severity.ToString(),
                category = finding.Category.ToString(),
                path = finding.Path,
                message = finding.Message,
                match = (string?)null
            }).ToArray()
        };

        return JsonSerializer.Serialize(payload, new JsonSerializerOptions
        {
            WriteIndented = false
        });
    }

    private static IReadOnlyList<string> ExtractRuleIds(string json)
    {
        var root = JsonNode.Parse(json) as JsonObject;
        Assert.NotNull(root);

        var findings = root!["findings"] as JsonArray;
        Assert.NotNull(findings);

        return findings!
            .Select(node => node?["ruleId"]?.GetValue<string>())
            .Where(value => value is not null)
            .Cast<string>()
            .ToArray();
    }
}
