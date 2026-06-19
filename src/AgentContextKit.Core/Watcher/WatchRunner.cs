namespace AgentContextKit.Core;

public sealed record WatchOptions(
    TimeSpan Debounce,
    TimeSpan MaxRuntime,
    bool OneShot,
    LanguageCode Language,
    bool EmitJson,
    string RepositoryPath,
    AckitConfig Config,
    Func<DateTimeOffset> Clock);

public sealed record WatchResult(
    int ScansRun,
    int EventsAccepted,
    int EventsIgnored,
    ScanChangeReport? LastReport);

public static class WatchRunner
{
    public static WatchResult Run(
        IFileWatcher watcher,
        IRepositoryScanner scanner,
        WatchOptions options)
    {
        ArgumentNullException.ThrowIfNull(watcher);
        ArgumentNullException.ThrowIfNull(scanner);
        ArgumentNullException.ThrowIfNull(options);

        var debouncer = new WatchDebouncer(options.Debounce, options.Clock);
        var repositoryName = GetRepositoryName(options.RepositoryPath);

        ScanResult previousScan;
        try
        {
            previousScan = scanner.Scan(options.RepositoryPath, options.Config);
        }
        catch
        {
            previousScan = new ScanResult(
                RepositoryPath: options.RepositoryPath,
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

        var scansRun = 0;
        var eventsAccepted = 0;
        var eventsIgnored = 0;
        ScanChangeReport? lastReport = null;
        var done = false;

        Action<FileWatcherEvent> handler = evt =>
        {
            if (done) return;
            if (WatchIgnoreFilter.IsIgnored(evt.RelativePath))
            {
                eventsIgnored++;
                return;
            }
            if (!debouncer.TryAccept(evt.Timestamp))
            {
                return;
            }
            eventsAccepted++;
            ScanResult newScan;
            try
            {
                newScan = scanner.Scan(options.RepositoryPath, options.Config);
            }
            catch
            {
                return;
            }
            scansRun++;
            var report = ScanChangeReportBuilder.Compute(previousScan, newScan);
            previousScan = newScan;
            lastReport = report;
        };

        watcher.Changed += handler;
        watcher.Start();
        try
        {
            if (options.OneShot)
            {
                handler(new FileWatcherEvent("oneshot", FileWatcherChangeKind.Changed, options.Clock()));
                done = true;
            }
            else
            {
                var deadline = options.MaxRuntime > TimeSpan.Zero
                    ? options.Clock() + options.MaxRuntime
                    : DateTimeOffset.MaxValue;
                while (!done && options.Clock() < deadline)
                {
                    Thread.Sleep(20);
                }
            }
        }
        finally
        {
            try { watcher.Stop(); } catch { }
            watcher.Changed -= handler;
        }

        _ = repositoryName;
        return new WatchResult(scansRun, eventsAccepted, eventsIgnored, lastReport);
    }

    private static string GetRepositoryName(string repositoryPath)
    {
        var trimmed = repositoryPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        return Path.GetFileName(trimmed);
    }
}
