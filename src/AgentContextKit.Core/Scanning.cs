using System.Xml.Linq;
using System.Text.RegularExpressions;

namespace AgentContextKit.Core;

public sealed class RepositoryScanner : IRepositoryScanner
{
    public static readonly IReadOnlySet<string> IgnoredDirectoryNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        ".git",
        ".vs",
        ".idea",
        "bin",
        "obj",
        "node_modules",
        "packages",
        "TestResults",
        "coverage"
    };

    private readonly IFileSystem _fileSystem;
    private readonly IStackDetector _stackDetector;
    private readonly IRiskScanner _riskScanner;

    public RepositoryScanner(IFileSystem fileSystem, IStackDetector stackDetector, IRiskScanner riskScanner)
    {
        _fileSystem = fileSystem;
        _stackDetector = stackDetector;
        _riskScanner = riskScanner;
    }

    public ScanResult Scan(string repositoryPath, AckitConfig? config = null)
    {
        var root = Path.GetFullPath(repositoryPath);
        var activeConfig = config ?? AckitConfig.Default;
        var files = _fileSystem
            .EnumerateFiles(root, IgnoredDirectoryNames)
            .Select(file => ToRelativePath(root, file))
            .Where(file => !IsIgnoredByConfig(file, activeConfig))
            .OrderBy(file => file, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var stacks = _stackDetector.Detect(root, files);
        var riskScan = _riskScanner.ScanWithAudit(root, files, activeConfig);

        return new ScanResult(
            root,
            files,
            stacks,
            riskScan.Findings,
            HasAny(files, "README.md", "README.tr.md"),
            HasAny(files, "LICENSE", "LICENSE.md"),
            HasAny(files, "SECURITY.md"),
            HasAny(files, "CONTRIBUTING.md"),
            HasAny(files, "CODE_OF_CONDUCT.md"),
            HasAny(files, "CHANGELOG.md"),
            files.Any(file => file.StartsWith("tests/", StringComparison.OrdinalIgnoreCase) || file.Contains(".Tests/", StringComparison.OrdinalIgnoreCase)),
            files.Any(file => file.StartsWith(".github/workflows/", StringComparison.OrdinalIgnoreCase)),
            files.Any(file => string.Equals(file, "Dockerfile", StringComparison.OrdinalIgnoreCase) || file.Contains("docker-compose", StringComparison.OrdinalIgnoreCase)),
            HasAny(files, "AGENTS.md", "CLAUDE.md", ".github/copilot-instructions.md") ||
            files.Any(file => file.StartsWith(".cursor/rules/", StringComparison.OrdinalIgnoreCase)))
        {
            Suppressions = riskScan.Suppressions
        };
    }

    internal static string ToRelativePath(string root, string path)
    {
        return Path.GetRelativePath(root, path).Replace('\\', '/');
    }

    internal static bool IsIgnoredByConfig(string relativePath, AckitConfig config)
    {
        var normalized = relativePath.Replace('\\', '/').TrimStart('/');

        foreach (var ignorePath in config.IgnorePaths)
        {
            var rule = ignorePath.Replace('\\', '/').TrimStart('/');
            if (rule.Length == 0)
            {
                continue;
            }

            if (rule.EndsWith("/", StringComparison.Ordinal))
            {
                if (normalized.StartsWith(rule, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                continue;
            }

            if (string.Equals(normalized, rule, StringComparison.OrdinalIgnoreCase) ||
                normalized.StartsWith(rule + "/", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static bool HasAny(IReadOnlyList<string> files, params string[] names)
    {
        return files.Any(file => names.Any(name => string.Equals(file, name, StringComparison.OrdinalIgnoreCase)));
    }
}

public sealed class StackDetector : IStackDetector
{
    private readonly IFileSystem? _fileSystem;

    public StackDetector(IFileSystem? fileSystem = null)
    {
        _fileSystem = fileSystem;
    }

    public IReadOnlyList<StackInfo> Detect(string repositoryPath, IReadOnlyList<string> relativeFiles)
    {
        var stackSignalFiles = relativeFiles
            .Where(IsMainStackSignalFile)
            .ToArray();
        var files = stackSignalFiles.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var stacks = new List<StackInfo>();
        var projectFiles = stackSignalFiles
            .Where(IsProjectFile)
            .OrderBy(file => file, StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var projectSdks = projectFiles
            .SelectMany(file => ReadProjectSdkValues(repositoryPath, file))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (files.Any(file => file.EndsWith(".sln", StringComparison.OrdinalIgnoreCase) ||
                              file.EndsWith(".slnx", StringComparison.OrdinalIgnoreCase)) ||
            projectFiles.Length > 0 ||
            files.Any(file => file.EndsWith("/Program.cs", StringComparison.OrdinalIgnoreCase) ||
                              file.Equals("Program.cs", StringComparison.OrdinalIgnoreCase)))
        {
            AddStack(stacks, ".NET", ".sln/.slnx/*proj/Program.cs");
        }

        if (HasDotNetToolProject(repositoryPath, projectFiles))
        {
            AddStack(stacks, ".NET CLI / .NET Tool", "PackAsTool/ToolCommandName");
        }

        if (projectSdks.Any(sdk => SdkMatches(sdk, "Microsoft.NET.Sdk.Web")))
        {
            AddStack(stacks, "ASP.NET Core", "Microsoft.NET.Sdk.Web");
        }

        if (projectSdks.Any(sdk => SdkMatches(sdk, "Microsoft.NET.Sdk.Razor")) ||
            files.Any(file => file.EndsWith(".cshtml", StringComparison.OrdinalIgnoreCase) ||
                              file.StartsWith("Pages/", StringComparison.OrdinalIgnoreCase)))
        {
            AddStack(stacks, "Razor/Razor Pages", "Microsoft.NET.Sdk.Razor/*.cshtml/Pages");
        }

        if (projectSdks.Any(sdk => SdkMatches(sdk, "Microsoft.NET.Sdk.BlazorWebAssembly")) ||
            files.Any(file => file.EndsWith(".razor", StringComparison.OrdinalIgnoreCase)))
        {
            AddStack(stacks, "Blazor WebAssembly", "Microsoft.NET.Sdk.BlazorWebAssembly/*.razor");
        }

        if (projectSdks.Any(sdk => SdkMatches(sdk, "Microsoft.NET.Sdk.Worker")))
        {
            AddStack(stacks, ".NET Worker Service", "Microsoft.NET.Sdk.Worker");
        }

        if (HasMinimalApiSignal(repositoryPath, stackSignalFiles))
        {
            AddStack(stacks, "ASP.NET Core Minimal API", "Program.cs WebApplication/Map*");
        }

        if (files.Contains("appsettings.json") ||
            files.Any(file => file.StartsWith("Controllers/", StringComparison.OrdinalIgnoreCase)) ||
            files.Any(file => file.StartsWith("Views/", StringComparison.OrdinalIgnoreCase)))
        {
            AddStack(stacks, "ASP.NET Core MVC", "appsettings.json/Controllers/Views");
        }

        if (files.Contains("package.json"))
        {
            AddStack(stacks, "Node", "package.json");
        }

        if (files.Contains("package-lock.json"))
        {
            AddStack(stacks, "npm", "package-lock.json");
        }

        if (files.Contains("pnpm-lock.yaml"))
        {
            AddStack(stacks, "pnpm", "pnpm-lock.yaml");
        }

        if (files.Contains("yarn.lock"))
        {
            AddStack(stacks, "Yarn", "yarn.lock");
        }

        if (files.Contains("bun.lockb") || files.Contains("bun.lock"))
        {
            AddStack(stacks, "Bun", "bun.lock/bun.lockb");
        }

        if (files.Contains("tsconfig.json") ||
            files.Any(file => file.EndsWith(".ts", StringComparison.OrdinalIgnoreCase) ||
                              file.EndsWith(".tsx", StringComparison.OrdinalIgnoreCase)))
        {
            AddStack(stacks, "TypeScript", "tsconfig.json/*.ts/*.tsx");
        }

        if (files.Any(file => file.StartsWith("vite.config.", StringComparison.OrdinalIgnoreCase)))
        {
            AddStack(stacks, "Vite", "vite.config.*");
        }

        if (files.Any(file => file.StartsWith("next.config.", StringComparison.OrdinalIgnoreCase)))
        {
            AddStack(stacks, "Next.js", "next.config.*");
        }

        if (files.Any(file => file.StartsWith("nuxt.config.", StringComparison.OrdinalIgnoreCase)))
        {
            AddStack(stacks, "Nuxt", "nuxt.config.*");
        }

        if (files.Contains("angular.json"))
        {
            AddStack(stacks, "Angular", "angular.json");
        }

        if (files.Any(file => file.StartsWith("tailwind.config.", StringComparison.OrdinalIgnoreCase)))
        {
            AddStack(stacks, "Tailwind CSS", "tailwind.config.*");
        }

        if (files.Contains("requirements.txt") || files.Contains("pyproject.toml"))
        {
            AddStack(stacks, "Python", "requirements.txt/pyproject.toml");
        }

        if (files.Contains("composer.json") || files.Contains("artisan"))
        {
            AddStack(stacks, "PHP/Laravel", "composer.json/artisan");
        }

        if (files.Contains("Dockerfile") || files.Any(file => file.Contains("docker-compose", StringComparison.OrdinalIgnoreCase)))
        {
            AddStack(stacks, "Docker", "Dockerfile/docker-compose");
        }

        if (files.Any(file => file.StartsWith(".github/workflows/", StringComparison.OrdinalIgnoreCase)))
        {
            AddStack(stacks, "GitHub Actions", ".github/workflows");
        }

        if (files.Any(file => file.EndsWith(".sql", StringComparison.OrdinalIgnoreCase)) ||
            files.Any(file => file.Contains("/Migrations/", StringComparison.OrdinalIgnoreCase) || file.StartsWith("Migrations/", StringComparison.OrdinalIgnoreCase)))
        {
            AddStack(stacks, "Database/Migrations", "*.sql/Migrations");
        }

        return stacks;
    }

    private static bool IsProjectFile(string relativeFile)
    {
        return relativeFile.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase) ||
               relativeFile.EndsWith(".fsproj", StringComparison.OrdinalIgnoreCase) ||
               relativeFile.EndsWith(".vbproj", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsMainStackSignalFile(string relativeFile)
    {
        var normalized = relativeFile.Replace('\\', '/').TrimStart('/');

        if (normalized.StartsWith("samples/", StringComparison.OrdinalIgnoreCase) ||
            normalized.StartsWith("docs/", StringComparison.OrdinalIgnoreCase) ||
            normalized.StartsWith(".ackit/", StringComparison.OrdinalIgnoreCase) ||
            normalized.StartsWith(".codex/", StringComparison.OrdinalIgnoreCase) ||
            normalized.StartsWith(".cursor/", StringComparison.OrdinalIgnoreCase) ||
            normalized.StartsWith("templates/", StringComparison.OrdinalIgnoreCase) ||
            normalized.StartsWith("fixtures/", StringComparison.OrdinalIgnoreCase) ||
            normalized.StartsWith("testdata/", StringComparison.OrdinalIgnoreCase) ||
            normalized.StartsWith("test-data/", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return !normalized.Contains("/fixtures/", StringComparison.OrdinalIgnoreCase) &&
               !normalized.Contains("/testdata/", StringComparison.OrdinalIgnoreCase) &&
               !normalized.Contains("/test-data/", StringComparison.OrdinalIgnoreCase);
    }

    private static void AddStack(List<StackInfo> stacks, string name, string signal)
    {
        if (!stacks.Any(stack => string.Equals(stack.Name, name, StringComparison.OrdinalIgnoreCase)))
        {
            stacks.Add(new StackInfo(name, signal));
        }
    }

    private static bool SdkMatches(string sdk, string expected)
    {
        return string.Equals(sdk, expected, StringComparison.OrdinalIgnoreCase) ||
               sdk.StartsWith(expected + "/", StringComparison.OrdinalIgnoreCase);
    }

    private bool HasDotNetToolProject(string repositoryPath, IReadOnlyList<string> projectFiles)
    {
        return projectFiles.Any(file =>
            ReadProjectPropertyValues(repositoryPath, file, "PackAsTool")
                .Any(value => value.Equals("true", StringComparison.OrdinalIgnoreCase)) ||
            ReadProjectPropertyValues(repositoryPath, file, "ToolCommandName")
                .Any(value => !string.IsNullOrWhiteSpace(value)));
    }

    private IReadOnlyList<string> ReadProjectSdkValues(string repositoryPath, string relativeFile)
    {
        if (_fileSystem is null)
        {
            return Array.Empty<string>();
        }

        var fullPath = Path.Combine(repositoryPath, relativeFile.Replace('/', Path.DirectorySeparatorChar));
        if (!_fileSystem.FileExists(fullPath))
        {
            return Array.Empty<string>();
        }

        try
        {
            var document = XDocument.Parse(_fileSystem.ReadAllText(fullPath));
            var values = new List<string>();
            var sdkAttribute = document.Root?.Attribute("Sdk")?.Value;
            AddSdkValues(values, sdkAttribute);

            if (document.Root is not null)
            {
                foreach (var element in document.Root.Elements("Sdk"))
                {
                    AddSdkValues(values, element.Attribute("Name")?.Value);
                }
            }

            return values;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Xml.XmlException)
        {
            return Array.Empty<string>();
        }
    }

    private IReadOnlyList<string> ReadProjectPropertyValues(string repositoryPath, string relativeFile, string propertyName)
    {
        if (_fileSystem is null)
        {
            return Array.Empty<string>();
        }

        var fullPath = Path.Combine(repositoryPath, relativeFile.Replace('/', Path.DirectorySeparatorChar));
        if (!_fileSystem.FileExists(fullPath))
        {
            return Array.Empty<string>();
        }

        try
        {
            var document = XDocument.Parse(_fileSystem.ReadAllText(fullPath));
            return document.Root?
                .Elements("PropertyGroup")
                .Elements(propertyName)
                .Select(element => element.Value.Trim())
                .Where(value => value.Length > 0)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray() ?? Array.Empty<string>();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Xml.XmlException)
        {
            return Array.Empty<string>();
        }
    }

    private static void AddSdkValues(List<string> values, string? rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue))
        {
            return;
        }

        values.AddRange(rawValue
            .Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(value => value.Length > 0));
    }

    private bool HasMinimalApiSignal(string repositoryPath, IReadOnlyList<string> relativeFiles)
    {
        if (_fileSystem is null)
        {
            return false;
        }

        foreach (var relativeFile in relativeFiles.Where(file => file.EndsWith("Program.cs", StringComparison.OrdinalIgnoreCase)))
        {
            var fullPath = Path.Combine(repositoryPath, relativeFile.Replace('/', Path.DirectorySeparatorChar));
            if (!_fileSystem.FileExists(fullPath) || _fileSystem.GetFileLength(fullPath) > 200_000)
            {
                continue;
            }

            try
            {
                var content = _fileSystem.ReadAllText(fullPath);
                if (content.Contains("WebApplication.CreateBuilder", StringComparison.Ordinal) &&
                    (content.Contains(".MapGet(", StringComparison.Ordinal) ||
                     content.Contains(".MapPost(", StringComparison.Ordinal) ||
                     content.Contains(".MapPut(", StringComparison.Ordinal) ||
                     content.Contains(".MapDelete(", StringComparison.Ordinal) ||
                     content.Contains(".MapMethods(", StringComparison.Ordinal) ||
                     content.Contains(".MapGroup(", StringComparison.Ordinal)))
                {
                    return true;
                }
            }
            catch (IOException)
            {
            }
            catch (UnauthorizedAccessException)
            {
            }
        }

        return false;
    }
}

public sealed class ProjectMapBuilder : IProjectMapBuilder
{
    public ProjectMap Build(ScanResult scanResult)
    {
        return new ProjectMap(scanResult.Files, scanResult.Stacks);
    }
}

public sealed class RiskScanner : IRiskScanner
{
    private const long MaxTextFileBytes = 1_000_000;
    private readonly IFileSystem _fileSystem;
    private readonly ISecretScanner _secretScanner;
    private readonly IBrandPiiScanner _brandPiiScanner;
    private readonly IHighEntropyScanner _highEntropyScanner;

    public RiskScanner(IFileSystem fileSystem, ISecretScanner secretScanner, IBrandPiiScanner brandPiiScanner, IHighEntropyScanner? highEntropyScanner = null)
    {
        _fileSystem = fileSystem;
        _secretScanner = secretScanner;
        _brandPiiScanner = brandPiiScanner;
        _highEntropyScanner = highEntropyScanner ?? new HighEntropyScanner();
    }

    public IReadOnlyList<RiskFinding> Scan(string repositoryPath, IReadOnlyList<string> relativeFiles, AckitConfig config)
    {
        return ScanWithAudit(repositoryPath, relativeFiles, config).Findings;
    }

    public RiskScanResult ScanWithAudit(string repositoryPath, IReadOnlyList<string> relativeFiles, AckitConfig config)
    {
        var findings = new List<RiskFinding>();
        var suppressions = new List<RiskSuppression>();

        foreach (var relativeFile in relativeFiles)
        {
            findings.AddRange(AnalyzePath(relativeFile, config));

            var fullPath = Path.Combine(repositoryPath, relativeFile.Replace('/', Path.DirectorySeparatorChar));
            if (!IsProbablyTextFile(relativeFile) || !_fileSystem.FileExists(fullPath) || _fileSystem.GetFileLength(fullPath) > MaxTextFileBytes)
            {
                continue;
            }

            string content;
            try
            {
                content = _fileSystem.ReadAllText(fullPath);
            }
            catch (IOException)
            {
                continue;
            }
            catch (UnauthorizedAccessException)
            {
                continue;
            }

            findings.AddRange(_secretScanner.ScanText(relativeFile, content));
            var brandPiiScan = _brandPiiScanner.ScanTextWithAudit(relativeFile, content, config);
            findings.AddRange(brandPiiScan.Findings);
            suppressions.AddRange(brandPiiScan.Suppressions);
            findings.AddRange(_highEntropyScanner.ScanText(relativeFile, content));
        }

        var visibleFindings = new List<RiskFinding>();
        foreach (var finding in findings)
        {
            var suppressionReason = GetSuppressionReason(finding, config);
            if (suppressionReason is null)
            {
                visibleFindings.Add(finding);
                continue;
            }

            suppressions.Add(ToSuppression(finding, suppressionReason.Value));
        }

        return new RiskScanResult(
            visibleFindings
            .OrderByDescending(finding => finding.Severity)
            .ThenBy(finding => finding.Path, StringComparer.OrdinalIgnoreCase)
            .ToArray(),
            suppressions
                .Distinct()
                .OrderBy(suppression => suppression.Path, StringComparer.OrdinalIgnoreCase)
                .ThenBy(suppression => suppression.RuleId, StringComparer.OrdinalIgnoreCase)
                .ThenBy(suppression => suppression.Reason)
                .ToArray());
    }

    private static RiskSuppressionReason? GetSuppressionReason(RiskFinding finding, AckitConfig config)
    {
        if (finding.Severity == RiskSeverity.Critical)
        {
            return null;
        }

        if (MatchesConfiguredPath(finding.Path, config.IgnoredPaths))
        {
            return RiskSuppressionReason.IgnoredPath;
        }

        var ruleId = RiskRuleCatalog.GetRuleId(finding);
        return config.IgnoredFindingIds.Any(ignoredId => string.Equals(ignoredId, ruleId, StringComparison.OrdinalIgnoreCase))
            ? RiskSuppressionReason.IgnoredFindingId
            : null;
    }

    private static RiskSuppression ToSuppression(RiskFinding finding, RiskSuppressionReason reason)
    {
        return new RiskSuppression(
            RiskRuleCatalog.GetRuleId(finding),
            finding.Severity,
            finding.Category,
            finding.Path,
            reason);
    }

    private static bool MatchesConfiguredPath(string relativePath, IReadOnlyList<string> configuredPaths)
    {
        var normalized = relativePath.Replace('\\', '/').TrimStart('/');

        foreach (var configuredPath in configuredPaths)
        {
            var rule = configuredPath.Replace('\\', '/').TrimStart('/');
            if (rule.Length == 0)
            {
                continue;
            }

            if (rule.EndsWith("*", StringComparison.Ordinal))
            {
                var prefix = rule[..^1];
                if (prefix.Length > 0 && normalized.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                continue;
            }

            if (rule.StartsWith("*", StringComparison.Ordinal))
            {
                var suffix = rule[1..];
                if (suffix.Length > 0 && normalized.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                continue;
            }

            if (rule.EndsWith("/", StringComparison.Ordinal))
            {
                if (normalized.StartsWith(rule, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                continue;
            }

            if (string.Equals(normalized, rule, StringComparison.OrdinalIgnoreCase) ||
                normalized.StartsWith(rule + "/", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static IEnumerable<RiskFinding> AnalyzePath(string relativeFile, AckitConfig config)
    {
        var fileName = Path.GetFileName(relativeFile);
        var lower = relativeFile.ToLowerInvariant();
        var extension = Path.GetExtension(relativeFile);

        if (IsEnvironmentSampleFile(fileName))
        {
            yield return new RiskFinding(RiskSeverity.Medium, RiskCategory.Configuration, relativeFile, "Environment sample file should be reviewed before public release.");
        }
        else if (IsSensitiveEnvironmentFile(fileName) ||
                 fileName.Equals("secrets.json", StringComparison.OrdinalIgnoreCase))
        {
            yield return new RiskFinding(RiskSeverity.Critical, RiskCategory.Secret, relativeFile, "Secret-like configuration file is present.");
        }

        if (IsPrivateKeyFile(fileName))
        {
            yield return new RiskFinding(RiskSeverity.Critical, RiskCategory.Secret, relativeFile, "Private key or key-store file is present.");
        }

        if (fileName.Equals("appsettings.Production.json", StringComparison.OrdinalIgnoreCase) ||
            fileName.Equals("appsettings.Staging.json", StringComparison.OrdinalIgnoreCase) ||
            fileName.Equals("appsettings.Local.json", StringComparison.OrdinalIgnoreCase))
        {
            yield return new RiskFinding(RiskSeverity.High, RiskCategory.ProductionConfig, relativeFile, "Environment-specific appsettings file should be reviewed before public release.");
        }

        if (lower.Contains("/uploads/") || lower.StartsWith("uploads/") ||
            lower.Contains("/backup/") || lower.StartsWith("backup/") ||
            lower.Contains("/backups/") || lower.StartsWith("backups/") ||
            lower.Contains("dataprotection-keys"))
        {
            yield return new RiskFinding(RiskSeverity.High, RiskCategory.RepositoryHygiene, relativeFile, "Risky data/storage path is present.");
        }

        if (IsBuiltInRiskExtension(fileName) ||
            config.RiskExtensions.Any(riskExtension => extension.Equals(riskExtension, StringComparison.OrdinalIgnoreCase)))
        {
            yield return new RiskFinding(RiskSeverity.Medium, RiskCategory.BuildArtifact, relativeFile, "File extension should be reviewed before public release.");
        }
    }

    private static bool IsBuiltInRiskExtension(string fileName)
    {
        return fileName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".rar", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".7z", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".nupkg", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".snupkg", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".bak", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".tmp", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".log", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".mdf", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".ldf", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".db", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".sqlite", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".sqlite3", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".bacpac", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".dacpac", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".sql", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsEnvironmentSampleFile(string fileName)
    {
        return fileName.Equals(".env.example", StringComparison.OrdinalIgnoreCase) ||
               fileName.Equals(".env.sample", StringComparison.OrdinalIgnoreCase) ||
               fileName.Equals(".env.template", StringComparison.OrdinalIgnoreCase) ||
               fileName.Equals(".env.dist", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsSensitiveEnvironmentFile(string fileName)
    {
        return fileName.Equals(".env", StringComparison.OrdinalIgnoreCase) ||
               fileName.StartsWith(".env.", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsPrivateKeyFile(string fileName)
    {
        return fileName.Equals("id_rsa", StringComparison.OrdinalIgnoreCase) ||
               fileName.Equals("id_dsa", StringComparison.OrdinalIgnoreCase) ||
               fileName.Equals("id_ecdsa", StringComparison.OrdinalIgnoreCase) ||
               fileName.Equals("id_ed25519", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".pfx", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".p12", StringComparison.OrdinalIgnoreCase) ||
               fileName.EndsWith(".key", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsProbablyTextFile(string relativeFile)
    {
        var fileName = Path.GetFileName(relativeFile);
        var extension = Path.GetExtension(relativeFile);

        if (fileName.Equals(".gitignore", StringComparison.OrdinalIgnoreCase) ||
            fileName.Equals(".editorconfig", StringComparison.OrdinalIgnoreCase) ||
            fileName.EndsWith(".mdc", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return extension.Equals(".md", StringComparison.OrdinalIgnoreCase) ||
               extension.Equals(".txt", StringComparison.OrdinalIgnoreCase) ||
               extension.Equals(".cs", StringComparison.OrdinalIgnoreCase) ||
               extension.Equals(".csproj", StringComparison.OrdinalIgnoreCase) ||
               extension.Equals(".sln", StringComparison.OrdinalIgnoreCase) ||
               extension.Equals(".slnx", StringComparison.OrdinalIgnoreCase) ||
               extension.Equals(".json", StringComparison.OrdinalIgnoreCase) ||
               extension.Equals(".yml", StringComparison.OrdinalIgnoreCase) ||
               extension.Equals(".yaml", StringComparison.OrdinalIgnoreCase) ||
               extension.Equals(".xml", StringComparison.OrdinalIgnoreCase) ||
               extension.Equals(".props", StringComparison.OrdinalIgnoreCase) ||
               extension.Equals(".targets", StringComparison.OrdinalIgnoreCase) ||
               extension.Equals(".config", StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class SecretScanner : ISecretScanner
{
    private sealed record SecretPattern(Regex Regex, RiskSeverity Severity, RiskCategory Category, string Message);

    private const string EqualsSign = "=";
    private const string FileUriPrefix = "file:" + "///";
    private const string OpenAiProjectKeyPrefix = "sk" + "-proj-";
    private const string GitHubFineGrainedTokenPrefix = "github" + "_pat_";

    private static readonly SecretPattern[] Patterns =
    [
        new(new Regex(Regex.Escape(OpenAiProjectKeyPrefix) + @"[A-Za-z0-9_-]{8,}", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.Critical, RiskCategory.Secret, "OpenAI project key-like value detected."),
        new(new Regex(@"\bsk-[A-Za-z0-9]{16,}", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.Critical, RiskCategory.Secret, "API key-like value detected."),
        new(new Regex(Regex.Escape(GitHubFineGrainedTokenPrefix) + @"[A-Za-z0-9_]{16,}", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.Critical, RiskCategory.Secret, "GitHub fine-grained token-like value detected."),
        new(new Regex(@"\bghp_[A-Za-z0-9]{16,}", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.Critical, RiskCategory.Secret, "GitHub token-like value detected."),
        new(new Regex(@"\bgh[osru]_[A-Za-z0-9]{16,}", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.Critical, RiskCategory.Secret, "GitHub token-like value detected."),
        new(new Regex(@"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b", RegexOptions.Compiled), RiskSeverity.Critical, RiskCategory.Secret, "AWS access key-like value detected."),
        new(new Regex(@"BEGIN (?:RSA |DSA |EC |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.Critical, RiskCategory.Secret, "Private key block detected."),
        new(new Regex(@"aws_secret_access_key\s*[:=]", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.Critical, RiskCategory.Secret, "AWS secret access key setting detected."),
        new(new Regex(@"\b(password|pwd|mysql password|sql password)\b\s*[:=]", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.High, RiskCategory.Secret, "Password-like assignment detected."),
        new(new Regex(@"(?<!var\s)(?<!const\s)(?<!string\s)(?<![A-Za-z0-9_-])(api[_ -]?key|apikey|api_key|token|bearer)\b\s*[:=]", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.High, RiskCategory.Secret, "Token or API key assignment detected."),
        new(new Regex(@"\bbearer\s+[A-Za-z0-9._-]{16,}", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.High, RiskCategory.Secret, "Bearer token-like value detected."),
        new(new Regex(@"\b(connectionstring|connection string)\b\s*[:=]|\b(data source|user id|uid)" + EqualsSign, RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.High, RiskCategory.Secret, "Connection string-like value detected."),
        new(new Regex(@"\b(smtp|recaptcha|cloudflare)\b\s*[:=]", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.Medium, RiskCategory.Secret, "Service credential-like setting detected."),
        new(new Regex(@"(?<![A-Za-z0-9])(?:[A-Za-z]:\\|" + FileUriPrefix + @"|/(?:home|Users)/[^\s""'<>]+)", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant), RiskSeverity.Low, RiskCategory.LocalPath, "Local filesystem path detected.")
    ];

    public IReadOnlyList<RiskFinding> ScanText(string relativePath, string content)
    {
        var findings = new List<RiskFinding>();

        foreach (var pattern in Patterns)
        {
            var match = pattern.Regex.Match(content);
            if (match.Success)
            {
                findings.Add(new RiskFinding(pattern.Severity, pattern.Category, relativePath, pattern.Message, Truncate(match.Value)));
            }
        }

        return findings;
    }

    private static string Truncate(string value)
    {
        return value.Length <= 48 ? value : value[..48] + "...";
    }
}

public sealed class BrandPiiScanner : IBrandPiiScanner
{
    private static readonly Regex PhoneRegex = new(@"(?<![A-Za-z0-9-])(\+?\d[\d \t()-]{7,}\d)(?![A-Za-z0-9])", RegexOptions.Compiled);
    private static readonly Regex EmailRegex = new(@"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex DomainRegex = new(@"\b(?:[A-Z0-9-]+\.)+(?:com\.tr|com|net|org|io|dev|app|ai|co|tr|edu|gov|cloud|site)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled | RegexOptions.CultureInvariant);
    private static readonly Regex IpAddressRegex = new(@"\b(?:\d{1,3}\.){3}\d{1,3}\b", RegexOptions.Compiled);
    private static readonly HashSet<string> KnownSafeTechnicalDomains = new(StringComparer.OrdinalIgnoreCase)
    {
        "github.com",
        "learn.microsoft.com",
        "microsoft.com",
        "dotnet.microsoft.com",
        "visualstudio.microsoft.com",
        "nuget.org",
        "api.nuget.org",
        "shields.io",
        "img.shields.io",
        "json-schema.org",
        "json.schemastore.org",
        "aka.ms",
        "example.com",
        "example.net",
        "example.org",
        "ASP.NET",
        "System.IO",
        "System.Net",
        "Microsoft.NET"
    };

    private static readonly string[] KnownSafeTechnicalDomainSuffixes =
    [
        ".github.com",
        ".microsoft.com",
        ".nuget.org",
        ".shields.io"
    ];

    private static readonly HashSet<string> FixtureOnlyEmailDomains = new(StringComparer.OrdinalIgnoreCase)
    {
        "example.internal",
        "example.invalid",
        "example.test"
    };

    public IReadOnlyList<RiskFinding> ScanText(string relativePath, string content, AckitConfig config)
    {
        return ScanTextWithAudit(relativePath, content, config).Findings;
    }

    public BrandPiiScanResult ScanTextWithAudit(string relativePath, string content, AckitConfig config)
    {
        var findings = new List<RiskFinding>();
        var suppressions = new List<RiskSuppression>();

        foreach (var keyword in config.BrandKeywords.Where(keyword => !string.IsNullOrWhiteSpace(keyword)))
        {
            if (ContainsConfiguredKeyword(content, keyword))
            {
                findings.Add(new RiskFinding(RiskSeverity.Medium, RiskCategory.Brand, relativePath, "Configured brand keyword detected.", keyword));
            }
        }

        foreach (var keyword in config.PiiKeywords.Where(keyword => !string.IsNullOrWhiteSpace(keyword)))
        {
            if (ContainsConfiguredKeyword(content, keyword))
            {
                findings.Add(new RiskFinding(RiskSeverity.High, RiskCategory.Pii, relativePath, "Configured PII keyword detected.", keyword));
            }
        }

        foreach (var phone in PhoneRegex.Matches(content).Select(match => match.Value).Distinct(StringComparer.Ordinal))
        {
            if (IsReportablePhoneNumber(phone))
            {
                findings.Add(new RiskFinding(RiskSeverity.Low, RiskCategory.Pii, relativePath, "Phone-like value detected.", phone));
            }
        }

        var emailDomains = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var email in EmailRegex.Matches(content).Select(match => match.Value).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var emailDomain = GetEmailDomain(email);
            emailDomains.Add(emailDomain);
            if (!IsBuiltInIgnoredDomainLikeValue(emailDomain) && !IsNonRealFixtureEmail(relativePath, email, emailDomain))
            {
                if (IsConfiguredSafeDomain(emailDomain, config.SafeDomains))
                {
                    suppressions.Add(new RiskSuppression(RiskRuleCatalog.PiiOrBrandLike.Id, RiskSeverity.Medium, RiskCategory.Pii, relativePath, RiskSuppressionReason.SafeDomain));
                }
                else
                {
                    findings.Add(new RiskFinding(RiskSeverity.Medium, RiskCategory.Pii, relativePath, "Email-like value detected.", email));
                }
            }
        }

        foreach (var domain in DomainRegex.Matches(content).Select(match => match.Value).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (emailDomains.Contains(domain) || IsBuiltInIgnoredDomainLikeValue(domain))
            {
                continue;
            }

            if (IsConfiguredSafeDomain(domain, config.SafeDomains))
            {
                suppressions.Add(new RiskSuppression(RiskRuleCatalog.PiiOrBrandLike.Id, RiskSeverity.Low, RiskCategory.Brand, relativePath, RiskSuppressionReason.SafeDomain));
                continue;
            }

            findings.Add(new RiskFinding(RiskSeverity.Low, RiskCategory.Brand, relativePath, "Domain-like value detected.", domain));
            break;
        }

        foreach (var ipAddress in IpAddressRegex.Matches(content).Select(match => match.Value).Distinct(StringComparer.Ordinal))
        {
            if (IsReportableIpAddress(ipAddress))
            {
                findings.Add(new RiskFinding(RiskSeverity.Low, RiskCategory.Pii, relativePath, "IP address-like value detected.", ipAddress));
            }
        }

        return new BrandPiiScanResult(findings.Distinct().ToArray(), suppressions.Distinct().ToArray());
    }

    private static bool IsReportableIpAddress(string value)
    {
        var parts = value.Split('.');
        if (parts.Length != 4)
        {
            return false;
        }

        var octets = new int[4];
        for (var index = 0; index < parts.Length; index++)
        {
            if (!int.TryParse(parts[index], out var parsed) || parsed is < 0 or > 255)
            {
                return false;
            }

            octets[index] = parsed;
        }

        if (octets is [0, 0, 0, 0] or [255, 255, 255, 255])
        {
            return false;
        }

        if (octets[0] == 127)
        {
            return false;
        }

        if (octets[0] == 192 && octets[1] == 0 && octets[2] == 2)
        {
            return false;
        }

        if (octets[0] == 198 && octets[1] == 51 && octets[2] == 100)
        {
            return false;
        }

        if (octets[0] == 203 && octets[1] == 0 && octets[2] == 113)
        {
            return false;
        }

        return true;
    }

    private static bool ContainsConfiguredKeyword(string content, string keyword)
    {
        var token = keyword.Trim();
        if (token.Length == 0)
        {
            return false;
        }

        var index = 0;
        while ((index = content.IndexOf(token, index, StringComparison.OrdinalIgnoreCase)) >= 0)
        {
            var beforeOk = index == 0 || IsKeywordBoundary(content[index - 1]);
            var afterIndex = index + token.Length;
            var afterOk = afterIndex >= content.Length || IsKeywordBoundary(content[afterIndex]);
            if (beforeOk && afterOk)
            {
                return true;
            }

            index += token.Length;
        }

        return false;
    }

    private static bool IsKeywordBoundary(char value)
    {
        return !char.IsLetterOrDigit(value) && value != '_';
    }

    private static bool IsDateOrDateTimeLikeValue(string value)
    {
        return Regex.IsMatch(value, @"^\d{4}-\d{2}-\d{2}(?:\s+\d{1,2})?$");
    }

    private static bool IsReportablePhoneNumber(string value)
    {
        var digitCount = value.Count(char.IsDigit);
        if (digitCount is < 8 or > 15 || IsDateOrDateTimeLikeValue(value))
        {
            return false;
        }

        if (value.StartsWith('+'))
        {
            return true;
        }

        return value.Any(character => character is ' ' or '\t' or '(' or ')') ||
               value.Count(character => character == '-') >= 2;
    }

    private static string GetEmailDomain(string email)
    {
        var at = email.LastIndexOf('@');
        return at >= 0 && at + 1 < email.Length ? email[(at + 1)..] : "";
    }

    private static bool IsBuiltInIgnoredDomainLikeValue(string domain)
    {
        if (string.IsNullOrWhiteSpace(domain))
        {
            return false;
        }

        return KnownSafeTechnicalDomains.Contains(domain) ||
               KnownSafeTechnicalDomainSuffixes.Any(suffix => domain.EndsWith(suffix, StringComparison.OrdinalIgnoreCase)) ||
               domain.StartsWith("README.", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsConfiguredSafeDomain(string domain, IReadOnlyList<string> safeDomains)
    {
        var normalized = domain.Trim().TrimEnd('.').ToLowerInvariant();

        foreach (var configuredDomain in safeDomains)
        {
            var rule = configuredDomain.Trim().TrimEnd('.').ToLowerInvariant();
            if (rule.Length == 0)
            {
                continue;
            }

            if (rule.StartsWith("*.", StringComparison.Ordinal))
            {
                var suffix = rule[1..];
                if (normalized.Length > suffix.Length &&
                    normalized.EndsWith(suffix, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                continue;
            }

            if (string.Equals(normalized, rule, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static bool IsNonRealFixtureEmail(string relativePath, string email, string domain)
    {
        if (!IsFixtureLikePath(relativePath) || string.IsNullOrWhiteSpace(domain))
        {
            return false;
        }

        var localPart = email.Split('@', 2)[0];
        return FixtureOnlyEmailDomains.Contains(domain) ||
               (IsDocumentationExampleDomain(domain) && IsFixtureLocalPart(localPart));
    }

    private static bool IsDocumentationExampleDomain(string domain)
    {
        return domain.Equals("example.com", StringComparison.OrdinalIgnoreCase) ||
               domain.Equals("example.net", StringComparison.OrdinalIgnoreCase) ||
               domain.Equals("example.org", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsFixtureLocalPart(string localPart)
    {
        return localPart.Equals("example", StringComparison.OrdinalIgnoreCase) ||
               localPart.Equals("sample", StringComparison.OrdinalIgnoreCase) ||
               localPart.Equals("test", StringComparison.OrdinalIgnoreCase) ||
               localPart.Equals("fixture", StringComparison.OrdinalIgnoreCase) ||
               localPart.Equals("fake", StringComparison.OrdinalIgnoreCase) ||
               localPart.Equals("private", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsFixtureLikePath(string relativePath)
    {
        var normalized = relativePath.Replace('\\', '/').TrimStart('/');
        return normalized.StartsWith("tests/", StringComparison.OrdinalIgnoreCase) ||
               normalized.StartsWith("test/", StringComparison.OrdinalIgnoreCase) ||
               normalized.StartsWith("samples/", StringComparison.OrdinalIgnoreCase) ||
               normalized.StartsWith("sample/", StringComparison.OrdinalIgnoreCase) ||
               normalized.StartsWith("fixtures/", StringComparison.OrdinalIgnoreCase) ||
               normalized.StartsWith("testdata/", StringComparison.OrdinalIgnoreCase) ||
               normalized.StartsWith("test-data/", StringComparison.OrdinalIgnoreCase) ||
               normalized.Contains("/tests/", StringComparison.OrdinalIgnoreCase) ||
               normalized.Contains("/test/", StringComparison.OrdinalIgnoreCase) ||
               normalized.Contains("/fixtures/", StringComparison.OrdinalIgnoreCase) ||
               normalized.Contains("/testdata/", StringComparison.OrdinalIgnoreCase) ||
               normalized.Contains("/test-data/", StringComparison.OrdinalIgnoreCase) ||
               normalized.Contains(".Tests/", StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class RiskReporter : IRiskReporter
{
    public string Render(IReadOnlyList<RiskFinding> findings)
    {
        if (findings.Count == 0)
        {
            return "No risk findings.";
        }

        var lines = new List<string>();
        foreach (var severity in new[] { RiskSeverity.Critical, RiskSeverity.High, RiskSeverity.Medium, RiskSeverity.Low, RiskSeverity.Info })
        {
            var group = findings.Where(finding => finding.Severity == severity).ToArray();
            if (group.Length == 0)
            {
                continue;
            }

            lines.Add($"{severity}:");
            lines.AddRange(group.Select(finding => $"- {finding.Path}: {finding.Message}"));
        }

        return string.Join(Environment.NewLine, lines);
    }
}

public sealed class HighEntropyScanner : IHighEntropyScanner
{
    private const int MinTokenLength = 40;
    private const double MinShannonEntropy = 4.5;
    private static readonly Regex TokenRegex = new(@"[A-Za-z0-9+/=_\-]{40}", RegexOptions.Compiled);

    public IReadOnlyList<RiskFinding> ScanText(string relativePath, string content)
    {
        if (string.IsNullOrEmpty(content))
        {
            return Array.Empty<RiskFinding>();
        }

        var findings = new List<RiskFinding>();
        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (Match match in TokenRegex.Matches(content))
        {
            var token = match.Value;
            if (token.Length < MinTokenLength)
            {
                continue;
            }

            if (!LooksLikeRandomToken(token))
            {
                continue;
            }

            if (ShannonEntropy(token) < MinShannonEntropy)
            {
                continue;
            }

            // Suppress UUIDs and SHA-1/256-like hex digests: those are typically content hashes,
            // not credentials. The fingerprint that matters is the high-entropy base64/secret shape.
            if (IsLikelyHexDigest(token))
            {
                continue;
            }

            var truncated = token.Length <= 48 ? token : token[..24] + "..." + token[^8..];
            var key = $"{relativePath}|{truncated}";
            if (!seen.Add(key))
            {
                continue;
            }

            findings.Add(new RiskFinding(
                RiskSeverity.High,
                RiskCategory.RepositoryHygiene,
                relativePath,
                "High-entropy string detected; review for embedded secret or signing key.",
                truncated));
        }

        return findings;
    }

    private static bool LooksLikeRandomToken(string token)
    {
        var letterCount = 0;
        var digitCount = 0;
        var symbolCount = 0;
        foreach (var ch in token)
        {
            if (char.IsLetter(ch)) letterCount++;
            else if (char.IsDigit(ch)) digitCount++;
            else symbolCount++;
        }

        // Reject pure-digits (timestamps), and tokens dominated by one character class.
        if (letterCount == 0 || digitCount == 0)
        {
            return false;
        }

        var total = letterCount + digitCount + symbolCount;
        return letterCount >= total / 4 && digitCount >= total / 6;
    }

    private static bool IsLikelyHexDigest(string token)
    {
        foreach (var ch in token)
        {
            if (!(char.IsDigit(ch) || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F')))
            {
                return false;
            }
        }
        return true;
    }

    private static double ShannonEntropy(string value)
    {
        Span<int> counts = stackalloc int[256];
        foreach (var ch in value)
        {
            counts[(byte)ch]++;
        }

        var total = value.Length;
        var entropy = 0.0;
        for (var i = 0; i < counts.Length; i++)
        {
            if (counts[i] == 0)
            {
                continue;
            }

            var p = (double)counts[i] / total;
            entropy -= p * Math.Log2(p);
        }

        return entropy;
    }
}
