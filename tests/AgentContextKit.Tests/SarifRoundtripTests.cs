using System.Text.Json;
using System.Text.Json.Serialization;
using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class SarifRoundtripTests
{
    [Fact]
    public void SarifRoundtripMapsEveryFindingToExpectedRule()
    {
        using var repo = TempRepository.Create();
        var scan = CreateScan(
            repo.Path,
            Findings: [
                new RiskFinding(RiskSeverity.Critical, RiskCategory.Secret, "src/settings.txt", "Secret-like value detected"),
                new RiskFinding(RiskSeverity.High, RiskCategory.ProductionConfig, "config/appsettings.Production.json", "Production connection string review required"),
                new RiskFinding(RiskSeverity.Medium, RiskCategory.BuildArtifact, "artifacts/source.zip", "Generated or build artifact present"),
                new RiskFinding(RiskSeverity.Low, RiskCategory.LocalPath, "docs/paths.md", "Workspace path may leak local location"),
                new RiskFinding(RiskSeverity.Medium, RiskCategory.Documentation, "docs/missing-section.md", "Documentation gap example"),
                new RiskFinding(RiskSeverity.Info, RiskCategory.RepositoryHygiene, "README.md", "Repository hygiene item")
            ]);

        var writer = new SarifReportWriter(new PhysicalFileSystem());
        writer.Generate(repo.Path, ".ackit/reports/sarif-roundtrip.sarif", scan, "0.2.0-alpha.2-test");

        var sarifPath = Path.Combine(repo.Path, ".ackit", "reports", "sarif-roundtrip.sarif");
        var roundtrip = ParseReport(sarifPath);

        var results = roundtrip.Runs[0].Results;
        Assert.Equal(scan.Findings.Count, results.Count);

        for (var index = 0; index < scan.Findings.Count; index++)
        {
            var finding = scan.Findings[index];
            var result = results[index];

            var expectedRuleId = RiskRuleCatalog.GetRuleId(finding);
            var expectedLevel = SeverityToSarifLevel(finding.Severity);

            Assert.Equal(expectedRuleId, result.RuleId);
            Assert.Equal(expectedLevel, result.Level);
        }
    }

    [Fact]
    public void SarifRoundtripHandlesEmptyFindings()
    {
        using var repo = TempRepository.Create();
        var scan = CreateScan(repo.Path, Findings: Array.Empty<RiskFinding>());

        var writer = new SarifReportWriter(new PhysicalFileSystem());
        writer.Generate(repo.Path, ".ackit/reports/sarif-empty.sarif", scan, "0.2.0-alpha.2-test");

        var sarifPath = Path.Combine(repo.Path, ".ackit", "reports", "sarif-empty.sarif");
        var roundtrip = ParseReport(sarifPath);

        Assert.NotNull(roundtrip.Runs);
        Assert.Single(roundtrip.Runs);
        Assert.Empty(roundtrip.Runs[0].Results);
    }

    [Fact]
    public void SarifRoundtripWriterDoesNotSerializeSuppressions()
    {
        using var repo = TempRepository.Create();
        var findings = new[]
        {
            new RiskFinding(RiskSeverity.Critical, RiskCategory.Secret, "src/settings.txt", "Secret-like value detected"),
            new RiskFinding(RiskSeverity.High, RiskCategory.ProductionConfig, "config/appsettings.Production.json", "Production connection string review required")
        };
        var suppressions = new[]
        {
            new RiskSuppression(
                RuleId: "ACKIT001",
                Severity: RiskSeverity.Critical,
                Category: RiskCategory.Secret,
                Path: "src/settings.txt",
                Reason: RiskSuppressionReason.SafeDomain),
            new RiskSuppression(
                RuleId: "ACKIT006",
                Severity: RiskSeverity.High,
                Category: RiskCategory.ProductionConfig,
                Path: "config/appsettings.Production.json",
                Reason: RiskSuppressionReason.IgnoredPath)
        };

        var scan = new ScanResult(
            RepositoryPath: repo.Path,
            Files: Array.Empty<string>(),
            Stacks: Array.Empty<StackInfo>(),
            Findings: findings,
            HasReadme: true,
            HasLicense: true,
            HasSecurityPolicy: true,
            HasContributing: true,
            HasCodeOfConduct: true,
            HasChangelog: true,
            HasTests: true,
            HasCi: true,
            HasDocker: false,
            HasAgentInstructions: true)
        {
            Suppressions = suppressions
        };

        var writer = new SarifReportWriter(new PhysicalFileSystem());
        writer.Generate(repo.Path, ".ackit/reports/sarif-suppressions.sarif", scan, "0.2.0-alpha.2-test");

        var sarifPath = Path.Combine(repo.Path, ".ackit", "reports", "sarif-suppressions.sarif");
        var roundtrip = ParseReport(sarifPath);
        var results = roundtrip.Runs[0].Results;

        Assert.Equal(scan.Findings.Count, results.Count);
        for (var index = 0; index < scan.Findings.Count; index++)
        {
            var finding = scan.Findings[index];
            var result = results[index];

            Assert.Equal(RiskRuleCatalog.GetRuleId(finding), result.RuleId);
            Assert.Equal(SeverityToSarifLevel(finding.Severity), result.Level);
        }

        // Documented current contract: the SARIF writer does not emit a SARIF
        // `suppressions` property on the run; suppressions stay in the source
        // ScanResult and are intentionally not round-tripped to SARIF today.
        using var document = JsonDocument.Parse(File.ReadAllText(sarifPath));
        var runElement = document.RootElement.GetProperty("runs")[0];
        Assert.False(
            runElement.TryGetProperty("suppressions", out _),
            "SARIF writer must not emit a `suppressions` field on the run today; if that contract changes, add a focused suppression-count test in addition to this contract check.");
        Assert.False(
            document.RootElement.TryGetProperty("suppressions", out _),
            "SARIF writer must not emit a top-level `suppressions` field today.");
    }

    private static ScanResult CreateScan(string repositoryPath, IReadOnlyList<RiskFinding> Findings)
    {
        return new ScanResult(
            repositoryPath,
            Array.Empty<string>(),
            Array.Empty<StackInfo>(),
            Findings,
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

    private static SarifReport ParseReport(string sarifPath)
    {
        var json = File.ReadAllText(sarifPath);
        var report = JsonSerializer.Deserialize<SarifReport>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            });

        Assert.NotNull(report);
        Assert.NotEmpty(report!.Runs);
        return report;
    }

    private static string SeverityToSarifLevel(RiskSeverity severity)
    {
        return severity switch
        {
            RiskSeverity.Critical or RiskSeverity.High => "error",
            RiskSeverity.Medium => "warning",
            _ => "note"
        };
    }
}