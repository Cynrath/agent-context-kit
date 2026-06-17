using AgentContextKit.Core;
using Xunit;

namespace AgentContextKit.Tests;

public class HighEntropyScannerGuardTests
{
    [Fact]
    public void HighEntropyScannerFlagsLongRandomBase64LikeString()
    {
        const string token = "ZmFrZS1zZWNyZXQtdmFsdWUtbG9uZy1lbm91Z2gtdG8tYmUtaGlnaC1lbnRyb3B5LXNpZ25hdHVyZQ==";
        var content = $"const signingKey = \"{token}\";";
        var findings = new HighEntropyScanner().ScanText("src/auth/token.txt", content);

        Assert.Contains(findings, finding =>
            finding.Severity == RiskSeverity.High &&
            finding.Message.Contains("High-entropy"));
    }

    [Fact]
    public void HighEntropyScannerIgnoresPlainEnglishSentence()
    {
        const string content = "The quick brown fox jumps over the lazy dog every single morning.";
        var findings = new HighEntropyScanner().ScanText("docs/note.md", content);

        Assert.Empty(findings);
    }

    [Fact]
    public void HighEntropyScannerIgnoresUuidLikeStrings()
    {
        const string uuid = "550e8400-e29b-41d4-a716-446655440000";
        var content = $"id: {uuid}";
        var findings = new HighEntropyScanner().ScanText("manifest.yaml", content);

        Assert.Empty(findings);
    }

    [Fact]
    public void HighEntropyScannerIgnoresHexDigestLikeStrings()
    {
        const string digest = "0123456789abcdef0123456789abcdef01234567";
        var content = $"sha256: {digest}";
        var findings = new HighEntropyScanner().ScanText("checksum.txt", content);

        Assert.Empty(findings);
    }

    [Fact]
    public void HighEntropyScannerDoesNotFlagRealisticLicenseHeader()
    {
        const string content = "Copyright (c) 2024 Cynrath. Licensed under the MIT License.";
        var findings = new HighEntropyScanner().ScanText("LICENSE.md", content);

        Assert.Empty(findings);
    }

    [Fact]
    public void HighEntropyScannerTruncatesMatchPreview()
    {
        const string token = "aB3xZ9qM7vQpLrY2tEcVwN4hK8sJdF6gUoI1aB0cD2eF3gH4iJ5kL6mN7oP8qR9sT==";
        var content = $"// payload {token}";
        var findings = new HighEntropyScanner().ScanText("src/keys/dev.txt", content);

        Assert.NotEmpty(findings);
        Assert.All(findings, finding =>
        {
            Assert.NotNull(finding.Match);
            Assert.True(finding.Match!.Length <= 48, "Match preview must be truncated to <=48 chars.");
        });
    }

    [Fact]
    public void HighEntropyScannerReturnsEmptyForEmptyContent()
    {
        Assert.Empty(new HighEntropyScanner().ScanText("empty.md", ""));
    }

    [Fact]
    public void HighEntropyScannerRuleIdResolvesToAckit008()
    {
        const string token = "ZmFrZS1zZWNyZXQtdmFsdWUtbG9uZy1lbm91Z2gtdG8tYmUtaGlnaC1lbnRyb3B5LXNpZ25hdHVyZQ==";
        var payload = string.Concat("\"", token, "\"");
        var findings = new HighEntropyScanner().ScanText("src/auth/token.txt", "var k = " + payload);
        Assert.NotEmpty(findings);
        Assert.Equal(RiskRuleCatalog.HighEntropyString.Id, RiskRuleCatalog.GetRuleId(findings[0]));
    }

    [Fact]
    public void HighEntropyRuleAppearsInCatalog()
    {
        Assert.Contains(RiskRuleCatalog.All, rule => rule.Id == "ACKIT008");
    }
}
