using System.Text.Json.Nodes;

namespace AgentContextKit.Tests;

public sealed class OptimizeCommandTests
{
    [Fact]
    public void DefaultConsoleIsReviewOnlyLocalizedAndDoesNotFailOnFindings()
    {
        using var englishRepository = CreateConflictRepository();
        using var turkishRepository = CreateConflictRepository();
        var sourcePath = Path.Combine(englishRepository.Path, "AGENTS.md");
        var sourceBefore = File.ReadAllText(sourcePath);

        var english = RunCli(englishRepository.Path, ["optimize", "--lang", "en"]);
        var turkish = RunCli(turkishRepository.Path, ["optimize", "--lang", "tr"]);

        Assert.Equal(0, english.ExitCode);
        Assert.Equal(english.ExitCode, turkish.ExitCode);
        Assert.Contains("ACKit Optimize instruction audit", english.Output, StringComparison.Ordinal);
        Assert.Contains("ACKit Optimize yönerge denetimi", turkish.Output, StringComparison.Ordinal);
        Assert.Contains("ACKITOPT014", english.Output, StringComparison.Ordinal);
        Assert.Contains("ACKITOPT014 Safety", english.Output, StringComparison.Ordinal);
        Assert.Contains("Review only", english.Output, StringComparison.Ordinal);
        Assert.Contains("Yalnızca inceleme", turkish.Output, StringComparison.Ordinal);
        Assert.Equal(sourceBefore, File.ReadAllText(sourcePath));
        Assert.DoesNotContain(
            Directory.EnumerateFiles(englishRepository.Path, "*", SearchOption.AllDirectories),
            path => path.Contains("report", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void JsonAliasAndFormatProduceEquivalentLanguageInvariantContracts()
    {
        using var repository = CreateConflictRepository();

        var alias = RunCli(repository.Path, ["optimize", "--json", "--lang", "en"]);
        var format = RunCli(repository.Path, ["optimize", "--format", "json", "--lang", "tr"]);
        var aliasJson = ParseAndNormalize(alias.Output);
        var formatJson = ParseAndNormalize(format.Output);

        Assert.Equal(0, alias.ExitCode);
        Assert.Equal(alias.ExitCode, format.ExitCode);
        Assert.True(JsonNode.DeepEquals(aliasJson, formatJson));
        Assert.Equal("optimize", aliasJson["command"]?.GetValue<string>());
        Assert.Equal("StandardOutput", aliasJson["output"]?["status"]?.GetValue<string>());
        Assert.True(aliasJson["auditSummary"]?["findingCount"]?.GetValue<int>() > 0);
        Assert.Null(aliasJson["repositoryPath"]);
        Assert.DoesNotContain(repository.Path, alias.Output, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void CiExitUsesHighestSeverityAndIsFormatIndependent()
    {
        using var criticalRepository = CreateConflictRepository();

        var console = RunCli(criticalRepository.Path, ["optimize", "--ci"]);
        var json = RunCli(criticalRepository.Path, ["optimize", "--ci", "--json"]);
        var markdown = RunCli(
            criticalRepository.Path,
            ["optimize", "--ci", "--format", "markdown", "--output", "reports/ci.md"]);

        Assert.Equal(2, console.ExitCode);
        Assert.Equal(console.ExitCode, json.ExitCode);
        Assert.Equal(console.ExitCode, markdown.ExitCode);
        Assert.Equal(2, JsonNode.Parse(json.Output)?["exitCode"]?.GetValue<int>());

        using var highRepository = TempRepository.Create();
        highRepository.Write("AGENTS.md", "# Root\n\n- Use npm for JavaScript packages.\n");
        highRepository.Write("CLAUDE.md", "# Claude\n\n- Use pnpm for JavaScript packages.\n");
        Assert.Equal(1, RunCli(highRepository.Path, ["optimize", "--ci"]).ExitCode);

        using var cleanRepository = TempRepository.Create();
        cleanRepository.Write("AGENTS.md", "# Root\n\n- Run tests.\n");
        Assert.Equal(0, RunCli(cleanRepository.Path, ["optimize", "--ci"]).ExitCode);
    }

    [Fact]
    public void ExplicitReportsAreCreatedParseableOfflineAndNeverOverwritten()
    {
        using var repository = CreateConflictRepository();
        var sourcePath = Path.Combine(repository.Path, "AGENTS.md");
        var sourceBefore = File.ReadAllText(sourcePath);

        var markdown = RunCli(repository.Path, ["optimize", "--format", "markdown", "--output", "reports/audit.md"]);
        var markdownPath = Path.Combine(repository.Path, "reports", "audit.md");
        Assert.Equal(0, markdown.ExitCode);
        Assert.Contains("created", markdown.Output, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ACKITOPT014", File.ReadAllText(markdownPath), StringComparison.Ordinal);
        var markdownBefore = File.ReadAllText(markdownPath);

        var skipped = RunCli(repository.Path, ["optimize", "--format", "markdown", "--output", "reports/audit.md"]);
        Assert.Equal(0, skipped.ExitCode);
        Assert.Contains("skipped existing", skipped.Output, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(markdownBefore, File.ReadAllText(markdownPath));

        var sarif = RunCli(repository.Path, ["optimize", "--format", "sarif", "--output", "reports/audit.sarif"]);
        Assert.Equal(0, sarif.ExitCode);
        var sarifJson = JsonNode.Parse(File.ReadAllText(Path.Combine(repository.Path, "reports", "audit.sarif")))?.AsObject();
        Assert.NotNull(sarifJson);
        Assert.Equal("2.1.0", sarifJson["version"]?.GetValue<string>());
        Assert.Equal("ACKITOPT014", sarifJson["runs"]?[0]?["results"]?[0]?["ruleId"]?.GetValue<string>());

        var html = RunCli(repository.Path, ["optimize", "--format", "html", "--output", "reports/audit.html"]);
        Assert.Equal(0, html.ExitCode);
        var htmlText = File.ReadAllText(Path.Combine(repository.Path, "reports", "audit.html"));
        Assert.Contains("ACKit Optimize instruction audit", htmlText, StringComparison.Ordinal);
        Assert.DoesNotContain("http://", htmlText, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("https://", htmlText, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<script", htmlText, StringComparison.OrdinalIgnoreCase);

        var json = RunCli(repository.Path, ["optimize", "--format", "json", "--output", "reports/audit.json"]);
        Assert.Equal(0, json.ExitCode);
        Assert.Contains("created", json.Output, StringComparison.OrdinalIgnoreCase);
        var jsonReport = JsonNode.Parse(File.ReadAllText(Path.Combine(repository.Path, "reports", "audit.json")))?.AsObject();
        Assert.NotNull(jsonReport);
        Assert.Equal("Created", jsonReport["output"]?["status"]?.GetValue<string>());
        Assert.Equal("optimize", jsonReport["command"]?.GetValue<string>());

        Assert.Equal(sourceBefore, File.ReadAllText(sourcePath));
    }

    [Fact]
    public void InvalidFormatsAndPathsFailWithoutWriting()
    {
        using var repository = CreateConflictRepository();

        var missingOutput = RunCli(repository.Path, ["optimize", "--format", "markdown"]);
        Assert.Equal(1, missingOutput.ExitCode);
        Assert.Contains("require --output", missingOutput.Error, StringComparison.OrdinalIgnoreCase);

        var invalidFormat = RunCli(repository.Path, ["optimize", "--format", "xml"]);
        Assert.Equal(1, invalidFormat.ExitCode);
        Assert.Contains("must be console", invalidFormat.Error, StringComparison.OrdinalIgnoreCase);

        var emptyFormat = RunCli(repository.Path, ["optimize", "--format="]);
        Assert.Equal(1, emptyFormat.ExitCode);
        Assert.Contains("must be console", emptyFormat.Error, StringComparison.OrdinalIgnoreCase);

        var emptyOutput = RunCli(repository.Path, ["optimize", "--format", "json", "--output="]);
        Assert.Equal(1, emptyOutput.ExitCode);
        Assert.Equal("InvalidOutput", JsonNode.Parse(emptyOutput.Output)?["error"]?["code"]?.GetValue<string>());

        var conflict = RunCli(repository.Path, ["optimize", "--json", "--format", "sarif", "--output", "report.sarif"]);
        Assert.Equal(1, conflict.ExitCode);
        Assert.Equal("ConflictingFormat", JsonNode.Parse(conflict.Output)?["error"]?["code"]?.GetValue<string>());

        var wrongExtension = RunCli(repository.Path, ["optimize", "--format", "html", "--output", "report.txt"]);
        Assert.Equal(1, wrongExtension.ExitCode);
        Assert.Contains("must end with .html", wrongExtension.Error, StringComparison.OrdinalIgnoreCase);

        var outside = RunCli(repository.Path, ["optimize", "--format", "markdown", "--output", "../outside.md"]);
        Assert.Equal(1, outside.ExitCode);
        Assert.Contains("inside the repository", outside.Error, StringComparison.OrdinalIgnoreCase);
        Assert.False(File.Exists(Path.GetFullPath(Path.Combine(repository.Path, "..", "outside.md"))));

        var unwritable = RunCli(repository.Path, ["optimize", "--format", "json", "--output", "AGENTS.md/report.json"]);
        Assert.Equal(1, unwritable.ExitCode);
        Assert.Equal("OutputWriteFailed", JsonNode.Parse(unwritable.Output)?["error"]?["code"]?.GetValue<string>());
        Assert.DoesNotContain(repository.Path, unwritable.Output, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ExplicitProposalIsReviewOnlyReportedInJsonAndNeverOverwritten()
    {
        using var repository = TempRepository.Create();
        repository.Write(
            "AGENTS.md",
            "# Root rules\n\n- Run `dotnet test Demo.sln` before every commit.\n- Run `dotnet test Demo.sln` before every commit.\n- Never deploy to production without explicit approval.\n");
        repository.Write(
            "CLAUDE.md",
            "# Claude rules\n\n- Always deploy to production without confirmation.\n");
        repository.Write("Demo.sln", "Microsoft Visual Studio Solution File, Format Version 12.00\n");
        var agentsPath = Path.Combine(repository.Path, "AGENTS.md");
        var claudePath = Path.Combine(repository.Path, "CLAUDE.md");
        var agentsBefore = File.ReadAllBytes(agentsPath);
        var claudeBefore = File.ReadAllBytes(claudePath);

        var generated = RunCli(
            repository.Path,
            ["optimize", "--json", "--proposal", "review/optimized-instructions.md"]);
        var json = JsonNode.Parse(generated.Output)?.AsObject()
            ?? throw new InvalidOperationException("Optimize proposal JSON was not an object.");
        var proposalPath = Path.Combine(repository.Path, "review", "optimized-instructions.md");

        Assert.Equal(0, generated.ExitCode);
        Assert.Equal("Created", json["proposal"]?["output"]?["status"]?.GetValue<string>());
        Assert.True(json["proposal"]?["metrics"]?["saved"]?["characters"]?.GetValue<int>() > 0);
        Assert.Equal(1, json["proposal"]?["consolidationCount"]?.GetValue<int>());
        Assert.True(json["proposal"]?["unresolvedDecisionCount"]?.GetValue<int>() > 0);
        Assert.True(File.Exists(proposalPath));
        Assert.Contains("REVIEW ONLY / DRY RUN", File.ReadAllText(proposalPath), StringComparison.Ordinal);
        Assert.Equal(agentsBefore, File.ReadAllBytes(agentsPath));
        Assert.Equal(claudeBefore, File.ReadAllBytes(claudePath));

        File.WriteAllText(proposalPath, "reviewed sentinel\n");
        var skipped = RunCli(
            repository.Path,
            ["optimize", "--proposal", "review/optimized-instructions.md", "--lang", "tr"]);
        Assert.Equal(0, skipped.ExitCode);
        Assert.Contains("atlandı", skipped.Output, StringComparison.Ordinal);
        Assert.Equal("reviewed sentinel\n", File.ReadAllText(proposalPath));
        Assert.Equal(agentsBefore, File.ReadAllBytes(agentsPath));
        Assert.Equal(claudeBefore, File.ReadAllBytes(claudePath));
    }

    [Fact]
    public void InvalidProposalPathsFailBeforeWriting()
    {
        using var repository = CreateConflictRepository();

        var missing = RunCli(repository.Path, ["optimize", "--proposal="]);
        Assert.Equal(1, missing.ExitCode);
        Assert.Contains("--proposal requires", missing.Error, StringComparison.OrdinalIgnoreCase);

        var wrongExtension = RunCli(repository.Path, ["optimize", "--proposal", "review/proposal.txt"]);
        Assert.Equal(1, wrongExtension.ExitCode);
        Assert.Contains(".md or .markdown", wrongExtension.Error, StringComparison.OrdinalIgnoreCase);

        var outside = RunCli(repository.Path, ["optimize", "--json", "--proposal", "../outside.md"]);
        Assert.Equal(1, outside.ExitCode);
        Assert.Equal("InvalidProposal", JsonNode.Parse(outside.Output)?["error"]?["code"]?.GetValue<string>());

        var instructionSource = RunCli(repository.Path, ["optimize", "--proposal", "AGENTS.md"]);
        Assert.Equal(1, instructionSource.ExitCode);

        var sameOutput = RunCli(
            repository.Path,
            ["optimize", "--format", "markdown", "--output", "review/report.md", "--proposal", "review/report.md"]);
        Assert.Equal(1, sameOutput.ExitCode);
        Assert.False(Directory.Exists(Path.Combine(repository.Path, "review")));
    }

    [Fact]
    public void HelpPublishesTheOptimizeEntryPoint()
    {
        using var repository = TempRepository.Create();

        var help = RunCli(repository.Path, ["--help"]);

        Assert.Equal(0, help.ExitCode);
        Assert.Contains("ackit optimize", help.Output, StringComparison.Ordinal);
        Assert.Contains("console|json|markdown|sarif|html", help.Output, StringComparison.Ordinal);
        Assert.Contains("--proposal <repo-relative.md>", help.Output, StringComparison.Ordinal);
    }

    private static TempRepository CreateConflictRepository()
    {
        var repository = TempRepository.Create();
        repository.Write(
            "AGENTS.md",
            "# Root rules\n\n- Run `dotnet test Demo.sln` before every commit.\n- Never run `dotnet test Demo.sln`.\n- Make it good.\n- Read `docs/missing.md` before implementation.\n- Never deploy to production without explicit approval.\n");
        repository.Write(
            "CLAUDE.md",
            "# Claude rules\n\n- Always deploy to production without confirmation.\n");
        repository.Write("Demo.sln", "Microsoft Visual Studio Solution File, Format Version 12.00\n");
        repository.Write("src/component.txt", "fixture\n");
        return repository;
    }

    private static JsonObject ParseAndNormalize(string output)
    {
        var json = JsonNode.Parse(output)?.AsObject()
            ?? throw new InvalidOperationException("CLI output was not a JSON object.");
        json.Remove("generatedAtUtc");
        return json;
    }

    private static (int ExitCode, string Output, string Error) RunCli(string workingDirectory, string[] args)
    {
        var originalDirectory = Directory.GetCurrentDirectory();
        var originalOut = Console.Out;
        var originalError = Console.Error;
        using var output = new StringWriter();
        using var error = new StringWriter();

        try
        {
            Directory.SetCurrentDirectory(workingDirectory);
            Console.SetOut(output);
            Console.SetError(error);
            var exitCode = AgentContextKit.Cli.Program.Main(args);
            return (exitCode, output.ToString(), error.ToString());
        }
        finally
        {
            Console.SetOut(originalOut);
            Console.SetError(originalError);
            Directory.SetCurrentDirectory(originalDirectory);
        }
    }
}
