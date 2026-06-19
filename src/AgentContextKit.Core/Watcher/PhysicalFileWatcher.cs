namespace AgentContextKit.Core;

public sealed class PhysicalFileWatcher : IFileWatcher
{
    private readonly string _repositoryFullPath;
    private readonly FileSystemWatcher _inner;

    public PhysicalFileWatcher(string repositoryPath)
    {
        if (string.IsNullOrWhiteSpace(repositoryPath))
        {
            throw new ArgumentException("Repository path must not be empty.", nameof(repositoryPath));
        }

        _repositoryFullPath = System.IO.Path.GetFullPath(repositoryPath)
            .TrimEnd(System.IO.Path.DirectorySeparatorChar, System.IO.Path.AltDirectorySeparatorChar);
        _inner = new FileSystemWatcher(_repositoryFullPath)
        {
            IncludeSubdirectories = true,
            NotifyFilter = NotifyFilters.FileName
                | NotifyFilters.DirectoryName
                | NotifyFilters.LastWrite
                | NotifyFilters.Size
                | NotifyFilters.CreationTime,
            InternalBufferSize = 64 * 1024,
            EnableRaisingEvents = false
        };

        _inner.Created += OnCreated;
        _inner.Deleted += OnDeleted;
        _inner.Changed += OnChanged;
        _inner.Renamed += OnRenamed;
    }

    public event Action<FileWatcherEvent>? Changed;

    public void Start()
    {
        _inner.EnableRaisingEvents = true;
    }

    public void Stop()
    {
        _inner.EnableRaisingEvents = false;
    }

    public void Dispose()
    {
        try
        {
            _inner.EnableRaisingEvents = false;
        }
        catch
        {
        }
        _inner.Dispose();
    }

    private void OnCreated(object sender, FileSystemEventArgs e) => Handle(e, FileWatcherChangeKind.Created);
    private void OnDeleted(object sender, FileSystemEventArgs e) => Handle(e, FileWatcherChangeKind.Deleted);
    private void OnChanged(object sender, FileSystemEventArgs e) => Handle(e, FileWatcherChangeKind.Changed);
    private void OnRenamed(object sender, RenamedEventArgs e) => Handle(e, FileWatcherChangeKind.Renamed);

    private void Handle(FileSystemEventArgs e, FileWatcherChangeKind kind)
    {
        var relative = ToRelative(e.FullPath);
        if (relative is null)
        {
            return;
        }

        try
        {
            Changed?.Invoke(new FileWatcherEvent(relative, kind, DateTimeOffset.UtcNow));
        }
        catch
        {
        }
    }

    private string? ToRelative(string fullPath)
    {
        try
        {
            var normalized = System.IO.Path.GetFullPath(fullPath)
                .TrimEnd(System.IO.Path.DirectorySeparatorChar, System.IO.Path.AltDirectorySeparatorChar);
            if (!normalized.StartsWith(_repositoryFullPath, StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }
            var rel = normalized.Substring(_repositoryFullPath.Length)
                .TrimStart(System.IO.Path.DirectorySeparatorChar, System.IO.Path.AltDirectorySeparatorChar)
                .Replace('\\', '/');
            return rel;
        }
        catch
        {
            return null;
        }
    }
}
