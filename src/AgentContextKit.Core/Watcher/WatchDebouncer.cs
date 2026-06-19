namespace AgentContextKit.Core;

public sealed class WatchDebouncer
{
    private readonly TimeSpan _window;
    private readonly Func<DateTimeOffset> _clock;
    private DateTimeOffset _lastAccepted = DateTimeOffset.MinValue;

    public WatchDebouncer(TimeSpan window)
        : this(window, () => DateTimeOffset.UtcNow)
    {
    }

    public WatchDebouncer(TimeSpan window, Func<DateTimeOffset> clock)
    {
        if (window < TimeSpan.Zero)
        {
            throw new ArgumentOutOfRangeException(nameof(window), "Debounce window must not be negative.");
        }
        _window = window;
        _clock = clock ?? throw new ArgumentNullException(nameof(clock));
    }

    public TimeSpan Window => _window;

    public bool TryAccept(DateTimeOffset timestamp)
    {
        if (timestamp - _lastAccepted >= _window)
        {
            _lastAccepted = timestamp;
            return true;
        }
        return false;
    }

    public bool TryAccept()
    {
        return TryAccept(_clock());
    }

    public void Reset()
    {
        _lastAccepted = DateTimeOffset.MinValue;
    }
}
