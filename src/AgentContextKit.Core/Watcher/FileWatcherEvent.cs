namespace AgentContextKit.Core;

public enum FileWatcherChangeKind
{
    Created,
    Changed,
    Renamed,
    Deleted
}

public sealed record FileWatcherEvent(
    string RelativePath,
    FileWatcherChangeKind Kind,
    DateTimeOffset Timestamp);
