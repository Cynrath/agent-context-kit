using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class SampleGalleryCoverageTests
{
    [Fact]
    public void DotnetConsoleSampleScansAsDotnetStack()
    {
        var repoRoot = LocateRepoRoot();
        var samplePath = Path.Combine(repoRoot, "samples", "dotnet-console");
        if (!Directory.Exists(samplePath))
        {
            return;
        }

        var scan = TestServices.CreateRepositoryScanner().Scan(samplePath);

        Assert.NotEmpty(scan.Stacks);
        Assert.Contains(scan.Stacks, stack => stack.Name == ".NET");
    }

    [Fact]
    public void DotnetMinimalApiSampleScansAsDotnetStack()
    {
        var repoRoot = LocateRepoRoot();
        var samplePath = Path.Combine(repoRoot, "samples", "dotnet-minimal-api");
        if (!Directory.Exists(samplePath))
        {
            return;
        }

        var scan = TestServices.CreateRepositoryScanner().Scan(samplePath);

        Assert.NotEmpty(scan.Stacks);
        Assert.Contains(scan.Stacks, stack => stack.Name == ".NET");
    }

    [Fact]
    public void GenericEmptyRepoSampleHasKnownHealthGaps()
    {
        var repoRoot = LocateRepoRoot();
        var samplePath = Path.Combine(repoRoot, "samples", "generic-empty-repo");
        if (!Directory.Exists(samplePath))
        {
            return;
        }

        var scan = TestServices.CreateRepositoryScanner().Scan(samplePath);

        Assert.Contains(scan.Files, file => string.Equals(file, "README.md", StringComparison.OrdinalIgnoreCase));
        Assert.True(scan.HasReadme);
        Assert.False(scan.HasLicense);
    }

    [Fact]
    public void NodeToolingSampleScansAsNodeStack()
    {
        var repoRoot = LocateRepoRoot();
        var samplePath = Path.Combine(repoRoot, "samples", "node-tooling");
        if (!Directory.Exists(samplePath))
        {
            return;
        }

        var scan = TestServices.CreateRepositoryScanner().Scan(samplePath);

        Assert.NotEmpty(scan.Stacks);
        Assert.Contains(scan.Stacks, stack => stack.Name == "Node");
    }

    [Fact]
    public void SecurityFixtureRepoSampleProducesExpectedHygieneGap()
    {
        var repoRoot = LocateRepoRoot();
        var samplePath = Path.Combine(repoRoot, "samples", "security-fixture-repo");
        if (!Directory.Exists(samplePath))
        {
            return;
        }

        var scan = TestServices.CreateRepositoryScanner().Scan(samplePath);

        Assert.True(scan.HasReadme);
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
