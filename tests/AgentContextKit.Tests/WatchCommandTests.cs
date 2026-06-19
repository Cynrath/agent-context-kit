using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class WatchCommandTests
{
    [Fact]
    public void OneShotRunsExactlyOneScanAndExits()
    {
        var watcher = new FakeFileWatcher();
        var scanner = new FakeRepositoryScanner();
        var options = new WatchOptions(
            Debounce: TimeSpan.FromMilliseconds(0),
            MaxRuntime: TimeSpan.Zero,
            OneShot: true,
            Language: LanguageCode.English,
            EmitJson: false,
            RepositoryPath: "/repo",
            Config: AckitConfig.Default,
            Clock: () => DateTimeOffset.UtcNow);

        var result = WatchRunner.Run(watcher, scanner, options);

        Assert.Equal(1, result.ScansRun);
    }

    [Fact]
    public void OneShotCountsInitialScanOnly()
    {
        var watcher = new FakeFileWatcher();
        var scanner = new FakeRepositoryScanner();
        var options = new WatchOptions(
            Debounce: TimeSpan.Zero,
            MaxRuntime: TimeSpan.Zero,
            OneShot: true,
            Language: LanguageCode.English,
            EmitJson: false,
            RepositoryPath: "/repo",
            Config: AckitConfig.Default,
            Clock: () => DateTimeOffset.UtcNow);

        var result = WatchRunner.Run(watcher, scanner, options);

        Assert.Equal(1, result.ScansRun);
        Assert.True(result.LastReport is not null);
    }

    [Fact]
    public void ScanChangeReportAddedSampleTruncatedAt25()
    {
        var findings = Enumerable.Range(0, 60)
            .Select(i => new RiskFinding(
                Severity: RiskSeverity.Medium,
                Category: RiskCategory.Secret,
                Path: string.Format("secrets/file-{0}.txt", i),
                Message: string.Format("Secret value detected in secrets/file-{0}.txt", i),
                Match: null))
            .ToArray();

        var previous = EmptyScan();
        var current = EmptyScan() with { Findings = findings };

        var report = ScanChangeReportBuilder.Compute(previous, current);

        Assert.Equal(60, report.AddedCount);
        Assert.Equal(25, report.AddedSample.Count);
        Assert.Equal(0, report.RemovedCount);
        Assert.Equal(0, report.SeverityChangedCount);
        Assert.Equal(0, report.UnchangedCount);
    }

    [Fact]
    public void ScanChangeReportDetectsSeverityChange()
    {
        var previous = EmptyScan() with
        {
            Findings = new[]
            {
                new RiskFinding(
                    Severity: RiskSeverity.Low,
                    Category: RiskCategory.Secret,
                    Path: "settings.txt",
                    Message: "low risk",
                    Match: null)
            }
        };

        var current = EmptyScan() with
        {
            Findings = new[]
            {
                new RiskFinding(
                    Severity: RiskSeverity.Critical,
                    Category: RiskCategory.Secret,
                    Path: "settings.txt",
                    Message: "critical risk",
                    Match: null)
            }
        };

        var report = ScanChangeReportBuilder.Compute(previous, current);

        Assert.Equal(0, report.AddedCount);
        Assert.Equal(0, report.RemovedCount);
        Assert.True(report.SeverityChangedCount >= 1);
        Assert.Equal(1, report.SeverityChangedSample.Count);
    }

    [Fact]
    public void ScanChangeReportDetectsRemovedFinding()
    {
        var previous = EmptyScan() with
        {
            Findings = new[]
            {
                new RiskFinding(
                    Severity: RiskSeverity.Medium,
                    Category: RiskCategory.Secret,
                    Path: "old.txt",
                    Message: "old secret",
                    Match: null)
            }
        };

        var current = EmptyScan();

        var report = ScanChangeReportBuilder.Compute(previous, current);

        Assert.Equal(0, report.AddedCount);
        Assert.Equal(1, report.RemovedCount);
        Assert.Single(report.RemovedSample);
    }

    [Fact]
    public void EmptyToEmptyIsAllUnchanged()
    {
        var report = ScanChangeReportBuilder.Compute(EmptyScan(), EmptyScan());

        Assert.Equal(0, report.AddedCount);
        Assert.Equal(0, report.RemovedCount);
        Assert.Equal(0, report.SeverityChangedCount);
        Assert.Equal(0, report.UnchangedCount);
    }

    [Fact]
    public void SameFindingsAreAllUnchanged()
    {
        var findings = new[]
        {
            new RiskFinding(
                Severity: RiskSeverity.Medium,
                Category: RiskCategory.Secret,
                Path: "stable.txt",
                Message: "stable",
                Match: null)
        };

        var previous = EmptyScan() with { Findings = findings };
        var current = EmptyScan() with { Findings = findings };

        var report = ScanChangeReportBuilder.Compute(previous, current);

        Assert.Equal(0, report.AddedCount);
        Assert.Equal(0, report.RemovedCount);
        Assert.Equal(0, report.SeverityChangedCount);
        Assert.Equal(1, report.UnchangedCount);
    }

    [Fact]
    public void InitialScanFailureDoesNotCrash()
    {
        var watcher = new FakeFileWatcher();
        var scanner = new ThrowingRepositoryScanner();
        var options = new WatchOptions(
            Debounce: TimeSpan.FromMilliseconds(0),
            MaxRuntime: TimeSpan.Zero,
            OneShot: true,
            Language: LanguageCode.English,
            EmitJson: false,
            RepositoryPath: "/repo",
            Config: AckitConfig.Default,
            Clock: () => DateTimeOffset.UtcNow);

        var result = WatchRunner.Run(watcher, scanner, options);

        Assert.Equal(0, result.ScansRun);
    }

    [Fact]
    public void EventHandlerExceptionDoesNotCrash()
    {
        var watcher = new FakeFileWatcher();
        var scanner = new FakeRepositoryScanner();
        var options = new WatchOptions(
            Debounce: TimeSpan.FromMilliseconds(0),
            MaxRuntime: TimeSpan.Zero,
            OneShot: true,
            Language: LanguageCode.English,
            EmitJson: false,
            RepositoryPath: "/repo",
            Config: AckitConfig.Default,
            Clock: () => DateTimeOffset.UtcNow);

        var result = WatchRunner.Run(watcher, scanner, options);

        Assert.NotNull(result);
    }

    private static ScanResult EmptyScan()
    {
        return new ScanResult(
            RepositoryPath: "/repo",
            Files: Array.Empty<string>(),
            Stacks: Array.Empty<StackInfo>(),
            Findings: Array.Empty<RiskFinding>(),
            HasReadme: false,
            HasLicense: false,
            HasSecurityPolicy: false,
            HasContributing: false,
            HasCodeOfConduct: false,
            HasChangelog: false,
            HasTests: false,
            HasCi: false,
            HasDocker: false,
            HasAgentInstructions: false);
    }

    private sealed class FakeRepositoryScanner : IRepositoryScanner
    {
        private int _scanCallCount;
        public int ScanCallCount => _scanCallCount;

        public ScanResult Scan(
            string repositoryPath,
            AckitConfig? config = null,
            IReadOnlyList<string>? includeGlobs = null,
            IReadOnlyList<string>? excludeGlobs = null)
        {
            Interlocked.Increment(ref _scanCallCount);
            return EmptyScan() with { RepositoryPath = repositoryPath };
        }
    }

    private sealed class ThrowingRepositoryScanner : IRepositoryScanner
    {
        public ScanResult Scan(
            string repositoryPath,
            AckitConfig? config = null,
            IReadOnlyList<string>? includeGlobs = null,
            IReadOnlyList<string>? excludeGlobs = null)
        {
            throw new InvalidOperationException("synthetic initial scan failure");
        }
    }
}
