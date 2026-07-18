using AgentContextKit.Core;
using System.Text.Json.Nodes;

namespace AgentContextKit.Tests;

public sealed class InstructionAuditReportWriterTests
{
    [Fact]
    public void JsonReportContainsCompleteSanitizedReviewContract()
    {
        var audit = AuditFixture();
        var writer = new InstructionAuditReportWriter(new PhysicalFileSystem());
        var context = new InstructionAuditReportContext(
            "1.0.0-test",
            new DateTimeOffset(2026, 7, 18, 12, 0, 0, TimeSpan.Zero),
            "synthetic-demo",
            CiMode: false,
            ExitCode: 0);

        var content = writer.RenderJson(audit, context, InstructionAuditOutputInfo.StandardOutput);
        var json = JsonNode.Parse(content)?.AsObject()
            ?? throw new InvalidOperationException("Optimize JSON report was not an object.");

        Assert.Equal(2, json["schemaVersion"]?.GetValue<int>());
        Assert.Equal("optimize", json["command"]?.GetValue<string>());
        Assert.Equal("StandardOutput", json["output"]?["status"]?.GetValue<string>());
        Assert.Equal(audit.Sources.Count, json["auditSummary"]?["sourceCount"]?.GetValue<int>());
        Assert.Equal(audit.Findings.Count, json["auditSummary"]?["findingCount"]?.GetValue<int>());
        Assert.Equal(audit.Findings.Count, json["instructionFindings"]?.AsArray().Count);
        Assert.Equal(audit.Scopes.Count, json["scopes"]?.AsArray().Count);
        Assert.Equal(audit.ScopedOverrides.Count, json["scopedOverrides"]?.AsArray().Count);
        Assert.Null(json["repositoryPath"]);

        var finding = json["instructionFindings"]?[0]?.AsObject();
        Assert.NotNull(finding);
        Assert.Matches("^ACKITOPT[0-9]{3}$", finding["ruleId"]?.GetValue<string>() ?? "");
        Assert.Matches("^[a-f0-9]{64}$", finding["fingerprint"]?.GetValue<string>() ?? "");
        Assert.True(finding["startLine"]?.GetValue<int>() >= 1);
        Assert.False(string.IsNullOrWhiteSpace(finding["evidence"]?.GetValue<string>()));
        Assert.False(string.IsNullOrWhiteSpace(finding["remediation"]?.GetValue<string>()));
    }

    [Fact]
    public void ReportsDoNotExposeRawSecretLikeInstructionTextOrAbsoluteRoot()
    {
        using var repository = TempRepository.Create();
        var rawValue = TestData.OpenAiProjectKey();
        repository.Write("AGENTS.md", $"# Rules\n\n- Always publish the package with credential {rawValue}.\n");
        var audit = new InstructionAuditor(new PhysicalFileSystem()).Audit(
            repository.Path,
            cancellationToken: TestContext.Current.CancellationToken);
        var writer = new InstructionAuditReportWriter(new PhysicalFileSystem());
        var context = new InstructionAuditReportContext(
            "1.0.0-test",
            DateTimeOffset.UnixEpoch,
            "demo",
            CiMode: false,
            ExitCode: 0);

        var reports = new[]
        {
            writer.RenderJson(audit, context, InstructionAuditOutputInfo.StandardOutput),
            writer.RenderMarkdown(audit, "demo<script>alert(1)</script>"),
            writer.RenderSarif(audit, "1.0.0-test"),
            writer.RenderHtml(audit, "demo<script>alert(1)</script>")
        };

        Assert.All(reports, report =>
        {
            Assert.DoesNotContain(rawValue, report, StringComparison.Ordinal);
            Assert.DoesNotContain(repository.Path, report, StringComparison.OrdinalIgnoreCase);
        });
        Assert.DoesNotContain("<script>alert(1)</script>", reports[3], StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<script>alert(1)</script>", reports[1], StringComparison.OrdinalIgnoreCase);
        Assert.Contains("demo&lt;script&gt;alert(1)&lt;/script&gt;", reports[1], StringComparison.Ordinal);
        Assert.Contains("demo&lt;script&gt;alert(1)&lt;/script&gt;", reports[3], StringComparison.Ordinal);
    }

    [Fact]
    public void MarkdownSarifAndHtmlAreDeterministicParseableAndOffline()
    {
        var audit = AuditFixture();
        var writer = new InstructionAuditReportWriter(new PhysicalFileSystem());

        var markdown = writer.RenderMarkdown(audit, "demo");
        Assert.Equal(markdown, writer.RenderMarkdown(audit, "demo"));
        Assert.Contains("ACKITOPT014", markdown, StringComparison.Ordinal);
        Assert.Contains("Review boundary", markdown, StringComparison.Ordinal);
        Assert.Contains("estimated tokens", markdown, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Resolved scopes", markdown, StringComparison.Ordinal);
        Assert.Contains("Applicability", markdown, StringComparison.Ordinal);

        var sarif = writer.RenderSarif(audit, "1.0.0-test");
        Assert.Equal(sarif, writer.RenderSarif(audit, "1.0.0-test"));
        var sarifJson = JsonNode.Parse(sarif)?.AsObject()
            ?? throw new InvalidOperationException("Optimize SARIF was not an object.");
        Assert.Equal("2.1.0", sarifJson["version"]?.GetValue<string>());
        Assert.Equal("AgentContextKit Optimize", sarifJson["runs"]?[0]?["tool"]?["driver"]?["name"]?.GetValue<string>());
        Assert.Equal(15, sarifJson["runs"]?[0]?["tool"]?["driver"]?["rules"]?.AsArray().Count);
        var firstResult = sarifJson["runs"]?[0]?["results"]?[0];
        Assert.NotNull(firstResult);
        Assert.True(firstResult["locations"]?[0]?["physicalLocation"]?["region"]?["startLine"]?.GetValue<int>() >= 1);
        var uri = firstResult["locations"]?[0]?["physicalLocation"]?["artifactLocation"]?["uri"]?.GetValue<string>() ?? "";
        Assert.DoesNotContain('\\', uri);
        Assert.DoesNotContain(':', uri);

        var html = writer.RenderHtml(audit, "demo");
        Assert.Equal(html, writer.RenderHtml(audit, "demo"));
        Assert.Contains("<!doctype html>", html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ACKITOPT014", html, StringComparison.Ordinal);
        Assert.Contains("Context estimate", html, StringComparison.Ordinal);
        Assert.Contains("Exact duplicated", html, StringComparison.Ordinal);
        Assert.Contains("Resolved scopes", html, StringComparison.Ordinal);
        Assert.Contains("Valid scoped overrides", html, StringComparison.Ordinal);
        Assert.Contains(audit.Metrics.EstimationMethod, html, StringComparison.Ordinal);
        Assert.DoesNotContain("http://", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("https://", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("<script", html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(" src=", html, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void GenerateRequiresSafeExtensionAndNeverOverwritesExistingReport()
    {
        using var repository = TempRepository.Create();
        repository.Write("AGENTS.md", "# Rules\n\n- Run tests.\n");
        var writer = new InstructionAuditReportWriter(new PhysicalFileSystem());
        var sourceBefore = File.ReadAllText(Path.Combine(repository.Path, "AGENTS.md"));

        var first = writer.Generate(
            repository.Path,
            "reports/optimize.md",
            InstructionAuditReportFormat.Markdown,
            "# First report\n");
        var reportPath = Path.Combine(repository.Path, "reports", "optimize.md");
        Assert.Equal(GeneratedFileStatus.Created, first.Status);
        Assert.Equal("# First report\n", File.ReadAllText(reportPath));

        var second = writer.Generate(
            repository.Path,
            "reports/optimize.md",
            InstructionAuditReportFormat.Markdown,
            "# Replacement\n");
        Assert.Equal(GeneratedFileStatus.SkippedExisting, second.Status);
        Assert.Equal("# First report\n", File.ReadAllText(reportPath));
        Assert.Equal(sourceBefore, File.ReadAllText(Path.Combine(repository.Path, "AGENTS.md")));

        Assert.Throws<InvalidOperationException>(() => writer.Generate(
            repository.Path,
            "../outside.md",
            InstructionAuditReportFormat.Markdown,
            "report"));
        Assert.Throws<InvalidOperationException>(() => writer.Generate(
            repository.Path,
            Path.GetFullPath(Path.Combine(repository.Path, "outside.md")),
            InstructionAuditReportFormat.Markdown,
            "report"));
        Assert.Throws<InvalidOperationException>(() => writer.Generate(
            repository.Path,
            "reports/wrong.txt",
            InstructionAuditReportFormat.Markdown,
            "report"));
    }

    private static InstructionAuditResult AuditFixture()
    {
        return new InstructionAuditor(new PhysicalFileSystem()).Audit(FixtureRoot());
    }

    private static string FixtureRoot()
    {
        return Path.Combine(LocateRepositoryRoot(), "tests", "fixtures", "optimize", "nested-scope");
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
}
