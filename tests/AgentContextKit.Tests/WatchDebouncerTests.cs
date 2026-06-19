using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class WatchDebouncerTests
{
    [Fact]
    public void FirstEventIsAccepted()
    {
        var debouncer = new WatchDebouncer(TimeSpan.FromMilliseconds(500));

        Assert.True(debouncer.TryAccept(new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero)));
    }

    [Fact]
    public void EventInsideWindowIsRejected()
    {
        var debouncer = new WatchDebouncer(TimeSpan.FromMilliseconds(500));
        var t0 = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
        debouncer.TryAccept(t0);

        Assert.False(debouncer.TryAccept(t0.AddMilliseconds(100)));
        Assert.False(debouncer.TryAccept(t0.AddMilliseconds(499)));
    }

    [Fact]
    public void EventAfterWindowIsAccepted()
    {
        var debouncer = new WatchDebouncer(TimeSpan.FromMilliseconds(500));
        var t0 = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
        debouncer.TryAccept(t0);

        Assert.True(debouncer.TryAccept(t0.AddMilliseconds(500)));
        Assert.True(debouncer.TryAccept(t0.AddMilliseconds(1500)));
    }

    [Fact]
    public void ZeroWindowAcceptsEveryEvent()
    {
        var debouncer = new WatchDebouncer(TimeSpan.Zero);
        var t0 = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

        Assert.True(debouncer.TryAccept(t0));
        Assert.True(debouncer.TryAccept(t0));
        Assert.True(debouncer.TryAccept(t0));
    }

    [Fact]
    public void MonotonicallyIncreasingTimestampsWithZeroWindowAreAllAccepted()
    {
        var debouncer = new WatchDebouncer(TimeSpan.Zero);
        var t0 = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

        for (var i = 0; i < 100; i++)
        {
            Assert.True(debouncer.TryAccept(t0.AddMilliseconds(i)));
        }
    }

    [Fact]
    public void EqualTimestampsInsideWindowAreRejected()
    {
        var debouncer = new WatchDebouncer(TimeSpan.FromMilliseconds(500));
        var t0 = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

        Assert.True(debouncer.TryAccept(t0));
        Assert.False(debouncer.TryAccept(t0));
        Assert.False(debouncer.TryAccept(t0));
    }

    [Fact]
    public void WindowBoundaryIsInclusiveAtExactEdge()
    {
        var debouncer = new WatchDebouncer(TimeSpan.FromMilliseconds(500));
        var t0 = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);

        Assert.True(debouncer.TryAccept(t0));
        Assert.False(debouncer.TryAccept(t0.AddMilliseconds(499)));
        Assert.True(debouncer.TryAccept(t0.AddMilliseconds(500)));
    }

    [Fact]
    public void NegativeWindowIsRejected()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => new WatchDebouncer(TimeSpan.FromMilliseconds(-1)));
    }

    [Fact]
    public void ResetAllowsImmediateAccept()
    {
        var debouncer = new WatchDebouncer(TimeSpan.FromMilliseconds(500));
        var t0 = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
        debouncer.TryAccept(t0);

        Assert.False(debouncer.TryAccept(t0.AddMilliseconds(100)));

        debouncer.Reset();

        Assert.True(debouncer.TryAccept(t0.AddMilliseconds(100)));
    }

    [Fact]
    public void InjectedClockDrivesDecisions()
    {
        var current = new DateTimeOffset(2026, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var debouncer = new WatchDebouncer(TimeSpan.FromMilliseconds(500), () => current);

        Assert.True(debouncer.TryAccept());
        current = current.AddMilliseconds(100);
        Assert.False(debouncer.TryAccept());
        current = current.AddMilliseconds(500);
        Assert.True(debouncer.TryAccept());
    }
}
