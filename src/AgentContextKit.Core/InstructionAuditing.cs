using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace AgentContextKit.Core;

public sealed class InstructionAuditor : IInstructionAuditor
{
    private const string ContextEstimationMethod = "Estimated tokens = ceiling of normalized UTF-16 character count divided by 4. This is a deterministic local size estimate, not exact tokenizer output or model billing.";
    private static readonly Regex HeadingRegex = new(@"^\s*#{1,6}\s+(?<text>.+?)\s*$", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex ListItemRegex = new(@"^\s*(?:[-*+]|\d+[.)])\s+(?<text>.+?)\s*$", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex InlineCodeRegex = new(@"`(?<value>[^`\r\n]+)`", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex MarkdownLinkRegex = new(@"\[[^\]]*\]\((?<target>[^)]+)\)", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex WordRegex = new(@"[\p{L}\p{N}]+(?:[-_][\p{L}\p{N}]+)*", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex WhitespaceRegex = new(@"\s+", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex RepositoryPathRegex = new(@"(?<![\p{L}\p{N}_])(?:\.?\.?/)?[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.#-]+)+(?:\.[A-Za-z0-9]+)?", RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex RepositoryFileRegex = new(@"(?<![\p{L}\p{N}_./-])[A-Za-z0-9_.-]+\.(?:md|markdown|sln|slnx|csproj|fsproj|vbproj|json|ya?ml|ps1|sh|cs|ts|tsx)(?![\p{L}\p{N}_-])", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex ProhibitionRegex = new(@"\b(?:do\s+not|don't|never|must\s+not|shall\s+not|avoid|prohibit(?:ed|ion|ions)?|forbid(?:den)?|cannot|can't)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex PreferenceRegex = new(@"\b(?:prefer|should|recommended)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex RequirementRegex = new(@"\b(?:must|shall|required|always|ensure|needs?\s+to)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex ImperativeRegex = new(@"^(?:please\s+)?(?:add|apply|build|check|commit|create|delete|deploy|document|follow|implement|keep|maintain|overwrite|preserve|publish|read|record|remove|require|respect|review|run|support|test|update|use|verify|write)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex ObjectiveRegex = new(@"(?:`[^`]+`|\b(?:test|build|lint|format|command|exit\s+code|file|path|check|verify|assert|review|approval|status|sha|commit|contains?|matches?|zero|pass(?:ed|es)?|fail(?:ed|s)?|warning|error)\b|\d)", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex VagueRegex = new(@"\b(?:make\s+it\s+good|fix\s+everything|test\s+properly|do\s+it\s+right|improve\s+everything|clean\s+it\s+up|use\s+best\s+practices|make\s+everything\s+better)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex QualitativeRegex = new(@"\b(?:good|properly|intuitive|high[- ]quality|best|appropriate|robust|user[- ]friendly|better|clean)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex BroadScopeRegex = new(@"\b(?:everything|entire\s+repository|all\s+files|every\s+file|any\s+file|across\s+the\s+whole\s+repository)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex UnsafeActionRegex = new(@"(?:\bgit\s+reset\s+--hard\b|\bgit\s+clean\b|\bforce[- ]?push\b|\brewrite\s+history\b|\bmove\s+(?:an?\s+)?tag\b|\bdelete\b|\boverwrite\b|\brm\s+-rf\b|\bdrop\s+(?:the\s+)?database\b|\bpublish\b|\bdeploy\b|\bcreate\s+(?:a\s+)?release\b|\brotate\s+secrets?\b)", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex CriticalBoundaryRegex = new(@"(?:force[- ]?push|rewrite\s+history|move\s+(?:an?\s+)?tag|git\s+reset\s+--hard|git\s+clean|rm\s+-rf|drop\s+(?:the\s+)?database|publish|deploy\s+(?:to\s+)?production|create\s+(?:a\s+)?release|rotate\s+secrets?)", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex ApprovalRegex = new(@"\b(?:explicit|approval|approve|confirmation|confirm|authorized|authorised|human[- ]controlled|maintainer[- ]only|reviewed\s+need)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex ConditionalPlatformRegex = new(@"\b(?:on|when|if|for)\s+(?:windows|linux|ubuntu|macos|macOS)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex BuildRegex = new(@"\bbuild\b|\bdotnet\s+build\b|\b(?:npm|pnpm|yarn|bun)\s+run\s+build\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex TestRegex = new(@"\btests?\b|\bdotnet\s+test\b|\b(?:npm|pnpm|yarn|bun)\s+test\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly string[] ContinueInstructionPropertyNames = ["systemMessage", "systemPrompt", "customInstructions", "instructions"];

    private readonly IFileSystem _fileSystem;

    public InstructionAuditor(IFileSystem fileSystem)
    {
        _fileSystem = fileSystem;
    }

    public InstructionAuditResult Audit(
        string repositoryPath,
        AckitConfig? config = null,
        InstructionAuditOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(repositoryPath);
        cancellationToken.ThrowIfCancellationRequested();

        var root = Path.GetFullPath(repositoryPath);
        if (!_fileSystem.DirectoryExists(root))
        {
            throw new DirectoryNotFoundException("Repository directory was not found.");
        }

        var activeConfig = config ?? AckitConfig.Default;
        var activeOptions = options ?? new InstructionAuditOptions();
        if (activeOptions.MaxSourceBytes <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(options), "MaxSourceBytes must be positive.");
        }

        ValidateGlobs(activeOptions.IncludeGlobs, nameof(activeOptions.IncludeGlobs));
        ValidateGlobs(activeOptions.ExcludeGlobs, nameof(activeOptions.ExcludeGlobs));

        var files = _fileSystem
            .EnumerateFiles(root, RepositoryScanner.IgnoredDirectoryNames)
            .Select(file => RepositoryScanner.ToRelativePath(root, file))
            .Where(file => !RepositoryScanner.IsIgnoredByConfig(file, activeConfig))
            .Where(file => MatchesAnyGlob(file, activeOptions.IncludeGlobs, defaultWhenEmpty: true))
            .Where(file => !MatchesAnyGlob(file, activeOptions.ExcludeGlobs, defaultWhenEmpty: false))
            .OrderBy(file => file, StringComparer.OrdinalIgnoreCase)
            .ThenBy(file => file, StringComparer.Ordinal)
            .ToArray();

        var sources = DiscoverSources(root, files, activeOptions, cancellationToken);
        var rules = sources
            .SelectMany(source => source.Rules)
            .OrderBy(rule => rule.SourcePath, StringComparer.OrdinalIgnoreCase)
            .ThenBy(rule => rule.SourcePath, StringComparer.Ordinal)
            .ThenBy(rule => rule.StartLine)
            .ThenBy(rule => rule.EndLine)
            .ThenBy(rule => rule.Id, StringComparer.Ordinal)
            .ToArray();

        var scopedOverrides = FindScopedOverrides(rules, cancellationToken);
        var analysis = Analyze(root, files, sources, rules, scopedOverrides, cancellationToken);
        var scopes = ResolveScopes(files, sources, scopedOverrides, cancellationToken);
        var metrics = BuildAuditMetrics(sources, rules, analysis.ExactDuplicateRuleIds, analysis.AvoidableRuleIds);

        return new InstructionAuditResult(
            sources,
            scopes,
            scopedOverrides,
            analysis.Findings,
            metrics);
    }

    private IReadOnlyList<InstructionSource> DiscoverSources(
        string repositoryRoot,
        IReadOnlyList<string> files,
        InstructionAuditOptions options,
        CancellationToken cancellationToken)
    {
        var sources = new List<InstructionSource>();
        foreach (var relativePath in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (!TryDescribeSource(relativePath, out var descriptor))
            {
                continue;
            }

            var fullPath = Path.Combine(repositoryRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
            long length;
            try
            {
                length = _fileSystem.GetFileLength(fullPath);
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                continue;
            }

            if (length > options.MaxSourceBytes)
            {
                continue;
            }

            string content;
            try
            {
                content = NormalizeNewLines(_fileSystem.ReadAllText(fullPath));
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                continue;
            }

            var rules = descriptor.Type == InstructionSourceType.Continue &&
                        relativePath.EndsWith(".json", StringComparison.OrdinalIgnoreCase)
                ? ParseContinueJson(relativePath, descriptor, content, cancellationToken)
                : ParseMarkdown(relativePath, descriptor, content, cancellationToken);

            sources.Add(new InstructionSource(
                relativePath,
                descriptor.Type,
                descriptor.Scope,
                descriptor.Precedence,
                AppliesToDescendants: true,
                descriptor.Scope == "." ? "repository-wide" : "scope-and-descendants",
                Measure(content),
                rules));
        }

        return sources
            .OrderBy(source => source.Path, StringComparer.OrdinalIgnoreCase)
            .ThenBy(source => source.Path, StringComparer.Ordinal)
            .ToArray();
    }

    private static bool TryDescribeSource(string relativePath, out SourceDescriptor descriptor)
    {
        var normalized = NormalizePath(relativePath);
        var fileName = GetFileName(normalized);
        if (string.Equals(fileName, "AGENTS.md", StringComparison.OrdinalIgnoreCase))
        {
            var scope = GetDirectory(normalized);
            descriptor = new SourceDescriptor(InstructionSourceType.Agents, scope, 300 + (GetDepth(scope) * 10));
            return true;
        }

        if (string.Equals(normalized, "CLAUDE.md", StringComparison.OrdinalIgnoreCase))
        {
            descriptor = new SourceDescriptor(InstructionSourceType.Claude, ".", 220);
            return true;
        }

        if (string.Equals(normalized, "ANTHROPIC.md", StringComparison.OrdinalIgnoreCase))
        {
            descriptor = new SourceDescriptor(InstructionSourceType.Anthropic, ".", 220);
            return true;
        }

        if (string.Equals(normalized, ".github/copilot-instructions.md", StringComparison.OrdinalIgnoreCase) ||
            (normalized.StartsWith(".github/instructions/", StringComparison.OrdinalIgnoreCase) &&
             normalized.EndsWith(".instructions.md", StringComparison.OrdinalIgnoreCase)))
        {
            descriptor = new SourceDescriptor(InstructionSourceType.Copilot, ".", 210);
            return true;
        }

        if (normalized.StartsWith(".cursor/rules/", StringComparison.OrdinalIgnoreCase) &&
            (normalized.EndsWith(".md", StringComparison.OrdinalIgnoreCase) ||
             normalized.EndsWith(".mdc", StringComparison.OrdinalIgnoreCase)))
        {
            descriptor = new SourceDescriptor(InstructionSourceType.Cursor, ".", 210);
            return true;
        }

        if (normalized.StartsWith(".continue/", StringComparison.OrdinalIgnoreCase) &&
            (normalized.EndsWith(".json", StringComparison.OrdinalIgnoreCase) ||
             normalized.EndsWith(".yml", StringComparison.OrdinalIgnoreCase) ||
             normalized.EndsWith(".yaml", StringComparison.OrdinalIgnoreCase) ||
             normalized.EndsWith(".md", StringComparison.OrdinalIgnoreCase)))
        {
            descriptor = new SourceDescriptor(InstructionSourceType.Continue, ".", 210);
            return true;
        }

        if (string.Equals(normalized, "docs/AI_WORKFLOW.md", StringComparison.OrdinalIgnoreCase))
        {
            descriptor = new SourceDescriptor(InstructionSourceType.Workflow, ".", 120);
            return true;
        }

        if (string.Equals(normalized, "docs/DEVELOPMENT_STANDARD.md", StringComparison.OrdinalIgnoreCase))
        {
            descriptor = new SourceDescriptor(InstructionSourceType.DevelopmentStandard, ".", 130);
            return true;
        }

        descriptor = default;
        return false;
    }

    private static IReadOnlyList<InstructionRule> ParseMarkdown(
        string sourcePath,
        SourceDescriptor descriptor,
        string content,
        CancellationToken cancellationToken)
    {
        var rules = new List<InstructionRule>();
        var lines = content.Split('\n');
        var section = "Document";
        var inFence = false;
        var paragraph = new List<(int Line, string Text)>();

        void FlushParagraph()
        {
            if (paragraph.Count == 0)
            {
                return;
            }

            var original = string.Join("\n", paragraph.Select(item => item.Text.Trim()));
            if (LooksLikeInstruction(original))
            {
                rules.Add(CreateRule(
                    sourcePath,
                    descriptor,
                    section,
                    paragraph[0].Line,
                    paragraph[^1].Line,
                    original));
            }

            paragraph.Clear();
        }

        for (var index = 0; index < lines.Length; index++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var lineNumber = index + 1;
            var rawLine = lines[index];
            var trimmed = rawLine.Trim();

            if (trimmed.StartsWith("```", StringComparison.Ordinal) ||
                trimmed.StartsWith("~~~", StringComparison.Ordinal))
            {
                FlushParagraph();
                inFence = !inFence;
                continue;
            }

            if (inFence)
            {
                continue;
            }

            var heading = HeadingRegex.Match(rawLine);
            if (heading.Success)
            {
                FlushParagraph();
                section = StripInlineMarkdown(heading.Groups["text"].Value).Trim();
                continue;
            }

            var listItem = ListItemRegex.Match(rawLine);
            if (listItem.Success)
            {
                FlushParagraph();
                var original = listItem.Groups["text"].Value.Trim();
                if (original.Length > 0 && LooksLikeInstruction(original))
                {
                    rules.Add(CreateRule(sourcePath, descriptor, section, lineNumber, lineNumber, original));
                }
                continue;
            }

            if (trimmed.Length == 0 || trimmed.StartsWith('|') || trimmed.StartsWith("<!--", StringComparison.Ordinal))
            {
                FlushParagraph();
                continue;
            }

            var paragraphText = trimmed.StartsWith('>') ? trimmed.TrimStart('>').TrimStart() : trimmed;
            paragraph.Add((lineNumber, paragraphText));
        }

        FlushParagraph();
        return rules;
    }

    private static IReadOnlyList<InstructionRule> ParseContinueJson(
        string sourcePath,
        SourceDescriptor descriptor,
        string content,
        CancellationToken cancellationToken)
    {
        try
        {
            using var document = JsonDocument.Parse(content);
            var values = new List<string>();
            CollectContinueInstructionValues(document.RootElement, values, cancellationToken);
            var rules = new List<InstructionRule>();
            foreach (var value in values)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var rawIndex = content.IndexOf(value, StringComparison.Ordinal);
                var line = rawIndex < 0 ? 1 : 1 + content.AsSpan(0, rawIndex).Count('\n');
                var descriptorRules = ParseMarkdown(sourcePath, descriptor, NormalizeNewLines(value), cancellationToken);
                foreach (var rule in descriptorRules)
                {
                    rules.Add(rule with
                    {
                        StartLine = line,
                        EndLine = line,
                        Id = BuildRuleId(sourcePath, line, line, rule.NormalizedText)
                    });
                }
            }
            return rules;
        }
        catch (JsonException)
        {
            return ParseMarkdown(sourcePath, descriptor, content, cancellationToken);
        }
    }

    private static void CollectContinueInstructionValues(
        JsonElement element,
        ICollection<string> values,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (element.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in element.EnumerateObject())
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (ContinueInstructionPropertyNames.Contains(property.Name, StringComparer.OrdinalIgnoreCase) &&
                    property.Value.ValueKind == JsonValueKind.String &&
                    property.Value.GetString() is { Length: > 0 } value)
                {
                    values.Add(value);
                }
                else
                {
                    CollectContinueInstructionValues(property.Value, values, cancellationToken);
                }
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                CollectContinueInstructionValues(item, values, cancellationToken);
            }
        }
    }

    private static InstructionRule CreateRule(
        string sourcePath,
        SourceDescriptor descriptor,
        string section,
        int startLine,
        int endLine,
        string originalText)
    {
        var original = originalText.Trim();
        var polarity = GetPolarity(original);
        var normalized = NormalizeInstruction(original);
        var core = NormalizeCore(normalized);
        return new InstructionRule(
            BuildRuleId(sourcePath, startLine, endLine, normalized),
            sourcePath,
            descriptor.Type,
            descriptor.Scope,
            descriptor.Precedence,
            string.IsNullOrWhiteSpace(section) ? "Document" : section.Trim(),
            startLine,
            endLine,
            original,
            normalized,
            core,
            polarity,
            ExtractCommandFragments(original),
            ExtractRepositoryReferences(original));
    }

    private AnalysisResult Analyze(
        string repositoryRoot,
        IReadOnlyList<string> files,
        IReadOnlyList<InstructionSource> sources,
        IReadOnlyList<InstructionRule> rules,
        IReadOnlyList<InstructionScopedOverride> scopedOverrides,
        CancellationToken cancellationToken)
    {
        var findings = new List<InstructionFinding>();
        var findingKeys = new HashSet<string>(StringComparer.Ordinal);
        var exactDuplicateRuleIds = new HashSet<string>(StringComparer.Ordinal);
        var avoidableRuleIds = new HashSet<string>(StringComparer.Ordinal);

        void AddFinding(
            InstructionAuditRule definition,
            InstructionRule primary,
            IEnumerable<InstructionRule>? related,
            string evidence,
            RiskSeverity? severity = null,
            string? explanation = null)
        {
            var relatedLocations = (related ?? Array.Empty<InstructionRule>())
                .Select(ToLocation)
                .Distinct()
                .OrderBy(location => location.Path, StringComparer.OrdinalIgnoreCase)
                .ThenBy(location => location.Path, StringComparer.Ordinal)
                .ThenBy(location => location.StartLine)
                .ToArray();
            var key = string.Join('|', new[]
            {
                definition.Id,
                primary.SourcePath,
                primary.StartLine.ToString(System.Globalization.CultureInfo.InvariantCulture),
                string.Join(',', relatedLocations.Select(location => $"{location.Path}:{location.StartLine}"))
            });
            if (!findingKeys.Add(key))
            {
                return;
            }

            var fingerprint = BuildFindingFingerprint(definition.Id, ToLocation(primary), relatedLocations);
            findings.Add(new InstructionFinding(
                definition.Id,
                fingerprint,
                severity ?? definition.DefaultSeverity,
                definition.Category,
                primary.SourcePath,
                primary.StartLine,
                primary.EndLine,
                primary.DirectoryScope,
                explanation ?? definition.Description,
                evidence,
                definition.Remediation,
                definition.IsHeuristic,
                relatedLocations));
        }

        foreach (var group in rules
                     .Where(rule => rule.NormalizedText.Length > 0)
                     .GroupBy(rule => rule.NormalizedText, StringComparer.Ordinal)
                     .OrderBy(group => group.Key, StringComparer.Ordinal))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var ordered = group
                .OrderBy(rule => rule.SourcePath, StringComparer.OrdinalIgnoreCase)
                .ThenBy(rule => rule.SourcePath, StringComparer.Ordinal)
                .ThenBy(rule => rule.StartLine)
                .ToArray();
            var canonical = new List<InstructionRule>();
            foreach (var rule in ordered)
            {
                var prior = canonical.FirstOrDefault(candidate => ScopesOverlap(candidate.DirectoryScope, rule.DirectoryScope));
                if (prior is null)
                {
                    canonical.Add(rule);
                    continue;
                }

                exactDuplicateRuleIds.Add(rule.Id);
                avoidableRuleIds.Add(rule.Id);
                AddFinding(
                    InstructionAuditRuleCatalog.ExactDuplicate,
                    rule,
                    [prior],
                    "The normalized instruction hashes are identical in an overlapping effective scope.");
            }

            if (ordered.Length >= 3 && ordered.Any(rule => exactDuplicateRuleIds.Contains(rule.Id)))
            {
                AddFinding(
                    InstructionAuditRuleCatalog.RepeatedBoilerplate,
                    ordered[0],
                    ordered.Skip(1),
                    $"The same normalized instruction occurs {ordered.Length} times.");
            }
        }

        var specializedConflictPairs = new HashSet<string>(StringComparer.Ordinal);
        for (var leftIndex = 0; leftIndex < rules.Count; leftIndex++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var left = rules[leftIndex];
            for (var rightIndex = leftIndex + 1; rightIndex < rules.Count; rightIndex++)
            {
                if ((rightIndex & 63) == 0)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                }

                var right = rules[rightIndex];
                if (!ScopesOverlap(left.DirectoryScope, right.DirectoryScope) ||
                    string.Equals(left.NormalizedText, right.NormalizedText, StringComparison.Ordinal))
                {
                    continue;
                }

                var pairKey = BuildPairKey(left, right);
                var scopedOverride = IsScopedOverridePair(left, right, scopedOverrides);
                var unsafePair = IsUnsafePositiveRule(left) || IsUnsafePositiveRule(right);

                if (IsPackageManagerConflict(left, right) && !(scopedOverride && !unsafePair))
                {
                    specializedConflictPairs.Add(pairKey);
                    AddFinding(
                        InstructionAuditRuleCatalog.PackageManagerConflict,
                        HigherPriorityConflictRule(left, right),
                        [LowerPriorityConflictRule(left, right)],
                        "Explicit package-manager requirements overlap and select incompatible managers or opposite use policies.");
                    AddAmbiguityIfNeeded(left, right, AddFinding);
                }

                if (IsPlatformConflict(left, right) && !(scopedOverride && !unsafePair))
                {
                    specializedConflictPairs.Add(pairKey);
                    AddFinding(
                        InstructionAuditRuleCatalog.PlatformConflict,
                        HigherPriorityConflictRule(left, right),
                        [LowerPriorityConflictRule(left, right)],
                        "Unconditional shell or platform requirements overlap without an explicit platform condition.");
                    AddAmbiguityIfNeeded(left, right, AddFinding);
                }

                if (IsBuildTestConflict(left, right) && !(scopedOverride && !unsafePair))
                {
                    specializedConflictPairs.Add(pairKey);
                    AddFinding(
                        InstructionAuditRuleCatalog.BuildTestConflict,
                        HigherPriorityConflictRule(left, right),
                        [LowerPriorityConflictRule(left, right)],
                        "Build/test rules have opposite execution polarity or incompatible exclusive commands.");
                    AddAmbiguityIfNeeded(left, right, AddFinding);
                }

                if (specializedConflictPairs.Contains(pairKey) || (scopedOverride && !unsafePair))
                {
                    continue;
                }

                if (HaveOppositePolarity(left, right) && AreSameAction(left, right))
                {
                    AddFinding(
                        InstructionAuditRuleCatalog.DirectContradiction,
                        HigherPriorityConflictRule(left, right),
                        [LowerPriorityConflictRule(left, right)],
                        "Requirement and prohibition polarities resolve to the same normalized action.");
                    AddAmbiguityIfNeeded(left, right, AddFinding);
                }
            }
        }

        var nearDuplicateCandidates = rules
            .Where(rule => rule.NormalizedText.Length >= 20)
            .GroupBy(GetSimilarityBucket, StringComparer.Ordinal)
            .OrderBy(group => group.Key, StringComparer.Ordinal);
        foreach (var bucket in nearDuplicateCandidates)
        {
            var ordered = bucket
                .OrderBy(rule => rule.SourcePath, StringComparer.OrdinalIgnoreCase)
                .ThenBy(rule => rule.SourcePath, StringComparer.Ordinal)
                .ThenBy(rule => rule.StartLine)
                .Take(500)
                .ToArray();
            for (var leftIndex = 0; leftIndex < ordered.Length; leftIndex++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                for (var rightIndex = leftIndex + 1; rightIndex < ordered.Length; rightIndex++)
                {
                    var left = ordered[leftIndex];
                    var right = ordered[rightIndex];
                    if (left.Polarity != right.Polarity ||
                        !ScopesOverlap(left.DirectoryScope, right.DirectoryScope) ||
                        string.Equals(left.NormalizedText, right.NormalizedText, StringComparison.Ordinal) ||
                        IsScopedOverridePair(left, right, scopedOverrides))
                    {
                        continue;
                    }

                    var similarity = Jaccard(Tokenize(left.CoreText), Tokenize(right.CoreText));
                    if (similarity < 0.88 || HaveOppositePolarity(left, right))
                    {
                        continue;
                    }

                    var redundant = right;
                    if (!avoidableRuleIds.Add(redundant.Id))
                    {
                        continue;
                    }

                    AddFinding(
                        InstructionAuditRuleCatalog.RedundantNearDuplicate,
                        redundant,
                        [left],
                        $"Normalized token similarity is {similarity:0.00}, at or above the conservative 0.88 review threshold.");
                }
            }
        }

        foreach (var rule in rules)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (VagueRegex.IsMatch(rule.OriginalText))
            {
                AddFinding(
                    InstructionAuditRuleCatalog.VagueRule,
                    rule,
                    null,
                    "The rule matches the deterministic vague-phrase catalog.");
                AddFinding(
                    InstructionAuditRuleCatalog.UnverifiableRule,
                    rule,
                    null,
                    "The vague rule does not define an objective completion check.");
            }
            else if (QualitativeRegex.IsMatch(rule.OriginalText) && !ObjectiveRegex.IsMatch(rule.OriginalText))
            {
                AddFinding(
                    InstructionAuditRuleCatalog.UnverifiableRule,
                    rule,
                    null,
                    "The qualitative requirement has no command, assertion, threshold, path, or review checkpoint.");
            }

            if (BroadScopeRegex.IsMatch(rule.OriginalText))
            {
                AddFinding(
                    InstructionAuditRuleCatalog.OverlyBroadScope,
                    rule,
                    null,
                    "The rule uses an unbounded repository-wide quantifier.");
            }

            foreach (var reference in rule.RepositoryReferences)
            {
                if (!IsDeterministicallyCheckableReference(reference) || ReferenceExists(repositoryRoot, rule.SourcePath, reference))
                {
                    continue;
                }

                AddFinding(
                    InstructionAuditRuleCatalog.StaleReference,
                    rule,
                    null,
                    $"Repository-relative reference '{SanitizeReference(reference)}' does not resolve to a file or directory.");
                break;
            }

            if (IsUnsafePositiveRule(rule))
            {
                AddFinding(
                    InstructionAuditRuleCatalog.UnsafeAutomaticAction,
                    rule,
                    null,
                    "A positive high-impact action appears without an explicit authorization or confirmation boundary.");

                if (CriticalBoundaryRegex.IsMatch(rule.OriginalText))
                {
                    AddFinding(
                        InstructionAuditRuleCatalog.SafetyBoundaryConflict,
                        rule,
                        null,
                        "The action matches the deterministic release, production, destructive-data, secret, tag, or history safety boundary.");
                }
            }
        }

        foreach (var source in sources.Where(source => source.Type == InstructionSourceType.Agents && source.DirectoryScope != "."))
        {
            cancellationToken.ThrowIfCancellationRequested();
            var containsApplicableContent = files.Any(file =>
                !string.Equals(file, source.Path, StringComparison.OrdinalIgnoreCase) &&
                IsPathWithinScope(file, source.DirectoryScope));
            if (!containsApplicableContent && source.Rules.Count > 0)
            {
                AddFinding(
                    InstructionAuditRuleCatalog.ShadowedOrUnreachable,
                    source.Rules[0],
                    null,
                    "The nested AGENTS.md scope contains no other discovered repository content.");
            }
        }

        foreach (var sourceGroup in rules.GroupBy(rule => (rule.SourcePath, rule.DirectoryScope)))
        {
            var ordered = sourceGroup.OrderBy(rule => rule.StartLine).ToArray();
            for (var index = 0; index < ordered.Length; index++)
            {
                for (var laterIndex = index + 1; laterIndex < ordered.Length; laterIndex++)
                {
                    var earlier = ordered[index];
                    var later = ordered[laterIndex];
                    if (HaveOppositePolarity(earlier, later) && AreSameAction(earlier, later))
                    {
                        AddFinding(
                            InstructionAuditRuleCatalog.ShadowedOrUnreachable,
                            earlier,
                            [later],
                            "A later rule in the same source and scope replaces the same normalized action.");
                    }
                }
            }
        }

        var orderedFindings = findings
            .OrderByDescending(finding => finding.Severity)
            .ThenBy(finding => finding.RuleId, StringComparer.Ordinal)
            .ThenBy(finding => finding.SourcePath, StringComparer.OrdinalIgnoreCase)
            .ThenBy(finding => finding.SourcePath, StringComparer.Ordinal)
            .ThenBy(finding => finding.StartLine)
            .ThenBy(finding => finding.Fingerprint, StringComparer.Ordinal)
            .ToArray();

        return new AnalysisResult(orderedFindings, exactDuplicateRuleIds, avoidableRuleIds);
    }

    private static void AddAmbiguityIfNeeded(
        InstructionRule left,
        InstructionRule right,
        Action<InstructionAuditRule, InstructionRule, IEnumerable<InstructionRule>?, string, RiskSeverity?, string?> addFinding)
    {
        if (left.SourcePrecedence == right.SourcePrecedence &&
            string.Equals(left.DirectoryScope, right.DirectoryScope, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(left.SourcePath, right.SourcePath, StringComparison.OrdinalIgnoreCase))
        {
            addFinding(
                InstructionAuditRuleCatalog.AmbiguousPrecedence,
                HigherPriorityConflictRule(left, right),
                [LowerPriorityConflictRule(left, right)],
                "The conflicting sources have equal numeric precedence and the same directory scope.",
                null,
                null);
        }
    }

    private static IReadOnlyList<InstructionScopedOverride> FindScopedOverrides(
        IReadOnlyList<InstructionRule> rules,
        CancellationToken cancellationToken)
    {
        var overrides = new List<InstructionScopedOverride>();
        var keys = new HashSet<string>(StringComparer.Ordinal);
        foreach (var narrower in rules.Where(rule => rule.SourceType == InstructionSourceType.Agents && rule.DirectoryScope != "."))
        {
            cancellationToken.ThrowIfCancellationRequested();
            foreach (var broader in rules)
            {
                if (ReferenceEquals(narrower, broader) ||
                    string.Equals(narrower.Id, broader.Id, StringComparison.Ordinal) ||
                    !IsStrictDescendantScope(narrower.DirectoryScope, broader.DirectoryScope))
                {
                    continue;
                }

                string? reason = null;
                if (IsPackageManagerDifference(narrower, broader))
                {
                    reason = "Narrower AGENTS.md selects a different package manager for its subtree.";
                }
                else if (IsPlatformDifference(narrower, broader))
                {
                    reason = "Narrower AGENTS.md selects a different platform or shell for its subtree.";
                }
                else if (HaveOppositePolarity(narrower, broader) && AreSameAction(narrower, broader) &&
                         !IsUnsafePositiveRule(narrower) && !IsUnsafePositiveRule(broader))
                {
                    reason = "Narrower AGENTS.md explicitly overrides the broader action for its subtree.";
                }

                if (reason is null)
                {
                    continue;
                }

                var key = $"{broader.Id}|{narrower.Id}";
                if (keys.Add(key))
                {
                    overrides.Add(new InstructionScopedOverride(
                        narrower.DirectoryScope,
                        ToLocation(broader),
                        ToLocation(narrower),
                        reason));
                }
            }
        }

        return overrides
            .OrderBy(item => item.DirectoryScope, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.DirectoryScope, StringComparer.Ordinal)
            .ThenBy(item => item.NarrowerRule.Path, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.NarrowerRule.StartLine)
            .ThenBy(item => item.BroaderRule.Path, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.BroaderRule.StartLine)
            .ToArray();
    }

    private static IReadOnlyList<InstructionScopeResolution> ResolveScopes(
        IReadOnlyList<string> files,
        IReadOnlyList<InstructionSource> sources,
        IReadOnlyList<InstructionScopedOverride> scopedOverrides,
        CancellationToken cancellationToken)
    {
        var directories = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "." };
        foreach (var file in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var directory = GetDirectory(file);
            while (directory != ".")
            {
                directories.Add(directory);
                directory = GetDirectory(directory);
            }
        }

        return directories
            .OrderBy(directory => directory, StringComparer.OrdinalIgnoreCase)
            .ThenBy(directory => directory, StringComparer.Ordinal)
            .Select(directory => new InstructionScopeResolution(
                directory,
                sources
                    .Where(source => IsScopeWithin(directory, source.DirectoryScope))
                    .OrderByDescending(source => source.Precedence)
                    .ThenBy(source => source.Path, StringComparer.OrdinalIgnoreCase)
                    .ThenBy(source => source.Path, StringComparer.Ordinal)
                    .Select(source => source.Path)
                    .ToArray(),
                scopedOverrides
                    .Where(item => IsScopeWithin(directory, item.DirectoryScope))
                    .ToArray()))
            .ToArray();
    }

    private static InstructionAuditMetrics BuildAuditMetrics(
        IReadOnlyList<InstructionSource> sources,
        IReadOnlyList<InstructionRule> rules,
        IReadOnlySet<string> exactDuplicateRuleIds,
        IReadOnlySet<string> avoidableRuleIds)
    {
        var totalCharacters = sources.Sum(source => source.Metrics.Characters);
        var totalWords = sources.Sum(source => source.Metrics.Words);
        var totalLines = sources.Sum(source => source.Metrics.Lines);
        var duplicated = MeasureRuleSet(rules.Where(rule => exactDuplicateRuleIds.Contains(rule.Id)));
        var avoidable = MeasureRuleSet(rules.Where(rule => avoidableRuleIds.Contains(rule.Id)));
        return new InstructionAuditMetrics(
            new InstructionContentMetrics(totalCharacters, totalWords, totalLines, EstimateTokens(totalCharacters)),
            duplicated,
            avoidable,
            ContextEstimationMethod);
    }

    private static InstructionContentMetrics MeasureRuleSet(IEnumerable<InstructionRule> rules)
    {
        var texts = rules
            .OrderBy(rule => rule.SourcePath, StringComparer.OrdinalIgnoreCase)
            .ThenBy(rule => rule.SourcePath, StringComparer.Ordinal)
            .ThenBy(rule => rule.StartLine)
            .Select(rule => NormalizeNewLines(rule.OriginalText))
            .ToArray();
        return texts.Length == 0 ? new InstructionContentMetrics(0, 0, 0, 0) : Measure(string.Join('\n', texts));
    }

    private static InstructionContentMetrics Measure(string content)
    {
        var normalized = NormalizeNewLines(content);
        var characters = normalized.Length;
        var words = WordRegex.Matches(normalized).Count;
        var lines = normalized.Length == 0
            ? 0
            : normalized.Count(character => character == '\n') + (normalized.EndsWith('\n') ? 0 : 1);
        return new InstructionContentMetrics(characters, words, lines, EstimateTokens(characters));
    }

    private static int EstimateTokens(int characters)
    {
        return characters == 0 ? 0 : (characters + 3) / 4;
    }

    private static bool IsPackageManagerConflict(InstructionRule left, InstructionRule right)
    {
        var leftManagers = GetPackageManagers(left.NormalizedText);
        var rightManagers = GetPackageManagers(right.NormalizedText);
        if (leftManagers.Count == 0 || rightManagers.Count == 0)
        {
            return false;
        }

        if (HaveOppositePolarity(left, right) && leftManagers.Overlaps(rightManagers))
        {
            return true;
        }

        if (left.Polarity is InstructionRulePolarity.Require or InstructionRulePolarity.Neutral &&
            right.Polarity is InstructionRulePolarity.Require or InstructionRulePolarity.Neutral)
        {
            return SamePackageEcosystem(leftManagers, rightManagers) && !leftManagers.SetEquals(rightManagers);
        }

        return false;
    }

    private static bool IsPackageManagerDifference(InstructionRule left, InstructionRule right)
    {
        var leftManagers = GetPackageManagers(left.NormalizedText);
        var rightManagers = GetPackageManagers(right.NormalizedText);
        return leftManagers.Count > 0 && rightManagers.Count > 0 &&
               SamePackageEcosystem(leftManagers, rightManagers) && !leftManagers.SetEquals(rightManagers);
    }

    private static HashSet<string> GetPackageManagers(string text)
    {
        var managers = new HashSet<string>(StringComparer.Ordinal);
        foreach (var manager in new[] { "npm", "pnpm", "yarn", "bun", "pip", "poetry", "uv" })
        {
            if (Regex.IsMatch(text, $@"(?<![\p{{L}}\p{{N}}_-]){Regex.Escape(manager)}(?![\p{{L}}\p{{N}}_-])", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
            {
                managers.Add(manager);
            }
        }
        return managers;
    }

    private static bool SamePackageEcosystem(IReadOnlySet<string> left, IReadOnlySet<string> right)
    {
        var javascript = new HashSet<string>(["npm", "pnpm", "yarn", "bun"], StringComparer.Ordinal);
        var python = new HashSet<string>(["pip", "poetry", "uv"], StringComparer.Ordinal);
        return (left.Overlaps(javascript) && right.Overlaps(javascript)) ||
               (left.Overlaps(python) && right.Overlaps(python));
    }

    private static bool IsPlatformConflict(InstructionRule left, InstructionRule right)
    {
        if (ConditionalPlatformRegex.IsMatch(left.OriginalText) || ConditionalPlatformRegex.IsMatch(right.OriginalText))
        {
            return false;
        }

        var leftPlatforms = GetPlatformFamilies(left.NormalizedText);
        var rightPlatforms = GetPlatformFamilies(right.NormalizedText);
        return leftPlatforms.Count > 0 && rightPlatforms.Count > 0 &&
               left.Polarity == InstructionRulePolarity.Require &&
               right.Polarity == InstructionRulePolarity.Require &&
               IsStrongPlatformRequirement(left.OriginalText) &&
               IsStrongPlatformRequirement(right.OriginalText) &&
               !leftPlatforms.SetEquals(rightPlatforms);
    }

    private static bool IsStrongPlatformRequirement(string text)
    {
        return Regex.IsMatch(
            text,
            @"\b(?:must|shall|always|only|required)\b|\bfor\s+all\s+commands\b",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    }

    private static bool IsPlatformDifference(InstructionRule left, InstructionRule right)
    {
        var leftPlatforms = GetPlatformFamilies(left.NormalizedText);
        var rightPlatforms = GetPlatformFamilies(right.NormalizedText);
        return leftPlatforms.Count > 0 && rightPlatforms.Count > 0 && !leftPlatforms.SetEquals(rightPlatforms);
    }

    private static HashSet<string> GetPlatformFamilies(string text)
    {
        var result = new HashSet<string>(StringComparer.Ordinal);
        if (Regex.IsMatch(text, @"\b(?:windows|powershell|pwsh|cmd(?:\.exe)?)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
        {
            result.Add("windows-shell");
        }
        if (Regex.IsMatch(text, @"\b(?:linux|ubuntu|bash|zsh|shell|sh)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
        {
            result.Add("posix-shell");
        }
        if (Regex.IsMatch(text, @"\b(?:macos|osx)\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant))
        {
            result.Add("macos");
        }
        return result;
    }

    private static bool IsBuildTestConflict(InstructionRule left, InstructionRule right)
    {
        var leftSubject = GetBuildTestSubject(left.OriginalText);
        var rightSubject = GetBuildTestSubject(right.OriginalText);
        if (leftSubject is null || !string.Equals(leftSubject, rightSubject, StringComparison.Ordinal))
        {
            return false;
        }

        if (HaveOppositePolarity(left, right))
        {
            return AreSameAction(left, right);
        }

        var exclusive = Regex.IsMatch(left.OriginalText, @"\bonly\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant) ||
                        Regex.IsMatch(right.OriginalText, @"\bonly\b", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        return exclusive && left.CommandFragments.Count > 0 && right.CommandFragments.Count > 0 &&
               !left.CommandFragments.SequenceEqual(right.CommandFragments, StringComparer.OrdinalIgnoreCase);
    }

    private static string? GetBuildTestSubject(string text)
    {
        if (TestRegex.IsMatch(text))
        {
            return "test";
        }
        if (BuildRegex.IsMatch(text))
        {
            return "build";
        }
        return null;
    }

    private static bool HaveOppositePolarity(InstructionRule left, InstructionRule right)
    {
        return (left.Polarity == InstructionRulePolarity.Require && right.Polarity == InstructionRulePolarity.Prohibit) ||
               (left.Polarity == InstructionRulePolarity.Prohibit && right.Polarity == InstructionRulePolarity.Require);
    }

    private static bool AreSameAction(InstructionRule left, InstructionRule right)
    {
        if (left.CoreText.Length == 0 || right.CoreText.Length == 0)
        {
            return false;
        }
        if (string.Equals(left.CoreText, right.CoreText, StringComparison.Ordinal))
        {
            return true;
        }
        var leftTokens = Tokenize(left.CoreText);
        var rightTokens = Tokenize(right.CoreText);
        return leftTokens.Count >= 2 && rightTokens.Count >= 2 && Jaccard(leftTokens, rightTokens) >= 0.80;
    }

    private static InstructionRule HigherPriorityConflictRule(InstructionRule left, InstructionRule right)
    {
        if (left.SourcePrecedence != right.SourcePrecedence)
        {
            return left.SourcePrecedence > right.SourcePrecedence ? left : right;
        }
        var path = StringComparer.OrdinalIgnoreCase.Compare(left.SourcePath, right.SourcePath);
        if (path != 0)
        {
            return path < 0 ? left : right;
        }
        return left.StartLine <= right.StartLine ? left : right;
    }

    private static InstructionRule LowerPriorityConflictRule(InstructionRule left, InstructionRule right)
    {
        return ReferenceEquals(HigherPriorityConflictRule(left, right), left) ? right : left;
    }

    private static bool IsUnsafePositiveRule(InstructionRule rule)
    {
        return rule.Polarity == InstructionRulePolarity.Require &&
               UnsafeActionRegex.IsMatch(rule.OriginalText) &&
               !HasExplicitApprovalBoundary(rule.OriginalText);
    }

    private static bool HasExplicitApprovalBoundary(string text)
    {
        var withoutApproval = Regex.Replace(
            text,
            @"\b(?:without|no)\s+(?:explicit\s+)?(?:approval|confirmation|authorization|authorisation|review)\b",
            " ",
            RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        return ApprovalRegex.IsMatch(withoutApproval);
    }

    private static bool IsScopedOverridePair(
        InstructionRule left,
        InstructionRule right,
        IReadOnlyList<InstructionScopedOverride> scopedOverrides)
    {
        return scopedOverrides.Any(item =>
            LocationsMatch(item.BroaderRule, left) && LocationsMatch(item.NarrowerRule, right) ||
            LocationsMatch(item.BroaderRule, right) && LocationsMatch(item.NarrowerRule, left));
    }

    private static bool LocationsMatch(InstructionLocation location, InstructionRule rule)
    {
        return string.Equals(location.Path, rule.SourcePath, StringComparison.OrdinalIgnoreCase) &&
               location.StartLine == rule.StartLine &&
               location.EndLine == rule.EndLine;
    }

    private bool ReferenceExists(string repositoryRoot, string sourcePath, string reference)
    {
        var normalized = NormalizeReference(reference);
        if (normalized.Length == 0)
        {
            return true;
        }

        try
        {
            var root = Path.GetFullPath(repositoryRoot);
            var prefix = root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
            var candidates = new List<string>
            {
                Path.Combine(root, normalized.Replace('/', Path.DirectorySeparatorChar))
            };
            var sourceDirectory = GetDirectory(sourcePath);
            if (sourceDirectory != ".")
            {
                candidates.Add(Path.Combine(
                    root,
                    sourceDirectory.Replace('/', Path.DirectorySeparatorChar),
                    normalized.Replace('/', Path.DirectorySeparatorChar)));
            }

            foreach (var candidate in candidates)
            {
                var fullPath = Path.GetFullPath(candidate);
                if ((fullPath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(fullPath, root, StringComparison.OrdinalIgnoreCase)) &&
                    (_fileSystem.FileExists(fullPath) || _fileSystem.DirectoryExists(fullPath)))
                {
                    return true;
                }
            }
            return false;
        }
        catch (Exception ex) when (ex is ArgumentException or NotSupportedException or PathTooLongException)
        {
            return true;
        }
    }

    private static bool IsDeterministicallyCheckableReference(string reference)
    {
        var normalized = NormalizeReference(reference);
        if (normalized.Length == 0 ||
            normalized.StartsWith(".ackit/", StringComparison.OrdinalIgnoreCase) ||
            normalized.StartsWith("http", StringComparison.OrdinalIgnoreCase) ||
            normalized.Contains('*') || normalized.Contains('?') || normalized.Contains('<') || normalized.Contains('>') ||
            normalized.Contains('$') || normalized.Contains('{') || normalized.Contains('}') || normalized.Contains("TASK-####", StringComparison.OrdinalIgnoreCase) ||
            normalized.Equals("README.*", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }
        return RepositoryFileRegex.IsMatch(normalized) ||
               Regex.IsMatch(
                   normalized,
                   @"^(?:\.codex|\.cursor|\.continue|\.github|docs|examples|samples|scripts|src|tests)/",
                   RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
    }

    private static string NormalizeReference(string reference)
    {
        var value = reference.Trim().Trim('"', '\'', '(', ')', '[', ']', ',', ';', ':');
        var hash = value.IndexOf('#');
        if (hash > 0)
        {
            value = value[..hash];
        }
        value = NormalizePath(value);
        while (value.StartsWith("./", StringComparison.Ordinal))
        {
            value = value[2..];
        }
        return value;
    }

    private static string SanitizeReference(string reference)
    {
        var normalized = NormalizeReference(reference);
        normalized = new string(normalized.Where(character =>
            char.IsLetterOrDigit(character) || character is '/' or '.' or '-' or '_').ToArray());
        return normalized.Length <= 160 ? normalized : normalized[..157] + "...";
    }

    private static IReadOnlyList<string> ExtractCommandFragments(string text)
    {
        return InlineCodeRegex.Matches(text)
            .Select(match => NormalizeInstruction(match.Groups["value"].Value))
            .Where(value => value.Length > 0)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(value => value, StringComparer.Ordinal)
            .ToArray();
    }

    private static IReadOnlyList<string> ExtractRepositoryReferences(string text)
    {
        var values = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match match in MarkdownLinkRegex.Matches(text))
        {
            values.Add(match.Groups["target"].Value);
        }
        foreach (Match match in InlineCodeRegex.Matches(text))
        {
            var inline = match.Groups["value"].Value;
            foreach (Match path in RepositoryPathRegex.Matches(inline))
            {
                values.Add(path.Value);
            }
            foreach (Match file in RepositoryFileRegex.Matches(inline))
            {
                values.Add(file.Value);
            }
        }
        foreach (Match path in RepositoryPathRegex.Matches(text))
        {
            values.Add(path.Value);
        }
        foreach (Match file in RepositoryFileRegex.Matches(text))
        {
            values.Add(file.Value);
        }
        return values
            .Select(NormalizePath)
            .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
            .ThenBy(value => value, StringComparer.Ordinal)
            .ToArray();
    }

    private static InstructionRulePolarity GetPolarity(string text)
    {
        if (ProhibitionRegex.IsMatch(text))
        {
            return InstructionRulePolarity.Prohibit;
        }
        if (PreferenceRegex.IsMatch(text))
        {
            return InstructionRulePolarity.Prefer;
        }
        if (RequirementRegex.IsMatch(text) || ImperativeRegex.IsMatch(text))
        {
            return InstructionRulePolarity.Require;
        }
        return InstructionRulePolarity.Neutral;
    }

    private static string NormalizeInstruction(string value)
    {
        var normalized = NormalizeNewLines(value).Normalize(NormalizationForm.FormKC);
        normalized = MarkdownLinkRegex.Replace(normalized, match =>
            $"{match.Value.Split(']')[0].TrimStart('[')} {match.Groups["target"].Value}");
        normalized = StripInlineMarkdown(normalized).Replace('\\', '/').ToLowerInvariant();
        normalized = Regex.Replace(normalized, @"\b(?:you\s+)?(?:must\s+not|shall\s+not|do\s+not|don't|never)\b", " prohibit ", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        normalized = Regex.Replace(normalized, @"\b(?:you\s+)?(?:are\s+required\s+to|is\s+required\s+to|must|shall|always)\b", " require ", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        normalized = Regex.Replace(normalized, @"\b(?:should|prefer|recommended\s+to)\b", " prefer ", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
        normalized = Regex.Replace(normalized, @"[^\p{L}\p{N}\s/._:+\-=]", " ", RegexOptions.CultureInvariant);
        return WhitespaceRegex.Replace(normalized, " ").Trim().TrimEnd('.', ';', ':');
    }

    private static string NormalizeCore(string normalized)
    {
        var core = Regex.Replace(normalized, @"\b(?:require|prohibit|prefer|please|you|the|a|an|only|always)\b", " ", RegexOptions.CultureInvariant);
        core = Regex.Replace(core, @"\btests\b", "test", RegexOptions.CultureInvariant);
        core = Regex.Replace(core, @"\bcommands\b", "command", RegexOptions.CultureInvariant);
        core = Regex.Replace(core, @"\bfiles\b", "file", RegexOptions.CultureInvariant);
        return WhitespaceRegex.Replace(core, " ").Trim();
    }

    private static string StripInlineMarkdown(string value)
    {
        return value
            .Replace("`", "", StringComparison.Ordinal)
            .Replace("**", "", StringComparison.Ordinal)
            .Replace("__", "", StringComparison.Ordinal)
            .Replace("~~", "", StringComparison.Ordinal)
            .Replace("*", "", StringComparison.Ordinal);
    }

    private static bool LooksLikeInstruction(string value)
    {
        return RequirementRegex.IsMatch(value) || ImperativeRegex.IsMatch(value) || ProhibitionRegex.IsMatch(value) ||
               PreferenceRegex.IsMatch(value) || VagueRegex.IsMatch(value) || QualitativeRegex.IsMatch(value);
    }

    private static HashSet<string> Tokenize(string value)
    {
        return WordRegex.Matches(value)
            .Select(match => match.Value.ToLowerInvariant())
            .Where(term => term.Length > 1 && term is not "require" and not "prohibit" and not "prefer")
            .ToHashSet(StringComparer.Ordinal);
    }

    private static double Jaccard(IReadOnlySet<string> left, IReadOnlySet<string> right)
    {
        if (left.Count == 0 || right.Count == 0)
        {
            return 0;
        }
        var intersection = left.Count(right.Contains);
        var union = left.Count + right.Count - intersection;
        return union == 0 ? 0 : (double)intersection / union;
    }

    private static string GetSimilarityBucket(InstructionRule rule)
    {
        return Tokenize(rule.CoreText).OrderBy(term => term, StringComparer.Ordinal).FirstOrDefault() ?? "~";
    }

    private static InstructionLocation ToLocation(InstructionRule rule)
    {
        return new InstructionLocation(rule.SourcePath, rule.StartLine, rule.EndLine, rule.DirectoryScope);
    }

    private static string BuildRuleId(string path, int startLine, int endLine, string normalized)
    {
        return Sha256($"{NormalizePath(path).ToLowerInvariant()}\n{startLine}\n{endLine}\n{normalized}");
    }

    private static string BuildFindingFingerprint(
        string ruleId,
        InstructionLocation primary,
        IReadOnlyList<InstructionLocation> related)
    {
        var locations = new[] { primary }
            .Concat(related)
            .OrderBy(location => location.Path, StringComparer.OrdinalIgnoreCase)
            .ThenBy(location => location.Path, StringComparer.Ordinal)
            .ThenBy(location => location.StartLine)
            .Select(location => $"{NormalizePath(location.Path).ToLowerInvariant()}:{location.StartLine}:{location.EndLine}:{NormalizePath(location.DirectoryScope).ToLowerInvariant()}");
        return Sha256(ruleId + "\n" + string.Join('\n', locations));
    }

    private static string Sha256(string value)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
    }

    private static string BuildPairKey(InstructionRule left, InstructionRule right)
    {
        return string.CompareOrdinal(left.Id, right.Id) <= 0 ? $"{left.Id}|{right.Id}" : $"{right.Id}|{left.Id}";
    }

    private static bool MatchesAnyGlob(string relativePath, IReadOnlyList<string> globs, bool defaultWhenEmpty)
    {
        return globs.Count == 0 ? defaultWhenEmpty : globs.Any(glob => GlobMatcher.IsMatch(relativePath, glob));
    }

    private static void ValidateGlobs(IReadOnlyList<string> globs, string parameterName)
    {
        if (globs.Any(string.IsNullOrWhiteSpace))
        {
            throw new ArgumentException("Instruction audit globs must not be empty or whitespace.", parameterName);
        }
    }

    private static bool ScopesOverlap(string left, string right)
    {
        return IsScopeWithin(left, right) || IsScopeWithin(right, left);
    }

    private static bool IsScopeWithin(string candidate, string scope)
    {
        var normalizedCandidate = NormalizeScope(candidate);
        var normalizedScope = NormalizeScope(scope);
        return normalizedScope == "." ||
               string.Equals(normalizedCandidate, normalizedScope, StringComparison.OrdinalIgnoreCase) ||
               normalizedCandidate.StartsWith(normalizedScope + "/", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsStrictDescendantScope(string candidate, string broader)
    {
        return !string.Equals(NormalizeScope(candidate), NormalizeScope(broader), StringComparison.OrdinalIgnoreCase) &&
               IsScopeWithin(candidate, broader);
    }

    private static bool IsPathWithinScope(string path, string scope)
    {
        var directory = GetDirectory(path);
        return IsScopeWithin(directory, scope);
    }

    private static string NormalizeScope(string value)
    {
        var normalized = NormalizePath(value).Trim('/');
        return normalized.Length == 0 ? "." : normalized;
    }

    private static string NormalizePath(string value)
    {
        return value.Replace('\\', '/').Trim().TrimStart('/');
    }

    private static string GetDirectory(string path)
    {
        var normalized = NormalizePath(path).TrimEnd('/');
        var separator = normalized.LastIndexOf('/');
        return separator <= 0 ? "." : normalized[..separator];
    }

    private static string GetFileName(string path)
    {
        var normalized = NormalizePath(path).TrimEnd('/');
        var separator = normalized.LastIndexOf('/');
        return separator < 0 ? normalized : normalized[(separator + 1)..];
    }

    private static int GetDepth(string scope)
    {
        return scope == "." ? 0 : scope.Count(character => character == '/') + 1;
    }

    private static string NormalizeNewLines(string value)
    {
        return value.Replace("\r\n", "\n", StringComparison.Ordinal).Replace('\r', '\n');
    }

    private readonly record struct SourceDescriptor(InstructionSourceType Type, string Scope, int Precedence);

    private sealed record AnalysisResult(
        IReadOnlyList<InstructionFinding> Findings,
        IReadOnlySet<string> ExactDuplicateRuleIds,
        IReadOnlySet<string> AvoidableRuleIds);
}
