using System.Text.RegularExpressions;
using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class ScannerRuleCatalogDocConsistencyTests
{
    [Fact]
    public void ScannerRulesDocumentListsEveryCatalogRuleId()
    {
        var documentText = ReadRepoFile("docs", "SCANNER_RULES.md");

        foreach (var rule in RiskRuleCatalog.All)
        {
            var pattern = $@"`\s*{Regex.Escape(rule.Id)}\s*`";
            Assert.True(
                Regex.IsMatch(documentText, pattern),
                $"docs/SCANNER_RULES.md is missing rule {rule.Id} ({rule.Name}).");
        }
    }

    [Fact]
    public void ScannerRulesDocumentUsesCorrectSeverityForNewRules()
    {
        var documentText = ReadRepoFile("docs", "SCANNER_RULES.md");

        AssertAckitRow(documentText, "ACKIT006", "ProductionConfigLike", "High", "error");
        AssertAckitRow(documentText, "ACKIT007", "DocumentationGap", "Medium", "warning");
    }

    [Fact]
    public void SarifOutputDocumentListsEveryCatalogRuleId()
    {
        var documentText = ReadRepoFile("docs", "SARIF_OUTPUT.md");

        foreach (var rule in RiskRuleCatalog.All)
        {
            var pattern = $@"`\s*{Regex.Escape(rule.Id)}\s*`";
            Assert.True(
                Regex.IsMatch(documentText, pattern),
                $"docs/SARIF_OUTPUT.md is missing rule {rule.Id} ({rule.Name}).");
        }
    }

    [Fact]
    public void SecurityModelListsDocumentationRiskCategory()
    {
        var documentText = ReadRepoFile("docs", "SECURITY_MODEL.md");
        Assert.Contains("Documentation", documentText);
        Assert.Contains("ProductionConfig", documentText);
    }

    private static void AssertAckitRow(
        string documentText,
        string ruleId,
        string name,
        string severity,
        string sarifLevel)
    {
        var pattern = $@"`\s*{Regex.Escape(ruleId)}\s*`\s*\|\s*{Regex.Escape(name)}\s*\|\s*{Regex.Escape(severity)}";
        Assert.True(
            Regex.IsMatch(documentText, pattern, RegexOptions.IgnoreCase),
            $"docs/SCANNER_RULES.md row for {ruleId} ({name}) does not match expected severity {severity}.");
        Assert.Contains(sarifLevel, documentText, StringComparison.OrdinalIgnoreCase);
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
