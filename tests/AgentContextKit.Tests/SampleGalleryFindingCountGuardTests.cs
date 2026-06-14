using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class SampleGalleryFindingCountGuardTests
{
    [Theory]
    [InlineData("dotnet-console", 0, 5)]
    [InlineData("dotnet-minimal-api", 0, 5)]
    [InlineData("node-tooling", 0, 5)]
    [InlineData("generic-empty-repo", 0, 3)]
    [InlineData("security-fixture-repo", 0, 3)]
    public void SafeSampleScanFindingCountIsWithinExpectedBound(
        string sampleName,
        int minFindings,
        int maxFindings)
    {
        var repoRoot = LocateRepoRoot();
        var samplePath = Path.Combine(repoRoot, "samples", sampleName);
        if (!Directory.Exists(samplePath))
        {
            return;
        }

        var scan = TestServices.CreateRepositoryScanner().Scan(samplePath);

        Assert.InRange(scan.Findings.Count, minFindings, maxFindings);
    }

    [Fact]
    public void SafeSampleScanDoesNotProduceCriticalFindings()
    {
        var repoRoot = LocateRepoRoot();
        foreach (var sampleDir in Directory.EnumerateDirectories(Path.Combine(repoRoot, "samples")))
        {
            var scan = TestServices.CreateRepositoryScanner().Scan(sampleDir);

            Assert.DoesNotContain(
                scan.Findings,
                finding => finding.Severity == RiskSeverity.Critical);
        }
    }

    private static string LocateRepoRoot()
    {
        var current = AppContext.BaseDirectory;
        while (!string.IsNullOrEmpty(current))
        {
            var probe = Path.Combine(current, "AgentContextKit.sln");
            if (File.Exists(probe))
            {
                return current;
            }

            current = Directory.GetParent(current)?.FullName;
        }

        throw new DirectoryNotFoundException(
            "Could not locate the AgentContextKit repository root from " + AppContext.BaseDirectory);
    }
}
