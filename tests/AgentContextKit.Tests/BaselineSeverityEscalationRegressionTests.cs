using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class BaselineSeverityEscalationRegressionTests
{
    [Fact]
    public void SeverityEscalationIsTreatedAsNewFinding()
    {
        var classifier = new BaselineClassifier();
        var reviewed = new RiskFinding(
            RiskSeverity.High,
            RiskCategory.Secret,
            "settings.txt",
            "Credential assignment detected.");
        var manifest = classifier.CreateManifest([reviewed]);

        var escalated = new RiskFinding(
            RiskSeverity.Critical,
            RiskCategory.Secret,
            "settings.txt",
            "Credential assignment detected.");

        var result = classifier.Classify([escalated], manifest);

        Assert.Single(result.New);
        Assert.Empty(result.Existing);
        Assert.Equal(RiskSeverity.Critical, result.New[0].Finding.Severity);
    }

    [Fact]
    public void SeverityReductionStaysExisting()
    {
        var classifier = new BaselineClassifier();
        var reviewed = new RiskFinding(
            RiskSeverity.High,
            RiskCategory.Secret,
            "settings.txt",
            "Credential assignment detected.");
        var manifest = classifier.CreateManifest([reviewed]);

        var reduced = new RiskFinding(
            RiskSeverity.Medium,
            RiskCategory.Secret,
            "settings.txt",
            "Credential assignment detected.");

        var result = classifier.Classify([reduced], manifest);

        Assert.Empty(result.New);
        Assert.Single(result.Existing);
    }
}
