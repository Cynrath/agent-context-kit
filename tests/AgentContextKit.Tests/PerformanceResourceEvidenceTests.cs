using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class PerformanceResourceEvidenceTests
{
    [Fact]
    public void RiskScannerSkipsUnreadableTextFileWithoutFailing()
    {
        var fileSystem = new UnreadableTextFileSystem();
        var scanner = new RiskScanner(fileSystem, new SecretScanner(), new BrandPiiScanner());

        var result = scanner.ScanWithAudit("synthetic-repository", ["src/locked.cs"], AckitConfig.Default);

        Assert.Empty(result.Findings);
        Assert.Empty(result.Suppressions);
    }

    [Fact]
    public void PerformanceScriptDeclaresMixedCorpusMemoryAndInterruptionEvidence()
    {
        var root = FindRepositoryRoot();
        var script = File.ReadAllText(Path.Combine(root, "scripts", "measure-scan-performance.ps1"));

        Assert.Contains("CorpusProfile = \"mixed\"", script, StringComparison.Ordinal);
        Assert.Contains("Peak working set MiB:", script, StringComparison.Ordinal);
        Assert.Contains("Memory threshold result:", script, StringComparison.Ordinal);
        Assert.Contains("VerifyInterruption", script, StringComparison.Ordinal);
        Assert.Contains("Interruption result:", script, StringComparison.Ordinal);
        Assert.Contains("not a production SLA", script, StringComparison.Ordinal);
    }

    private static string FindRepositoryRoot()
    {
        var current = AppContext.BaseDirectory;
        while (!string.IsNullOrWhiteSpace(current))
        {
            if (File.Exists(Path.Combine(current, "AgentContextKit.sln")))
            {
                return current;
            }

            current = Directory.GetParent(current)?.FullName;
        }

        throw new DirectoryNotFoundException(
            "Could not locate the AgentContextKit repository root from " + AppContext.BaseDirectory);
    }

    private sealed class UnreadableTextFileSystem : IFileSystem
    {
        public bool FileExists(string path) => true;

        public bool DirectoryExists(string path) => true;

        public void CreateDirectory(string path)
        {
        }

        public string ReadAllText(string path) =>
            throw new UnauthorizedAccessException("Synthetic unreadable file.");

        public void WriteAllText(string path, string content) =>
            throw new NotSupportedException();

        public long GetFileLength(string path) => 128;

        public IEnumerable<string> EnumerateFiles(
            string rootPath,
            IReadOnlySet<string> ignoredDirectoryNames) =>
            [Path.Combine(rootPath, "src", "locked.cs")];
    }
}
