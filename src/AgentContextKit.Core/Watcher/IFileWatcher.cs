namespace AgentContextKit.Core;

public interface IFileWatcher : IDisposable
{
    event Action<FileWatcherEvent>? Changed;

    void Start();

    void Stop();
}
