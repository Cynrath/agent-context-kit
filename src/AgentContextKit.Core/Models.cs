namespace AgentContextKit.Core;

public enum RiskSeverity
{
    Info = 0,
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

public enum RiskCategory
{
    Secret,
    Pii,
    Brand,
    LocalPath,
    ProductionConfig,
    BuildArtifact,
    RepositoryHygiene,
    Documentation,
    Configuration
}

public enum AgentTarget
{
    Codex,
    Claude,
    Anthropic,
    Cursor,
    Copilot,
    Continue,
    All
}

public enum GeneratedFileStatus
{
    Created,
    SkippedExisting
}

public readonly record struct LanguageCode
{
    private LanguageCode(string value)
    {
        Value = value;
    }

    public string Value { get; }

    public static LanguageCode English => new("en");

    public static LanguageCode Turkish => new("tr");

    public static LanguageCode From(string? value)
    {
        return string.Equals(value?.Trim(), "tr", StringComparison.OrdinalIgnoreCase)
            ? Turkish
            : English;
    }

    public override string ToString()
    {
        return Value;
    }
}

public sealed record StackInfo(string Name, string Signal);

public sealed record RiskFinding(
    RiskSeverity Severity,
    RiskCategory Category,
    string Path,
    string Message,
    string? Match = null);

public enum RiskSuppressionReason
{
    SafeDomain,
    IgnoredPath,
    IgnoredFindingId
}

public sealed record RiskSuppression(
    string RuleId,
    RiskSeverity Severity,
    RiskCategory Category,
    string Path,
    RiskSuppressionReason Reason);

public sealed record RiskScanResult(
    IReadOnlyList<RiskFinding> Findings,
    IReadOnlyList<RiskSuppression> Suppressions);

public sealed record BrandPiiScanResult(
    IReadOnlyList<RiskFinding> Findings,
    IReadOnlyList<RiskSuppression> Suppressions);

public sealed record RiskRule(
    string Id,
    string Name,
    RiskCategory Category,
    RiskSeverity DefaultSeverity,
    string Description,
    string Recommendation);

public static class RiskRuleCatalog
{
    public static readonly RiskRule SecretLike = new(
        "ACKIT001",
        "SecretLike",
        RiskCategory.Secret,
        RiskSeverity.Critical,
        "Secret-like value, credential, key, or production secret risk.",
        "Remove the secret from source, rotate the credential if it was real, and move runtime values to a safe local secret store.");

    public static readonly RiskRule PiiOrBrandLike = new(
        "ACKIT002",
        "PiiOrBrandLike",
        RiskCategory.Pii,
        RiskSeverity.Medium,
        "PII-like, brand-like, email-like, or domain-like value requiring review.",
        "Confirm the value is intended for public release or replace it with a safe placeholder.");

    public static readonly RiskRule GeneratedOrBuildArtifact = new(
        "ACKIT003",
        "GeneratedOrBuildArtifact",
        RiskCategory.BuildArtifact,
        RiskSeverity.Medium,
        "Generated, build, package, backup, database, or archive artifact requiring review.",
        "Remove generated artifacts from source control and keep local outputs ignored.");

    public static readonly RiskRule LocalPathOrPrivateLocation = new(
        "ACKIT004",
        "LocalPathOrPrivateLocation",
        RiskCategory.LocalPath,
        RiskSeverity.Low,
        "Local path, user profile path, file URI, or private machine location requiring review.",
        "Replace absolute local paths with repository-relative paths or documentation-safe placeholders.");

    public static readonly RiskRule RepositoryHygiene = new(
        "ACKIT005",
        "RepositoryHygiene",
        RiskCategory.RepositoryHygiene,
        RiskSeverity.Medium,
        "Repository hygiene, configuration, documentation, or release readiness issue.",
        "Review the repository hygiene item before public release or generated context export.");

    public static readonly RiskRule ProductionConfigLike = new(
        "ACKIT006",
        "ProductionConfigLike",
        RiskCategory.ProductionConfig,
        RiskSeverity.High,
        "Production configuration, deployment manifest, environment template, or live-service connection string requiring review.",
        "Replace production connection strings, environment names, and deployment-only settings with safe local or placeholder values before public release.");

    public static readonly RiskRule DocumentationGap = new(
        "ACKIT007",
        "DocumentationGap",
        RiskCategory.Documentation,
        RiskSeverity.Medium,
        "Documentation gap, stale guidance, missing required public document, or unclear wording requiring review.",
        "Update or add the relevant public documentation so the next reader or AI agent receives accurate, current guidance.");

    public static readonly RiskRule GeneralFinding = new(
        "ACKIT999",
        "GeneralFinding",
        RiskCategory.RepositoryHygiene,
        RiskSeverity.Info,
        "General AgentContextKit scanner finding.",
        "Review the finding and decide whether it should remain in the repository.");

    public static readonly RiskRule HighEntropyString = new(
        "ACKIT008",
        "HighEntropyString",
        RiskCategory.RepositoryHygiene,
        RiskSeverity.High,
        "Long high-entropy string detected that may indicate an embedded secret, signing key, or signing token.",
        "Confirm the value is intentionally public; if it is a credential, remove it from source, rotate it, and move it to a safe local secret store.");

    public static IReadOnlyList<RiskRule> All { get; } =
    [
        SecretLike,
        PiiOrBrandLike,
        GeneratedOrBuildArtifact,
        LocalPathOrPrivateLocation,
        RepositoryHygiene,
        ProductionConfigLike,
        DocumentationGap,
        HighEntropyString,
        GeneralFinding
    ];

    public static RiskRule GetRule(RiskFinding finding)
    {
        var id = GetRuleId(finding);
        return All.First(rule => string.Equals(rule.Id, id, StringComparison.OrdinalIgnoreCase));
    }

    public static string GetRuleId(RiskFinding finding)
    {
        // HighEntropyString findings are emitted with the message "High-entropy string detected";
        // route them to ACKIT008 instead of the default RepositoryHygiene rule.
        if (finding.Category == RiskCategory.RepositoryHygiene &&
            finding.Message.StartsWith("High-entropy", StringComparison.Ordinal))
        {
            return HighEntropyString.Id;
        }

        return finding.Category switch
        {
            RiskCategory.Secret => SecretLike.Id,
            RiskCategory.ProductionConfig => ProductionConfigLike.Id,
            RiskCategory.Pii or RiskCategory.Brand => PiiOrBrandLike.Id,
            RiskCategory.BuildArtifact => GeneratedOrBuildArtifact.Id,
            RiskCategory.LocalPath => LocalPathOrPrivateLocation.Id,
            RiskCategory.RepositoryHygiene or RiskCategory.Configuration => RepositoryHygiene.Id,
            RiskCategory.Documentation => DocumentationGap.Id,
            _ => GeneralFinding.Id
        };
    }
}

public sealed record ProjectMap(IReadOnlyList<string> Files, IReadOnlyList<StackInfo> Stacks);

public sealed record ScanResult(
    string RepositoryPath,
    IReadOnlyList<string> Files,
    IReadOnlyList<StackInfo> Stacks,
    IReadOnlyList<RiskFinding> Findings,
    bool HasReadme,
    bool HasLicense,
    bool HasSecurityPolicy,
    bool HasContributing,
    bool HasCodeOfConduct,
    bool HasChangelog,
    bool HasTests,
    bool HasCi,
    bool HasDocker,
    bool HasAgentInstructions)
{
    public IReadOnlyList<RiskSuppression> Suppressions { get; init; } = Array.Empty<RiskSuppression>();
}

public sealed record GeneratedFileResult(
    string Path,
    GeneratedFileStatus Status,
    string Message)
{
    public bool Created => Status == GeneratedFileStatus.Created;
}

public sealed record TaskSpec(string Title, LanguageCode Language);

public sealed record ContextExportSpec(
    string PromptPackPath,
    string? OutputPath,
    string ApprovalMode,
    LanguageCode Language);

public sealed record RepositoryProfile(string RootPath, IReadOnlyList<string> Files, IReadOnlyList<StackInfo> Stacks);

public sealed record AckitConfig(
    int SchemaVersion,
    LanguageCode DefaultLanguage,
    IReadOnlyList<string> BrandKeywords,
    IReadOnlyList<string> PiiKeywords,
    IReadOnlyList<string> IgnorePaths,
    IReadOnlyList<string> RiskExtensions,
    IReadOnlyList<string> SafeDomains,
    IReadOnlyList<string> IgnoredPaths,
    IReadOnlyList<string> IgnoredFindingIds)
{
    public static AckitConfig Default => new(
        1,
        LanguageCode.English,
        Array.Empty<string>(),
        Array.Empty<string>(),
        [".ackit/cache/", ".ackit/reports/", ".ackit/webui/", ".ackit/prompt-packs/", ".ackit/context-exports/"],
        [".bak", ".tmp", ".log", ".sql"],
        Array.Empty<string>(),
        Array.Empty<string>(),
        Array.Empty<string>());
}

public enum LlmMessageRole
{
    System,
    User,
    Assistant,
    Tool
}

public sealed record LlmMessage(LlmMessageRole Role, string Content);

public sealed record LlmTokenUsage(int? InputTokens, int? OutputTokens, int? TotalTokens);

public sealed record LlmProviderRequest
{
    public LlmProviderRequest(
        string model,
        IReadOnlyList<LlmMessage> messages,
        bool dryRun = true,
        string? exportReviewId = null,
        string? auditCorrelationId = null,
        IReadOnlyDictionary<string, string>? metadata = null)
    {
        Model = model;
        Messages = messages.ToArray();
        DryRun = dryRun;
        ExportReviewId = exportReviewId;
        AuditCorrelationId = auditCorrelationId;
        Metadata = metadata is null
            ? new Dictionary<string, string>()
            : new Dictionary<string, string>(metadata);
    }

    public string Model { get; init; }

    public IReadOnlyList<LlmMessage> Messages { get; init; }

    public bool DryRun { get; init; }

    public string? ExportReviewId { get; init; }

    public string? AuditCorrelationId { get; init; }

    public IReadOnlyDictionary<string, string> Metadata { get; init; }
}

public sealed record LlmProviderResponse
{
    public LlmProviderResponse(
        string outputText,
        string providerName,
        string model,
        string? requestId = null,
        LlmTokenUsage? tokenUsage = null,
        IReadOnlyList<string>? warnings = null)
    {
        OutputText = outputText;
        ProviderName = providerName;
        Model = model;
        RequestId = requestId;
        TokenUsage = tokenUsage;
        Warnings = warnings?.ToArray() ?? Array.Empty<string>();
    }

    public string OutputText { get; init; }

    public string ProviderName { get; init; }

    public string Model { get; init; }

    public string? RequestId { get; init; }

    public LlmTokenUsage? TokenUsage { get; init; }

    public IReadOnlyList<string> Warnings { get; init; }
}

public sealed record CommandResult(int ExitCode, string Message);

public sealed record DoctorCheck(string Name, RiskSeverity Severity, bool Passed, string Message);

public sealed record DoctorResult(IReadOnlyList<DoctorCheck> Checks);
