using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class PromptPackEdgeCaseTests
{
    private const string SyntheticPemBody = "ackit-pem-fixture-9d7c2e-not-a-real-key";
    private const string PemHeaderBegin = "-----BEGIN ";
    private const string PemHeaderKeyType = "OPENSSH PRIVATE KEY";
    private const string PemHeaderEnd = "-----";
    private const string PemFooterBegin = "-----END ";
    private const string PemFooterKeyType = "OPENSSH PRIVATE KEY";

    [Fact]
    public void PromptPackEmptyRepositoryProducesWellFormedEnglishMarkdown()
    {
        using var repo = TempRepository.Create();
        var scan = EmptyScanResult(repo.Path);

        var generator = new PromptPackGenerator(new PhysicalFileSystem(), new FixedClock());
        generator.Generate(repo.Path, ".ackit/prompt-packs/empty.md", LanguageCode.English, scan);

        var content = ReadPromptPack(repo.Path, "empty.md");

        Assert.Contains("# AgentContextKit Dry-Run Prompt Pack", content, StringComparison.Ordinal);
        Assert.Contains("## Scan Summary", content, StringComparison.Ordinal);
        Assert.Contains("## Repository Health", content, StringComparison.Ordinal);
        Assert.Contains("## Stack Signals", content, StringComparison.Ordinal);
        Assert.Contains("## Dry-Run Safety Notes", content, StringComparison.Ordinal);
        Assert.Contains("- Files: 0", content, StringComparison.Ordinal);
        Assert.Contains("- Risk findings: 0", content, StringComparison.Ordinal);
        Assert.Contains("- Critical: 0", content, StringComparison.Ordinal);
        Assert.Contains("- High: 0", content, StringComparison.Ordinal);
        Assert.DoesNotContain("Scan Ozeti", content, StringComparison.Ordinal);
    }

    [Fact]
    public void PromptPackSingleFileRepoMarksOnlyReadme()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Project\n");

        var scan = new ScanResult(
            repo.Path,
            ["README.md"],
            Array.Empty<StackInfo>(),
            Array.Empty<RiskFinding>(),
            HasReadme: true,
            HasLicense: false,
            HasSecurityPolicy: false,
            HasContributing: false,
            HasCodeOfConduct: false,
            HasChangelog: false,
            HasTests: false,
            HasCi: false,
            HasDocker: false,
            HasAgentInstructions: false);

        var generator = new PromptPackGenerator(new PhysicalFileSystem(), new FixedClock());
        generator.Generate(repo.Path, ".ackit/prompt-packs/single-file.md", LanguageCode.English, scan);

        var content = ReadPromptPack(repo.Path, "single-file.md");

        Assert.Contains("- Files: 1", content, StringComparison.Ordinal);
        Assert.Contains("| README | yes |", content, StringComparison.Ordinal);
        Assert.Contains("| LICENSE | no |", content, StringComparison.Ordinal);
        Assert.Contains("| SECURITY | no |", content, StringComparison.Ordinal);
        Assert.Contains("| Tests | no |", content, StringComparison.Ordinal);
        Assert.Contains("| CI | no |", content, StringComparison.Ordinal);
    }

    [Fact]
    public void PromptPackDocsOnlyRepoOmitsStackSignalsAndCsprojPaths()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Project\n");
        repo.Write("docs/AI_WORKFLOW.md", "# AI Workflow\n");
        repo.Write("docs/SECURITY_NOTES.md", "# Security Notes\n");
        repo.Write("docs/PROJECT_MAP.md", "# Project Map\n");
        repo.Write("docs/DEVELOPMENT_STANDARD.md", "# Development Standard\n");

        var files = new[]
        {
            "README.md",
            "docs/AI_WORKFLOW.md",
            "docs/SECURITY_NOTES.md",
            "docs/PROJECT_MAP.md",
            "docs/DEVELOPMENT_STANDARD.md"
        };
        var scan = new ScanResult(
            repo.Path,
            files,
            Array.Empty<StackInfo>(),
            Array.Empty<RiskFinding>(),
            HasReadme: true,
            HasLicense: false,
            HasSecurityPolicy: false,
            HasContributing: false,
            HasCodeOfConduct: false,
            HasChangelog: false,
            HasTests: false,
            HasCi: false,
            HasDocker: false,
            HasAgentInstructions: false);

        var generator = new PromptPackGenerator(new PhysicalFileSystem(), new FixedClock());
        generator.Generate(repo.Path, ".ackit/prompt-packs/docs-only.md", LanguageCode.English, scan);

        var content = ReadPromptPack(repo.Path, "docs-only.md");

        Assert.Contains("- Files: 5", content, StringComparison.Ordinal);
        Assert.Contains("- Unknown", content, StringComparison.Ordinal);
        Assert.Contains("| Documentation | Present | `docs/AI_WORKFLOW.md` |", content, StringComparison.Ordinal);
        Assert.Contains("| Documentation | Present | `docs/PROJECT_MAP.md` |", content, StringComparison.Ordinal);
        Assert.DoesNotContain(".csproj", content, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void PromptPackRedactsCriticalSecretFixture()
    {
        using var repo = TempRepository.Create();
        repo.Write("README.md", "# Project\n");
        repo.Write(
            "secrets/fixture.txt",
            PemHeaderBegin + PemHeaderKeyType + PemHeaderEnd + "\n" + SyntheticPemBody + "\n" + PemFooterBegin + PemFooterKeyType + PemHeaderEnd + "\n");

        var scan = TestServices.CreateRepositoryScanner().Scan(repo.Path);

        var criticalFinding = Assert.Single(
            scan.Findings,
            finding => finding.Category == RiskCategory.Secret && finding.Severity == RiskSeverity.Critical);
        Assert.Equal("ACKIT001", RiskRuleCatalog.GetRuleId(criticalFinding));

        var generator = new PromptPackGenerator(new PhysicalFileSystem(), new FixedClock());
        generator.Generate(repo.Path, ".ackit/prompt-packs/secret-bearing.md", LanguageCode.English, scan);

        var content = ReadPromptPack(repo.Path, "secret-bearing.md");

        Assert.Contains("- Critical: 1", content, StringComparison.Ordinal);
        Assert.DoesNotContain(PemHeaderBegin + PemHeaderKeyType + PemHeaderEnd, content, StringComparison.Ordinal);
        Assert.DoesNotContain(SyntheticPemBody, content, StringComparison.Ordinal);
    }

    private static ScanResult EmptyScanResult(string repositoryPath)
    {
        return new ScanResult(
            repositoryPath,
            Array.Empty<string>(),
            Array.Empty<StackInfo>(),
            Array.Empty<RiskFinding>(),
            HasReadme: false,
            HasLicense: false,
            HasSecurityPolicy: false,
            HasContributing: false,
            HasCodeOfConduct: false,
            HasChangelog: false,
            HasTests: false,
            HasCi: false,
            HasDocker: false,
            HasAgentInstructions: false);
    }

    private static string ReadPromptPack(string repositoryPath, string fileName)
    {
        return File.ReadAllText(Path.Combine(repositoryPath, ".ackit", "prompt-packs", fileName));
    }
}