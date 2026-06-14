using System.Text.Json;
using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class SarifRuleIdAlignmentGuardTests
{
    [Fact]
    public void GeneratedSarifRuleIdsMatchCoreCatalog()
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

        writer.Generate(repo.Path, ".ackit/reports/sarif-id-align.sarif", scan, "0.2.0-alpha.2-test");

        var sarifPath = Path.Combine(repo.Path, ".ackit", "reports", "sarif-id-align.sarif");
        using var document = JsonDocument.Parse(File.ReadAllText(sarifPath));

        var actualIds = document.RootElement
            .GetProperty("runs")[0]
            .GetProperty("tool")
            .GetProperty("driver")
            .GetProperty("rules")
            .EnumerateArray()
            .Select(element => element.GetProperty("id").GetString())
            .OrderBy(value => value, StringComparer.Ordinal)
            .ToArray();

        var expectedIds = RiskRuleCatalog.All
            .Select(rule => rule.Id)
            .OrderBy(value => value, StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(expectedIds, actualIds);
    }

    [Fact]
    public void SarifOutputDocumentReferencesCoreRuleCatalog()
    {
        var content = ReadRepoFile("docs", "SARIF_OUTPUT.md");
        Assert.Contains("RiskRuleCatalog", content, StringComparison.Ordinal);
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
