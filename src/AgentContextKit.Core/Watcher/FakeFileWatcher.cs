namespace AgentContextKit.Core;

public sealed class FakeFileWatcher : IFileWatcher
{
    public event Action<FileWatcherEvent>? Changed;

    public bool Started { get; private set; }

    public List<FileWatcherEvent> Raised { get; } = new();

    public void Start() => Started = true;

    public void Stop() => Started = false;

    public void Raise(FileWatcherEvent evt)
    {
        Raised.Add(evt);
        Changed?.Invoke(evt);
    }

    public void Raise(string relativePath, FileWatcherChangeKind kind)
    {
        Raise(new FileWatcherEvent(relativePath, kind, DateTimeOffset.UtcNow));
    }

    public void Dispose()
    {
    }
}
