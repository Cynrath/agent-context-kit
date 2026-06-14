using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class RiskRuleCatalogTextGuardTests
{
    [Fact]
    public void EveryCatalogRuleHasNonEmptyTextFields()
    {
        foreach (var rule in RiskRuleCatalog.All)
        {
            Assert.False(string.IsNullOrWhiteSpace(rule.Id), "Catalog rule is missing an Id.");
            Assert.False(string.IsNullOrWhiteSpace(rule.Name), $"Catalog rule {rule.Id} is missing a Name.");
            Assert.False(string.IsNullOrWhiteSpace(rule.Description), $"Catalog rule {rule.Id} is missing a Description.");
            Assert.False(string.IsNullOrWhiteSpace(rule.Recommendation), $"Catalog rule {rule.Id} is missing a Recommendation.");
        }
    }

    [Fact]
    public void NewAckit006AndAckit007HaveOperativeDescriptionAndRecommendation()
    {
        var production = RiskRuleCatalog.GetRule(
            new RiskFinding(RiskSeverity.High, RiskCategory.ProductionConfig, "config/prod.json", "fixture"));
        var documentation = RiskRuleCatalog.GetRule(
            new RiskFinding(RiskSeverity.Medium, RiskCategory.Documentation, "docs/missing.md", "fixture"));

        Assert.Contains("production", production.Description, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("replac", production.Recommendation, StringComparison.OrdinalIgnoreCase);

        Assert.Contains("documentation", documentation.Description, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("update", documentation.Recommendation, StringComparison.OrdinalIgnoreCase);
    }
}
