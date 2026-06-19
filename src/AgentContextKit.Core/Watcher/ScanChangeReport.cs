namespace AgentContextKit.Core;

public sealed record ScanChangeReport(
    int AddedCount,
    int RemovedCount,
    int UnchangedCount,
    int SeverityChangedCount,
    IReadOnlyList<RiskFinding> AddedSample,
    IReadOnlyList<RiskFinding> RemovedSample,
    IReadOnlyList<SeverityChangeSample> SeverityChangedSample);

public sealed record SeverityChangeSample(
    string Path,
    string RuleId,
    string FromSeverity,
    string ToSeverity);

public static class ScanChangeReportBuilder
{
    private const int MaxSampleRows = 25;

    public static ScanChangeReport Compute(ScanResult previous, ScanResult current)
    {
        ArgumentNullException.ThrowIfNull(previous);
        ArgumentNullException.ThrowIfNull(current);

        var previousManifest = new BaselineClassifier().CreateManifest(previous.Findings);
        var currentManifest = new BaselineClassifier().CreateManifest(current.Findings);
        var diff = BaselineDiffCalculator.Compare(previousManifest, currentManifest);

        var previousByPath = previous.Findings.ToDictionary(finding => finding.Path, StringComparer.OrdinalIgnoreCase);
        var currentByPath = current.Findings.ToDictionary(finding => finding.Path, StringComparer.OrdinalIgnoreCase);

        var addedSample = diff.Added
            .Select(entry => currentByPath.TryGetValue(entry.Path, out var finding) ? finding : null)
            .Where(finding => finding is not null)
            .Cast<RiskFinding>()
            .Take(MaxSampleRows)
            .ToArray();

        var removedSample = diff.Removed
            .Select(entry => previousByPath.TryGetValue(entry.Path, out var finding) ? finding : null)
            .Where(finding => finding is not null)
            .Cast<RiskFinding>()
            .Take(MaxSampleRows)
            .ToArray();

        var severityChangedSample = diff.SeverityChanged
            .Select(change => new SeverityChangeSample(
                Path: change.To.Path,
                RuleId: change.To.RuleId,
                FromSeverity: change.From.Severity.ToString(),
                ToSeverity: change.To.Severity.ToString()))
            .Take(MaxSampleRows)
            .ToArray();

        return new ScanChangeReport(
            AddedCount: diff.Added.Count,
            RemovedCount: diff.Removed.Count,
            UnchangedCount: diff.Unchanged.Count,
            SeverityChangedCount: diff.SeverityChanged.Count,
            AddedSample: addedSample,
            RemovedSample: removedSample,
            SeverityChangedSample: severityChangedSample);
    }
}
