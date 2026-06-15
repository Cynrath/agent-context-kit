using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace AgentContextKit.Core;

public static class BaselineSchema
{
    public const int CurrentVersion = 1;

    public const string FingerprintAlgorithm = "sha256-rule-path-location-occurrence-v1";
}

public sealed record BaselineLocation
{
    public BaselineLocation(int? startLine = null, int? startColumn = null, int? occurrence = null)
    {
        if (startLine is <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(startLine), "Baseline line numbers must be positive.");
        }

        if (startColumn is <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(startColumn), "Baseline column numbers must be positive.");
        }

        if (startColumn.HasValue && !startLine.HasValue)
        {
            throw new ArgumentException("A baseline column requires a line number.", nameof(startColumn));
        }

        if (occurrence is <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(occurrence), "Baseline occurrence numbers must be positive.");
        }

        StartLine = startLine;
        StartColumn = startColumn;
        Occurrence = occurrence;
    }

    public int? StartLine { get; }

    public int? StartColumn { get; }

    public int? Occurrence { get; }
}

public sealed record BaselineEntry
{
    public BaselineEntry(
        string ruleId,
        string path,
        RiskSeverity severity,
        BaselineLocation? location = null)
    {
        RuleId = BaselineFingerprint.NormalizeRuleId(ruleId);
        Path = BaselineFingerprint.NormalizeRelativePath(path);
        Severity = severity;
        StartLine = location?.StartLine;
        StartColumn = location?.StartColumn;
        Occurrence = location?.Occurrence;
        Fingerprint = BaselineFingerprint.Create(RuleId, Path, location);
    }

    public string Fingerprint { get; }

    public string RuleId { get; }

    public string Path { get; }

    public RiskSeverity Severity { get; }

    public int? StartLine { get; }

    public int? StartColumn { get; }

    public int? Occurrence { get; }
}

public sealed record BaselineManifest
{
    public BaselineManifest(IEnumerable<BaselineEntry> entries)
    {
        ArgumentNullException.ThrowIfNull(entries);

        var ordered = entries
            .OrderBy(entry => entry.Path, StringComparer.Ordinal)
            .ThenBy(entry => entry.RuleId, StringComparer.Ordinal)
            .ThenBy(entry => entry.StartLine)
            .ThenBy(entry => entry.StartColumn)
            .ThenBy(entry => entry.Occurrence)
            .ThenBy(entry => entry.Fingerprint, StringComparer.Ordinal)
            .ToArray();

        var duplicate = ordered
            .GroupBy(entry => entry.Fingerprint, StringComparer.Ordinal)
            .FirstOrDefault(group => group.Count() > 1);

        if (duplicate is not null)
        {
            throw new ArgumentException($"Duplicate baseline fingerprint: {duplicate.Key}", nameof(entries));
        }

        SchemaVersion = BaselineSchema.CurrentVersion;
        FingerprintAlgorithm = BaselineSchema.FingerprintAlgorithm;
        Entries = Array.AsReadOnly(ordered);
    }

    public int SchemaVersion { get; }

    public string FingerprintAlgorithm { get; }

    public IReadOnlyList<BaselineEntry> Entries { get; }
}

public sealed record BaselineDiff
{
    public BaselineDiff(
        IReadOnlyList<BaselineEntry> added,
        IReadOnlyList<BaselineEntry> removed,
        IReadOnlyList<BaselineEntry> unchanged,
        IReadOnlyList<BaselineDiffChange> severityChanged)
    {
        Added = added;
        Removed = removed;
        Unchanged = unchanged;
        SeverityChanged = severityChanged;
    }

    public IReadOnlyList<BaselineEntry> Added { get; }
    public IReadOnlyList<BaselineEntry> Removed { get; }
    public IReadOnlyList<BaselineEntry> Unchanged { get; }
    public IReadOnlyList<BaselineDiffChange> SeverityChanged { get; }
}

public sealed record BaselineDiffChange(BaselineEntry From, BaselineEntry To);

public static class BaselineDiffCalculator
{
    public static BaselineDiff Compare(BaselineManifest from, BaselineManifest to)
    {
        ArgumentNullException.ThrowIfNull(from);
        ArgumentNullException.ThrowIfNull(to);

        var fromByFp = from.Entries.ToDictionary(e => e.Fingerprint, StringComparer.Ordinal);
        var toByFp = to.Entries.ToDictionary(e => e.Fingerprint, StringComparer.Ordinal);

        var added = to.Entries.Where(e => !fromByFp.ContainsKey(e.Fingerprint)).ToArray();
        var removed = from.Entries.Where(e => !toByFp.ContainsKey(e.Fingerprint)).ToArray();
        var unchanged = new List<BaselineEntry>();
        var severityChanged = new List<BaselineDiffChange>();
        foreach (var e in to.Entries)
        {
            if (!fromByFp.TryGetValue(e.Fingerprint, out var f)) continue;
            if (f.Severity == e.Severity) unchanged.Add(e);
            else severityChanged.Add(new BaselineDiffChange(f, e));
        }

        return new BaselineDiff(added, removed, unchanged, severityChanged);
    }
}

public static class BaselineSerializer
{
    public static BaselineManifest Deserialize(string json)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(json);
        using var document = System.Text.Json.JsonDocument.Parse(json);
        var root = document.RootElement;
        var schema = root.TryGetProperty("schemaVersion", out var sv) ? sv.GetInt32() : 0;
        if (schema != BaselineSchema.CurrentVersion)
        {
            throw new InvalidOperationException($"Unsupported baseline schema version: {schema}");
        }
        if (!root.TryGetProperty("entries", out var entries) || entries.ValueKind != System.Text.Json.JsonValueKind.Array)
        {
            return new BaselineManifest(Array.Empty<BaselineEntry>());
        }
        var list = new List<BaselineEntry>();
        foreach (var el in entries.EnumerateArray())
        {
            var ruleId = el.TryGetProperty("ruleId", out var rid) ? rid.GetString() ?? "" : "";
            var path = el.TryGetProperty("path", out var pp) ? pp.GetString() ?? "" : "";
            var severity = el.TryGetProperty("severity", out var sevEl) ? ParseSeverity(sevEl.GetString()) : RiskSeverity.Info;
            int? sl = el.TryGetProperty("startLine", out var sLine) && sLine.ValueKind == System.Text.Json.JsonValueKind.Number ? sLine.GetInt32() : null;
            int? sc = el.TryGetProperty("startColumn", out var sCol) && sCol.ValueKind == System.Text.Json.JsonValueKind.Number ? sCol.GetInt32() : null;
            int? occ = el.TryGetProperty("occurrence", out var occEl) && occEl.ValueKind == System.Text.Json.JsonValueKind.Number ? occEl.GetInt32() : null;
            var loc = (sl.HasValue || sc.HasValue || occ.HasValue) ? new BaselineLocation(sl, sc, occ) : null;
            list.Add(new BaselineEntry(ruleId, path, severity, loc));
        }
        return new BaselineManifest(list);
    }

    private static RiskSeverity ParseSeverity(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        "critical" => RiskSeverity.Critical,
        "high" => RiskSeverity.High,
        "medium" => RiskSeverity.Medium,
        "low" => RiskSeverity.Low,
        _ => RiskSeverity.Info
    };
}

public static partial class BaselineFingerprint
{
    public static string Create(string ruleId, string relativePath, BaselineLocation? location = null)
    {
        var normalizedRuleId = NormalizeRuleId(ruleId);
        var normalizedPath = NormalizeRelativePath(relativePath);
        var canonical = string.Join('\n',
            BaselineSchema.FingerprintAlgorithm,
            normalizedRuleId,
            normalizedPath,
            location?.StartLine?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty,
            location?.StartColumn?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty,
            location?.Occurrence?.ToString(System.Globalization.CultureInfo.InvariantCulture) ?? string.Empty);
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(canonical));
        return Convert.ToHexStringLower(hash);
    }

    public static string NormalizeRuleId(string ruleId)
    {
        if (string.IsNullOrWhiteSpace(ruleId))
        {
            throw new ArgumentException("Baseline rule ID is required.", nameof(ruleId));
        }

        var normalized = ruleId.Trim().Normalize(NormalizationForm.FormC).ToUpperInvariant();
        if (!RuleIdPattern().IsMatch(normalized))
        {
            throw new ArgumentException("Baseline rule ID contains unsupported characters.", nameof(ruleId));
        }

        return normalized;
    }

    public static string NormalizeRelativePath(string relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            throw new ArgumentException("Baseline path is required.", nameof(relativePath));
        }

        var normalized = relativePath.Trim().Normalize(NormalizationForm.FormC).Replace('\\', '/');
        if (normalized.StartsWith("/", StringComparison.Ordinal) ||
            normalized.Contains(":", StringComparison.Ordinal) ||
            normalized.Any(char.IsControl))
        {
            throw new ArgumentException("Baseline path must be a safe repository-relative path.", nameof(relativePath));
        }

        var segments = new List<string>();
        foreach (var segment in normalized.Split('/', StringSplitOptions.RemoveEmptyEntries))
        {
            if (segment == ".")
            {
                continue;
            }

            if (segment == "..")
            {
                throw new ArgumentException("Baseline path must not escape the repository.", nameof(relativePath));
            }

            if (segment.Any(char.IsControl))
            {
                throw new ArgumentException("Baseline path contains unsupported characters.", nameof(relativePath));
            }

            segments.Add(segment);
        }

        if (segments.Count == 0)
        {
            throw new ArgumentException("Baseline path is required.", nameof(relativePath));
        }

        return string.Join('/', segments);
    }

    [GeneratedRegex("^[A-Z0-9][A-Z0-9._-]{0,63}$", RegexOptions.CultureInvariant)]
    private static partial Regex RuleIdPattern();
}
