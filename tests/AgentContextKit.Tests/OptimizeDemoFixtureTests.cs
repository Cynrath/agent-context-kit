using AgentContextKit.Core;
using System.Security.Cryptography;

namespace AgentContextKit.Tests;

public sealed class OptimizeDemoFixtureTests
{
    [Fact]
    public void PublicDemoHasStableAuditProposalMetricsAndOrdering()
    {
        var root = DemoRoot();
        var hashes = HashFiles(root);
        var fileSystem = new PhysicalFileSystem();
        var auditor = new InstructionAuditor(fileSystem);

        var first = auditor.Audit(root, cancellationToken: TestContext.Current.CancellationToken);
        var second = auditor.Audit(root, cancellationToken: TestContext.Current.CancellationToken);

        Assert.Equal(4, first.Sources.Count);
        Assert.Equal(16, first.Sources.Sum(source => source.Rules.Count));
        Assert.Equal(4, first.Scopes.Count);
        Assert.Single(first.ScopedOverrides);
        Assert.Equal(10, first.Findings.Count);
        Assert.Equal(7, first.Findings.Count(finding => !finding.IsHeuristic));
        Assert.Equal(3, first.Findings.Count(finding => finding.IsHeuristic));
        Assert.Equal(new InstructionContentMetrics(1080, 142, 39, 270), first.Metrics.Total);
        Assert.Equal(24, first.Metrics.Duplicated.EstimatedTokens);
        Assert.Equal(35, first.Metrics.Avoidable.EstimatedTokens);
        Assert.Equal(
            new Dictionary<string, int>(StringComparer.Ordinal)
            {
                ["ACKITOPT001"] = 2,
                ["ACKITOPT002"] = 1,
                ["ACKITOPT007"] = 2,
                ["ACKITOPT008"] = 1,
                ["ACKITOPT009"] = 1,
                ["ACKITOPT012"] = 1,
                ["ACKITOPT013"] = 1,
                ["ACKITOPT014"] = 1
            },
            first.Findings.GroupBy(finding => finding.RuleId, StringComparer.Ordinal)
                .ToDictionary(group => group.Key, group => group.Count(), StringComparer.Ordinal));
        Assert.Equal(
            first.Findings.Select(finding => finding.Fingerprint).ToArray(),
            second.Findings.Select(finding => finding.Fingerprint).ToArray());
        var scopedOverride = Assert.Single(first.ScopedOverrides);
        Assert.Equal("src/web", scopedOverride.DirectoryScope);
        Assert.Equal("AGENTS.md", scopedOverride.BroaderRule.Path);
        Assert.Equal("src/web/AGENTS.md", scopedOverride.NarrowerRule.Path);

        var generator = new InstructionOptimizationProposalGenerator(fileSystem);
        var proposal = generator.Build(first, "ackit-optimize-demo", TestContext.Current.CancellationToken);
        var repeated = generator.Build(second, "ackit-optimize-demo", TestContext.Current.CancellationToken);

        Assert.Equal(new InstructionContentMetrics(765, 115, 16, 192), proposal.Metrics.Before);
        Assert.Equal(new InstructionContentMetrics(624, 92, 13, 156), proposal.Metrics.After);
        Assert.Equal(new InstructionContentMetrics(141, 23, 3, 36), proposal.Metrics.Saved);
        Assert.Equal(13, proposal.RetainedRules.Count);
        Assert.Equal(2, proposal.Consolidations.Count);
        Assert.Equal(2, proposal.UnresolvedDecisions.Count);
        Assert.Equal(
            ["Deployment", "Documentation", "Release", "Security", "Verification"],
            proposal.MandatoryConstraints.Select(item => item.Category).ToArray());
        Assert.Equal(proposal.Markdown, repeated.Markdown);
        Assert.Equal(hashes, HashFiles(root));
    }

    [Fact]
    public void PublicDemoContainsNoSecretPatternPrivatePathOrContactData()
    {
        var root = DemoRoot();
        var secretScanner = new SecretScanner();
        foreach (var path in Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories))
        {
            var relative = Path.GetRelativePath(root, path).Replace('\\', '/');
            var content = File.ReadAllText(path);
            Assert.Empty(secretScanner.ScanText(relative, content));
            Assert.DoesNotContain("C:" + "\\Users\\", content, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("/" + "Users/", content, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("/" + "home/", content, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("@example.", content, StringComparison.OrdinalIgnoreCase);
        }
    }

    private static string DemoRoot()
    {
        return Path.Combine(LocateRepositoryRoot(), "samples", "ackit-optimize-demo");
    }

    private static string LocateRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "AgentContextKit.sln")))
            {
                return directory.FullName;
            }
            directory = directory.Parent;
        }
        throw new InvalidOperationException("Repository root could not be located.");
    }

    private static IReadOnlyDictionary<string, string> HashFiles(string root)
    {
        return Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories)
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                path => Path.GetRelativePath(root, path).Replace('\\', '/'),
                path => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path))),
                StringComparer.OrdinalIgnoreCase);
    }
}
