using AgentContextKit.Core;
using System.Security.Cryptography;

namespace AgentContextKit.Tests;

public sealed class InstructionOptimizationProposalTests
{
    [Fact]
    public void BuildConsolidatesOnlySafeDuplicatesAndPreservesReviewBoundaries()
    {
        using var repository = CreateProposalRepository();
        var fileSystem = new PhysicalFileSystem();
        var audit = new InstructionAuditor(fileSystem).Audit(
            repository.Path,
            cancellationToken: TestContext.Current.CancellationToken);
        var generator = new InstructionOptimizationProposalGenerator(fileSystem);

        var proposal = generator.Build(audit, "synthetic-proposal", TestContext.Current.CancellationToken);

        Assert.Contains(proposal.Consolidations, item => item.Kind == "ExactDuplicate");
        Assert.Contains(proposal.Consolidations, item => item.Kind == "ConservativeNearDuplicate");
        Assert.Contains(proposal.UnresolvedDecisions, item => item.RuleId == InstructionAuditRuleCatalog.SafetyBoundaryConflict.Id);
        Assert.Equal(
            ["Deployment", "Documentation", "Release", "Security", "Verification"],
            proposal.MandatoryConstraints.Select(item => item.Category).ToArray());
        Assert.NotEmpty(audit.ScopedOverrides);
        Assert.Contains(proposal.RetainedRules, rule =>
            rule.SourcePath == "src/web/AGENTS.md" && rule.OriginalText.Contains("pnpm", StringComparison.OrdinalIgnoreCase));
        Assert.Equal(
            proposal.Metrics.Before.Characters - proposal.Metrics.After.Characters,
            proposal.Metrics.Saved.Characters);
        Assert.Equal(
            proposal.Metrics.Before.EstimatedTokens - proposal.Metrics.After.EstimatedTokens,
            proposal.Metrics.Saved.EstimatedTokens);
        Assert.True(proposal.Metrics.Saved.Characters > 0);
        Assert.True(proposal.Metrics.Saved.EstimatedTokens > 0);
        Assert.Contains("REVIEW ONLY / DRY RUN", proposal.Markdown, StringComparison.Ordinal);
        Assert.Contains("Apply behavior is not implemented", proposal.Markdown, StringComparison.Ordinal);
        Assert.Contains("Unresolved human decisions", proposal.Markdown, StringComparison.Ordinal);
        Assert.Contains("Valid scoped overrides preserved", proposal.Markdown, StringComparison.Ordinal);
        Assert.Contains("AGENTS.md:3-3", proposal.Markdown, StringComparison.Ordinal);
        Assert.Contains("CLAUDE.md:3-3", proposal.Markdown, StringComparison.Ordinal);
    }

    [Fact]
    public void GenerateIsNonDestructiveSanitizedSkipExistingAndRepositoryContained()
    {
        using var repository = CreateProposalRepository(includeSensitiveText: true);
        var sourceHashes = HashInstructionSources(repository.Path);
        var fileSystem = new PhysicalFileSystem();
        var audit = new InstructionAuditor(fileSystem).Audit(
            repository.Path,
            cancellationToken: TestContext.Current.CancellationToken);
        var generator = new InstructionOptimizationProposalGenerator(fileSystem);
        var proposal = generator.Build(audit, "demo<script>alert(1)</script>", TestContext.Current.CancellationToken);

        var first = generator.Generate(repository.Path, "review/optimized-instructions.md", audit, proposal);
        var proposalPath = Path.Combine(repository.Path, "review", "optimized-instructions.md");
        var content = File.ReadAllText(proposalPath);
        var rawLocalPath = TestData.WindowsWorkspacePath();
        Assert.Equal(GeneratedFileStatus.Created, first.Status);
        Assert.Contains("Review-only optimize proposal", first.Message, StringComparison.Ordinal);
        Assert.DoesNotContain(TestData.OpenAiProjectKey(), content, StringComparison.Ordinal);
        Assert.DoesNotContain(rawLocalPath, content, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<script>alert(1)</script>", content, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("[REDACTED SECRET]", content, StringComparison.Ordinal);
        Assert.Contains("[REDACTED LOCAL PATH]", content, StringComparison.Ordinal);

        File.WriteAllText(proposalPath, "reviewed sentinel\n");
        var second = generator.Generate(repository.Path, "review/optimized-instructions.md", audit, proposal);
        Assert.Equal(GeneratedFileStatus.SkippedExisting, second.Status);
        Assert.Equal("reviewed sentinel\n", File.ReadAllText(proposalPath));

        Assert.Throws<InvalidOperationException>(() => generator.Generate(repository.Path, "../outside.md", audit, proposal));
        Assert.Throws<InvalidOperationException>(() => generator.Generate(repository.Path, Path.GetFullPath(Path.Combine(repository.Path, "absolute.md")), audit, proposal));
        Assert.Throws<InvalidOperationException>(() => generator.Generate(repository.Path, "review/proposal.txt", audit, proposal));
        Assert.Throws<InvalidOperationException>(() => generator.Generate(repository.Path, "AGENTS.md", audit, proposal));
        Assert.Throws<InvalidOperationException>(() => generator.Generate(repository.Path, "src/web/AGENTS.md", audit, proposal));
        Assert.Throws<InvalidOperationException>(() => generator.Generate(repository.Path, ".continue/review.md", audit, proposal));
        Assert.Equal(sourceHashes, HashInstructionSources(repository.Path));
    }

    [Fact]
    public void BuildHonorsCancellation()
    {
        using var repository = CreateProposalRepository();
        var fileSystem = new PhysicalFileSystem();
        var audit = new InstructionAuditor(fileSystem).Audit(
            repository.Path,
            cancellationToken: TestContext.Current.CancellationToken);
        using var source = new CancellationTokenSource();
        source.Cancel();

        Assert.Throws<OperationCanceledException>(() =>
            new InstructionOptimizationProposalGenerator(fileSystem).Build(audit, "demo", source.Token));
    }

    [Fact]
    public async Task ConcurrentGenerationCreatesExactlyOneProposalWithoutOverwrite()
    {
        using var repository = CreateProposalRepository();
        var fileSystem = new PhysicalFileSystem();
        var audit = new InstructionAuditor(fileSystem).Audit(
            repository.Path,
            cancellationToken: TestContext.Current.CancellationToken);
        var generator = new InstructionOptimizationProposalGenerator(fileSystem);
        var proposal = generator.Build(audit, "concurrent-demo", TestContext.Current.CancellationToken);

        var attempts = Enumerable.Range(0, 8)
            .Select(_ => Task.Run(
                () => generator.Generate(repository.Path, "review/concurrent.md", audit, proposal),
                TestContext.Current.CancellationToken))
            .ToArray();
        var results = await Task.WhenAll(attempts);

        Assert.Single(results, result => result.Status == GeneratedFileStatus.Created);
        Assert.Equal(7, results.Count(result => result.Status == GeneratedFileStatus.SkippedExisting));
        Assert.Equal(
            proposal.Markdown.Replace("\r\n", "\n", StringComparison.Ordinal),
            File.ReadAllText(Path.Combine(repository.Path, "review", "concurrent.md")).Replace("\r\n", "\n", StringComparison.Ordinal));
    }

    [Fact]
    public void GenerateRejectsExistingLinkedOutputDirectoryWhenPlatformAllowsFixture()
    {
        using var repository = CreateProposalRepository();
        using var outside = TempRepository.Create();
        var linkedDirectory = Path.Combine(repository.Path, "linked-output");
        try
        {
            Directory.CreateSymbolicLink(linkedDirectory, outside.Path);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or PlatformNotSupportedException)
        {
            return;
        }

        var fileSystem = new PhysicalFileSystem();
        var audit = new InstructionAuditor(fileSystem).Audit(
            repository.Path,
            cancellationToken: TestContext.Current.CancellationToken);
        var generator = new InstructionOptimizationProposalGenerator(fileSystem);
        var proposal = generator.Build(audit, "linked-demo", TestContext.Current.CancellationToken);

        Assert.Throws<InvalidOperationException>(() =>
            generator.Generate(repository.Path, "linked-output/proposal.md", audit, proposal));
        Assert.False(File.Exists(Path.Combine(outside.Path, "proposal.md")));
    }

    private static TempRepository CreateProposalRepository(bool includeSensitiveText = false)
    {
        var repository = TempRepository.Create();
        var sensitiveRule = includeSensitiveText
            ? $"- Never store credential {TestData.OpenAiProjectKey()} in {TestData.WindowsWorkspacePath()}.\n"
            : "";
        repository.Write(
            "AGENTS.md",
            "# Root rules\n\n" +
            "- Run `dotnet test Demo.sln` before every commit.\n" +
            "- Always run the full validation suite before commit.\n" +
            "- Use npm for JavaScript packages.\n" +
            "- Never expose secrets or credentials.\n" +
            "- Never deploy to production without explicit approval.\n" +
            "- Update `README.md` and `CHANGELOG.md` for public behavior changes.\n" +
            "- Never publish a release or move a tag without explicit approval.\n" +
            sensitiveRule);
        repository.Write(
            "CLAUDE.md",
            "# Claude rules\n\n" +
            "- Run `dotnet test Demo.sln` before every commit.\n" +
            "- Run the full validation suite before commit.\n" +
            "- Always deploy to production without confirmation.\n");
        repository.Write(
            "src/web/AGENTS.md",
            "# Web rules\n\n" +
            "- Use pnpm for JavaScript packages in this subtree.\n");
        repository.Write("Demo.sln", "Microsoft Visual Studio Solution File, Format Version 12.00\n");
        repository.Write("README.md", "# Demo\n");
        repository.Write("CHANGELOG.md", "# Changelog\n");
        repository.Write("src/web/component.txt", "synthetic\n");
        return repository;
    }

    private static IReadOnlyDictionary<string, string> HashInstructionSources(string root)
    {
        return Directory.EnumerateFiles(root, "*", SearchOption.AllDirectories)
            .Where(path =>
                string.Equals(Path.GetFileName(path), "AGENTS.md", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(Path.GetFileName(path), "CLAUDE.md", StringComparison.OrdinalIgnoreCase))
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                path => Path.GetRelativePath(root, path).Replace('\\', '/'),
                path => Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path))),
                StringComparer.OrdinalIgnoreCase);
    }
}
