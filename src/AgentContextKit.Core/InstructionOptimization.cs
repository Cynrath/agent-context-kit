using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;

namespace AgentContextKit.Core;

public sealed class InstructionOptimizationProposalGenerator : IInstructionOptimizationProposalGenerator
{
    private const string EstimationMethod = "Parsed instruction-body estimated tokens = ceiling of normalized UTF-16 character count divided by 4. This is a deterministic local size estimate, not exact tokenizer output or model billing.";
    private static readonly Regex WordRegex = new(@"[\p{L}\p{N}]+(?:[-_][\p{L}\p{N}]+)*", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex WhitespaceRegex = new(@"\s+", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex ApiKeyRegex = new(@"\b(?:sk|rk|pk)[-_](?:proj[-_])?[A-Za-z0-9_-]{12,}\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex GitHubTokenRegex = new(@"\b(?:gh" + @"[pousr]_[A-Za-z0-9]{20,}|github" + @"_pat_[A-Za-z0-9_]{20,})\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex AwsKeyRegex = new(@"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex BearerRegex = new(@"\bbearer\s+[A-Za-z0-9._~+/=-]{12,}", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex CredentialRegex = new(@"\b(?:api[-_ ]?key|token|secret|password|credential)\s*[:=]?\s+[A-Za-z0-9._~+/=-]{12,}", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex EmailRegex = new(@"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex Ipv4Regex = new(@"(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?!\d)", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex PhoneRegex = new(@"(?<!\d)(?:\+?\d[\s().-]*){10,15}(?!\d)", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex WindowsPathRegex = new(@"(?<![\p{L}\p{N}])[A-Za-z]:[\\/](?:[^\s`<>|]+[\\/])*[^\s`<>|]*", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex UncPathRegex = new(@"(?<![\\])\\\\[^\s`<>|]+\\[^\s`<>|]+", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex HomePathRegex = new(@"(?<![\p{L}\p{N}])/(?:home|users|private|root)/[^\s`<>|]+", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex PrivateKeyRegex = new("-----BEGIN " + @"[A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", RegexOptions.IgnoreCase | RegexOptions.Singleline | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex SecurityRegex = new(@"\b(?:security|secrets?|credentials?|passwords?|tokens?|authorization|authorisation|permissions?|destructive|force[- ]?push|reset\s+--hard)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex VerificationRegex = new(@"\b(?:test|tests|build|lint|format|check|verify|validation|compile)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex DeploymentRegex = new(@"\b(?:deploy|deployment|production)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex DocumentationRegex = new(@"\b(?:documentation|document|docs|readme|changelog|project\s+map|handoff)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex ReleaseRegex = new(@"\b(?:release|tag|publish|publication|attestation|artifact)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly string[] ConflictRuleIds =
    [
        InstructionAuditRuleCatalog.DirectContradiction.Id,
        InstructionAuditRuleCatalog.PlatformConflict.Id,
        InstructionAuditRuleCatalog.PackageManagerConflict.Id,
        InstructionAuditRuleCatalog.BuildTestConflict.Id,
        InstructionAuditRuleCatalog.UnsafeAutomaticAction.Id,
        InstructionAuditRuleCatalog.SafetyBoundaryConflict.Id,
        InstructionAuditRuleCatalog.AmbiguousPrecedence.Id
    ];

    private readonly IFileSystem _fileSystem;

    public InstructionOptimizationProposalGenerator(IFileSystem fileSystem)
    {
        _fileSystem = fileSystem;
    }

    public InstructionOptimizationProposal Build(
        InstructionAuditResult audit,
        string repositoryName,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(audit);
        ArgumentException.ThrowIfNullOrWhiteSpace(repositoryName);
        cancellationToken.ThrowIfCancellationRequested();

        var rules = audit.Sources
            .SelectMany(source => source.Rules)
            .OrderBy(rule => rule.SourcePath, PathComparer)
            .ThenBy(rule => rule.SourcePath, StringComparer.Ordinal)
            .ThenBy(rule => rule.StartLine)
            .ThenBy(rule => rule.EndLine)
            .ThenBy(rule => rule.Id, StringComparer.Ordinal)
            .ToArray();
        var rulesByLocation = rules
            .GroupBy(LocationKey, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.OrdinalIgnoreCase);
        var protectedRuleIds = FindProtectedRuleIds(audit, rulesByLocation);
        var removedRuleIds = new HashSet<string>(StringComparer.Ordinal);
        var consolidations = new List<InstructionConsolidation>();

        foreach (var group in BuildExactDuplicateGroups(audit, rulesByLocation))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var kept = SelectRepresentative(group);
            var removed = group.Where(rule => !string.Equals(rule.Id, kept.Id, StringComparison.Ordinal)).ToArray();
            foreach (var rule in removed)
            {
                removedRuleIds.Add(rule.Id);
            }
            consolidations.Add(new InstructionConsolidation(
                "ExactDuplicate",
                ToLocation(kept),
                removed.Select(ToLocation).OrderBy(LocationSortKey, StringComparer.Ordinal).ToArray(),
                "Normalized constraints are identical in overlapping scopes; the broadest authoritative occurrence is retained."));
        }

        foreach (var finding in audit.Findings.Where(item => item.RuleId == InstructionAuditRuleCatalog.RedundantNearDuplicate.Id))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var pair = ResolveFindingRules(finding, rulesByLocation)
                .Where(rule => !removedRuleIds.Contains(rule.Id))
                .DistinctBy(rule => rule.Id, StringComparer.Ordinal)
                .ToArray();
            if (pair.Length != 2 || !CanConsolidateNearDuplicate(pair[0], pair[1], protectedRuleIds))
            {
                continue;
            }

            var kept = SelectRepresentative(pair);
            var removed = pair.Single(rule => !string.Equals(rule.Id, kept.Id, StringComparison.Ordinal));
            removedRuleIds.Add(removed.Id);
            consolidations.Add(new InstructionConsolidation(
                "ConservativeNearDuplicate",
                ToLocation(kept),
                [ToLocation(removed)],
                "The rules have the same scope, polarity, normalized core, command fragments, repository references, and mandatory-constraint categories."));
        }

        var retained = rules.Where(rule => !removedRuleIds.Contains(rule.Id)).ToArray();
        var unresolved = BuildUnresolvedDecisions(audit);
        var mandatory = BuildMandatoryConstraints(retained);
        var metrics = BuildMetrics(rules, retained);
        var orderedConsolidations = consolidations
            .OrderBy(item => LocationSortKey(item.Kept), StringComparer.Ordinal)
            .ThenBy(item => item.Kind, StringComparer.Ordinal)
            .ToArray();
        var markdown = RenderMarkdown(
            repositoryName,
            retained,
            orderedConsolidations,
            unresolved,
            mandatory,
            audit.ScopedOverrides,
            audit.Findings,
            metrics);

        return new InstructionOptimizationProposal(
            markdown,
            metrics,
            retained,
            orderedConsolidations,
            unresolved,
            mandatory);
    }

    public GeneratedFileResult Generate(
        string repositoryPath,
        string relativeOutputPath,
        InstructionAuditResult audit,
        InstructionOptimizationProposal proposal)
    {
        ArgumentNullException.ThrowIfNull(audit);
        ArgumentNullException.ThrowIfNull(proposal);
        var outputPath = NormalizeOutputPath(repositoryPath, relativeOutputPath);
        if (audit.Sources.Any(source => string.Equals(source.Path, outputPath, StringComparison.OrdinalIgnoreCase)) ||
            IsKnownInstructionSurface(outputPath))
        {
            throw new InvalidOperationException("Optimize proposal path must not target an instruction source.");
        }

        var fullPath = Path.Combine(repositoryPath, outputPath.Replace('/', Path.DirectorySeparatorChar));
        if (!_fileSystem.WriteAllTextIfNotExists(fullPath, proposal.Markdown.TrimEnd('\r', '\n') + "\n"))
        {
            return new GeneratedFileResult(outputPath, GeneratedFileStatus.SkippedExisting, "Existing optimize proposal was not overwritten.");
        }

        return new GeneratedFileResult(outputPath, GeneratedFileStatus.Created, "Review-only optimize proposal created.");
    }

    private static IReadOnlyList<IReadOnlyList<InstructionRule>> BuildExactDuplicateGroups(
        InstructionAuditResult audit,
        IReadOnlyDictionary<string, InstructionRule> rulesByLocation)
    {
        var adjacency = new Dictionary<string, HashSet<string>>(StringComparer.Ordinal);
        var ruleLookup = new Dictionary<string, InstructionRule>(StringComparer.Ordinal);
        foreach (var finding in audit.Findings.Where(item => item.RuleId == InstructionAuditRuleCatalog.ExactDuplicate.Id))
        {
            var pair = ResolveFindingRules(finding, rulesByLocation).DistinctBy(rule => rule.Id, StringComparer.Ordinal).ToArray();
            if (pair.Length < 2)
            {
                continue;
            }
            foreach (var rule in pair)
            {
                ruleLookup[rule.Id] = rule;
                adjacency.TryAdd(rule.Id, new HashSet<string>(StringComparer.Ordinal));
            }
            for (var index = 1; index < pair.Length; index++)
            {
                adjacency[pair[0].Id].Add(pair[index].Id);
                adjacency[pair[index].Id].Add(pair[0].Id);
            }
        }

        var visited = new HashSet<string>(StringComparer.Ordinal);
        var groups = new List<IReadOnlyList<InstructionRule>>();
        foreach (var id in adjacency.Keys.OrderBy(value => value, StringComparer.Ordinal))
        {
            if (!visited.Add(id))
            {
                continue;
            }
            var pending = new Stack<string>();
            var group = new List<InstructionRule>();
            pending.Push(id);
            while (pending.Count > 0)
            {
                var current = pending.Pop();
                group.Add(ruleLookup[current]);
                foreach (var related in adjacency[current].OrderByDescending(value => value, StringComparer.Ordinal))
                {
                    if (visited.Add(related))
                    {
                        pending.Push(related);
                    }
                }
            }
            groups.Add(group.OrderBy(rule => LocationSortKey(ToLocation(rule)), StringComparer.Ordinal).ToArray());
        }
        return groups;
    }

    private static HashSet<string> FindProtectedRuleIds(
        InstructionAuditResult audit,
        IReadOnlyDictionary<string, InstructionRule> rulesByLocation)
    {
        var protectedIds = new HashSet<string>(StringComparer.Ordinal);
        foreach (var finding in audit.Findings.Where(item => ConflictRuleIds.Contains(item.RuleId, StringComparer.Ordinal)))
        {
            foreach (var rule in ResolveFindingRules(finding, rulesByLocation))
            {
                protectedIds.Add(rule.Id);
            }
        }
        foreach (var item in audit.ScopedOverrides)
        {
            AddLocation(item.BroaderRule);
            AddLocation(item.NarrowerRule);
        }
        return protectedIds;

        void AddLocation(InstructionLocation location)
        {
            if (rulesByLocation.TryGetValue(LocationKey(location), out var rule))
            {
                protectedIds.Add(rule.Id);
            }
        }
    }

    private static IReadOnlyList<InstructionRule> ResolveFindingRules(
        InstructionFinding finding,
        IReadOnlyDictionary<string, InstructionRule> rulesByLocation)
    {
        var locations = new[]
        {
            new InstructionLocation(finding.SourcePath, finding.StartLine, finding.EndLine, finding.DirectoryScope)
        }.Concat(finding.RelatedLocations);
        return locations
            .Select(location => rulesByLocation.TryGetValue(LocationKey(location), out var rule) ? rule : null)
            .Where(rule => rule is not null)
            .Cast<InstructionRule>()
            .ToArray();
    }

    private static bool CanConsolidateNearDuplicate(
        InstructionRule left,
        InstructionRule right,
        IReadOnlySet<string> protectedRuleIds)
    {
        return !protectedRuleIds.Contains(left.Id) &&
               !protectedRuleIds.Contains(right.Id) &&
               string.Equals(left.DirectoryScope, right.DirectoryScope, StringComparison.OrdinalIgnoreCase) &&
               left.Polarity == right.Polarity &&
               string.Equals(left.CoreText, right.CoreText, StringComparison.Ordinal) &&
               left.CommandFragments.SequenceEqual(right.CommandFragments, StringComparer.OrdinalIgnoreCase) &&
               left.RepositoryReferences.SequenceEqual(right.RepositoryReferences, StringComparer.OrdinalIgnoreCase) &&
               GetMandatoryCategories(left).SequenceEqual(GetMandatoryCategories(right), StringComparer.Ordinal);
    }

    private static InstructionRule SelectRepresentative(IEnumerable<InstructionRule> candidates)
    {
        return candidates
            .OrderBy(rule => ScopeDepth(rule.DirectoryScope))
            .ThenByDescending(rule => rule.CommandFragments.Count + rule.RepositoryReferences.Count)
            .ThenByDescending(rule => rule.SourcePrecedence)
            .ThenByDescending(rule => rule.OriginalText.Length)
            .ThenBy(rule => rule.SourcePath, PathComparer)
            .ThenBy(rule => rule.SourcePath, StringComparer.Ordinal)
            .ThenBy(rule => rule.StartLine)
            .ThenBy(rule => rule.Id, StringComparer.Ordinal)
            .First();
    }

    private static IReadOnlyList<InstructionUnresolvedDecision> BuildUnresolvedDecisions(InstructionAuditResult audit)
    {
        return audit.Findings
            .Where(finding => ConflictRuleIds.Contains(finding.RuleId, StringComparer.Ordinal))
            .Select(finding => new InstructionUnresolvedDecision(
                finding.RuleId,
                finding.Fingerprint,
                finding.Severity,
                finding.Category,
                finding.Explanation,
                new[]
                {
                    new InstructionLocation(finding.SourcePath, finding.StartLine, finding.EndLine, finding.DirectoryScope)
                }.Concat(finding.RelatedLocations)
                    .Distinct()
                    .OrderBy(LocationSortKey, StringComparer.Ordinal)
                    .ToArray()))
            .OrderByDescending(item => item.Severity)
            .ThenBy(item => item.RuleId, StringComparer.Ordinal)
            .ThenBy(item => item.Fingerprint, StringComparer.Ordinal)
            .ToArray();
    }

    private static IReadOnlyList<InstructionMandatoryConstraint> BuildMandatoryConstraints(IReadOnlyList<InstructionRule> retained)
    {
        return retained
            .SelectMany(rule => GetMandatoryCategories(rule).Select(category => (Category: category, Location: ToLocation(rule))))
            .GroupBy(item => item.Category, StringComparer.Ordinal)
            .OrderBy(group => group.Key, StringComparer.Ordinal)
            .Select(group => new InstructionMandatoryConstraint(
                group.Key,
                group.Select(item => item.Location).Distinct().OrderBy(LocationSortKey, StringComparer.Ordinal).ToArray()))
            .ToArray();
    }

    private static IReadOnlyList<string> GetMandatoryCategories(InstructionRule rule)
    {
        var categories = new List<string>();
        var text = rule.OriginalText;
        if (SecurityRegex.IsMatch(text)) categories.Add("Security");
        if (VerificationRegex.IsMatch(text)) categories.Add("Verification");
        if (DeploymentRegex.IsMatch(text)) categories.Add("Deployment");
        if (DocumentationRegex.IsMatch(text)) categories.Add("Documentation");
        if (ReleaseRegex.IsMatch(text)) categories.Add("Release");
        return categories;
    }

    private static InstructionOptimizationProposalMetrics BuildMetrics(
        IReadOnlyList<InstructionRule> before,
        IReadOnlyList<InstructionRule> after)
    {
        var beforeMetrics = MeasureRules(before);
        var afterMetrics = MeasureRules(after);
        return new InstructionOptimizationProposalMetrics(
            beforeMetrics,
            afterMetrics,
            new InstructionContentMetrics(
                Math.Max(0, beforeMetrics.Characters - afterMetrics.Characters),
                Math.Max(0, beforeMetrics.Words - afterMetrics.Words),
                Math.Max(0, beforeMetrics.Lines - afterMetrics.Lines),
                Math.Max(0, beforeMetrics.EstimatedTokens - afterMetrics.EstimatedTokens)),
            EstimationMethod);
    }

    private static InstructionContentMetrics MeasureRules(IReadOnlyList<InstructionRule> rules)
    {
        if (rules.Count == 0)
        {
            return new InstructionContentMetrics(0, 0, 0, 0);
        }
        var text = string.Join('\n', rules.Select(rule => NormalizeNewLines(rule.OriginalText)));
        return new InstructionContentMetrics(
            text.Length,
            WordRegex.Matches(text).Count,
            text.Count(character => character == '\n') + 1,
            (int)Math.Ceiling(text.Length / 4d));
    }

    private static string RenderMarkdown(
        string repositoryName,
        IReadOnlyList<InstructionRule> retained,
        IReadOnlyList<InstructionConsolidation> consolidations,
        IReadOnlyList<InstructionUnresolvedDecision> unresolved,
        IReadOnlyList<InstructionMandatoryConstraint> mandatory,
        IReadOnlyList<InstructionScopedOverride> scopedOverrides,
        IReadOnlyList<InstructionFinding> findings,
        InstructionOptimizationProposalMetrics metrics)
    {
        var lines = new List<string>
        {
            "# ACKit Optimize review proposal",
            "",
            $"Repository: **{Escape(Sanitize(repositoryName))}**",
            "",
            "> REVIEW ONLY / DRY RUN: this local artifact is a deterministic proposal, not an apply-ready instruction file. It did not modify source instructions or call a remote service.",
            "",
            "## Review boundary",
            "",
            "- Apply behavior is not implemented.",
            "- Contradictions, ambiguous precedence, and unsafe automatic actions remain unresolved for human decision.",
            "- Exact duplicates and only conservative same-scope near-duplicates are consolidated below.",
            "- Security, verification, deployment, documentation, and release constraints detected in retained rules remain source-mapped.",
            "",
            "## Before/after parsed instruction-body metrics",
            "",
            "These metrics cover parsed rule bodies, not complete source files.",
            "",
            "| Metric | Before | After | Avoided |",
            "| --- | ---: | ---: | ---: |",
            $"| Characters | {Invariant(metrics.Before.Characters)} | {Invariant(metrics.After.Characters)} | {Invariant(metrics.Saved.Characters)} |",
            $"| Words | {Invariant(metrics.Before.Words)} | {Invariant(metrics.After.Words)} | {Invariant(metrics.Saved.Words)} |",
            $"| Lines | {Invariant(metrics.Before.Lines)} | {Invariant(metrics.After.Lines)} | {Invariant(metrics.Saved.Lines)} |",
            $"| Estimated tokens | {Invariant(metrics.Before.EstimatedTokens)} | {Invariant(metrics.After.EstimatedTokens)} | {Invariant(metrics.Saved.EstimatedTokens)} |",
            "",
            $"Method: {Escape(metrics.EstimationMethod)}",
            "",
            "## Consolidation mapping",
            ""
        };

        if (consolidations.Count == 0)
        {
            lines.Add("No rule was safe to consolidate automatically.");
        }
        else
        {
            foreach (var item in consolidations)
            {
                lines.Add($"### {Escape(item.Kind)}");
                lines.Add("");
                lines.Add($"- Kept: {FormatLocation(item.Kept)}");
                lines.Add($"- Reason: {Escape(item.Reason)}");
                lines.Add("- Consolidated occurrences:");
                foreach (var location in item.Removed)
                {
                    lines.Add($"  - {FormatLocation(location)}");
                }
                lines.Add("");
            }
        }

        lines.Add("## Proposed retained instruction set");
        lines.Add("");
        foreach (var scope in retained.GroupBy(rule => rule.DirectoryScope, StringComparer.OrdinalIgnoreCase)
                     .OrderBy(group => ScopeDepth(group.Key))
                     .ThenBy(group => group.Key, PathComparer)
                     .ThenBy(group => group.Key, StringComparer.Ordinal))
        {
            lines.Add($"### Scope `{EscapeCode(scope.Key)}`");
            lines.Add("");
            foreach (var rule in scope.OrderBy(rule => rule.SourcePath, PathComparer).ThenBy(rule => rule.StartLine))
            {
                lines.Add($"- {Escape(Sanitize(rule.OriginalText))}  ");
                lines.Add($"  Source: {FormatLocation(ToLocation(rule))}");
            }
            lines.Add("");
        }
        if (retained.Count == 0)
        {
            lines.Add("No parsed instruction rules were discovered.");
            lines.Add("");
        }

        lines.Add("## Valid scoped overrides preserved");
        lines.Add("");
        if (scopedOverrides.Count == 0)
        {
            lines.Add("No valid scoped override was detected.");
        }
        else
        {
            foreach (var item in scopedOverrides.OrderBy(item => item.DirectoryScope, PathComparer).ThenBy(item => LocationSortKey(item.NarrowerRule), StringComparer.Ordinal))
            {
                lines.Add($"- Scope `{EscapeCode(item.DirectoryScope)}`: {FormatLocation(item.NarrowerRule)} overrides {FormatLocation(item.BroaderRule)}. {Escape(item.Reason)}");
            }
        }

        lines.Add("");
        lines.Add("## Mandatory constraints preserved");
        lines.Add("");
        if (mandatory.Count == 0)
        {
            lines.Add("No mandatory-category rule was deterministically classified.");
        }
        else
        {
            foreach (var item in mandatory)
            {
                lines.Add($"- {Escape(item.Category)}: {string.Join(", ", item.RetainedLocations.Select(FormatLocation))}");
            }
        }

        lines.Add("");
        lines.Add("## Unresolved human decisions");
        lines.Add("");
        if (unresolved.Count == 0)
        {
            lines.Add("No conflict or unsafe-action decision was detected.");
        }
        else
        {
            foreach (var item in unresolved)
            {
                lines.Add($"### {item.RuleId} — {item.Severity} / {item.Category}");
                lines.Add("");
                lines.Add($"- Explanation: {Escape(item.Explanation)}");
                lines.Add($"- Fingerprint: `{EscapeCode(item.Fingerprint)}`");
                lines.Add($"- Source locations: {string.Join(", ", item.Locations.Select(FormatLocation))}");
                lines.Add("- Required decision: choose an authoritative safe rule or narrow applicability explicitly; ACKit did not choose for you.");
                lines.Add("");
            }
        }

        var otherFindings = findings.Where(finding =>
                finding.RuleId != InstructionAuditRuleCatalog.ExactDuplicate.Id &&
                finding.RuleId != InstructionAuditRuleCatalog.RedundantNearDuplicate.Id &&
                !ConflictRuleIds.Contains(finding.RuleId, StringComparer.Ordinal))
            .ToArray();
        lines.Add("## Other review findings retained");
        lines.Add("");
        if (otherFindings.Length == 0)
        {
            lines.Add("No additional finding remains.");
        }
        else
        {
            foreach (var finding in otherFindings)
            {
                lines.Add($"- {finding.RuleId} ({finding.Severity}, {(finding.IsHeuristic ? "heuristic" : "deterministic")}) at {FormatLocation(new InstructionLocation(finding.SourcePath, finding.StartLine, finding.EndLine, finding.DirectoryScope))}: {Escape(finding.Explanation)}");
            }
        }

        lines.Add("");
        lines.Add("## Human review checklist");
        lines.Add("");
        lines.Add("- Resolve every unresolved decision against repository owners and safety/release policy.");
        lines.Add("- Confirm each consolidated occurrence added no hidden constraint.");
        lines.Add("- Correct vague and stale rules in their owning source files through normal review.");
        lines.Add("- Re-run `ackit optimize` after reviewed edits and compare metrics/findings.");
        lines.Add("- Do not copy this proposal over an instruction source without a separate human-reviewed change.");
        return string.Join('\n', lines).TrimEnd() + "\n";
    }

    private static string NormalizeOutputPath(string repositoryPath, string relativeOutputPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(repositoryPath);
        if (string.IsNullOrWhiteSpace(relativeOutputPath))
        {
            throw new InvalidOperationException("Optimize proposal path is required.");
        }
        var normalized = relativeOutputPath.Trim().Replace('\\', '/');
        if (Path.IsPathRooted(normalized) || normalized.Contains(':'))
        {
            throw new InvalidOperationException("Optimize proposal path must be repository-relative.");
        }
        var segments = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 0 || segments.Any(segment => segment is "." or ".."))
        {
            throw new InvalidOperationException("Optimize proposal path must stay inside the repository.");
        }
        if (!normalized.EndsWith(".md", StringComparison.OrdinalIgnoreCase) &&
            !normalized.EndsWith(".markdown", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Optimize proposal path must end with .md or .markdown.");
        }
        try
        {
            var root = Path.GetFullPath(repositoryPath);
            var target = Path.GetFullPath(Path.Combine(root, normalized.Replace('/', Path.DirectorySeparatorChar)));
            var prefix = root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
            var comparison = OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;
            if (!target.StartsWith(prefix, comparison))
            {
                throw new InvalidOperationException("Optimize proposal path must stay inside the repository.");
            }
            EnsureNoLinkedParent(root, segments);
        }
        catch (Exception ex) when (ex is ArgumentException or NotSupportedException or PathTooLongException)
        {
            throw new InvalidOperationException("Optimize proposal path is invalid.", ex);
        }
        return string.Join('/', segments);
    }

    private static void EnsureNoLinkedParent(string repositoryRoot, IReadOnlyList<string> segments)
    {
        var current = repositoryRoot;
        for (var index = 0; index < segments.Count - 1; index++)
        {
            current = Path.Combine(current, segments[index]);
            if (!Directory.Exists(current))
            {
                return;
            }

            try
            {
                var directory = new DirectoryInfo(current);
                if (directory.LinkTarget is not null ||
                    directory.Attributes.HasFlag(FileAttributes.ReparsePoint))
                {
                    throw new InvalidOperationException("Optimize proposal path must not traverse a symbolic link or junction.");
                }
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                throw new InvalidOperationException("Optimize proposal path could not be safely validated.", ex);
            }
        }
    }

    private static bool IsKnownInstructionSurface(string path)
    {
        var normalized = path.Replace('\\', '/');
        var fileName = normalized[(normalized.LastIndexOf('/') + 1)..];
        return string.Equals(fileName, "AGENTS.md", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(normalized, "CLAUDE.md", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(normalized, "ANTHROPIC.md", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(normalized, ".github/copilot-instructions.md", StringComparison.OrdinalIgnoreCase) ||
               (normalized.StartsWith(".github/instructions/", StringComparison.OrdinalIgnoreCase) && normalized.EndsWith(".instructions.md", StringComparison.OrdinalIgnoreCase)) ||
               (normalized.StartsWith(".cursor/rules/", StringComparison.OrdinalIgnoreCase) && (normalized.EndsWith(".md", StringComparison.OrdinalIgnoreCase) || normalized.EndsWith(".mdc", StringComparison.OrdinalIgnoreCase))) ||
               normalized.StartsWith(".continue/", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(normalized, "docs/AI_WORKFLOW.md", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(normalized, "docs/DEVELOPMENT_STANDARD.md", StringComparison.OrdinalIgnoreCase);
    }

    private static string Sanitize(string value)
    {
        var sanitized = NormalizeNewLines(value);
        sanitized = ApiKeyRegex.Replace(sanitized, "[REDACTED SECRET]");
        sanitized = GitHubTokenRegex.Replace(sanitized, "[REDACTED SECRET]");
        sanitized = AwsKeyRegex.Replace(sanitized, "[REDACTED SECRET]");
        sanitized = PrivateKeyRegex.Replace(sanitized, "[REDACTED SECRET]");
        sanitized = BearerRegex.Replace(sanitized, "Bearer [REDACTED SECRET]");
        sanitized = CredentialRegex.Replace(sanitized, "credential [REDACTED SECRET]");
        sanitized = EmailRegex.Replace(sanitized, "[REDACTED PII]");
        sanitized = Ipv4Regex.Replace(sanitized, "[REDACTED PII]");
        sanitized = PhoneRegex.Replace(sanitized, "[REDACTED PII]");
        sanitized = WindowsPathRegex.Replace(sanitized, "[REDACTED LOCAL PATH]");
        sanitized = UncPathRegex.Replace(sanitized, "[REDACTED LOCAL PATH]");
        sanitized = HomePathRegex.Replace(sanitized, "[REDACTED LOCAL PATH]");
        return WhitespaceRegex.Replace(sanitized, " ").Trim();
    }

    private static string Escape(string value)
    {
        return WebUtility.HtmlEncode(value)
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("`", "\\`", StringComparison.Ordinal)
            .Replace("|", "\\|", StringComparison.Ordinal);
    }

    private static string EscapeCode(string value)
    {
        return WebUtility.HtmlEncode(value.Replace('`', '\''));
    }

    private static string FormatLocation(InstructionLocation location)
    {
        return $"`{EscapeCode(location.Path)}:{Invariant(location.StartLine)}-{Invariant(location.EndLine)}` (scope `{EscapeCode(location.DirectoryScope)}`)";
    }

    private static InstructionLocation ToLocation(InstructionRule rule)
    {
        return new InstructionLocation(rule.SourcePath, rule.StartLine, rule.EndLine, rule.DirectoryScope);
    }

    private static string LocationKey(InstructionRule rule) => LocationKey(ToLocation(rule));

    private static string LocationKey(InstructionLocation location)
    {
        return $"{location.Path.Replace('\\', '/')}|{Invariant(location.StartLine)}|{Invariant(location.EndLine)}";
    }

    private static string LocationSortKey(InstructionLocation location)
    {
        return $"{location.Path.Replace('\\', '/').ToUpperInvariant()}|{location.Path.Replace('\\', '/')}|{location.StartLine:D10}|{location.EndLine:D10}";
    }

    private static int ScopeDepth(string scope)
    {
        return scope == "." ? 0 : scope.Split('/', StringSplitOptions.RemoveEmptyEntries).Length;
    }

    private static string NormalizeNewLines(string value)
    {
        return value.Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n');
    }

    private static string Invariant(int value) => value.ToString(CultureInfo.InvariantCulture);

    private static StringComparer PathComparer => StringComparer.OrdinalIgnoreCase;
}
