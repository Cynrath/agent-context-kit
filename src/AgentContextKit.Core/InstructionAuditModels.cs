namespace AgentContextKit.Core;

public enum InstructionSourceType
{
    Agents,
    Claude,
    Anthropic,
    Copilot,
    Cursor,
    Continue,
    Workflow,
    DevelopmentStandard
}

public enum InstructionFindingCategory
{
    Duplication,
    Conflict,
    Platform,
    PackageManagement,
    Verification,
    Vagueness,
    Staleness,
    Scope,
    Boilerplate,
    Safety
}

public enum InstructionRulePolarity
{
    Neutral,
    Require,
    Prohibit,
    Prefer
}

public sealed record InstructionAuditOptions
{
    public IReadOnlyList<string> IncludeGlobs { get; init; } = Array.Empty<string>();

    public IReadOnlyList<string> ExcludeGlobs { get; init; } = Array.Empty<string>();

    public long MaxSourceBytes { get; init; } = 1_000_000;
}

public sealed record InstructionContentMetrics(
    int Characters,
    int Words,
    int Lines,
    int EstimatedTokens);

public sealed record InstructionAuditMetrics(
    InstructionContentMetrics Total,
    InstructionContentMetrics Duplicated,
    InstructionContentMetrics Avoidable,
    string EstimationMethod);

public sealed record InstructionLocation(
    string Path,
    int StartLine,
    int EndLine,
    string DirectoryScope);

public sealed record InstructionRule(
    string Id,
    string SourcePath,
    InstructionSourceType SourceType,
    string DirectoryScope,
    int SourcePrecedence,
    string Section,
    int StartLine,
    int EndLine,
    string OriginalText,
    string NormalizedText,
    string CoreText,
    InstructionRulePolarity Polarity,
    IReadOnlyList<string> CommandFragments,
    IReadOnlyList<string> RepositoryReferences);

public sealed record InstructionSource(
    string Path,
    InstructionSourceType Type,
    string DirectoryScope,
    int Precedence,
    bool AppliesToDescendants,
    string InheritedApplicability,
    InstructionContentMetrics Metrics,
    IReadOnlyList<InstructionRule> Rules);

public sealed record InstructionScopedOverride(
    string DirectoryScope,
    InstructionLocation BroaderRule,
    InstructionLocation NarrowerRule,
    string Reason);

public sealed record InstructionScopeResolution(
    string DirectoryScope,
    IReadOnlyList<string> ApplicableSourcePaths,
    IReadOnlyList<InstructionScopedOverride> ScopedOverrides);

public sealed record InstructionFinding(
    string RuleId,
    string Fingerprint,
    RiskSeverity Severity,
    InstructionFindingCategory Category,
    string SourcePath,
    int StartLine,
    int EndLine,
    string DirectoryScope,
    string Explanation,
    string Evidence,
    string Remediation,
    bool IsHeuristic,
    IReadOnlyList<InstructionLocation> RelatedLocations);

public sealed record InstructionAuditResult(
    IReadOnlyList<InstructionSource> Sources,
    IReadOnlyList<InstructionScopeResolution> Scopes,
    IReadOnlyList<InstructionScopedOverride> ScopedOverrides,
    IReadOnlyList<InstructionFinding> Findings,
    InstructionAuditMetrics Metrics);

public sealed record InstructionAuditRule(
    string Id,
    string Name,
    InstructionFindingCategory Category,
    RiskSeverity DefaultSeverity,
    string Description,
    string Remediation,
    bool IsHeuristic);

public static class InstructionAuditRuleCatalog
{
    public static readonly InstructionAuditRule ExactDuplicate = new(
        "ACKITOPT001",
        "ExactDuplicate",
        InstructionFindingCategory.Duplication,
        RiskSeverity.Low,
        "An instruction repeats the same normalized constraint in an overlapping scope.",
        "Keep one authoritative occurrence and retain source mapping for removed copies.",
        false);

    public static readonly InstructionAuditRule RedundantNearDuplicate = new(
        "ACKITOPT002",
        "RedundantNearDuplicate",
        InstructionFindingCategory.Duplication,
        RiskSeverity.Low,
        "Two instructions are materially similar and the later occurrence adds no clear constraint.",
        "Consolidate only after a human confirms that the shorter wording carries no unique requirement.",
        true);

    public static readonly InstructionAuditRule DirectContradiction = new(
        "ACKITOPT003",
        "DirectContradiction",
        InstructionFindingCategory.Conflict,
        RiskSeverity.High,
        "Overlapping instructions require and prohibit the same normalized action.",
        "Choose one rule explicitly or narrow the rules into non-overlapping directory scopes.",
        false);

    public static readonly InstructionAuditRule PlatformConflict = new(
        "ACKITOPT004",
        "PlatformConflict",
        InstructionFindingCategory.Platform,
        RiskSeverity.High,
        "Overlapping unconditional rules require incompatible platform or shell assumptions.",
        "Make the platform condition explicit or provide equivalent commands per supported platform.",
        true);

    public static readonly InstructionAuditRule PackageManagerConflict = new(
        "ACKITOPT005",
        "PackageManagerConflict",
        InstructionFindingCategory.PackageManagement,
        RiskSeverity.High,
        "Overlapping instructions require different package managers for the same ecosystem.",
        "Name one repository-wide package manager or scope each requirement to its owning subtree.",
        false);

    public static readonly InstructionAuditRule BuildTestConflict = new(
        "ACKITOPT006",
        "BuildTestConflict",
        InstructionFindingCategory.Verification,
        RiskSeverity.High,
        "Overlapping instructions conflict about required build or test execution.",
        "Define one objective build/test gate per applicable scope and document intentional exceptions.",
        false);

    public static readonly InstructionAuditRule UnverifiableRule = new(
        "ACKITOPT007",
        "UnverifiableRule",
        InstructionFindingCategory.Verification,
        RiskSeverity.Medium,
        "A qualitative instruction has no observable acceptance check.",
        "Replace subjective wording with a command, assertion, measurable threshold, or review checklist.",
        true);

    public static readonly InstructionAuditRule VagueRule = new(
        "ACKITOPT008",
        "VagueRule",
        InstructionFindingCategory.Vagueness,
        RiskSeverity.Medium,
        "The instruction uses a known vague phrase that does not identify a bounded result.",
        "State the affected surface and the exact behavior or check that defines completion.",
        false);

    public static readonly InstructionAuditRule StaleReference = new(
        "ACKITOPT009",
        "StaleReference",
        InstructionFindingCategory.Staleness,
        RiskSeverity.Medium,
        "An instruction references a repository-relative file or project that does not exist.",
        "Correct the repository-relative reference or remove the obsolete instruction.",
        false);

    public static readonly InstructionAuditRule OverlyBroadScope = new(
        "ACKITOPT010",
        "OverlyBroadScope",
        InstructionFindingCategory.Scope,
        RiskSeverity.Medium,
        "An instruction applies a broad action to every file or the entire repository without a narrower owner.",
        "Move the rule into the nearest applicable instruction scope or name explicit paths and exclusions.",
        true);

    public static readonly InstructionAuditRule ShadowedOrUnreachable = new(
        "ACKITOPT011",
        "ShadowedOrUnreachable",
        InstructionFindingCategory.Scope,
        RiskSeverity.Medium,
        "A rule or instruction source cannot affect content, or an earlier rule is replaced at the same scope.",
        "Remove the unreachable rule or make precedence and the intended exception explicit.",
        false);

    public static readonly InstructionAuditRule RepeatedBoilerplate = new(
        "ACKITOPT012",
        "RepeatedBoilerplate",
        InstructionFindingCategory.Boilerplate,
        RiskSeverity.Low,
        "The same instruction boilerplate appears three or more times.",
        "Keep a single authoritative rule and reference it from narrower surfaces where supported.",
        false);

    public static readonly InstructionAuditRule UnsafeAutomaticAction = new(
        "ACKITOPT013",
        "UnsafeAutomaticAction",
        InstructionFindingCategory.Safety,
        RiskSeverity.High,
        "An instruction directs an automatic destructive, publishing, deployment, or history-changing action without review.",
        "Require explicit confirmation and exact target validation, or keep the action human-controlled.",
        false);

    public static readonly InstructionAuditRule SafetyBoundaryConflict = new(
        "ACKITOPT014",
        "SafetyBoundaryConflict",
        InstructionFindingCategory.Safety,
        RiskSeverity.Critical,
        "An instruction conflicts with repository safety or release boundaries.",
        "Preserve the stricter safety boundary and route the requested action through explicit authorization and review.",
        false);

    public static readonly InstructionAuditRule AmbiguousPrecedence = new(
        "ACKITOPT015",
        "AmbiguousPrecedence",
        InstructionFindingCategory.Scope,
        RiskSeverity.High,
        "Conflicting instructions have equal effective precedence in the same scope.",
        "Choose an authoritative surface or document deterministic precedence for the conflicting rules.",
        true);

    public static IReadOnlyList<InstructionAuditRule> All { get; } =
    [
        ExactDuplicate,
        RedundantNearDuplicate,
        DirectContradiction,
        PlatformConflict,
        PackageManagerConflict,
        BuildTestConflict,
        UnverifiableRule,
        VagueRule,
        StaleReference,
        OverlyBroadScope,
        ShadowedOrUnreachable,
        RepeatedBoilerplate,
        UnsafeAutomaticAction,
        SafetyBoundaryConflict,
        AmbiguousPrecedence
    ];

    public static InstructionAuditRule Get(string id)
    {
        return All.First(rule => string.Equals(rule.Id, id, StringComparison.Ordinal));
    }
}
