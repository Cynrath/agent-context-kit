using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class PromptPackRedactionFreshMarkerTests
{
    private const string FreshMarker = "ackit-redaction-fresh-marker-77c0a2e9";

    [Fact]
    public void PromptPackOmitsFreshSyntheticMarker()
    {
        using var repo = TempRepository.Create();
        repo.Write("AGENTS.md", "# Agents");
        repo.Write("docs/tasks/TASK-0001-redact-guard.md", "# Demo\n\nCompleted.\n");
        repo.Write("config/insecure.txt", $"raw-token={FreshMarker}");

        var generator = new PromptPackGenerator(new PhysicalFileSystem(), new FixedClock());
        var scan = new ScanResult(
            repo.Path,
            ["AGENTS.md", "config/insecure.txt"],
            Array.Empty<StackInfo>(),
            [
                new RiskFinding(
                    RiskSeverity.Critical,
                    RiskCategory.Secret,
                    "config/insecure.txt",
                    "Fresh synthetic redaction guard secret",
                    FreshMarker)
            ],
            HasReadme: false,
            HasLicense: false,
            HasSecurityPolicy: false,
            HasContributing: false,
            HasCodeOfConduct: false,
            HasChangelog: false,
            HasTests: true,
            HasCi: false,
            HasDocker: false,
            HasAgentInstructions: true);

        generator.Generate(repo.Path, ".ackit/prompt-packs/fresh-marker.md", LanguageCode.English, scan);

        var content = File.ReadAllText(Path.Combine(repo.Path, ".ackit", "prompt-packs", "fresh-marker.md"));
        Assert.DoesNotContain(FreshMarker, content, StringComparison.Ordinal);
    }

    [Fact]
    public void ContextExportManifestOmitsFreshSyntheticMarkerWithApprove()
    {
        using var repo = TempRepository.Create();
        repo.Write("AGENTS.md", "# Agents");
        repo.Write("docs/tasks/TASK-0001-redact-guard.md", "# Demo\n\nCompleted.\n");
        repo.Write(".ackit/prompt-packs/source.md", "# Source prompt pack\n");
        repo.Write("config/insecure.txt", $"raw-token={FreshMarker}");

        var promptPackGen = new PromptPackGenerator(new PhysicalFileSystem(), new FixedClock());
        var sourceScan = new ScanResult(
            repo.Path,
            ["AGENTS.md", "config/insecure.txt", ".ackit/prompt-packs/source.md"],
            Array.Empty<StackInfo>(),
            [
                new RiskFinding(
                    RiskSeverity.Critical,
                    RiskCategory.Secret,
                    "config/insecure.txt",
                    "Fresh synthetic redaction guard secret",
                    FreshMarker)
            ],
            HasReadme: false,
            HasLicense: false,
            HasSecurityPolicy: false,
            HasContributing: false,
            HasCodeOfConduct: false,
            HasChangelog: false,
            HasTests: true,
            HasCi: false,
            HasDocker: false,
            HasAgentInstructions: true);

        promptPackGen.Generate(repo.Path, ".ackit/prompt-packs/source.md", LanguageCode.English, sourceScan);

        var exportGen = new ContextExportManifestGenerator(new PhysicalFileSystem(), new FixedClock());
        var spec = new ContextExportSpec(
            PromptPackPath: ".ackit/prompt-packs/source.md",
            OutputPath: ".ackit/context-exports/fresh-marker.json",
            ApprovalMode: "explicit-approve",
            Language: LanguageCode.English);

        exportGen.Generate(repo.Path, spec, sourceScan);

        var content = File.ReadAllText(Path.Combine(repo.Path, ".ackit", "context-exports", "fresh-marker.json"));
        Assert.DoesNotContain(FreshMarker, content, StringComparison.Ordinal);
    }
}
