using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;

namespace AgentContextKit.Core;

public sealed class AgentInstructionGenerator : IAgentInstructionGenerator
{
    private readonly IFileSystem _fileSystem;
    private readonly ITemplateRenderer _templateRenderer;
    private readonly IClock _clock;

    public AgentInstructionGenerator(IFileSystem fileSystem, ITemplateRenderer templateRenderer, IClock clock)
    {
        _fileSystem = fileSystem;
        _templateRenderer = templateRenderer;
        _clock = clock;
    }

    public IReadOnlyList<GeneratedFileResult> Generate(string repositoryPath, AgentTarget target, LanguageCode language, ScanResult scanResult)
    {
        var values = BuildValues(repositoryPath, scanResult);
        var outputs = BuildOutputs(target);
        var results = new List<GeneratedFileResult>();

        foreach (var output in outputs)
        {
            var content = _templateRenderer.Render(output.TemplateId, language, values);
            results.Add(SafeWrite(repositoryPath, output.Path, content));
        }

        return results;
    }

    private GeneratedFileResult SafeWrite(string repositoryPath, string relativePath, string content)
    {
        var fullPath = Path.Combine(repositoryPath, relativePath.Replace('/', Path.DirectorySeparatorChar));
        if (_fileSystem.FileExists(fullPath))
        {
            return new GeneratedFileResult(relativePath, GeneratedFileStatus.SkippedExisting, "Existing file was not overwritten.");
        }

        _fileSystem.WriteAllText(fullPath, content.TrimEnd() + Environment.NewLine);
        return new GeneratedFileResult(relativePath, GeneratedFileStatus.Created, "File created.");
    }

    private IReadOnlyDictionary<string, string> BuildValues(string repositoryPath, ScanResult scanResult)
    {
        var projectName = new DirectoryInfo(repositoryPath).Name;
        var stackList = scanResult.Stacks.Count == 0
            ? "- Unknown"
            : string.Join(Environment.NewLine, scanResult.Stacks.Select(stack => $"- {stack.Name}: {stack.Signal}"));

        var visibleFiles = scanResult.Files.Take(120).Select(file => $"- {file}").ToList();
        if (scanResult.Files.Count > visibleFiles.Count)
        {
            visibleFiles.Add($"- ... {scanResult.Files.Count - visibleFiles.Count} more files");
        }

        return new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["ProjectName"] = projectName,
            ["RepositoryPath"] = repositoryPath,
            ["GeneratedAt"] = _clock.UtcNow.ToString("u", CultureInfo.InvariantCulture),
            ["StackList"] = stackList,
            ["FileList"] = visibleFiles.Count == 0 ? "- No files detected" : string.Join(Environment.NewLine, visibleFiles),
            ["HealthSummary"] = BuildHealthSummary(scanResult),
            ["RiskSummary"] = BuildRiskSummary(scanResult),
            ["RecommendedChecks"] = BuildRecommendedChecks(scanResult),
            ["SystemPrompt"] = BuildContinueSystemPrompt(scanResult)
        };
    }

    private static string BuildHealthSummary(ScanResult scanResult)
    {
        var lines = new[]
        {
            $"- README: {YesNo(scanResult.HasReadme)}",
            $"- LICENSE: {YesNo(scanResult.HasLicense)}",
            $"- SECURITY: {YesNo(scanResult.HasSecurityPolicy)}",
            $"- Tests: {YesNo(scanResult.HasTests)}",
            $"- CI: {YesNo(scanResult.HasCi)}",
            $"- Agent instructions: {YesNo(scanResult.HasAgentInstructions)}"
        };

        return string.Join(Environment.NewLine, lines);
    }

    private static string BuildRiskSummary(ScanResult scanResult)
    {
        if (scanResult.Findings.Count == 0)
        {
            return "- No risk findings";
        }

        return string.Join(Environment.NewLine, new[]
        {
            $"- Critical: {scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Critical)}",
            $"- High: {scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.High)}",
            $"- Medium: {scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Medium)}",
            $"- Low: {scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Low)}",
            $"- Info: {scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Info)}"
        });
    }

    private static string BuildContinueSystemPrompt(ScanResult scanResult)
    {
        return string.Join(Environment.NewLine, new[]
        {
            "You are an offline-first coding assistant. Prefer minimal, tested, secure changes.",
            $"Repository stacks: {scanResult.Stacks.Count}",
            $"Risk findings: {scanResult.Findings.Count} (Critical: {scanResult.Findings.Count(f => f.Severity == RiskSeverity.Critical)}, High: {scanResult.Findings.Count(f => f.Severity == RiskSeverity.High)})",
            "Run ackit scan, ackit doctor, and ackit redact-check before changes.",
            "Honor AGENTS.md and existing task files first."
        });
    }

    private static string BuildRecommendedChecks(ScanResult scanResult)
    {
        var checks = new List<string>
        {
            "- ackit scan",
            "- ackit doctor",
            "- ackit redact-check --profile public-release"
        };

        if (scanResult.Stacks.Any(stack => stack.Name.Contains(".NET", StringComparison.OrdinalIgnoreCase) ||
                                           stack.Name.Contains("ASP.NET", StringComparison.OrdinalIgnoreCase) ||
                                           stack.Name.Contains("Blazor", StringComparison.OrdinalIgnoreCase)))
        {
            checks.Insert(0, "- dotnet build");
            checks.Insert(1, "- dotnet test");
        }

        return string.Join(Environment.NewLine, checks);
    }

    private static string YesNo(bool value)
    {
        return value ? "yes" : "no";
    }

    private static IReadOnlyList<(string Path, string TemplateId)> BuildOutputs(AgentTarget target)
    {
        var outputs = new List<(string Path, string TemplateId)>();

        if (target is AgentTarget.Codex or AgentTarget.All)
        {
            outputs.Add(("AGENTS.md", "AGENTS"));
            outputs.Add((".codex/HANDOFF.md", "HANDOFF"));
            outputs.Add((".codex/CONTEXT_PACK.md", "CONTEXT_PACK"));
        }

        if (target is AgentTarget.Claude or AgentTarget.All)
        {
            outputs.Add(("CLAUDE.md", "CLAUDE"));
        }

        if (target is AgentTarget.Anthropic or AgentTarget.All)
        {
            outputs.Add(("ANTHROPIC.md", "ANTHROPIC"));
        }

        if (target is AgentTarget.Cursor or AgentTarget.All)
        {
            outputs.Add((".cursor/rules/project.mdc", "CURSOR"));
        }

        if (target is AgentTarget.Copilot or AgentTarget.All)
        {
            outputs.Add((".github/copilot-instructions.md", "COPILOT"));
        }

        if (target is AgentTarget.Continue or AgentTarget.All)
        {
            outputs.Add((".continue/config.json", "CONTINUE"));
        }

        if (target == AgentTarget.All)
        {
            outputs.Add(("docs/PROJECT_MAP.md", "PROJECT_MAP"));
            outputs.Add(("docs/AI_WORKFLOW.md", "AI_WORKFLOW"));
            outputs.Add(("docs/SECURITY_NOTES.md", "SECURITY_NOTES"));
            outputs.Add(("docs/DEVELOPMENT_STANDARD.md", "DEVELOPMENT_STANDARD"));
            outputs.Add(("docs/tasks/TASK-0001.md", "TASK"));
        }

        return outputs;
    }
}

public static class HookFileBuilder
{
    public static IReadOnlyList<HookFileSpec> Build(AgentTarget target, string shell)
    {
        return target switch
        {
            AgentTarget.Anthropic => BuildAnthropicHooks(shell),
            AgentTarget.Continue => BuildContinueHooks(),
            AgentTarget.All => BuildAllHooks(shell),
            _ => BuildGitHooks(shell)
        };
    }

    public static IReadOnlyList<HookFileSpec> BuildAnthropicHooks(string shell)
    {
        return
        [
            new(".anthropic/hooks/installed.txt", RenderHookTemplate("HOOK_ANTHROPIC_MARKER")),
            new(shell == "pwsh" ? ".anthropic/hooks/pre-commit-reminder.ps1" : ".anthropic/hooks/pre-commit-reminder.sh",
                RenderHookTemplate(shell == "pwsh" ? "HOOK_ANTHROPIC_PWSH" : "HOOK_ANTHROPIC_SH"))
        ];
    }

    public static IReadOnlyList<HookFileSpec> BuildContinueHooks()
    {
        return
        [
            new(".continue/hooks/installed.txt", RenderHookTemplate("HOOK_CONTINUE_MARKER")),
            new(".continue/hooks/hooks.json", RenderHookTemplate("HOOK_CONTINUE_JSON"))
        ];
    }

    private static IReadOnlyList<HookFileSpec> BuildAllHooks(string shell)
    {
        return BuildGitHooks(shell)
            .Concat(BuildAnthropicHooks(shell))
            .Concat(BuildContinueHooks())
            .ToArray();
    }

    private static IReadOnlyList<HookFileSpec> BuildGitHooks(string shell)
    {
        var content = RenderHookTemplate(shell == "pwsh" ? "HOOK_GIT_PWSH" : "HOOK_GIT_SH");
        return
        [
            new(".git/hooks/pre-commit", content),
            new(".git/hooks/pre-push", content)
        ];
    }

    private static string RenderHookTemplate(string templateId)
    {
        return TemplateCatalog.Get(templateId, LanguageCode.English).TrimEnd() + "\n";
    }
}

public sealed class HtmlReportGenerator : IHtmlReportGenerator
{
    private const string DefaultOutputPath = ".ackit/reports/scan-report.html";
    private readonly IFileSystem _fileSystem;
    private readonly IClock _clock;

    public HtmlReportGenerator(IFileSystem fileSystem, IClock clock)
    {
        _fileSystem = fileSystem;
        _clock = clock;
    }

    public GeneratedFileResult Generate(
        string repositoryPath,
        string? relativeOutputPath,
        LanguageCode language,
        ScanResult scanResult,
        BaselineEvaluation? baseline = null)
    {
        var outputPath = NormalizeOutputPath(repositoryPath, relativeOutputPath);
        var fullPath = Path.Combine(repositoryPath, outputPath.Replace('/', Path.DirectorySeparatorChar));

        if (_fileSystem.FileExists(fullPath))
        {
            return new GeneratedFileResult(outputPath, GeneratedFileStatus.SkippedExisting, "Existing report was not overwritten.");
        }

        var content = BuildHtml(repositoryPath, language, scanResult, baseline);
        _fileSystem.WriteAllText(fullPath, content);
        return new GeneratedFileResult(outputPath, GeneratedFileStatus.Created, "HTML report created.");
    }

    private static string NormalizeOutputPath(string repositoryPath, string? relativeOutputPath)
    {
        var outputPath = string.IsNullOrWhiteSpace(relativeOutputPath)
            ? DefaultOutputPath
            : relativeOutputPath.Trim().Replace('\\', '/');

        if (Path.IsPathRooted(outputPath))
        {
            throw new InvalidOperationException("Report output path must be repository-relative.");
        }

        var segments = outputPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0 || segments.Any(segment => segment is "." or ".."))
        {
            throw new InvalidOperationException("Report output path must stay inside the repository.");
        }

        if (!outputPath.EndsWith(".html", StringComparison.OrdinalIgnoreCase) &&
            !outputPath.EndsWith(".htm", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Report output path must end with .html or .htm.");
        }

        var repositoryFullPath = Path.GetFullPath(repositoryPath);
        var reportFullPath = Path.GetFullPath(Path.Combine(repositoryFullPath, outputPath.Replace('/', Path.DirectorySeparatorChar)));
        var repositoryPrefix = repositoryFullPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

        if (!reportFullPath.StartsWith(repositoryPrefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Report output path must stay inside the repository.");
        }

        return outputPath;
    }

    private string BuildHtml(
        string repositoryPath,
        LanguageCode language,
        ScanResult scanResult,
        BaselineEvaluation? baseline)
    {
        ValidateBaselineAlignment(scanResult, baseline);
        var generatedAt = _clock.UtcNow.ToString("u", CultureInfo.InvariantCulture);
        var projectName = new DirectoryInfo(repositoryPath).Name;
        var builder = new StringBuilder();

        builder.AppendLine("<!doctype html>");
        builder.AppendLine("<html lang=\"" + E(language.Value) + "\">");
        builder.AppendLine("<head>");
        builder.AppendLine("  <meta charset=\"utf-8\">");
        builder.AppendLine("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">");
        builder.AppendLine("  <title>" + E(projectName) + " - AgentContextKit Report</title>");
        builder.AppendLine("  <style>");
        builder.AppendLine("    :root{color-scheme:light;--ink:#18212f;--muted:#5d6b7d;--line:#d9e0e8;--panel:#f7f9fb;--accent:#2364aa;--ok:#20744a;--warn:#9b5d00;--critical:#a5282c;}");
        builder.AppendLine("    body{margin:0;font-family:Segoe UI,Arial,sans-serif;color:var(--ink);background:#fff;line-height:1.5;}");
        builder.AppendLine("    main{max-width:1120px;margin:0 auto;padding:32px 20px 48px;}");
        builder.AppendLine("    header{border-bottom:1px solid var(--line);padding-bottom:18px;margin-bottom:24px;}");
        builder.AppendLine("    h1{font-size:30px;margin:0 0 6px;} h2{font-size:20px;margin:28px 0 10px;} p{margin:0 0 10px;color:var(--muted);}");
        builder.AppendLine("    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:16px 0;}");
        builder.AppendLine("    .metric{border:1px solid var(--line);background:var(--panel);border-radius:8px;padding:12px;}");
        builder.AppendLine("    .metric strong{display:block;font-size:22px;color:var(--ink);} .metric span{color:var(--muted);font-size:13px;}");
        builder.AppendLine("    table{border-collapse:collapse;width:100%;font-size:14px;} th,td{border:1px solid var(--line);padding:8px;text-align:left;vertical-align:top;} th{background:var(--panel);}");
        builder.AppendLine("    ul{padding-left:20px;} code{background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:1px 4px;}");
        builder.AppendLine("    .severity-Critical{color:var(--critical);font-weight:700;} .severity-High{color:var(--warn);font-weight:700;} .ok,.baseline-existing{color:var(--ok);font-weight:700;} .baseline-new{color:var(--critical);font-weight:700;}");
        builder.AppendLine("  </style>");
        builder.AppendLine("</head>");
        builder.AppendLine("<body><main>");
        builder.AppendLine("<header>");
        builder.AppendLine("  <h1>" + E(Label(language, "AgentContextKit Report", "AgentContextKit Raporu")) + "</h1>");
        builder.AppendLine("  <p>" + E(projectName) + " | " + E(generatedAt) + "</p>");
        builder.AppendLine("  <p>" + E(scanResult.RepositoryPath) + "</p>");
        builder.AppendLine("</header>");

        AppendMetrics(builder, language, scanResult, baseline);
        AppendBaselineSummary(builder, language, baseline);
        AppendHealth(builder, language, scanResult);
        AppendStacks(builder, language, scanResult);
        AppendFindings(builder, language, scanResult, baseline);
        AppendFiles(builder, language, scanResult);

        builder.AppendLine("</main></body></html>");
        return builder.ToString();
    }

    private static void AppendMetrics(
        StringBuilder builder,
        LanguageCode language,
        ScanResult scanResult,
        BaselineEvaluation? baseline)
    {
        builder.AppendLine("<section class=\"grid\" aria-label=\"" + E(Label(language, "Summary", "Ozet")) + "\">");
        AppendMetric(builder, Label(language, "Files", "Dosyalar"), scanResult.Files.Count.ToString(CultureInfo.InvariantCulture));
        AppendMetric(builder, Label(language, "Stacks", "Stackler"), scanResult.Stacks.Count.ToString(CultureInfo.InvariantCulture));
        AppendMetric(builder, Label(language, "Findings", "Bulgular"), scanResult.Findings.Count.ToString(CultureInfo.InvariantCulture));
        AppendMetric(builder, Label(language, "Critical", "Kritik"), scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Critical).ToString(CultureInfo.InvariantCulture));
        if (baseline is not null)
        {
            AppendMetric(builder, Label(language, "Existing", "Mevcut"), baseline.Existing.Count.ToString(CultureInfo.InvariantCulture));
            AppendMetric(builder, Label(language, "New", "Yeni"), baseline.New.Count.ToString(CultureInfo.InvariantCulture));
        }
        builder.AppendLine("</section>");
    }

    private static void AppendBaselineSummary(StringBuilder builder, LanguageCode language, BaselineEvaluation? baseline)
    {
        if (baseline is null)
        {
            return;
        }

        builder.AppendLine("<section>");
        builder.AppendLine("<h2>" + E(Label(language, "Baseline Classification", "Baseline Siniflandirmasi")) + "</h2>");
        builder.AppendLine("<p>" + E(Label(language, "Baseline status records prior review; it does not suppress findings.", "Baseline durumu onceki incelemeyi kaydeder; bulgulari gizlemez.")) + "</p>");
        builder.AppendLine("</section>");
    }

    private static void AppendMetric(StringBuilder builder, string label, string value)
    {
        builder.AppendLine("<div class=\"metric\"><strong>" + E(value) + "</strong><span>" + E(label) + "</span></div>");
    }

    private static void AppendHealth(StringBuilder builder, LanguageCode language, ScanResult scanResult)
    {
        builder.AppendLine("<section>");
        builder.AppendLine("<h2>" + E(Label(language, "Repository Health", "Repository Sagligi")) + "</h2>");
        builder.AppendLine("<table><tbody>");
        AppendHealthRow(builder, "README", scanResult.HasReadme);
        AppendHealthRow(builder, "LICENSE", scanResult.HasLicense);
        AppendHealthRow(builder, "SECURITY", scanResult.HasSecurityPolicy);
        AppendHealthRow(builder, "Tests", scanResult.HasTests);
        AppendHealthRow(builder, "CI", scanResult.HasCi);
        AppendHealthRow(builder, "Agent instructions", scanResult.HasAgentInstructions);
        builder.AppendLine("</tbody></table>");
        builder.AppendLine("</section>");
    }

    private static void AppendHealthRow(StringBuilder builder, string name, bool value)
    {
        builder.AppendLine("<tr><th>" + E(name) + "</th><td class=\"" + (value ? "ok" : "") + "\">" + E(value ? "yes" : "no") + "</td></tr>");
    }

    private static void AppendStacks(StringBuilder builder, LanguageCode language, ScanResult scanResult)
    {
        builder.AppendLine("<section>");
        builder.AppendLine("<h2>" + E(Label(language, "Stacks", "Stackler")) + "</h2>");
        if (scanResult.Stacks.Count == 0)
        {
            builder.AppendLine("<p>Unknown</p>");
        }
        else
        {
            builder.AppendLine("<ul>");
            foreach (var stack in scanResult.Stacks)
            {
                builder.AppendLine("<li><strong>" + E(stack.Name) + "</strong>: " + E(stack.Signal) + "</li>");
            }

            builder.AppendLine("</ul>");
        }

        builder.AppendLine("</section>");
    }

    private static void AppendFindings(
        StringBuilder builder,
        LanguageCode language,
        ScanResult scanResult,
        BaselineEvaluation? baseline)
    {
        builder.AppendLine("<section>");
        builder.AppendLine("<h2>" + E(Label(language, "Risk Findings", "Risk Bulgulari")) + "</h2>");
        if (scanResult.Findings.Count == 0)
        {
            builder.AppendLine("<p class=\"ok\">" + E(Label(language, "No risk findings.", "Risk bulgusu yok.")) + "</p>");
        }
        else
        {
            var baselineHeader = baseline is null ? "" : "<th>Baseline</th>";
            builder.AppendLine("<table><thead><tr><th>Severity</th><th>Category</th><th>Path</th><th>Message</th>" + baselineHeader + "</tr></thead><tbody>");
            for (var index = 0; index < Math.Min(scanResult.Findings.Count, 100); index++)
            {
                var finding = scanResult.Findings[index];
                var baselineCell = baseline is null
                    ? ""
                    : "<td class=\"baseline-" + E(baseline.Findings[index].Status.ToString().ToLowerInvariant()) + "\">" + E(baseline.Findings[index].Status.ToString()) + "</td>";
                builder.AppendLine("<tr><td class=\"severity-" + E(finding.Severity.ToString()) + "\">" + E(finding.Severity.ToString()) + "</td><td>" + E(finding.Category.ToString()) + "</td><td><code>" + E(finding.Path) + "</code></td><td>" + E(finding.Message) + "</td>" + baselineCell + "</tr>");
            }

            builder.AppendLine("</tbody></table>");
        }

        builder.AppendLine("</section>");
    }

    private static void ValidateBaselineAlignment(ScanResult scanResult, BaselineEvaluation? baseline)
    {
        baseline?.ValidateAgainst(scanResult.Findings);
    }

    private static void AppendFiles(StringBuilder builder, LanguageCode language, ScanResult scanResult)
    {
        builder.AppendLine("<section>");
        builder.AppendLine("<h2>" + E(Label(language, "Files", "Dosyalar")) + "</h2>");
        builder.AppendLine("<ul>");
        foreach (var file in scanResult.Files.Take(150))
        {
            builder.AppendLine("<li><code>" + E(file) + "</code></li>");
        }

        if (scanResult.Files.Count > 150)
        {
            builder.AppendLine("<li>... " + E((scanResult.Files.Count - 150).ToString(CultureInfo.InvariantCulture)) + " more</li>");
        }

        builder.AppendLine("</ul>");
        builder.AppendLine("</section>");
    }

    private static string Label(LanguageCode language, string english, string turkish)
    {
        return language.Value == "tr" ? turkish : english;
    }

    private static string E(string value)
    {
        return WebUtility.HtmlEncode(value);
    }
}

public sealed class WebUiGenerator : IWebUiGenerator
{
    private const string DefaultOutputPath = ".ackit/webui/index.html";
    private static readonly ExpectedPreviewFile[] ContextPreviewFiles =
    [
        new("AGENTS.md", "Codex"),
        new("CLAUDE.md", "Claude"),
        new(".cursor/rules/project.mdc", "Cursor"),
        new(".github/copilot-instructions.md", "Copilot"),
        new(".codex/HANDOFF.md", "Codex"),
        new(".codex/CONTEXT_PACK.md", "Codex"),
        new("docs/PROJECT_MAP.md", "Documentation"),
        new("docs/AI_WORKFLOW.md", "Documentation"),
        new("docs/SECURITY_NOTES.md", "Documentation"),
        new("docs/DEVELOPMENT_STANDARD.md", "Documentation")
    ];

    private readonly IFileSystem _fileSystem;
    private readonly IClock _clock;

    public WebUiGenerator(IFileSystem fileSystem, IClock clock)
    {
        _fileSystem = fileSystem;
        _clock = clock;
    }

    public GeneratedFileResult Generate(
        string repositoryPath,
        string? relativeOutputPath,
        LanguageCode language,
        ScanResult scanResult,
        BaselineEvaluation? baseline = null)
    {
        var outputPath = NormalizeOutputPath(repositoryPath, relativeOutputPath);
        var fullPath = Path.Combine(repositoryPath, outputPath.Replace('/', Path.DirectorySeparatorChar));

        if (_fileSystem.FileExists(fullPath))
        {
            return new GeneratedFileResult(outputPath, GeneratedFileStatus.SkippedExisting, "Existing Web UI was not overwritten.");
        }

        var content = BuildHtml(repositoryPath, language, scanResult, baseline);
        _fileSystem.WriteAllText(fullPath, content);
        return new GeneratedFileResult(outputPath, GeneratedFileStatus.Created, "Web UI prototype created.");
    }

    private static string NormalizeOutputPath(string repositoryPath, string? relativeOutputPath)
    {
        var outputPath = string.IsNullOrWhiteSpace(relativeOutputPath)
            ? DefaultOutputPath
            : relativeOutputPath.Trim().Replace('\\', '/');

        if (Path.IsPathRooted(outputPath))
        {
            throw new InvalidOperationException("Web UI output path must be repository-relative.");
        }

        var segments = outputPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0 || segments.Any(segment => segment is "." or ".."))
        {
            throw new InvalidOperationException("Web UI output path must stay inside the repository.");
        }

        if (!outputPath.EndsWith(".html", StringComparison.OrdinalIgnoreCase) &&
            !outputPath.EndsWith(".htm", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Web UI output path must end with .html or .htm.");
        }

        var repositoryFullPath = Path.GetFullPath(repositoryPath);
        var outputFullPath = Path.GetFullPath(Path.Combine(repositoryFullPath, outputPath.Replace('/', Path.DirectorySeparatorChar)));
        var repositoryPrefix = repositoryFullPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

        if (!outputFullPath.StartsWith(repositoryPrefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Web UI output path must stay inside the repository.");
        }

        return outputPath;
    }

    private string BuildHtml(
        string repositoryPath,
        LanguageCode language,
        ScanResult scanResult,
        BaselineEvaluation? baseline)
    {
        ValidateBaselineAlignment(scanResult, baseline);
        var generatedAt = _clock.UtcNow.ToString("u", CultureInfo.InvariantCulture);
        var projectName = new DirectoryInfo(repositoryPath).Name;
        var taskFiles = scanResult.Files
            .Where(file => file.StartsWith("docs/tasks/TASK-", StringComparison.OrdinalIgnoreCase) &&
                           file.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(file => file, StringComparer.OrdinalIgnoreCase)
            .Take(12)
            .ToArray();

        var contextFiles = ContextPreviewFiles;
        var existingContextFileCount = contextFiles.Count(file => scanResult.Files.Contains(file.Path, StringComparer.OrdinalIgnoreCase));

        var builder = new StringBuilder();
        builder.AppendLine("<!doctype html>");
        builder.AppendLine("<html lang=\"" + E(language.Value) + "\">");
        builder.AppendLine("<head>");
        builder.AppendLine("  <meta charset=\"utf-8\">");
        builder.AppendLine("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">");
        builder.AppendLine("  <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'self'; style-src 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'none'\">");
        builder.AppendLine("  <meta name=\"robots\" content=\"noindex,nofollow\">");
        builder.AppendLine("  <link rel=\"icon\" href=\"data:,\">");
        builder.AppendLine("  <title>" + E(projectName) + " - AgentContextKit Web UI</title>");
        builder.AppendLine("  <style>");
        builder.AppendLine("    :root{color-scheme:light;--ink:#1d2633;--muted:#617086;--line:#d7e0ea;--panel:#f6f8fb;--panel2:#eef4f8;--accent:#1b6ca8;--ok:#1f7a4d;--warn:#a35f00;--bad:#b3262d;--info:#5c4d9b;}");
        builder.AppendLine("    *{box-sizing:border-box;} body{margin:0;font-family:Segoe UI,Arial,sans-serif;color:var(--ink);background:#fff;line-height:1.5;} a{color:var(--accent);text-decoration:none;} a:hover{text-decoration:underline;}");
        builder.AppendLine("    header{border-bottom:1px solid var(--line);background:var(--panel);padding:24px 20px;} main{max-width:1180px;margin:0 auto;padding:24px 20px 52px;} .top{max-width:1180px;margin:0 auto;}");
        builder.AppendLine("    h1{font-size:30px;margin:0 0 6px;} h2{font-size:20px;margin:28px 0 10px;} h3{font-size:16px;margin:0 0 6px;} p{margin:0 0 10px;color:var(--muted);} code{background:#fff;border:1px solid var(--line);border-radius:4px;padding:1px 4px;}");
        builder.AppendLine("    nav{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px;} nav a{border:1px solid var(--line);border-radius:8px;background:#fff;padding:7px 10px;font-size:14px;} nav a[aria-current=\"page\"]{border-color:var(--accent);font-weight:700;}");
        builder.AppendLine("    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:18px 0;} .metric{border:1px solid var(--line);background:#fff;border-radius:8px;padding:12px;min-height:82px;} .metric strong{display:block;font-size:24px;} .metric span{display:block;color:var(--muted);font-size:13px;}");
        builder.AppendLine("    .band{border-top:1px solid var(--line);padding-top:18px;} .split{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;} .tile{border:1px solid var(--line);border-radius:8px;background:var(--panel);padding:12px;}");
        builder.AppendLine("    table{border-collapse:collapse;width:100%;font-size:14px;} th,td{border:1px solid var(--line);padding:8px;text-align:left;vertical-align:top;} th{background:var(--panel2);} .tablewrap{overflow:auto;border:1px solid var(--line);border-radius:8px;} .tablewrap table{border:0;} .tablewrap th:first-child,.tablewrap td:first-child{border-left:0;} .tablewrap th:last-child,.tablewrap td:last-child{border-right:0;}");
        builder.AppendLine("    details{border:1px solid var(--line);border-radius:8px;background:#fff;margin:8px 0;} summary{cursor:pointer;padding:10px 12px;font-weight:600;} pre{white-space:pre-wrap;overflow:auto;margin:0;border-top:1px solid var(--line);background:#fbfcfe;padding:12px;font-size:13px;max-height:280px;}");
        builder.AppendLine("    .status{font-weight:700;} .ok,.baseline-existing{color:var(--ok);} .fail,.baseline-new{color:var(--bad);} .severity-Critical{color:var(--bad);font-weight:700;} .severity-High{color:var(--warn);font-weight:700;} .severity-Medium{color:var(--info);font-weight:700;} .baseline-existing,.baseline-new{font-weight:700;} .muted{color:var(--muted);} @media(max-width:700px){h1{font-size:24px;} main{padding:18px 14px 40px;} header{padding:20px 14px;} nav a{flex:1 1 150px;text-align:center;}}");
        builder.AppendLine("  </style>");
        builder.AppendLine("</head>");
        builder.AppendLine("<body data-no-network=\"true\">");
        builder.AppendLine("<header><div class=\"top\">");
        builder.AppendLine("  <h1>" + E(Label(language, "AgentContextKit Web UI", "AgentContextKit Web UI")) + "</h1>");
        builder.AppendLine("  <p>" + E(projectName) + " | " + E(generatedAt) + "</p>");
        builder.AppendLine("  <p><code>" + E(scanResult.RepositoryPath) + "</code></p>");
        builder.AppendLine("  <nav aria-label=\"" + E(Label(language, "Sections", "Bolumler")) + "\"><a href=\"#dashboard\" aria-current=\"page\">" + E(Label(language, "Dashboard", "Panel")) + "</a><a href=\"#health\">" + E(Label(language, "Health", "Saglik")) + "</a><a href=\"#findings\">" + E(Label(language, "Findings", "Bulgular")) + "</a><a href=\"#context\">" + E(Label(language, "Context Files", "Context Dosyalari")) + "</a><a href=\"#tasks\">" + E(Label(language, "Tasks", "Tasklar")) + "</a></nav>");
        builder.AppendLine("</div></header>");
        builder.AppendLine("<main>");

        AppendDashboard(builder, language, scanResult, taskFiles.Length, existingContextFileCount, baseline);
        AppendHealthAndStacks(builder, language, scanResult);
        AppendFindings(builder, language, scanResult, baseline);
        AppendGeneratedPreviewSection(builder, repositoryPath, language, scanResult, contextFiles);
        AppendTaskPreviewSection(builder, repositoryPath, language, taskFiles);

        builder.AppendLine("</main>");
        builder.AppendLine("</body></html>");
        return builder.ToString();
    }

    private static void AppendDashboard(
        StringBuilder builder,
        LanguageCode language,
        ScanResult scanResult,
        int taskCount,
        int contextCount,
        BaselineEvaluation? baseline)
    {
        var readinessScore = CalculateReadinessScore(scanResult);
        var reviewStatus = GetReviewStatus(language, scanResult);

        builder.AppendLine("<section id=\"dashboard\" class=\"band\">");
        builder.AppendLine("<h2>" + E(Label(language, "Scan Result Dashboard", "Tarama Sonucu Paneli")) + "</h2>");
        builder.AppendLine("<div class=\"grid\">");
        AppendMetric(builder, Label(language, "Readiness Score", "Hazirlik Skoru"), readinessScore.ToString(CultureInfo.InvariantCulture) + "%");
        AppendMetric(builder, Label(language, "Review Status", "Inceleme Durumu"), reviewStatus);
        AppendMetric(builder, Label(language, "Files", "Dosyalar"), scanResult.Files.Count);
        AppendMetric(builder, Label(language, "Stacks", "Stackler"), scanResult.Stacks.Count);
        AppendMetric(builder, Label(language, "Findings", "Bulgular"), scanResult.Findings.Count);
        AppendMetric(builder, Label(language, "Critical", "Kritik"), scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Critical));
        AppendMetric(builder, Label(language, "Task files", "Task dosyalari"), taskCount);
        AppendMetric(builder, Label(language, "Context files", "Context dosyalari"), contextCount);
        if (baseline is not null)
        {
            AppendMetric(builder, Label(language, "Existing findings", "Mevcut bulgular"), baseline.Existing.Count);
            AppendMetric(builder, Label(language, "New findings", "Yeni bulgular"), baseline.New.Count);
        }
        builder.AppendLine("</div>");
        builder.AppendLine("<div class=\"split\">");
        AppendSeverityBreakdown(builder, language, scanResult);
        AppendRecommendedChecks(builder, language, scanResult);
        builder.AppendLine("</div>");
        builder.AppendLine("</section>");
    }

    private static void AppendMetric(StringBuilder builder, string label, int value)
    {
        AppendMetric(builder, label, value.ToString(CultureInfo.InvariantCulture));
    }

    private static void AppendMetric(StringBuilder builder, string label, string value)
    {
        builder.AppendLine("<div class=\"metric\"><strong>" + E(value) + "</strong><span>" + E(label) + "</span></div>");
    }

    private static int CalculateReadinessScore(ScanResult scanResult)
    {
        var checks = new[]
        {
            scanResult.HasReadme,
            scanResult.HasLicense,
            scanResult.HasSecurityPolicy,
            scanResult.HasContributing,
            scanResult.HasCodeOfConduct,
            scanResult.HasChangelog,
            scanResult.HasTests,
            scanResult.HasCi,
            scanResult.HasAgentInstructions,
            !scanResult.Findings.Any(finding => finding.Severity is RiskSeverity.High or RiskSeverity.Critical)
        };

        var passed = checks.Count(check => check);
        return (int)Math.Round((double)passed / checks.Length * 100, MidpointRounding.AwayFromZero);
    }

    private static string GetReviewStatus(LanguageCode language, ScanResult scanResult)
    {
        if (scanResult.Findings.Any(finding => finding.Severity == RiskSeverity.Critical))
        {
            return Label(language, "Blocked", "Bloke");
        }

        if (scanResult.Findings.Any(finding => finding.Severity == RiskSeverity.High))
        {
            return Label(language, "Needs review", "Inceleme gerekli");
        }

        if (scanResult.Findings.Count > 0)
        {
            return Label(language, "Review recommended", "Inceleme onerilir");
        }

        return Label(language, "Ready for local review", "Lokal incelemeye hazir");
    }

    private static void AppendSeverityBreakdown(StringBuilder builder, LanguageCode language, ScanResult scanResult)
    {
        builder.AppendLine("<div class=\"tile\"><h3>" + E(Label(language, "Risk Severity Breakdown", "Risk Seviye Kirilimi")) + "</h3>");
        builder.AppendLine("<table><tbody>");
        AppendSeverityRow(builder, RiskSeverity.Critical, scanResult);
        AppendSeverityRow(builder, RiskSeverity.High, scanResult);
        AppendSeverityRow(builder, RiskSeverity.Medium, scanResult);
        AppendSeverityRow(builder, RiskSeverity.Low, scanResult);
        AppendSeverityRow(builder, RiskSeverity.Info, scanResult);
        builder.AppendLine("</tbody></table></div>");
    }

    private static void AppendSeverityRow(StringBuilder builder, RiskSeverity severity, ScanResult scanResult)
    {
        var severityName = severity.ToString();
        var count = scanResult.Findings.Count(finding => finding.Severity == severity);
        builder.AppendLine("<tr><th class=\"severity-" + E(severityName) + "\">" + E(severityName) + "</th><td>" + E(count.ToString(CultureInfo.InvariantCulture)) + "</td></tr>");
    }

    private static void AppendRecommendedChecks(StringBuilder builder, LanguageCode language, ScanResult scanResult)
    {
        builder.AppendLine("<div class=\"tile\"><h3>" + E(Label(language, "Recommended Checks", "Onerilen Kontroller")) + "</h3>");
        builder.AppendLine("<ul>");
        foreach (var check in BuildRecommendedChecks(scanResult))
        {
            builder.AppendLine("<li><code>" + E(check) + "</code></li>");
        }

        builder.AppendLine("</ul></div>");
    }

    private static IReadOnlyList<string> BuildRecommendedChecks(ScanResult scanResult)
    {
        var checks = new List<string>();

        if (scanResult.Stacks.Any(stack => stack.Name.Contains(".NET", StringComparison.OrdinalIgnoreCase) ||
                                           stack.Name.Contains("ASP.NET", StringComparison.OrdinalIgnoreCase) ||
                                           stack.Name.Contains("Blazor", StringComparison.OrdinalIgnoreCase)))
        {
            checks.Add("dotnet build AgentContextKit.sln -c Release --no-restore");
            checks.Add("dotnet test AgentContextKit.sln -c Release --no-build");
        }

        checks.Add("ackit scan --ci");
        checks.Add("ackit redact-check --profile public-release");
        checks.Add("ackit report --output .ackit/reports/current.html");
        checks.Add("ackit webui --output .ackit/webui/current.html");

        return checks;
    }

    private static void AppendHealthAndStacks(StringBuilder builder, LanguageCode language, ScanResult scanResult)
    {
        builder.AppendLine("<section id=\"health\" class=\"band\">");
        builder.AppendLine("<h2>" + E(Label(language, "Repository Health", "Repository Sagligi")) + "</h2>");
        builder.AppendLine("<div class=\"split\">");
        builder.AppendLine("<div class=\"tile\"><h3>" + E(Label(language, "Health Checks", "Saglik Kontrolleri")) + "</h3><table><tbody>");
        AppendHealthRow(builder, "README", scanResult.HasReadme);
        AppendHealthRow(builder, "LICENSE", scanResult.HasLicense);
        AppendHealthRow(builder, "SECURITY", scanResult.HasSecurityPolicy);
        AppendHealthRow(builder, "CONTRIBUTING", scanResult.HasContributing);
        AppendHealthRow(builder, "CODE_OF_CONDUCT", scanResult.HasCodeOfConduct);
        AppendHealthRow(builder, "CHANGELOG", scanResult.HasChangelog);
        AppendHealthRow(builder, "Tests", scanResult.HasTests);
        AppendHealthRow(builder, "CI", scanResult.HasCi);
        AppendHealthRow(builder, "Docker", scanResult.HasDocker);
        AppendHealthRow(builder, "Agent instructions", scanResult.HasAgentInstructions);
        builder.AppendLine("</tbody></table></div>");
        builder.AppendLine("<div class=\"tile\"><h3>" + E(Label(language, "Stack Signals", "Stack Sinyalleri")) + "</h3>");
        if (scanResult.Stacks.Count == 0)
        {
            builder.AppendLine("<p>" + E(Label(language, "No stack signals detected.", "Stack sinyali bulunmadi.")) + "</p>");
        }
        else
        {
            builder.AppendLine("<table><thead><tr><th>Name</th><th>Signal</th></tr></thead><tbody>");
            foreach (var stack in scanResult.Stacks)
            {
                builder.AppendLine("<tr><td>" + E(stack.Name) + "</td><td><code>" + E(stack.Signal) + "</code></td></tr>");
            }

            builder.AppendLine("</tbody></table>");
        }

        builder.AppendLine("</div></div>");
        builder.AppendLine("</section>");
    }

    private static void AppendHealthRow(StringBuilder builder, string name, bool value)
    {
        var className = value ? "ok" : "fail";
        builder.AppendLine("<tr><th>" + E(name) + "</th><td class=\"status " + className + "\">" + E(value ? "yes" : "no") + "</td></tr>");
    }

    private static void AppendFindings(
        StringBuilder builder,
        LanguageCode language,
        ScanResult scanResult,
        BaselineEvaluation? baseline)
    {
        builder.AppendLine("<section id=\"findings\" class=\"band\">");
        builder.AppendLine("<h2>" + E(Label(language, "Risk Finding Browser", "Risk Bulgusu Tarayici")) + "</h2>");
        if (scanResult.Findings.Count == 0)
        {
            builder.AppendLine("<p class=\"status ok\">" + E(Label(language, "No risk findings.", "Risk bulgusu yok.")) + "</p>");
            builder.AppendLine("<p class=\"muted\">" + E(Label(language, "Review Queue is empty. Finding ID and Recommended Action columns appear when findings exist.", "Inceleme kuyrugu bos. Finding ID ve Recommended Action kolonlari bulgu oldugunda gorunur.")) + "</p>");
        }
        else
        {
            var classifiedFindings = baseline?.Findings
                .OrderByDescending(finding => finding.Finding.Severity)
                .ThenBy(finding => finding.Finding.Category.ToString(), StringComparer.OrdinalIgnoreCase)
                .ThenBy(finding => finding.Finding.Path, StringComparer.OrdinalIgnoreCase)
                .Take(150)
                .ToArray();
            var findings = classifiedFindings?.Select(finding => finding.Finding).ToArray()
                ?? SortFindings(scanResult.Findings).Take(150).ToArray();
            builder.AppendLine("<p class=\"muted\">" + E(Label(language, "Review Queue: highest severity findings are listed first.", "Inceleme Kuyrugu: en yuksek seviye bulgular once listelenir.")) + "</p>");
            var baselineHeader = baseline is null ? "" : "<th>Baseline</th>";
            builder.AppendLine("<div class=\"tablewrap\"><table><thead><tr><th>Finding ID</th><th>Severity</th><th>Category</th><th>Path</th><th>Message</th><th>Match</th>" + baselineHeader + "<th>Recommended Action</th></tr></thead><tbody>");
            for (var index = 0; index < findings.Length; index++)
            {
                var finding = findings[index];
                var severity = finding.Severity.ToString();
                var findingId = "RF-" + (index + 1).ToString("000", CultureInfo.InvariantCulture);
                const string match = "-";
                var baselineCell = classifiedFindings is null
                    ? ""
                    : "<td class=\"baseline-" + E(classifiedFindings[index].Status.ToString().ToLowerInvariant()) + "\">" + E(classifiedFindings[index].Status.ToString()) + "</td>";
                builder.AppendLine("<tr><td><code>" + E(findingId) + "</code></td><td class=\"severity-" + E(severity) + "\">" + E(severity) + "</td><td>" + E(finding.Category.ToString()) + "</td><td><code>" + E(finding.Path) + "</code></td><td>" + E(finding.Message) + "</td><td><code>" + E(match) + "</code></td>" + baselineCell + "<td>" + E(GetRecommendedAction(language, finding.Severity)) + "</td></tr>");
            }

            builder.AppendLine("</tbody></table></div>");
            if (scanResult.Findings.Count > 150)
            {
                builder.AppendLine("<p class=\"muted\">" + E((scanResult.Findings.Count - 150).ToString(CultureInfo.InvariantCulture)) + " " + E(Label(language, "additional findings omitted.", "ek bulgu gosterilmedi.")) + "</p>");
            }
        }

        builder.AppendLine("</section>");
    }

    private static void ValidateBaselineAlignment(ScanResult scanResult, BaselineEvaluation? baseline)
    {
        baseline?.ValidateAgainst(scanResult.Findings);
    }

    private static IReadOnlyList<RiskFinding> SortFindings(IReadOnlyList<RiskFinding> findings)
    {
        return findings
            .OrderByDescending(finding => finding.Severity)
            .ThenBy(finding => finding.Category.ToString(), StringComparer.OrdinalIgnoreCase)
            .ThenBy(finding => finding.Path, StringComparer.OrdinalIgnoreCase)
            .ThenBy(finding => finding.Message, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string GetRecommendedAction(LanguageCode language, RiskSeverity severity)
    {
        return severity switch
        {
            RiskSeverity.Critical => Label(language, "Block release until reviewed.", "Incelenene kadar release'i bloke edin."),
            RiskSeverity.High => Label(language, "Review before CI or release.", "CI veya release oncesi inceleyin."),
            RiskSeverity.Medium => Label(language, "Review before public sharing.", "Public paylasim oncesi inceleyin."),
            RiskSeverity.Low => Label(language, "Review when practical.", "Uygun zamanda inceleyin."),
            _ => Label(language, "Informational review.", "Bilgilendirme amacli inceleme.")
        };
    }

    private void AppendGeneratedPreviewSection(StringBuilder builder, string repositoryPath, LanguageCode language, ScanResult scanResult, IReadOnlyList<ExpectedPreviewFile> files)
    {
        builder.AppendLine("<section id=\"context\" class=\"band\">");
        builder.AppendLine("<h2>" + E(Label(language, "Generated File Preview", "Uretilen Dosya Onizleme")) + "</h2>");
        builder.AppendLine("<p>" + E(Label(language, "Expected agent/context files with local status, category, size, and capped previews.", "Beklenen agent/context dosyalari; lokal durum, kategori, boyut ve sinirli onizleme.")) + "</p>");
        builder.AppendLine("<p class=\"muted\">" + E(Label(language, "Status values: Present, Missing.", "Durum degerleri: Mevcut, Eksik.")) + "</p>");
        builder.AppendLine("<div class=\"tablewrap\"><table><thead><tr><th>Category</th><th>Status</th><th>Size</th><th>Path</th></tr></thead><tbody>");
        foreach (var file in files)
        {
            var exists = scanResult.Files.Contains(file.Path, StringComparer.OrdinalIgnoreCase);
            var status = exists ? Label(language, "Present", "Mevcut") : Label(language, "Missing", "Eksik");
            var size = exists ? FormatBytes(ReadFileLength(repositoryPath, file.Path)) : "-";
            builder.AppendLine("<tr><td>" + E(file.Category) + "</td><td class=\"status " + (exists ? "ok" : "fail") + "\">" + E(status) + "</td><td>" + E(size) + "</td><td><code>" + E(file.Path) + "</code></td></tr>");
        }

        builder.AppendLine("</tbody></table></div>");
        foreach (var file in files)
        {
            var exists = scanResult.Files.Contains(file.Path, StringComparer.OrdinalIgnoreCase);
            var status = exists ? Label(language, "Present", "Mevcut") : Label(language, "Missing", "Eksik");
            builder.AppendLine("<details>");
            builder.AppendLine("<summary><code>" + E(file.Path) + "</code> - " + E(file.Category) + " - " + E(status) + "</summary>");
            builder.AppendLine("<pre>" + E(exists ? ReadPreview(repositoryPath, file.Path) : Label(language, "Missing file. Generate intentionally with ackit generate --target all.", "Eksik dosya. Bilerek uretmek icin ackit generate --target all kullanin.")) + "</pre>");
            builder.AppendLine("</details>");
        }

        builder.AppendLine("</section>");
    }

    private void AppendTaskPreviewSection(StringBuilder builder, string repositoryPath, LanguageCode language, IReadOnlyList<string> files)
    {
        builder.AppendLine("<section id=\"tasks\" class=\"band\">");
        builder.AppendLine("<h2>" + E(Label(language, "Task Preview", "Task Onizleme")) + "</h2>");
        builder.AppendLine("<p>" + E(Label(language, "Latest task files under docs/tasks with task ID, title, inferred status, size, and capped previews.", "docs/tasks altindaki son task dosyalari; task ID, baslik, cikarilan durum, boyut ve sinirli onizleme.")) + "</p>");
        if (files.Count == 0)
        {
            builder.AppendLine("<p class=\"muted\">" + E(Label(language, "No matching files detected.", "Eslesen dosya bulunmadi.")) + "</p>");
        }
        else
        {
            builder.AppendLine("<div class=\"tablewrap\"><table><thead><tr><th>Task ID</th><th>Title</th><th>Task Status</th><th>Size</th><th>Path</th></tr></thead><tbody>");
            foreach (var file in files)
            {
                var content = ReadFileText(repositoryPath, file);
                builder.AppendLine("<tr><td><code>" + E(GetTaskId(file)) + "</code></td><td>" + E(GetTaskTitle(file, content)) + "</td><td>" + E(GetTaskStatus(language, content)) + "</td><td>" + E(FormatBytes(ReadFileLength(repositoryPath, file))) + "</td><td><code>" + E(file) + "</code></td></tr>");
            }

            builder.AppendLine("</tbody></table></div>");
            foreach (var file in files)
            {
                builder.AppendLine("<details>");
                builder.AppendLine("<summary><code>" + E(file) + "</code></summary>");
                builder.AppendLine("<pre>" + E(BuildPreview(ReadFileText(repositoryPath, file))) + "</pre>");
                builder.AppendLine("</details>");
            }
        }

        builder.AppendLine("</section>");
    }

    private long ReadFileLength(string repositoryPath, string relativePath)
    {
        try
        {
            var fullPath = Path.Combine(repositoryPath, relativePath.Replace('/', Path.DirectorySeparatorChar));
            return _fileSystem.GetFileLength(fullPath);
        }
        catch (IOException)
        {
            return 0;
        }
        catch (UnauthorizedAccessException)
        {
            return 0;
        }
    }

    private static string FormatBytes(long bytes)
    {
        if (bytes < 1024)
        {
            return bytes.ToString(CultureInfo.InvariantCulture) + " B";
        }

        if (bytes < 1024 * 1024)
        {
            return (bytes / 1024d).ToString("0.0", CultureInfo.InvariantCulture) + " KB";
        }

        return (bytes / 1024d / 1024d).ToString("0.0", CultureInfo.InvariantCulture) + " MB";
    }

    private string ReadPreview(string repositoryPath, string relativePath)
    {
        try
        {
            return BuildPreview(ReadFileText(repositoryPath, relativePath));
        }
        catch (IOException)
        {
            return "(preview unavailable)";
        }
        catch (UnauthorizedAccessException)
        {
            return "(preview unavailable)";
        }
    }

    private string ReadFileText(string repositoryPath, string relativePath)
    {
        try
        {
            var fullPath = Path.Combine(repositoryPath, relativePath.Replace('/', Path.DirectorySeparatorChar));
            return _fileSystem.ReadAllText(fullPath).Replace("\r", "", StringComparison.Ordinal);
        }
        catch (IOException)
        {
            return "(preview unavailable)";
        }
        catch (UnauthorizedAccessException)
        {
            return "(preview unavailable)";
        }
    }

    private static string BuildPreview(string content)
    {
        var lines = content.Split('\n').Take(18).Select(TrimPreviewLine).ToArray();
        var preview = string.Join(Environment.NewLine, lines).TrimEnd();
        return string.IsNullOrWhiteSpace(preview) ? "(empty file)" : preview;
    }

    private static string GetTaskId(string relativePath)
    {
        var fileName = Path.GetFileName(relativePath);
        return fileName.Length >= 9 && fileName.StartsWith("TASK-", StringComparison.OrdinalIgnoreCase)
            ? fileName[..9].ToUpperInvariant()
            : "TASK-????";
    }

    private static string GetTaskTitle(string relativePath, string content)
    {
        var heading = content
            .Split('\n')
            .FirstOrDefault(line => line.StartsWith("# ", StringComparison.Ordinal));

        if (!string.IsNullOrWhiteSpace(heading))
        {
            var title = heading[2..].Trim();
            var separator = title.IndexOf(':', StringComparison.Ordinal);
            return separator >= 0 && separator + 1 < title.Length ? title[(separator + 1)..].Trim() : title;
        }

        return Path.GetFileNameWithoutExtension(relativePath);
    }

    private static string GetTaskStatus(LanguageCode language, string content)
    {
        const string completionNotesHeading = "## Completion notes";
        var headingIndex = content.IndexOf(completionNotesHeading, StringComparison.OrdinalIgnoreCase);
        if (headingIndex < 0)
        {
            return Label(language, "Open", "Acik");
        }

        var notes = content[(headingIndex + completionNotesHeading.Length)..];
        var firstNote = notes
            .Split('\n')
            .Select(line => line.Trim())
            .TakeWhile(line => !line.StartsWith("## ", StringComparison.Ordinal))
            .FirstOrDefault(line => line.Length > 0);

        if (string.IsNullOrWhiteSpace(firstNote))
        {
            return Label(language, "Open", "Acik");
        }

        return firstNote.Equals("Not implemented yet.", StringComparison.OrdinalIgnoreCase)
            ? Label(language, "Open", "Acik")
            : Label(language, "Completed", "Tamamlandi");
    }

    private static string TrimPreviewLine(string line)
    {
        return line.Length <= 180 ? line : line[..180] + "...";
    }

    private static string Label(LanguageCode language, string english, string turkish)
    {
        return language.Value == "tr" ? turkish : english;
    }

    private static string E(string value)
    {
        return WebUtility.HtmlEncode(value);
    }

    private sealed record ExpectedPreviewFile(string Path, string Category);
}

public sealed class PromptPackGenerator : IPromptPackGenerator
{
    private const string DefaultOutputPath = ".ackit/prompt-packs/prompt-pack.md";
    private static readonly ExpectedPromptPackFile[] ContextFiles =
    [
        new("AGENTS.md", "Codex"),
        new("CLAUDE.md", "Claude"),
        new(".cursor/rules/project.mdc", "Cursor"),
        new(".github/copilot-instructions.md", "Copilot"),
        new(".codex/HANDOFF.md", "Codex"),
        new(".codex/CONTEXT_PACK.md", "Codex"),
        new("docs/PROJECT_MAP.md", "Documentation"),
        new("docs/AI_WORKFLOW.md", "Documentation"),
        new("docs/SECURITY_NOTES.md", "Documentation"),
        new("docs/DEVELOPMENT_STANDARD.md", "Documentation")
    ];

    private readonly IFileSystem _fileSystem;
    private readonly IClock _clock;

    public PromptPackGenerator(IFileSystem fileSystem, IClock clock)
    {
        _fileSystem = fileSystem;
        _clock = clock;
    }

    public GeneratedFileResult Generate(string repositoryPath, string? relativeOutputPath, LanguageCode language, ScanResult scanResult)
    {
        var outputPath = NormalizeOutputPath(repositoryPath, relativeOutputPath);
        var fullPath = Path.Combine(repositoryPath, outputPath.Replace('/', Path.DirectorySeparatorChar));

        if (_fileSystem.FileExists(fullPath))
        {
            return new GeneratedFileResult(outputPath, GeneratedFileStatus.SkippedExisting, "Existing prompt pack was not overwritten.");
        }

        var content = BuildMarkdown(repositoryPath, language, scanResult);
        _fileSystem.WriteAllText(fullPath, content.TrimEnd() + Environment.NewLine);
        return new GeneratedFileResult(outputPath, GeneratedFileStatus.Created, "Dry-run prompt pack created.");
    }

    private static string NormalizeOutputPath(string repositoryPath, string? relativeOutputPath)
    {
        var outputPath = string.IsNullOrWhiteSpace(relativeOutputPath)
            ? DefaultOutputPath
            : relativeOutputPath.Trim().Replace('\\', '/');

        if (Path.IsPathRooted(outputPath))
        {
            throw new InvalidOperationException("Prompt pack output path must be repository-relative.");
        }

        var segments = outputPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0 || segments.Any(segment => segment is "." or ".."))
        {
            throw new InvalidOperationException("Prompt pack output path must stay inside the repository.");
        }

        if (!outputPath.EndsWith(".md", StringComparison.OrdinalIgnoreCase) &&
            !outputPath.EndsWith(".markdown", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Prompt pack output path must end with .md or .markdown.");
        }

        var repositoryFullPath = Path.GetFullPath(repositoryPath);
        var promptPackFullPath = Path.GetFullPath(Path.Combine(repositoryFullPath, outputPath.Replace('/', Path.DirectorySeparatorChar)));
        var repositoryPrefix = repositoryFullPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

        if (!promptPackFullPath.StartsWith(repositoryPrefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Prompt pack output path must stay inside the repository.");
        }

        return outputPath;
    }

    private string BuildMarkdown(string repositoryPath, LanguageCode language, ScanResult scanResult)
    {
        var projectName = new DirectoryInfo(repositoryPath).Name;
        var generatedAt = _clock.UtcNow.ToString("u", CultureInfo.InvariantCulture);
        var builder = new StringBuilder();

        builder.AppendLine("# " + Label(language, "AgentContextKit Dry-Run Prompt Pack", "AgentContextKit Dry-Run Prompt Paketi"));
        builder.AppendLine();
        builder.AppendLine("> " + Label(language, "Local review artifact only. No remote LLM provider call was made.", "Sadece lokal inceleme ciktisi. Remote LLM provider cagrisi yapilmadi."));
        builder.AppendLine();
        builder.AppendLine("## " + Label(language, "Repository", "Repository"));
        builder.AppendLine("- Project: " + projectName);
        builder.AppendLine("- Path: " + scanResult.RepositoryPath);
        builder.AppendLine("- Generated: " + generatedAt);
        builder.AppendLine("- Command intent: dry-run prompt context review");
        builder.AppendLine();

        AppendScanSummary(builder, language, scanResult);
        AppendStacks(builder, language, scanResult);
        AppendHealth(builder, language, scanResult);
        AppendContextFiles(builder, language, scanResult);
        AppendLatestTasks(builder, repositoryPath, language, scanResult);
        AppendSafetyNotes(builder, language);

        return builder.ToString();
    }

    private static void AppendScanSummary(StringBuilder builder, LanguageCode language, ScanResult scanResult)
    {
        builder.AppendLine("## " + Label(language, "Scan Summary", "Scan Ozeti"));
        builder.AppendLine("- Files: " + scanResult.Files.Count.ToString(CultureInfo.InvariantCulture));
        builder.AppendLine("- Stacks: " + scanResult.Stacks.Count.ToString(CultureInfo.InvariantCulture));
        builder.AppendLine("- Risk findings: " + scanResult.Findings.Count.ToString(CultureInfo.InvariantCulture));
        builder.AppendLine("- Critical: " + scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Critical).ToString(CultureInfo.InvariantCulture));
        builder.AppendLine("- High: " + scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.High).ToString(CultureInfo.InvariantCulture));
        builder.AppendLine("- Medium: " + scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Medium).ToString(CultureInfo.InvariantCulture));
        builder.AppendLine("- Low: " + scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Low).ToString(CultureInfo.InvariantCulture));
        builder.AppendLine("- Info: " + scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Info).ToString(CultureInfo.InvariantCulture));
        builder.AppendLine();
    }

    private static void AppendStacks(StringBuilder builder, LanguageCode language, ScanResult scanResult)
    {
        builder.AppendLine("## " + Label(language, "Stack Signals", "Stack Sinyalleri"));
        if (scanResult.Stacks.Count == 0)
        {
            builder.AppendLine("- Unknown");
        }
        else
        {
            foreach (var stack in scanResult.Stacks)
            {
                builder.AppendLine("- " + stack.Name + ": " + stack.Signal);
            }
        }

        builder.AppendLine();
    }

    private static void AppendHealth(StringBuilder builder, LanguageCode language, ScanResult scanResult)
    {
        builder.AppendLine("## " + Label(language, "Repository Health", "Repository Sagligi"));
        builder.AppendLine("| Check | Status |");
        builder.AppendLine("| --- | --- |");
        AppendHealthRow(builder, "README", scanResult.HasReadme);
        AppendHealthRow(builder, "LICENSE", scanResult.HasLicense);
        AppendHealthRow(builder, "SECURITY", scanResult.HasSecurityPolicy);
        AppendHealthRow(builder, "CONTRIBUTING", scanResult.HasContributing);
        AppendHealthRow(builder, "CODE_OF_CONDUCT", scanResult.HasCodeOfConduct);
        AppendHealthRow(builder, "CHANGELOG", scanResult.HasChangelog);
        AppendHealthRow(builder, "Tests", scanResult.HasTests);
        AppendHealthRow(builder, "CI", scanResult.HasCi);
        AppendHealthRow(builder, "Docker", scanResult.HasDocker);
        AppendHealthRow(builder, "Agent instructions", scanResult.HasAgentInstructions);
        builder.AppendLine();
    }

    private static void AppendHealthRow(StringBuilder builder, string name, bool value)
    {
        builder.AppendLine("| " + EscapeTable(name) + " | " + (value ? "yes" : "no") + " |");
    }

    private static void AppendContextFiles(StringBuilder builder, LanguageCode language, ScanResult scanResult)
    {
        builder.AppendLine("## " + Label(language, "Generated/Context File Status", "Uretilen/Context Dosya Durumu"));
        builder.AppendLine("| Category | Status | Path |");
        builder.AppendLine("| --- | --- | --- |");
        foreach (var file in ContextFiles)
        {
            var exists = scanResult.Files.Contains(file.Path, StringComparer.OrdinalIgnoreCase);
            builder.AppendLine("| " + EscapeTable(file.Category) + " | " + (exists ? "Present" : "Missing") + " | `" + EscapeTable(file.Path) + "` |");
        }

        builder.AppendLine();
    }

    private void AppendLatestTasks(StringBuilder builder, string repositoryPath, LanguageCode language, ScanResult scanResult)
    {
        var taskFiles = scanResult.Files
            .Where(file => file.StartsWith("docs/tasks/", StringComparison.OrdinalIgnoreCase) &&
                           file.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(file => file, StringComparer.OrdinalIgnoreCase)
            .Take(12)
            .ToArray();

        builder.AppendLine("## " + Label(language, "Latest Task Summary", "Son Task Ozeti"));
        if (taskFiles.Length == 0)
        {
            builder.AppendLine("- No task files detected.");
            builder.AppendLine();
            return;
        }

        builder.AppendLine("| Task ID | Status | Title | Path |");
        builder.AppendLine("| --- | --- | --- | --- |");
        foreach (var file in taskFiles)
        {
            var content = ReadFileText(repositoryPath, file);
            builder.AppendLine("| " + EscapeTable(GetTaskId(file)) + " | " + EscapeTable(GetTaskStatus(content)) + " | " + EscapeTable(GetTaskTitle(file, content)) + " | `" + EscapeTable(file) + "` |");
        }

        builder.AppendLine();
    }

    private static void AppendSafetyNotes(StringBuilder builder, LanguageCode language)
    {
        builder.AppendLine("## " + Label(language, "Dry-Run Safety Notes", "Dry-Run Guvenlik Notlari"));
        builder.AppendLine("- No remote LLM provider call was made.");
        builder.AppendLine("- No API key was read, stored, generated, or validated.");
        builder.AppendLine("- This file is not approval to export repository context.");
        builder.AppendLine("- Review `ackit scan --ci` and `ackit redact-check --profile public-release` before any future provider use.");
        builder.AppendLine("- Keep this prompt pack local unless the user explicitly approves export.");
        builder.AppendLine();
    }

    private string ReadFileText(string repositoryPath, string relativePath)
    {
        try
        {
            var fullPath = Path.Combine(repositoryPath, relativePath.Replace('/', Path.DirectorySeparatorChar));
            return _fileSystem.ReadAllText(fullPath).Replace("\r", "", StringComparison.Ordinal);
        }
        catch (IOException)
        {
            return string.Empty;
        }
        catch (UnauthorizedAccessException)
        {
            return string.Empty;
        }
    }

    private static string GetTaskId(string relativePath)
    {
        var fileName = Path.GetFileName(relativePath);
        return fileName.Length >= 9 && fileName.StartsWith("TASK-", StringComparison.OrdinalIgnoreCase)
            ? fileName[..9].ToUpperInvariant()
            : "TASK-????";
    }

    private static string GetTaskTitle(string relativePath, string content)
    {
        var heading = content
            .Split('\n')
            .FirstOrDefault(line => line.StartsWith("# ", StringComparison.Ordinal));

        if (!string.IsNullOrWhiteSpace(heading))
        {
            var title = heading[2..].Trim();
            var separator = title.IndexOf(':', StringComparison.Ordinal);
            return separator >= 0 && separator + 1 < title.Length ? title[(separator + 1)..].Trim() : title;
        }

        return Path.GetFileNameWithoutExtension(relativePath);
    }

    private static string GetTaskStatus(string content)
    {
        const string completionNotesHeading = "## Completion notes";
        var headingIndex = content.IndexOf(completionNotesHeading, StringComparison.OrdinalIgnoreCase);
        if (headingIndex < 0)
        {
            return "Open";
        }

        var notes = content[(headingIndex + completionNotesHeading.Length)..];
        var firstNote = notes
            .Split('\n')
            .Select(line => line.Trim())
            .TakeWhile(line => !line.StartsWith("## ", StringComparison.Ordinal))
            .FirstOrDefault(line => line.Length > 0);

        if (string.IsNullOrWhiteSpace(firstNote))
        {
            return "Open";
        }

        return firstNote.Equals("Not implemented yet.", StringComparison.OrdinalIgnoreCase)
            ? "Open"
            : "Completed";
    }

    private static string EscapeTable(string value)
    {
        return value.Replace("|", "\\|", StringComparison.Ordinal)
            .Replace("\r", " ", StringComparison.Ordinal)
            .Replace("\n", " ", StringComparison.Ordinal);
    }

    private static string Label(LanguageCode language, string english, string turkish)
    {
        return language.Value == "tr" ? turkish : english;
    }

    private sealed record ExpectedPromptPackFile(string Path, string Category);
}

public sealed class ContextExportManifestGenerator : IContextExportManifestGenerator
{
    private const string DefaultOutputPath = ".ackit/context-exports/context-export-manifest.json";
    private readonly IFileSystem _fileSystem;
    private readonly IClock _clock;

    public ContextExportManifestGenerator(IFileSystem fileSystem, IClock clock)
    {
        _fileSystem = fileSystem;
        _clock = clock;
    }

    public GeneratedFileResult Generate(string repositoryPath, ContextExportSpec spec, ScanResult scanResult)
    {
        var promptPackPath = NormalizeInputPath(repositoryPath, spec.PromptPackPath);
        var outputPath = NormalizeOutputPath(repositoryPath, spec.OutputPath);
        var promptPackFullPath = Path.Combine(repositoryPath, promptPackPath.Replace('/', Path.DirectorySeparatorChar));
        var outputFullPath = Path.Combine(repositoryPath, outputPath.Replace('/', Path.DirectorySeparatorChar));

        if (!_fileSystem.FileExists(promptPackFullPath))
        {
            throw new InvalidOperationException("Prompt pack file was not found.");
        }

        if (_fileSystem.FileExists(outputFullPath))
        {
            return new GeneratedFileResult(outputPath, GeneratedFileStatus.SkippedExisting, "Existing context export manifest was not overwritten.");
        }

        var manifest = new
        {
            schemaVersion = 1,
            generatedAtUtc = _clock.UtcNow,
            repositoryPath,
            repositoryName = new DirectoryInfo(repositoryPath).Name,
            sourcePromptPack = new
            {
                path = promptPackPath,
                sizeBytes = _fileSystem.GetFileLength(promptPackFullPath)
            },
            approval = new
            {
                approved = true,
                mode = spec.ApprovalMode,
                note = Label(spec.Language, "Local manifest only. This is not approval for a remote provider call.", "Sadece lokal manifest. Remote provider cagrisi icin onay degildir.")
            },
            riskSummary = new
            {
                total = scanResult.Findings.Count,
                critical = scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Critical),
                high = scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.High),
                medium = scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Medium),
                low = scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Low),
                info = scanResult.Findings.Count(finding => finding.Severity == RiskSeverity.Info)
            },
            safety = new
            {
                noRemoteCall = true,
                noUpload = true,
                apiKeyAccessed = false,
                provider = "none"
            }
        };

        var content = JsonSerializer.Serialize(manifest, new JsonSerializerOptions { WriteIndented = true });
        _fileSystem.WriteAllText(outputFullPath, content + Environment.NewLine);
        return new GeneratedFileResult(outputPath, GeneratedFileStatus.Created, "Context export manifest created.");
    }

    private static string NormalizeInputPath(string repositoryPath, string relativePath)
    {
        var inputPath = NormalizeRepositoryRelativePath(repositoryPath, relativePath, "Prompt pack path");
        if (!inputPath.EndsWith(".md", StringComparison.OrdinalIgnoreCase) &&
            !inputPath.EndsWith(".markdown", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Prompt pack path must end with .md or .markdown.");
        }

        return inputPath;
    }

    private static string NormalizeOutputPath(string repositoryPath, string? relativeOutputPath)
    {
        var outputPath = string.IsNullOrWhiteSpace(relativeOutputPath)
            ? DefaultOutputPath
            : relativeOutputPath;

        outputPath = NormalizeRepositoryRelativePath(repositoryPath, outputPath, "Context export output path");
        if (!outputPath.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Context export output path must end with .json.");
        }

        return outputPath;
    }

    private static string NormalizeRepositoryRelativePath(string repositoryPath, string relativePath, string label)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            throw new InvalidOperationException(label + " is required.");
        }

        var outputPath = relativePath.Trim().Replace('\\', '/');
        if (Path.IsPathRooted(outputPath))
        {
            throw new InvalidOperationException(label + " must be repository-relative.");
        }

        var segments = outputPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0 || segments.Any(segment => segment is "." or ".."))
        {
            throw new InvalidOperationException(label + " must stay inside the repository.");
        }

        var repositoryFullPath = Path.GetFullPath(repositoryPath);
        var fullPath = Path.GetFullPath(Path.Combine(repositoryFullPath, outputPath.Replace('/', Path.DirectorySeparatorChar)));
        var repositoryPrefix = repositoryFullPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;

        if (!fullPath.StartsWith(repositoryPrefix, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(label + " must stay inside the repository.");
        }

        return outputPath;
    }

    private static string Label(LanguageCode language, string english, string turkish)
    {
        return language.Value == "tr" ? turkish : english;
    }
}

public sealed class TaskFileGenerator : ITaskFileGenerator
{
    private readonly IFileSystem _fileSystem;
    private readonly ITemplateRenderer _templateRenderer;

    public TaskFileGenerator(IFileSystem fileSystem, ITemplateRenderer templateRenderer)
    {
        _fileSystem = fileSystem;
        _templateRenderer = templateRenderer;
    }

    public GeneratedFileResult CreateTask(string repositoryPath, TaskSpec spec)
    {
        var taskDirectory = Path.Combine(repositoryPath, "docs", "tasks");
        _fileSystem.CreateDirectory(taskDirectory);

        var number = GetNextTaskNumber(repositoryPath);
        var taskNumber = $"TASK-{number:0000}";
        var slug = Slugify(spec.Title);
        var relativePath = $"docs/tasks/{taskNumber}-{slug}.md";
        var fullPath = Path.Combine(repositoryPath, relativePath.Replace('/', Path.DirectorySeparatorChar));

        if (_fileSystem.FileExists(fullPath))
        {
            return new GeneratedFileResult(relativePath, GeneratedFileStatus.SkippedExisting, "Existing task file was not overwritten.");
        }

        var content = _templateRenderer.Render("TASK", spec.Language, new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["TaskNumber"] = taskNumber,
            ["TaskTitle"] = spec.Title
        });

        _fileSystem.WriteAllText(fullPath, content.TrimEnd() + Environment.NewLine);
        return new GeneratedFileResult(relativePath, GeneratedFileStatus.Created, "Task file created.");
    }

    public static string Slugify(string title)
    {
        var normalized = title.Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder();
        var previousDash = false;

        foreach (var character in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(character);
            if (category == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            var lower = char.ToLowerInvariant(character);
            if (char.IsLetterOrDigit(lower))
            {
                builder.Append(lower);
                previousDash = false;
            }
            else if (!previousDash && builder.Length > 0)
            {
                builder.Append('-');
                previousDash = true;
            }
        }

        var slug = builder.ToString().Trim('-');
        if (slug.Length == 0)
        {
            slug = "task";
        }

        return slug.Length <= 64 ? slug : slug[..64].Trim('-');
    }

    private int GetNextTaskNumber(string repositoryPath)
    {
        var taskDirectory = Path.Combine(repositoryPath, "docs", "tasks");
        if (!_fileSystem.DirectoryExists(taskDirectory))
        {
            return 1;
        }

        var max = 0;
        foreach (var file in _fileSystem.EnumerateFiles(taskDirectory, RepositoryScanner.IgnoredDirectoryNames))
        {
            var name = Path.GetFileName(file);
            if (name.Length < 9 || !name.StartsWith("TASK-", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (int.TryParse(name.AsSpan(5, 4), NumberStyles.None, CultureInfo.InvariantCulture, out var value))
            {
                max = Math.Max(max, value);
            }
        }

        return max + 1;
    }
}
