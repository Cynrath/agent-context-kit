using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class ReleaseCandidateEvidenceTests
{
    [Fact]
    public void PublishedV020Alpha4GeneratedConfigFixtureMatchesFrozenWriterAndRemainsValid()
    {
        using var repo = TempRepository.Create();
        var fixture = File.ReadAllText(Path.Combine(
            LocateRepositoryRoot(),
            "tests",
            "fixtures",
            "upgrade",
            "v0.2.0-alpha.4-config.yml"));

        var writer = new AckitConfigWriter(new PhysicalFileSystem());
        writer.WriteDefaultIfMissing(repo.Path, LanguageCode.Turkish);
        var generated = File.ReadAllText(Path.Combine(repo.Path, ".ackit", "config.yml"));

        Assert.Equal(NormalizeNewlines(fixture).TrimEnd(), NormalizeNewlines(generated).TrimEnd());

        var config = new AckitConfigReader(new PhysicalFileSystem()).Read(repo.Path);
        var diagnostics = new AckitConfigValidator().Validate(fixture);

        Assert.Equal(1, config.SchemaVersion);
        Assert.Equal("tr", config.DefaultLanguage.Value);
        Assert.Empty(config.BrandKeywords);
        Assert.Empty(config.PiiKeywords);
        Assert.Contains(".ackit/context-exports/", config.IgnorePaths);
        Assert.Contains(".sql", config.RiskExtensions);
        Assert.Empty(config.SafeDomains);
        Assert.Empty(config.IgnoredPaths);
        Assert.Empty(config.IgnoredFindingIds);
        Assert.False(diagnostics.HasErrors);
    }

    [Fact]
    public void PublishedV020Alpha1ConfigFixtureRemainsReadableAndValid()
    {
        using var repo = TempRepository.Create();
        var fixture = File.ReadAllText(Path.Combine(
            LocateRepositoryRoot(),
            "tests",
            "fixtures",
            "upgrade",
            "v0.2.0-alpha.1-config.yml"));
        repo.Write(".ackit/config.yml", fixture);

        var config = new AckitConfigReader(new PhysicalFileSystem()).Read(repo.Path);
        var diagnostics = new AckitConfigValidator().Validate(fixture);

        Assert.Equal(1, config.SchemaVersion);
        Assert.Equal("tr", config.DefaultLanguage.Value);
        Assert.Contains("ExampleProduct", config.BrandKeywords);
        Assert.Contains("ExamplePerson", config.PiiKeywords);
        Assert.Contains("generated/", config.IgnorePaths);
        Assert.Contains("learn.microsoft.com", config.SafeDomains);
        Assert.Contains("docs/generated/", config.IgnoredPaths);
        Assert.Contains(".ackit/config.yml", config.IgnoredPaths);
        Assert.Contains("ACKIT003", config.IgnoredFindingIds);
        Assert.False(diagnostics.HasErrors);
    }

    [Fact]
    public void BaselineSchemaV1FixturePassesIntegrityValidation()
    {
        using var repo = TempRepository.Create();
        var fixture = File.ReadAllText(Path.Combine(
            LocateRepositoryRoot(),
            "tests",
            "fixtures",
            "upgrade",
            "baseline-schema-v1.json"));
        repo.Write("baseline.json", fixture);

        var manifest = new BaselineStore(new PhysicalFileSystem()).Load(repo.Path, "baseline.json");

        var entry = Assert.Single(manifest.Entries);
        Assert.Equal(BaselineSchema.CurrentVersion, manifest.SchemaVersion);
        Assert.Equal(BaselineSchema.FingerprintAlgorithm, manifest.FingerprintAlgorithm);
        Assert.Equal("ACKIT003", entry.RuleId);
        Assert.Equal("artifacts/package.nupkg", entry.Path);
        Assert.Equal(1, entry.Occurrence);
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

    private static string NormalizeNewlines(string value)
    {
        return value.Replace("\r\n", "\n", StringComparison.Ordinal);
    }
}
