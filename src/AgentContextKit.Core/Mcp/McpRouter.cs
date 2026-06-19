using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace AgentContextKit.Core;

public interface IAckitHealthProbe
{
    DoctorResult Check(string repositoryPath, ScanResult scanResult);
}

public sealed class RepositoryDoctorHealthProbe : IAckitHealthProbe
{
    private readonly RepositoryDoctor _doctor;

    public RepositoryDoctorHealthProbe(RepositoryDoctor doctor)
    {
        _doctor = doctor;
    }

    public DoctorResult Check(string repositoryPath, ScanResult scanResult)
    {
        return _doctor.Check(repositoryPath, scanResult);
    }
}

public sealed class McpRouter : IMcpServer
{
    private const string JsonRpcVersion = "2.0";
    private const string ProtocolVersion = "2024-11-05";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private readonly IFileSystem _fileSystem;
    private readonly IAckitConfigReader _configReader;
    private readonly IRepositoryScanner _repositoryScanner;
    private readonly IAckitHealthProbe _healthProbe;
    private readonly string _serverVersion;

    public McpRouter(
        IFileSystem fileSystem,
        IAckitConfigReader configReader,
        IRepositoryScanner repositoryScanner,
        IAckitHealthProbe healthProbe,
        string serverVersion)
    {
        _fileSystem = fileSystem;
        _configReader = configReader;
        _repositoryScanner = repositoryScanner;
        _healthProbe = healthProbe;
        _serverVersion = serverVersion;
    }

    public IReadOnlyList<McpToolDefinition> Tools { get; } =
    [
        Tool("ackit.scan", "Run a local AgentContextKit scan and return a compact summary.", "repoPath", "lang", "format"),
        Tool("ackit.findings", "Return local risk findings filtered by minimum severity.", "repoPath", "minSeverity", "lang"),
        Tool("ackit.context", "Return a local, write-free agent context preview for a target.", "repoPath", "target", "lang"),
        Tool("ackit.rules", "Return the local AgentContextKit risk rule catalog as a read-only metadata snapshot.", "lang"),
        Tool("ackit.health", "Return a local repository health snapshot.", "repoPath", "lang")
    ];

    public string HandleJson(string input)
    {
        var lines = input
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (lines.Length == 0)
        {
            return Serialize(ParseError(null, "Empty JSON-RPC input."));
        }

        return string.Join(Environment.NewLine, lines.Select(HandleJsonLine));
    }

    public McpResponse Handle(McpRequest request)
    {
        if (!string.Equals(request.JsonRpc, JsonRpcVersion, StringComparison.Ordinal))
        {
            return InvalidRequest(request.Id, "jsonrpc must be \"2.0\".");
        }

        return request.Method switch
        {
            "initialize" => Initialize(request),
            "tools/list" => ListTools(request),
            "tools/call" => CallTool(request),
            "notifications/initialized" => Success(request.Id, new { accepted = true }),
            "ping" => Success(request.Id, new { ok = true }),
            _ => new McpResponse(JsonRpcVersion, request.Id, Error: new McpError(-32601, "Method not found."))
        };
    }

    public McpResponse Initialize(McpRequest request)
    {
        return Success(request.Id, new
        {
            protocolVersion = ProtocolVersion,
            serverInfo = new McpServerInfo("ackit", "AgentContextKit", _serverVersion),
            capabilities = new McpCapabilities(new Dictionary<string, object?>())
        });
    }

    public McpResponse ListTools(McpRequest request)
    {
        return Success(request.Id, new { tools = Tools });
    }

    public McpResponse CallTool(McpRequest request)
    {
        if (!TryGetToolCall(request.Params, out var name, out var arguments, out var error))
        {
            return InvalidParams(request.Id, error);
        }

        return name switch
        {
            "ackit.scan" => CallScan(request.Id, arguments),
            "ackit.findings" => CallFindings(request.Id, arguments),
            "ackit.context" => CallContext(request.Id, arguments),
            "ackit.rules" => CallRules(request.Id, arguments),
            "ackit.health" => CallHealth(request.Id, arguments),
            _ => InvalidParams(request.Id, $"Unknown tool: {name}.")
        };
    }

    private string HandleJsonLine(string line)
    {
        try
        {
            var root = JsonNode.Parse(line)?.AsObject();
            if (root is null)
            {
                return Serialize(InvalidRequest(null, "Request must be a JSON object."));
            }

            var id = ReadId(root);
            if (!TryGetString(root, "jsonrpc", out var jsonRpc) ||
                !TryGetString(root, "method", out var method))
            {
                return Serialize(InvalidRequest(id, "jsonrpc and method are required."));
            }

            JsonObject? parameters = null;
            if (root.TryGetPropertyValue("params", out var paramsNode) && paramsNode is not null)
            {
                parameters = paramsNode as JsonObject;
                if (parameters is null)
                {
                    return Serialize(InvalidParams(id, "params must be a JSON object."));
                }
            }

            return Serialize(Handle(new McpRequest(jsonRpc, id, method, parameters)));
        }
        catch (JsonException)
        {
            return Serialize(ParseError(null, "Invalid JSON."));
        }
        catch (InvalidOperationException ex)
        {
            return Serialize(InvalidRequest(null, ex.Message));
        }
    }

    private McpResponse CallScan(string? id, JsonObject arguments)
    {
        if (!TryGetRepositoryPath(arguments, out var repositoryPath, out var error))
        {
            return InvalidParams(id, error);
        }

        var language = GetLanguage(arguments);
        var format = GetOptionalString(arguments, "format") ?? "summary";
        if (format is not "summary")
        {
            return InvalidParams(id, "format must be summary for this prototype.");
        }

        var scan = Scan(repositoryPath);
        var text = BuildScanSummary(scan, language, format);
        return Success(id, ToolResult(text, new
        {
            repositoryName = GetRepositoryName(scan.RepositoryPath),
            format,
            fileCount = scan.Files.Count,
            stacks = scan.Stacks.Select(stack => new { name = stack.Name, signal = stack.Signal }).ToArray(),
            health = ToHealthDto(scan),
            riskSummary = ToRiskSummary(scan.Findings)
        }));
    }

    private McpResponse CallFindings(string? id, JsonObject arguments)
    {
        if (!TryGetRepositoryPath(arguments, out var repositoryPath, out var error))
        {
            return InvalidParams(id, error);
        }

        if (!TryGetSeverity(arguments, "minSeverity", RiskSeverity.Info, out var minSeverity, out error))
        {
            return InvalidParams(id, error);
        }

        var scan = Scan(repositoryPath);
        var findings = scan.Findings
            .Where(finding => finding.Severity >= minSeverity)
            .OrderByDescending(finding => finding.Severity)
            .ThenBy(finding => finding.Path, StringComparer.OrdinalIgnoreCase)
            .ThenBy(finding => finding.Message, StringComparer.Ordinal)
            .Select(ToFindingDto)
            .ToArray();

        var text = $"Findings: {findings.Length} (minimum severity: {minSeverity})";
        return Success(id, ToolResult(text, new
        {
            repositoryName = GetRepositoryName(scan.RepositoryPath),
            minSeverity = minSeverity.ToString(),
            findingCount = findings.Length,
            findings
        }));
    }

    private McpResponse CallContext(string? id, JsonObject arguments)
    {
        if (!TryGetRepositoryPath(arguments, out var repositoryPath, out var error))
        {
            return InvalidParams(id, error);
        }

        if (!TryGetString(arguments, "target", out var targetValue) ||
            !TryParseTarget(targetValue, out var target))
        {
            return InvalidParams(id, "target must be codex, claude, anthropic, cursor, copilot, continue, or all.");
        }

        var language = GetLanguage(arguments);
        var scan = Scan(repositoryPath);
        var text = BuildContextFragment(scan, targetValue, language);

        return Success(id, ToolResult(text, new
        {
            repositoryName = GetRepositoryName(scan.RepositoryPath),
            target = ToTargetToken(target),
            fileCount = scan.Files.Count,
            stackCount = scan.Stacks.Count,
            riskSummary = ToRiskSummary(scan.Findings),
            generatedFilesPreview = BuildGeneratedFilesPreview(target)
        }));
    }

    private McpResponse CallHealth(string? id, JsonObject arguments)
    {
        if (!TryGetRepositoryPath(arguments, out var repositoryPath, out var error))
        {
            return InvalidParams(id, error);
        }

        var scan = Scan(repositoryPath);
        var result = _healthProbe.Check(repositoryPath, scan);
        var text = $"Health checks: {result.Checks.Count(check => check.Passed)}/{result.Checks.Count} passed";

        return Success(id, ToolResult(text, new
        {
            repositoryName = GetRepositoryName(scan.RepositoryPath),
            checkSummary = new
            {
                total = result.Checks.Count,
                passed = result.Checks.Count(check => check.Passed),
                failed = result.Checks.Count(check => !check.Passed),
                failedHighOrCritical = result.Checks.Count(check => !check.Passed && check.Severity >= RiskSeverity.High)
            },
            checks = result.Checks.Select(check => new
            {
                name = check.Name,
                severity = check.Severity.ToString(),
                passed = check.Passed,
                message = check.Message
            }).ToArray()
        }));
    }

    private McpResponse CallRules(string? id, JsonObject arguments)
    {
        var rules = RiskRuleCatalog.All
            .OrderBy(rule => rule.Id, StringComparer.Ordinal)
            .Select(rule => new
            {
                id = rule.Id,
                name = rule.Name,
                category = rule.Category.ToString(),
                defaultSeverity = rule.DefaultSeverity.ToString(),
                description = rule.Description,
                recommendation = rule.Recommendation
            })
            .ToArray();

        var text = $"ackit rules: {rules.Length} rules in catalog";
        return Success(id, ToolResult(text, new
        {
            version = _serverVersion,
            count = rules.Length,
            rules
        }));
    }

    private ScanResult Scan(string repositoryPath)
    {
        var config = _configReader.Read(repositoryPath);
        return _repositoryScanner.Scan(repositoryPath, config);
    }

    private bool TryGetRepositoryPath(JsonObject arguments, out string repositoryPath, out string error)
    {
        repositoryPath = string.Empty;
        if (!TryGetString(arguments, "repoPath", out var rawPath) || string.IsNullOrWhiteSpace(rawPath))
        {
            error = "repoPath is required.";
            return false;
        }

        var trimmed = rawPath.Trim();
        if (trimmed.Contains("://", StringComparison.Ordinal) ||
            trimmed.StartsWith("file:", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith(@"\\", StringComparison.Ordinal) ||
            trimmed.StartsWith("//", StringComparison.Ordinal))
        {
            error = "repoPath must be a local directory path, not a URL or remote path.";
            return false;
        }

        try
        {
            var fullPath = Path.GetFullPath(trimmed);
            if (!_fileSystem.DirectoryExists(fullPath))
            {
                error = "repoPath must point to an existing local directory.";
                return false;
            }

            repositoryPath = fullPath;
            error = string.Empty;
            return true;
        }
        catch (Exception ex) when (ex is ArgumentException or NotSupportedException or PathTooLongException)
        {
            error = "repoPath must be a valid local directory path.";
            return false;
        }
    }

    private static bool TryGetToolCall(JsonObject? parameters, out string name, out JsonObject arguments, out string error)
    {
        name = string.Empty;
        arguments = new JsonObject();
        if (parameters is null)
        {
            error = "tools/call params are required.";
            return false;
        }

        if (!TryGetString(parameters, "name", out name) || string.IsNullOrWhiteSpace(name))
        {
            error = "Tool name is required.";
            return false;
        }

        if (!parameters.TryGetPropertyValue("arguments", out var argumentsNode) || argumentsNode is null)
        {
            error = "Tool arguments are required.";
            return false;
        }

        arguments = argumentsNode as JsonObject ?? new JsonObject();
        if (argumentsNode is not JsonObject)
        {
            error = "Tool arguments must be a JSON object.";
            return false;
        }

        error = string.Empty;
        return true;
    }

    private static bool TryGetString(JsonObject value, string name, out string result)
    {
        result = string.Empty;
        if (!value.TryGetPropertyValue(name, out var node) || node is null)
        {
            return false;
        }

        try
        {
            result = node.GetValue<string>();
            return true;
        }
        catch (InvalidOperationException)
        {
            return false;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static string? GetOptionalString(JsonObject value, string name)
    {
        return TryGetString(value, name, out var result) && !string.IsNullOrWhiteSpace(result)
            ? result.Trim().ToLowerInvariant()
            : null;
    }

    private static LanguageCode GetLanguage(JsonObject arguments)
    {
        return LanguageCode.From(GetOptionalString(arguments, "lang"));
    }

    private static bool TryGetSeverity(
        JsonObject arguments,
        string name,
        RiskSeverity defaultValue,
        out RiskSeverity severity,
        out string error)
    {
        var value = GetOptionalString(arguments, name);
        if (value is null)
        {
            severity = defaultValue;
            error = string.Empty;
            return true;
        }

        foreach (var candidate in Enum.GetValues<RiskSeverity>())
        {
            if (string.Equals(candidate.ToString(), value, StringComparison.OrdinalIgnoreCase))
            {
                severity = candidate;
                error = string.Empty;
                return true;
            }
        }

        severity = defaultValue;
        error = "minSeverity must be info, low, medium, high, or critical.";
        return false;
    }

    private static bool TryParseTarget(string value, out AgentTarget target)
    {
        target = value.Trim().ToLowerInvariant() switch
        {
            "codex" => AgentTarget.Codex,
            "claude" => AgentTarget.Claude,
            "anthropic" => AgentTarget.Anthropic,
            "cursor" => AgentTarget.Cursor,
            "copilot" => AgentTarget.Copilot,
            "continue" => AgentTarget.Continue,
            "all" => AgentTarget.All,
            _ => AgentTarget.Codex
        };

        return value.Trim().ToLowerInvariant() is "codex" or "claude" or "anthropic" or "cursor" or "copilot" or "continue" or "all";
    }

    private static string BuildScanSummary(ScanResult scan, LanguageCode language, string format)
    {
        var title = language.Value == "tr" ? "AgentContextKit tarama ozeti" : "AgentContextKit scan summary";
        return string.Join(Environment.NewLine, new[]
        {
            title,
            $"- Repository: {GetRepositoryName(scan.RepositoryPath)}",
            $"- Format: {format}",
            $"- Files: {scan.Files.Count}",
            $"- Stacks: {scan.Stacks.Count}",
            $"- Risk findings: {scan.Findings.Count}",
            $"- Critical: {scan.Findings.Count(finding => finding.Severity == RiskSeverity.Critical)}",
            $"- High: {scan.Findings.Count(finding => finding.Severity == RiskSeverity.High)}"
        });
    }

    private static string BuildContextFragment(ScanResult scan, string target, LanguageCode language)
    {
        var title = language.Value == "tr" ? "AgentContextKit context onizlemesi" : "AgentContextKit context preview";
        var stacks = scan.Stacks.Count == 0
            ? "Unknown"
            : string.Join(", ", scan.Stacks.Select(stack => stack.Name));

        return string.Join(Environment.NewLine, new[]
        {
            title,
            $"- Target: {target.Trim().ToLowerInvariant()}",
            $"- Repository: {GetRepositoryName(scan.RepositoryPath)}",
            $"- Files: {scan.Files.Count}",
            $"- Stacks: {stacks}",
            $"- Risk findings: {scan.Findings.Count}",
            "- Recommended checks: ackit scan --ci; ackit doctor"
        });
    }

    private static object ToolResult(string text, object structuredContent)
    {
        return new
        {
            content = new[]
            {
                new
                {
                    type = "text",
                    text
                }
            },
            structuredContent
        };
    }

    private static object ToHealthDto(ScanResult scan)
    {
        return new
        {
            hasReadme = scan.HasReadme,
            hasLicense = scan.HasLicense,
            hasSecurityPolicy = scan.HasSecurityPolicy,
            hasContributing = scan.HasContributing,
            hasCodeOfConduct = scan.HasCodeOfConduct,
            hasChangelog = scan.HasChangelog,
            hasTests = scan.HasTests,
            hasCi = scan.HasCi,
            hasDocker = scan.HasDocker,
            hasAgentInstructions = scan.HasAgentInstructions
        };
    }

    private static object ToRiskSummary(IReadOnlyList<RiskFinding> findings)
    {
        return new
        {
            total = findings.Count,
            critical = findings.Count(finding => finding.Severity == RiskSeverity.Critical),
            high = findings.Count(finding => finding.Severity == RiskSeverity.High),
            medium = findings.Count(finding => finding.Severity == RiskSeverity.Medium),
            low = findings.Count(finding => finding.Severity == RiskSeverity.Low),
            info = findings.Count(finding => finding.Severity == RiskSeverity.Info)
        };
    }

    private static object ToFindingDto(RiskFinding finding)
    {
        return new
        {
            ruleId = RiskRuleCatalog.GetRuleId(finding),
            severity = finding.Severity.ToString(),
            category = finding.Category.ToString(),
            path = finding.Path,
            message = finding.Message,
            match = (string?)null
        };
    }

    private static IReadOnlyList<object> BuildGeneratedFilesPreview(AgentTarget target)
    {
        return target switch
        {
            AgentTarget.Codex => Files("AGENTS.md", ".codex/HANDOFF.md", ".codex/CONTEXT_PACK.md"),
            AgentTarget.Claude => Files("CLAUDE.md"),
            AgentTarget.Anthropic => Files("ANTHROPIC.md"),
            AgentTarget.Cursor => Files(".cursor/rules/project.mdc"),
            AgentTarget.Copilot => Files(".github/copilot-instructions.md"),
            AgentTarget.Continue => Files(".continue/config.json"),
            AgentTarget.All => Files(
                "AGENTS.md",
                ".codex/HANDOFF.md",
                ".codex/CONTEXT_PACK.md",
                "CLAUDE.md",
                "ANTHROPIC.md",
                ".cursor/rules/project.mdc",
                ".github/copilot-instructions.md",
                ".continue/config.json",
                "docs/PROJECT_MAP.md",
                "docs/AI_WORKFLOW.md",
                "docs/SECURITY_NOTES.md",
                "docs/DEVELOPMENT_STANDARD.md",
                "docs/tasks/TASK-0001.md"),
            _ => Array.Empty<object>()
        };
    }

    private static IReadOnlyList<object> Files(params string[] paths)
    {
        return paths.Select(path => new { path, mode = "preview-only" }).Cast<object>().ToArray();
    }

    private static string ToTargetToken(AgentTarget target)
    {
        return target.ToString().ToLowerInvariant();
    }

    private static string GetRepositoryName(string repositoryPath)
    {
        var trimmed = repositoryPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        return Path.GetFileName(trimmed);
    }

    private static string? ReadId(JsonObject value)
    {
        if (!value.TryGetPropertyValue("id", out var node) || node is null)
        {
            return null;
        }

        try
        {
            return node.GetValue<string>();
        }
        catch (InvalidOperationException)
        {
            return node.ToJsonString();
        }
        catch (FormatException)
        {
            return node.ToJsonString();
        }
    }

    private static string Serialize(McpResponse response)
    {
        return JsonSerializer.Serialize(response, JsonOptions);
    }

    private static McpResponse Success(string? id, object result)
    {
        return new McpResponse(JsonRpcVersion, id, Result: result);
    }

    private static McpResponse ParseError(string? id, string message)
    {
        return new McpResponse(JsonRpcVersion, id, Error: new McpError(-32700, $"Parse error: {message}"));
    }

    private static McpResponse InvalidRequest(string? id, string message)
    {
        return new McpResponse(JsonRpcVersion, id, Error: new McpError(-32600, $"Invalid request: {message}"));
    }

    private static McpResponse InvalidParams(string? id, string message)
    {
        return new McpResponse(JsonRpcVersion, id, Error: new McpError(-32602, $"Invalid params: {message}"));
    }

    private static McpToolDefinition Tool(string name, string description, params string[] properties)
    {
        return new McpToolDefinition(name, description, new Dictionary<string, object?>
        {
            ["type"] = "object",
            ["properties"] = properties.ToDictionary(
                property => property,
                property => (object?)new Dictionary<string, object?>
                {
                    ["type"] = property is "repoPath" or "lang" or "format" or "minSeverity" or "target" ? "string" : "object"
                },
                StringComparer.Ordinal),
            ["required"] = properties.Contains("target", StringComparer.Ordinal)
                ? new[] { "repoPath", "target" }
                : new[] { "repoPath" }
        });
    }
}
