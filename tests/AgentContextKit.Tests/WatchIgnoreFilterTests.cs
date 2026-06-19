using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class WatchIgnoreFilterTests
{
    [Theory]
    [InlineData(".git")]
    [InlineData(".git/HEAD")]
    [InlineData(".git/refs/heads/main")]
    [InlineData(".ackit/cache/foo.txt")]
    [InlineData(".ackit/reports/report.html")]
    [InlineData(".ackit/webui/index.html")]
    [InlineData(".ackit/prompt-packs/pack.md")]
    [InlineData(".ackit/context-exports/manifest.json")]
    [InlineData("bin")]
    [InlineData("src/bin/Release/foo.dll")]
    [InlineData("obj")]
    [InlineData("src/obj/Debug/foo.dll")]
    [InlineData("node_modules/lodash/index.js")]
    [InlineData(".vs/solution.suo")]
    [InlineData(".vscode/settings.json")]
    [InlineData(".idea/workspace.xml")]
    [InlineData("file.swp")]
    [InlineData("file~")]
    [InlineData(".#file.lock")]
    [InlineData("file.tmp")]
    [InlineData("report.html")]
    [InlineData("output.jsonl")]
    public void IgnoredPathsReturnTrue(string relativePath)
    {
        Assert.True(WatchIgnoreFilter.IsIgnored(relativePath));
    }

    [Theory]
    [InlineData("README.md")]
    [InlineData("src/Program.cs")]
    [InlineData("tests/DemoTests.cs")]
    [InlineData("docs/WATCH_MODE.md")]
    [InlineData(".ackit/config.yml")]
    [InlineData("samples/dotnet-console/Program.cs")]
    [InlineData("src/AgentContextKit.Cli/AgentContextKit.Cli.csproj")]
    [InlineData("artifacts/diagram.svg")]
    public void SourcePathsReturnFalse(string relativePath)
    {
        Assert.False(WatchIgnoreFilter.IsIgnored(relativePath));
    }

    [Fact]
    public void EmptyPathIsIgnored()
    {
        Assert.True(WatchIgnoreFilter.IsIgnored(string.Empty));
    }

    [Fact]
    public void WhitespacePathIsIgnored()
    {
        Assert.True(WatchIgnoreFilter.IsIgnored("   "));
    }

    [Fact]
    public void LeadingSlashIsIgnored()
    {
        Assert.True(WatchIgnoreFilter.IsIgnored("/"));
    }

    [Theory]
    [InlineData(".GIT/HEAD")]
    [InlineData(".Git/refs/heads/main")]
    [InlineData("BIN/Release/foo.dll")]
    public void DirectoryIgnoreIsCaseInsensitive(string relativePath)
    {
        Assert.True(WatchIgnoreFilter.IsIgnored(relativePath));
    }

    [Fact]
    public void AckitCachePrefixWithoutTrailingSlashIsIgnored()
    {
        Assert.True(WatchIgnoreFilter.IsIgnored(".ackit/cache"));
    }

    [Fact]
    public void AckitConfigYmlIsNotIgnored()
    {
        Assert.False(WatchIgnoreFilter.IsIgnored(".ackit/config.yml"));
    }

    [Fact]
    public void AckitReportsPrefixIsIgnoredCaseInsensitively()
    {
        Assert.True(WatchIgnoreFilter.IsIgnored(".ACKIT/REPORTS/report.html"));
    }

    [Fact]
    public void EditorSwapPatternMatchesDotPrefixLock()
    {
        Assert.True(WatchIgnoreFilter.IsIgnored(".#lockfile"));
    }
}
