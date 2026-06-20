using System.Text.RegularExpressions;

namespace AgentContextKit.Tests;

public sealed class IssueTemplateVersionPlaceholderTests
{
    private const string CurrentVersion = "0.2.0-alpha.3";
    private const string PreviousVersion = "0.2.0-alpha.2";

    [Fact]
    public void AllIssueTemplatesReferenceCurrentVersionPlaceholder()
    {
        var templateFiles = IssueTemplateFiles();

        Assert.NotEmpty(templateFiles);

        foreach (var file in templateFiles)
        {
            var content = ReadTemplate(file);

            Assert.Contains(CurrentVersion, content);

            var hasStalePlaceholder = Regex.IsMatch(
                content,
                @"AgentContextKit\s+0\.2\.0-alpha\.2(?!\.)",
                RegexOptions.IgnoreCase);

            Assert.False(
                hasStalePlaceholder,
                $"{file} still contains the stale '{PreviousVersion}' version placeholder.");
        }
    }

    [Theory]
    [InlineData("bug_report.yml")]
    [InlineData("docs_improvement.yml")]
    [InlineData("feature_request.yml")]
    [InlineData("security_hardening.yml")]
    public void IndividualIssueTemplateReferencesCurrentVersion(string fileName)
    {
        var file = LocateRepoFile(Path.Combine(".github", "ISSUE_TEMPLATE", fileName));
        var content = ReadTemplate(file);

        Assert.Contains(CurrentVersion, content);
    }

    private static IReadOnlyList<string> IssueTemplateFiles()
    {
        var templateDir = LocateRepoDir(".github", "ISSUE_TEMPLATE");
        return Directory
            .EnumerateFiles(templateDir, "*.yml")
            .Where(path => !string.Equals(
                Path.GetFileName(path),
                "config.yml",
                StringComparison.OrdinalIgnoreCase))
            .OrderBy(path => path, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string ReadTemplate(string path)
    {
        return File.ReadAllText(path);
    }

    private static string LocateRepoFile(params string[] segments)
    {
        return LocateRepoPath(segments);
    }

    private static string LocateRepoDir(params string[] segments)
    {
        var path = LocateRepoPath(segments);
        if (!Directory.Exists(path))
        {
            throw new DirectoryNotFoundException(path);
        }

        return path;
    }

    private static string LocateRepoPath(params string[] segments)
    {
        var current = AppContext.BaseDirectory;
        while (!string.IsNullOrEmpty(current))
        {
            var probe = Path.Combine(current, "AgentContextKit.sln");
            if (File.Exists(probe))
            {
                return Path.Combine(new[] { current }.Concat(segments).ToArray());
            }

            current = Directory.GetParent(current)?.FullName;
        }

        throw new DirectoryNotFoundException(
            "Could not locate the AgentContextKit repository root from " + AppContext.BaseDirectory);
    }
}
