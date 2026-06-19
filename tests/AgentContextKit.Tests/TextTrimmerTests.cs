using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class TextTrimmerTests
{
    [Fact]
    public void ContentShorterThanMaxCharsIsReturnedUnchanged()
    {
        var content = "Hello, world!";
        var result = TextTrimmer.Trim(content, 100);

        Assert.Equal(content, result);
    }

    [Fact]
    public void ContentEqualToMaxCharsIsReturnedUnchanged()
    {
        var content = new string('a', 100);
        var result = TextTrimmer.Trim(content, 100);

        Assert.Equal(content, result);
    }

    [Fact]
    public void MaxCharsEqualToHeaderPlusNoteReturnsOnlyHeaderAndNote()
    {
        var content = new string('a', 10_000);
        var budget = TextTrimmer.Header.Length + TextTrimmer.Note.Length;
        var result = TextTrimmer.Trim(content, budget);

        Assert.Equal(TextTrimmer.Header + TextTrimmer.Note, result);
    }

    [Fact]
    public void MaxCharsBelowHeaderPlusNoteReturnsOnlyHeaderAndNote()
    {
        var content = new string('a', 10_000);
        var result = TextTrimmer.Trim(content, 5);

        Assert.Equal(TextTrimmer.Header + TextTrimmer.Note, result);
    }

    [Fact]
    public void BodyOneByteBeyondHeaderPlusNoteIncludesFirstBodyByte()
    {
        var content = new string('a', 10_000);
        var budget = TextTrimmer.Header.Length + TextTrimmer.Note.Length + 1;
        var result = TextTrimmer.Trim(content, budget);

        Assert.Equal(budget, result.Length);
        Assert.StartsWith(TextTrimmer.Header, result);
        Assert.Equal("a", result.Substring(TextTrimmer.Header.Length + TextTrimmer.Note.Length));
    }

    [Fact]
    public void Utf8MultiByteAtBoundaryIsPreservedSafely()
    {
        var content = string.Concat(Enumerable.Repeat("ümlaut ", 200));
        var budget = TextTrimmer.Header.Length + TextTrimmer.Note.Length + 5;
        var result = TextTrimmer.Trim(content, budget);

        Assert.StartsWith(TextTrimmer.Header + TextTrimmer.Note, result);
        Assert.True(result.Length <= budget, string.Format("expected len <= {0}, got {1}", budget, result.Length));
    }

    [Fact]
    public void NullByteInContentIsPreservedInTruncatedBody()
    {
        var content = new string('a', 5) + "\0" + new string('b', 10_000);
        var budget = TextTrimmer.Header.Length + TextTrimmer.Note.Length + 8;
        var result = TextTrimmer.Trim(content, budget);

        Assert.StartsWith(TextTrimmer.Header + TextTrimmer.Note, result);
        Assert.Contains("\0", result);
        Assert.Equal(budget, result.Length);
    }

    [Fact]
    public void EmptyContentWithZeroMaxCharsReturnsEmpty()
    {
        var result = TextTrimmer.Trim(string.Empty, 0);

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void EmptyContentWithLargeBudgetReturnsEmpty()
    {
        var content = string.Empty;
        var result = TextTrimmer.Trim(content, 1000);

        Assert.Equal(content, result);
    }

    [Fact]
    public void LargeContentIsTruncatedDeterministically()
    {
        var content = string.Concat(Enumerable.Repeat("x", 10_000));
        var result1 = TextTrimmer.Trim(content, 250);
        var result2 = TextTrimmer.Trim(content, 250);

        Assert.Equal(result1, result2);
        Assert.True(result1.Length <= 250, string.Format("expected len <= 250, got {0}", result1.Length));
    }

    [Fact]
    public void OutputIsDeterministicAcrossCalls()
    {
        var content = string.Concat(Enumerable.Repeat("deterministic ", 100));
        var result1 = TextTrimmer.Trim(content, 500);
        var result2 = TextTrimmer.Trim(content, 500);

        Assert.Equal(result1, result2);
    }

    [Fact]
    public void NonAsciiContentIsHandledByCharCount()
    {
        var content = string.Concat(Enumerable.Repeat("中文", 1000));
        var budget = TextTrimmer.Header.Length + TextTrimmer.Note.Length + 20;
        var result = TextTrimmer.Trim(content, budget);

        Assert.True(result.Length <= budget, string.Format("expected len <= {0}, got {1}", budget, result.Length));
        Assert.StartsWith(TextTrimmer.Header + TextTrimmer.Note, result);
    }

    [Fact]
    public void NullContentThrows()
    {
        Assert.Throws<ArgumentNullException>(() => TextTrimmer.Trim(null!, 100));
    }

    [Fact]
    public void NegativeMaxCharsThrows()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => TextTrimmer.Trim("hello", -1));
    }

    [Fact]
    public void ZeroMaxCharsReturnsHeaderAndNote()
    {
        var content = new string('a', 100);
        var result = TextTrimmer.Trim(content, 0);

        Assert.Equal(TextTrimmer.Header + TextTrimmer.Note, result);
    }
}
