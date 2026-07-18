using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AgentContextKit.Core;

public sealed class InstructionAuditReportWriter : IInstructionAuditReportWriter
{
    private const string SarifSchema = "https://json.schemastore.org/sarif-2.1.0.json";
    private readonly IFileSystem _fileSystem;

    public InstructionAuditReportWriter(IFileSystem fileSystem)
    {
        _fileSystem = fileSystem;
    }

    public string RenderJson(
        InstructionAuditResult result,
        InstructionAuditReportContext context,
        InstructionAuditOutputInfo output)
    {
        ArgumentNullException.ThrowIfNull(result);
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(output);

        var payload = new
        {
            schemaVersion = 2,
            toolVersion = context.ToolVersion,
            generatedAtUtc = context.GeneratedAtUtc,
            command = "optimize",
            repositoryName = context.RepositoryName,
            ciMode = context.CiMode,
            exitCode = context.ExitCode,
            format = "json",
            output,
            proposal = context.Proposal is null ? null : ToProposal(context.Proposal),
            auditSummary = BuildSummary(result),
            instructionMetrics = ToMetrics(result.Metrics),
            sources = result.Sources.Select(source => new
            {
                path = source.Path,
                type = source.Type.ToString(),
                directoryScope = source.DirectoryScope,
                precedence = source.Precedence,
                appliesToDescendants = source.AppliesToDescendants,
                inheritedApplicability = source.InheritedApplicability,
                metrics = ToContentMetrics(source.Metrics),
                ruleCount = source.Rules.Count
            }).ToArray(),
            scopes = result.Scopes.Select(scope => new
            {
                directoryScope = scope.DirectoryScope,
                applicableSourcePaths = scope.ApplicableSourcePaths,
                scopedOverrideCount = scope.ScopedOverrides.Count
            }).ToArray(),
            scopedOverrides = result.ScopedOverrides.Select(item => new
            {
                directoryScope = item.DirectoryScope,
                broaderRule = ToLocation(item.BroaderRule),
                narrowerRule = ToLocation(item.NarrowerRule),
                reason = item.Reason
            }).ToArray(),
            instructionFindings = result.Findings.Select(ToFinding).ToArray()
        };

        return JsonSerializer.Serialize(payload, JsonOptions()) + "\n";
    }

    public string RenderMarkdown(InstructionAuditResult result, string repositoryName)
    {
        ArgumentNullException.ThrowIfNull(result);
        ArgumentException.ThrowIfNullOrWhiteSpace(repositoryName);

        var lines = new List<string>
        {
            "# ACKit Optimize instruction audit",
            "",
            $"Repository: **{EscapeMarkdown(repositoryName)}**",
            "",
            "> Review-only deterministic local analysis. Estimated tokens are context-size estimates, not exact tokenizer output or model billing.",
            "",
            "## Summary",
            "",
            $"- Instruction sources: {Invariant(result.Sources.Count)}",
            $"- Parsed rules: {Invariant(CountRules(result))}",
            $"- Resolved scopes: {Invariant(result.Scopes.Count)}",
            $"- Valid scoped overrides: {Invariant(result.ScopedOverrides.Count)}",
            $"- Findings: {Invariant(result.Findings.Count)}",
            $"- Deterministic findings: {Invariant(result.Findings.Count(finding => !finding.IsHeuristic))}",
            $"- Heuristic findings: {Invariant(result.Findings.Count(finding => finding.IsHeuristic))}",
            "",
            "## Context estimate",
            "",
            $"- Total: {FormatMetrics(result.Metrics.Total)}",
            $"- Exact duplicated context: {FormatMetrics(result.Metrics.Duplicated)}",
            $"- Avoidable context: {FormatMetrics(result.Metrics.Avoidable)}",
            $"- Method: {EscapeMarkdown(result.Metrics.EstimationMethod)}",
            "",
            "## Instruction sources",
            "",
            "| Source | Type | Scope | Precedence | Applicability | Descendants | Rules | Estimated tokens |",
            "| --- | --- | --- | ---: | --- | --- | ---: | ---: |"
        };

        foreach (var source in result.Sources)
        {
            lines.Add($"| `{EscapeMarkdownCode(source.Path)}` | {source.Type} | `{EscapeMarkdownCode(source.DirectoryScope)}` | {Invariant(source.Precedence)} | {EscapeMarkdown(source.InheritedApplicability)} | {(source.AppliesToDescendants ? "yes" : "no")} | {Invariant(source.Rules.Count)} | {Invariant(source.Metrics.EstimatedTokens)} |");
        }

        lines.Add("");
        lines.Add("## Resolved scopes");
        lines.Add("");
        lines.Add("| Directory scope | Applicable sources | Valid overrides |");
        lines.Add("| --- | --- | ---: |");
        foreach (var scope in result.Scopes)
        {
            lines.Add($"| `{EscapeMarkdownCode(scope.DirectoryScope)}` | {EscapeMarkdown(string.Join(", ", scope.ApplicableSourcePaths))} | {Invariant(scope.ScopedOverrides.Count)} |");
        }

        lines.Add("");
        lines.Add("## Valid scoped overrides");
        lines.Add("");
        if (result.ScopedOverrides.Count == 0)
        {
            lines.Add("None detected.");
        }
        else
        {
            foreach (var item in result.ScopedOverrides)
            {
                lines.Add($"- `{EscapeMarkdownCode(FormatLocation(item.NarrowerRule))}` overrides `{EscapeMarkdownCode(FormatLocation(item.BroaderRule))}` in scope `{EscapeMarkdownCode(item.DirectoryScope)}`. {EscapeMarkdown(item.Reason)}");
            }
        }

        lines.Add("");
        lines.Add("## Findings");
        lines.Add("");
        if (result.Findings.Count == 0)
        {
            lines.Add("No instruction audit findings.");
        }
        else
        {
            foreach (var finding in result.Findings)
            {
                lines.Add($"### {finding.RuleId} · {finding.Severity} · {finding.Category}");
                lines.Add("");
                lines.Add($"- Source: `{EscapeMarkdownCode(finding.SourcePath)}:{Invariant(finding.StartLine)}-{Invariant(finding.EndLine)}`");
                lines.Add($"- Directory scope: `{EscapeMarkdownCode(finding.DirectoryScope)}`");
                lines.Add($"- Classification: {(finding.IsHeuristic ? "heuristic; human review required" : "deterministic")}");
                lines.Add($"- Fingerprint: `{finding.Fingerprint}`");
                lines.Add($"- Explanation: {EscapeMarkdown(finding.Explanation)}");
                lines.Add($"- Evidence: {EscapeMarkdown(finding.Evidence)}");
                lines.Add($"- Safe remediation: {EscapeMarkdown(finding.Remediation)}");
                if (finding.RelatedLocations.Count > 0)
                {
                    lines.Add($"- Related locations: {string.Join(", ", finding.RelatedLocations.Select(location => $"`{EscapeMarkdownCode(FormatLocation(location))}`"))}");
                }
                lines.Add("");
            }
        }

        lines.Add("## Review boundary");
        lines.Add("");
        lines.Add("This report does not modify instruction sources. Resolve conflicts and review heuristic findings before consolidating any rule.");
        return string.Join('\n', lines).TrimEnd() + "\n";
    }

    public string RenderSarif(InstructionAuditResult result, string toolVersion)
    {
        ArgumentNullException.ThrowIfNull(result);
        ArgumentException.ThrowIfNullOrWhiteSpace(toolVersion);

        var report = new Dictionary<string, object?>
        {
            ["$schema"] = SarifSchema,
            ["version"] = "2.1.0",
            ["runs"] = new[]
            {
                new
                {
                    tool = new
                    {
                        driver = new
                        {
                            name = "AgentContextKit Optimize",
                            version = toolVersion,
                            rules = InstructionAuditRuleCatalog.All.Select(rule => new
                            {
                                id = rule.Id,
                                name = rule.Name,
                                shortDescription = new { text = rule.Description },
                                fullDescription = new { text = rule.Description },
                                help = new { text = rule.Remediation },
                                properties = new
                                {
                                    category = rule.Category.ToString(),
                                    defaultSeverity = rule.DefaultSeverity.ToString(),
                                    heuristic = rule.IsHeuristic
                                }
                            }).ToArray()
                        }
                    },
                    results = result.Findings.Select(finding => new
                    {
                        ruleId = finding.RuleId,
                        level = ToSarifLevel(finding.Severity),
                        message = new { text = finding.Explanation },
                        locations = new[] { ToSarifLocation(finding.SourcePath, finding.StartLine, finding.EndLine) },
                        relatedLocations = finding.RelatedLocations.Select((location, index) => new
                        {
                            id = index + 1,
                            physicalLocation = ToSarifPhysicalLocation(location.Path, location.StartLine, location.EndLine)
                        }).ToArray(),
                        fingerprints = new Dictionary<string, string>
                        {
                            ["ackitOptimize/v1"] = finding.Fingerprint
                        },
                        properties = new
                        {
                            category = finding.Category.ToString(),
                            directoryScope = finding.DirectoryScope,
                            evidence = finding.Evidence,
                            remediation = finding.Remediation,
                            deterministic = !finding.IsHeuristic,
                            heuristic = finding.IsHeuristic
                        }
                    }).ToArray()
                }
            }
        };

        return JsonSerializer.Serialize(report, JsonOptions()) + "\n";
    }

    public string RenderHtml(InstructionAuditResult result, string repositoryName)
    {
        ArgumentNullException.ThrowIfNull(result);
        ArgumentException.ThrowIfNullOrWhiteSpace(repositoryName);

        var html = new StringBuilder();
        html.Append("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n");
        html.Append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n");
        html.Append("<title>ACKit Optimize instruction audit</title>\n");
        html.Append("<style>\n");
        html.Append(":root{color-scheme:light dark;--bg:#f7f8fc;--panel:#fff;--text:#182033;--muted:#5d6678;--line:#d8ddeb;--critical:#a61b1b;--high:#b64b00;--medium:#8a6500;--low:#316ea5}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 system-ui,-apple-system,Segoe UI,sans-serif}main{width:min(1180px,calc(100% - 32px));margin:32px auto 64px}.hero,.panel,.finding{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:20px;margin:0 0 18px}.hero h1{margin:0 0 8px;font-size:clamp(1.6rem,4vw,2.4rem)}.muted{color:var(--muted)}.metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:18px}.metric{border:1px solid var(--line);border-radius:10px;padding:12px}.metric strong{display:block;font-size:1.35rem}.finding h3{margin:0 0 8px}.finding[data-severity=\"Critical\"]{border-left:6px solid var(--critical)}.finding[data-severity=\"High\"]{border-left:6px solid var(--high)}.finding[data-severity=\"Medium\"]{border-left:6px solid var(--medium)}.finding[data-severity=\"Low\"]{border-left:6px solid var(--low)}table{width:100%;border-collapse:collapse}caption{text-align:left;font-weight:700;margin-bottom:10px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid var(--line);padding:9px 8px}code{overflow-wrap:anywhere}.tag{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:2px 8px;margin-right:6px;font-size:.82rem}@media(prefers-color-scheme:dark){:root{--bg:#111522;--panel:#1a2030;--text:#eef1f8;--muted:#aeb6c8;--line:#394158}}\n");
        html.Append("</style>\n</head>\n<body>\n<main>\n");
        html.Append("<section class=\"hero\"><h1>ACKit Optimize instruction audit</h1><p class=\"muted\">Repository: ");
        html.Append(Encode(repositoryName));
        html.Append("</p><p>Review-only deterministic local analysis. Estimated tokens are context-size estimates, not exact tokenizer output or model billing.</p><div class=\"metrics\">");
        AppendMetric(html, "Sources", result.Sources.Count);
        AppendMetric(html, "Rules", CountRules(result));
        AppendMetric(html, "Scopes", result.Scopes.Count);
        AppendMetric(html, "Findings", result.Findings.Count);
        AppendMetric(html, "Characters", result.Metrics.Total.Characters);
        AppendMetric(html, "Words", result.Metrics.Total.Words);
        AppendMetric(html, "Lines", result.Metrics.Total.Lines);
        AppendMetric(html, "Estimated tokens", result.Metrics.Total.EstimatedTokens);
        html.Append("</div></section>\n");

        html.Append("<section class=\"panel\"><table><caption>Context estimate</caption><thead><tr><th>Measure</th><th>Characters</th><th>Words</th><th>Lines</th><th>Estimated tokens</th></tr></thead><tbody>");
        AppendMetricsRow(html, "Total", result.Metrics.Total);
        AppendMetricsRow(html, "Exact duplicated", result.Metrics.Duplicated);
        AppendMetricsRow(html, "Avoidable", result.Metrics.Avoidable);
        html.Append("</tbody></table><p class=\"muted\"><strong>Method:</strong> ").Append(Encode(result.Metrics.EstimationMethod)).Append("</p></section>\n");

        html.Append("<section class=\"panel\"><table><caption>Instruction sources</caption><thead><tr><th>Source</th><th>Type</th><th>Scope</th><th>Precedence</th><th>Applicability</th><th>Rules</th><th>Estimated tokens</th></tr></thead><tbody>");
        foreach (var source in result.Sources)
        {
            html.Append("<tr><td><code>").Append(Encode(source.Path)).Append("</code></td><td>").Append(source.Type).Append("</td><td><code>").Append(Encode(source.DirectoryScope)).Append("</code></td><td>").Append(Invariant(source.Precedence)).Append("</td><td>").Append(Encode(source.InheritedApplicability)).Append("; descendants: ").Append(source.AppliesToDescendants ? "yes" : "no").Append("</td><td>").Append(Invariant(source.Rules.Count)).Append("</td><td>").Append(Invariant(source.Metrics.EstimatedTokens)).Append("</td></tr>");
        }
        html.Append("</tbody></table></section>\n");

        html.Append("<section class=\"panel\"><table><caption>Resolved scopes</caption><thead><tr><th>Directory scope</th><th>Applicable sources</th><th>Valid overrides</th></tr></thead><tbody>");
        foreach (var scope in result.Scopes)
        {
            html.Append("<tr><td><code>").Append(Encode(scope.DirectoryScope)).Append("</code></td><td>").Append(Encode(string.Join(", ", scope.ApplicableSourcePaths))).Append("</td><td>").Append(Invariant(scope.ScopedOverrides.Count)).Append("</td></tr>");
        }
        html.Append("</tbody></table></section>\n");

        html.Append("<section class=\"panel\"><h2>Valid scoped overrides</h2>");
        if (result.ScopedOverrides.Count == 0)
        {
            html.Append("<p>None detected.</p>");
        }
        else
        {
            html.Append("<ul>");
            foreach (var item in result.ScopedOverrides)
            {
                html.Append("<li><code>").Append(Encode(FormatLocation(item.NarrowerRule))).Append("</code> overrides <code>").Append(Encode(FormatLocation(item.BroaderRule))).Append("</code> in scope <code>").Append(Encode(item.DirectoryScope)).Append("</code>. ").Append(Encode(item.Reason)).Append("</li>");
            }
            html.Append("</ul>");
        }
        html.Append("</section>\n");

        html.Append("<section class=\"panel\"><h2>Findings</h2><p class=\"muted\">Deterministic and heuristic classifications are labeled separately. Heuristic findings require human review.</p></section>\n");
        if (result.Findings.Count == 0)
        {
            html.Append("<section class=\"finding\"><p>No instruction audit findings.</p></section>\n");
        }
        else
        {
            foreach (var finding in result.Findings)
            {
                html.Append("<article class=\"finding\" data-severity=\"").Append(finding.Severity).Append("\"><h3>").Append(finding.RuleId).Append(" · ").Append(finding.Severity).Append(" · ").Append(finding.Category).Append("</h3>");
                html.Append("<p><span class=\"tag\">").Append(finding.IsHeuristic ? "heuristic" : "deterministic").Append("</span><span class=\"tag\">scope ").Append(Encode(finding.DirectoryScope)).Append("</span></p>");
                html.Append("<p><strong>Source:</strong> <code>").Append(Encode(finding.SourcePath)).Append(':').Append(Invariant(finding.StartLine)).Append('-').Append(Invariant(finding.EndLine)).Append("</code></p>");
                html.Append("<p><strong>Explanation:</strong> ").Append(Encode(finding.Explanation)).Append("</p>");
                html.Append("<p><strong>Evidence:</strong> ").Append(Encode(finding.Evidence)).Append("</p>");
                html.Append("<p><strong>Safe remediation:</strong> ").Append(Encode(finding.Remediation)).Append("</p>");
                if (finding.RelatedLocations.Count > 0)
                {
                    html.Append("<p><strong>Related locations:</strong> ").Append(Encode(string.Join(", ", finding.RelatedLocations.Select(FormatLocation)))).Append("</p>");
                }
                html.Append("<p class=\"muted\">Fingerprint: <code>").Append(finding.Fingerprint).Append("</code></p></article>\n");
            }
        }

        html.Append("<section class=\"panel\"><h2>Review boundary</h2><p>This report does not modify instruction sources. Resolve conflicts and review heuristic findings before consolidating any rule.</p></section>\n");
        html.Append("</main>\n</body>\n</html>\n");
        return html.ToString();
    }

    public GeneratedFileResult Generate(
        string repositoryPath,
        string relativeOutputPath,
        InstructionAuditReportFormat format,
        string content)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(content);
        var outputPath = NormalizeOutputPath(repositoryPath, relativeOutputPath, format);
        var fullPath = Path.Combine(repositoryPath, outputPath.Replace('/', Path.DirectorySeparatorChar));
        if (_fileSystem.FileExists(fullPath))
        {
            return new GeneratedFileResult(outputPath, GeneratedFileStatus.SkippedExisting, "Existing optimize report was not overwritten.");
        }

        _fileSystem.WriteAllText(fullPath, content.TrimEnd('\r', '\n') + "\n");
        return new GeneratedFileResult(outputPath, GeneratedFileStatus.Created, "Optimize report created.");
    }

    public GeneratedFileResult GenerateJson(
        string repositoryPath,
        string relativeOutputPath,
        InstructionAuditResult result,
        InstructionAuditReportContext context)
    {
        var outputPath = NormalizeOutputPath(repositoryPath, relativeOutputPath, InstructionAuditReportFormat.Json);
        var fullPath = Path.Combine(repositoryPath, outputPath.Replace('/', Path.DirectorySeparatorChar));
        if (_fileSystem.FileExists(fullPath))
        {
            return new GeneratedFileResult(outputPath, GeneratedFileStatus.SkippedExisting, "Existing optimize JSON report was not overwritten.");
        }

        var generated = new GeneratedFileResult(outputPath, GeneratedFileStatus.Created, "Optimize JSON report created.");
        _fileSystem.WriteAllText(fullPath, RenderJson(result, context, InstructionAuditOutputInfo.From(generated)));
        return generated;
    }

    private static object BuildSummary(InstructionAuditResult result)
    {
        return new
        {
            sourceCount = result.Sources.Count,
            ruleCount = CountRules(result),
            scopeCount = result.Scopes.Count,
            scopedOverrideCount = result.ScopedOverrides.Count,
            findingCount = result.Findings.Count,
            deterministicCount = result.Findings.Count(finding => !finding.IsHeuristic),
            heuristicCount = result.Findings.Count(finding => finding.IsHeuristic),
            severity = new
            {
                total = result.Findings.Count,
                critical = result.Findings.Count(finding => finding.Severity == RiskSeverity.Critical),
                high = result.Findings.Count(finding => finding.Severity == RiskSeverity.High),
                medium = result.Findings.Count(finding => finding.Severity == RiskSeverity.Medium),
                low = result.Findings.Count(finding => finding.Severity == RiskSeverity.Low),
                info = result.Findings.Count(finding => finding.Severity == RiskSeverity.Info)
            }
        };
    }

    private static object ToMetrics(InstructionAuditMetrics metrics)
    {
        return new
        {
            total = ToContentMetrics(metrics.Total),
            duplicated = ToContentMetrics(metrics.Duplicated),
            avoidable = ToContentMetrics(metrics.Avoidable),
            estimationMethod = metrics.EstimationMethod
        };
    }

    private static object ToContentMetrics(InstructionContentMetrics metrics)
    {
        return new
        {
            characters = metrics.Characters,
            words = metrics.Words,
            lines = metrics.Lines,
            estimatedTokens = metrics.EstimatedTokens
        };
    }

    private static object ToProposal(InstructionOptimizationProposalOutputInfo proposal)
    {
        return new
        {
            output = proposal.Output,
            metrics = new
            {
                before = ToContentMetrics(proposal.Metrics.Before),
                after = ToContentMetrics(proposal.Metrics.After),
                saved = ToContentMetrics(proposal.Metrics.Saved),
                estimationMethod = proposal.Metrics.EstimationMethod
            },
            retainedRuleCount = proposal.RetainedRuleCount,
            consolidationCount = proposal.ConsolidationCount,
            unresolvedDecisionCount = proposal.UnresolvedDecisionCount,
            mandatoryConstraintCategories = proposal.MandatoryConstraintCategories
        };
    }

    private static object ToLocation(InstructionLocation location)
    {
        return new
        {
            path = location.Path,
            startLine = location.StartLine,
            endLine = location.EndLine,
            directoryScope = location.DirectoryScope
        };
    }

    private static object ToFinding(InstructionFinding finding)
    {
        return new
        {
            ruleId = finding.RuleId,
            fingerprint = finding.Fingerprint,
            severity = finding.Severity.ToString(),
            category = finding.Category.ToString(),
            sourceFile = finding.SourcePath,
            startLine = finding.StartLine,
            endLine = finding.EndLine,
            directoryScope = finding.DirectoryScope,
            explanation = finding.Explanation,
            evidence = finding.Evidence,
            remediation = finding.Remediation,
            deterministic = !finding.IsHeuristic,
            heuristic = finding.IsHeuristic,
            relatedLocations = finding.RelatedLocations.Select(ToLocation).ToArray()
        };
    }

    private static object ToSarifLocation(string path, int startLine, int endLine)
    {
        return new { physicalLocation = ToSarifPhysicalLocation(path, startLine, endLine) };
    }

    private static object ToSarifPhysicalLocation(string path, int startLine, int endLine)
    {
        return new
        {
            artifactLocation = new { uri = NormalizeArtifactUri(path) },
            region = new { startLine, endLine }
        };
    }

    private static string ToSarifLevel(RiskSeverity severity)
    {
        return severity switch
        {
            RiskSeverity.Critical or RiskSeverity.High => "error",
            RiskSeverity.Medium => "warning",
            _ => "note"
        };
    }

    private static string NormalizeArtifactUri(string path)
    {
        var normalized = path.Replace('\\', '/').TrimStart('/');
        if (Path.IsPathRooted(normalized) || normalized.StartsWith("../", StringComparison.Ordinal) || normalized.Contains(':'))
        {
            return Path.GetFileName(normalized);
        }
        return normalized.Length == 0 ? "unknown" : normalized;
    }

    private static string NormalizeOutputPath(
        string repositoryPath,
        string relativeOutputPath,
        InstructionAuditReportFormat format)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(repositoryPath);
        if (string.IsNullOrWhiteSpace(relativeOutputPath))
        {
            throw new InvalidOperationException("Optimize output path is required.");
        }

        var outputPath = relativeOutputPath.Trim().Replace('\\', '/');
        if (Path.IsPathRooted(outputPath) || outputPath.Contains(':'))
        {
            throw new InvalidOperationException("Optimize output path must be repository-relative.");
        }

        var segments = outputPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0 || segments.Any(segment => segment is "." or ".."))
        {
            throw new InvalidOperationException("Optimize output path must stay inside the repository.");
        }

        var expectedExtension = format switch
        {
            InstructionAuditReportFormat.Json => ".json",
            InstructionAuditReportFormat.Markdown => ".md",
            InstructionAuditReportFormat.Sarif => ".sarif",
            InstructionAuditReportFormat.Html => ".html",
            _ => throw new ArgumentOutOfRangeException(nameof(format))
        };
        if (!outputPath.EndsWith(expectedExtension, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Optimize {format.ToString().ToLowerInvariant()} output path must end with {expectedExtension}.");
        }

        try
        {
            var repositoryFullPath = Path.GetFullPath(repositoryPath);
            var outputFullPath = Path.GetFullPath(Path.Combine(repositoryFullPath, outputPath.Replace('/', Path.DirectorySeparatorChar)));
            var prefix = repositoryFullPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
            var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
            if (!outputFullPath.StartsWith(prefix, comparison))
            {
                throw new InvalidOperationException("Optimize output path must stay inside the repository.");
            }
        }
        catch (Exception ex) when (ex is ArgumentException or NotSupportedException or PathTooLongException)
        {
            throw new InvalidOperationException("Optimize output path is invalid.", ex);
        }

        return string.Join('/', segments);
    }

    private static JsonSerializerOptions JsonOptions()
    {
        return new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
    }

    private static int CountRules(InstructionAuditResult result)
    {
        return result.Sources.Sum(source => source.Rules.Count);
    }

    private static string FormatMetrics(InstructionContentMetrics metrics)
    {
        return $"{Invariant(metrics.Characters)} characters, {Invariant(metrics.Words)} words, {Invariant(metrics.Lines)} lines, {Invariant(metrics.EstimatedTokens)} estimated tokens";
    }

    private static string FormatLocation(InstructionLocation location)
    {
        return $"{location.Path}:{Invariant(location.StartLine)}-{Invariant(location.EndLine)}";
    }

    private static string EscapeMarkdown(string value)
    {
        return value.Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("&", "&amp;", StringComparison.Ordinal)
            .Replace("<", "&lt;", StringComparison.Ordinal)
            .Replace(">", "&gt;", StringComparison.Ordinal)
            .Replace("`", "\\`", StringComparison.Ordinal)
            .Replace("*", "\\*", StringComparison.Ordinal)
            .Replace("_", "\\_", StringComparison.Ordinal)
            .Replace("|", "\\|", StringComparison.Ordinal)
            .Replace("[", "\\[", StringComparison.Ordinal)
            .Replace("]", "\\]", StringComparison.Ordinal)
            .Replace("\r", " ", StringComparison.Ordinal)
            .Replace("\n", " ", StringComparison.Ordinal);
    }

    private static string EscapeMarkdownCode(string value)
    {
        return value.Replace("&", "&amp;", StringComparison.Ordinal)
            .Replace("<", "&lt;", StringComparison.Ordinal)
            .Replace(">", "&gt;", StringComparison.Ordinal)
            .Replace("`", "'", StringComparison.Ordinal)
            .Replace("|", "\\|", StringComparison.Ordinal)
            .Replace("\r", " ", StringComparison.Ordinal)
            .Replace("\n", " ", StringComparison.Ordinal);
    }

    private static string Encode(string value)
    {
        return WebUtility.HtmlEncode(value);
    }

    private static void AppendMetric(StringBuilder html, string label, int value)
    {
        html.Append("<div class=\"metric\"><strong>").Append(Invariant(value)).Append("</strong><span>").Append(Encode(label)).Append("</span></div>");
    }

    private static void AppendMetricsRow(StringBuilder html, string label, InstructionContentMetrics metrics)
    {
        html.Append("<tr><th scope=\"row\">").Append(Encode(label)).Append("</th><td>").Append(Invariant(metrics.Characters)).Append("</td><td>").Append(Invariant(metrics.Words)).Append("</td><td>").Append(Invariant(metrics.Lines)).Append("</td><td>").Append(Invariant(metrics.EstimatedTokens)).Append("</td></tr>");
    }

    private static string Invariant(int value)
    {
        return value.ToString(CultureInfo.InvariantCulture);
    }
}
