using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class ScanIncludeExcludeTests
{
    [Fact]
    public void IncludeGlobKeepsOnlyMatchingFiles()
    {
        using var repo = TempRepository.Create();
        repo.Write("src/Program.cs", "class Program {}\n");
        repo.Write("src/Helper.cs", "class Helper {}\n");
        repo.Write("docs/readme.md", "# Readme\n");
        repo.Write("tests/x.txt", "x");

        var scan = ScanWith(repo.Path, includeGlobs: ["src/**"]);

        Assert.Contains("src/Program.cs", scan.Files);
        Assert.Contains("src/Helper.cs", scan.Files);
        Assert.DoesNotContain("docs/readme.md", scan.Files);
        Assert.DoesNotContain("tests/x.txt", scan.Files);
    }

    [Fact]
    public void ExcludeGlobDropsMatchingFiles()
    {
        using var repo = TempRepository.Create();
        repo.Write("src/Program.cs", "class Program {}\n");
        repo.Write("tests/x.txt", "x");
        repo.Write("tests/y.txt", "y");

        var scan = ScanWith(repo.Path, excludeGlobs: ["tests/**"]);

        Assert.Contains("src/Program.cs", scan.Files);
        Assert.DoesNotContain("tests/x.txt", scan.Files);
        Assert.DoesNotContain("tests/y.txt", scan.Files);
    }

    [Fact]
    public void IncludeAndExcludeCombine()
    {
        using var repo = TempRepository.Create();
        repo.Write("src/keep.cs", "class Keep {}\n");
        repo.Write("src/skip.cs", "class Skip {}\n");
        repo.Write("docs/drop.md", "# Drop\n");

        var scan = ScanWith(
            repo.Path,
            includeGlobs: ["src/**", "docs/**"],
            excludeGlobs: ["src/skip.cs", "docs/drop.md"]);

        Assert.Contains("src/keep.cs", scan.Files);
        Assert.DoesNotContain("src/skip.cs", scan.Files);
        Assert.DoesNotContain("docs/drop.md", scan.Files);
    }

    [Fact]
    public void DoubleStarGlobMatchesNestedFiles()
    {
        using var repo = TempRepository.Create();
        repo.Write("src/A.cs", "class A {}\n");
        repo.Write("src/nested/B.cs", "class B {}\n");
        repo.Write("src/nested/deeper/C.cs", "class C {}\n");
        repo.Write("docs/file.txt", "x");

        var scan = ScanWith(repo.Path, includeGlobs: ["**/*.cs"]);

        Assert.Contains("src/A.cs", scan.Files);
        Assert.Contains("src/nested/B.cs", scan.Files);
        Assert.Contains("src/nested/deeper/C.cs", scan.Files);
        Assert.DoesNotContain("docs/file.txt", scan.Files);
    }

    [Fact]
    public void EmptyIncludeGlobIsRejected()
    {
        using var repo = TempRepository.Create();
        repo.Write("src/A.cs", "class A {}\n");

        Assert.Throws<ArgumentException>(() => ScanWith(repo.Path, includeGlobs: [""]));
        Assert.Throws<ArgumentException>(() => ScanWith(repo.Path, includeGlobs: ["   "]));
    }

    [Fact]
    public void EmptyExcludeGlobIsRejected()
    {
        using var repo = TempRepository.Create();
        repo.Write("src/A.cs", "class A {}\n");

        Assert.Throws<ArgumentException>(() => ScanWith(repo.Path, excludeGlobs: [""]));
        Assert.Throws<ArgumentException>(() => ScanWith(repo.Path, excludeGlobs: ["   "]));
    }

    [Fact]
    public void IncludeGlobWithNoMatchProducesEmptyFiles()
    {
        using var repo = TempRepository.Create();
        repo.Write("src/A.cs", "class A {}\n");
        repo.Write("docs/B.md", "# B\n");

        var scan = ScanWith(repo.Path, includeGlobs: ["nonexistent/**"]);

        Assert.Empty(scan.Files);
    }

    [Fact]
    public void DefaultScanIsUnchangedWhenNoGlobsProvided()
    {
        using var repo = TempRepository.Create();
        repo.Write("src/A.cs", "class A {}\n");
        repo.Write("tests/x.txt", "x");

        var scan = ScanWith(repo.Path, includeGlobs: null, excludeGlobs: null);

        Assert.Contains("src/A.cs", scan.Files);
        Assert.Contains("tests/x.txt", scan.Files);
    }

    private static ScanResult ScanWith(
        string repositoryPath,
        IReadOnlyList<string>? includeGlobs = null,
        IReadOnlyList<string>? excludeGlobs = null)
    {
        var scanner = TestServices.CreateRepositoryScanner();
        return scanner.Scan(repositoryPath, config: null, includeGlobs, excludeGlobs);
    }
}