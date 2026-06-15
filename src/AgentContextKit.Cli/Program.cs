using AgentContextKit.Core;
using System.Text.Json;

namespace AgentContextKit.Cli;

public static class Program
{
    private const string Version = "0.2.0-alpha.2";
    private const string DefaultBaselinePath = ".ackit-baseline.json";
    private const int JsonSchemaVersion = 2;
    private const int ExitSuccess = 0;
    private const int ExitError = 1;
    private const int ExitCritical = 2;

    public static int Main(string[] args)
    {
        var language = LanguageCode.English;
        try
        {
            var services = CreateServices();
            var repositoryPath = Directory.GetCurrentDirectory();
            var config = services.ConfigReader.Read(repositoryPath);
            language = LanguageCode.From(GetOption(args, "--lang") ?? config.DefaultLanguage.Value);
            var command = args.Length == 0 ? "help" : args[0].Trim().ToLowerInvariant();
            var json = HasFlag(args, "--json");
            var ci = HasFlag(args, "--ci");

            return command switch
            {
                "help" or "--help" or "-h" => RunHelp(language, services.TextProvider),
                "version" or "--version" => RunVersion(),
                "init" => RunInit(repositoryPath, language, json, services),
                "config-check" => RunConfigCheck(repositoryPath, language, json, services),
                "scan" => RunScan(args, repositoryPath, config, language, json, ci, services),
                "baseline" => RunBaseline(args, repositoryPath, config, language, json, services),
                "sarif" => RunSarif(args, repositoryPath, config, language, json, services),
                "report" => RunReport(args, repositoryPath, config, language, json, services),
                "webui" => RunWebUi(args, repositoryPath, config, language, json, services),
                "prompt-pack" => RunPromptPack(args, repositoryPath, config, language, json, services),
                "context-export" => RunContextExport(args, repositoryPath, config, language, json, services),
                "generate" => RunGenerate(args, repositoryPath, config, language, json, services),
                "task" => RunTask(args, repositoryPath, language, json, services),
                "redact-check" => RunRedactCheck(args, repositoryPath, config, language, json, services),
                "doctor" => RunDoctor(repositoryPath, config, language, json, services),
                "hooks" => RunHooks(args, repositoryPath, language, json, services),
                "diff" => RunDiff(args, repositoryPath, language, json, services),
                "trim" => RunTrim(args, repositoryPath, language, json, services),
                _ => RunUnknown(command, language, services.TextProvider)
            };
        }
        catch (Exception ex)
        {
            var textProvider = new TextProvider();
            Console.Error.WriteLine($"{textProvider.Get("ackitError", language)}: {ex.Message}");
            Console.Error.WriteLine(textProvider.Get("suggestedAction", language));
            return ExitError;
        }
    }

    private static int RunHelp(LanguageCode language, ITextProvider textProvider)
    {
        Console.WriteLine(textProvider.Get("help", language));
        Console.WriteLine();
        Console.WriteLine(textProvider.Get("usage", language));
        Console.WriteLine("  ackit init [--lang en|tr] [--json]");
        Console.WriteLine("  ackit config-check [--lang en|tr] [--json]");
        Console.WriteLine("  ackit scan [--baseline <repo-relative.json>] [--lang en|tr] [--json] [--ci]");
        Console.WriteLine("  ackit baseline [--output <repo-relative.json>] [--update] [--lang en|tr] [--json]");
        Console.WriteLine("  ackit sarif --output <repo-relative.sarif> [--baseline <repo-relative.json>] [--lang en|tr] [--json]");
        Console.WriteLine("  ackit report [--output <repo-relative.html>] [--baseline <repo-relative.json>] [--lang en|tr] [--json]");
        Console.WriteLine("  ackit webui [--output <repo-relative.html>] [--baseline <repo-relative.json>] [--lang en|tr] [--json]");
        Console.WriteLine("  ackit prompt-pack [--output <repo-relative.md>] [--lang en|tr] [--json]");
        Console.WriteLine("  ackit context-export --prompt-pack <repo-relative.md> --approve [--output <repo-relative.json>] [--lang en|tr] [--json]");
        Console.WriteLine("  ackit generate [--target codex|claude|Anthropic|cursor|copilot|continue|all] [--lang en|tr] [--json]");
        Console.WriteLine("  ackit task \"<title>\" [--lang en|tr] [--json]");
        Console.WriteLine("  ackit redact-check [--profile public-release] [--lang en|tr] [--json]");
        Console.WriteLine("  ackit doctor [--lang en|tr] [--json]");
        Console.WriteLine("  ackit hooks [--shell pwsh|sh] [--install] [--output <repo-relative-dir>] [--lang en|tr] [--json]");
        Console.WriteLine("  ackit diff --from <from.json> --to <to.json> [--lang en|tr] [--json]");
        Console.WriteLine("  ackit trim --input <repo-relative.md|json> --output <repo-relative.md|json> --max-chars <N> [--lang en|tr] [--json]");
        Console.WriteLine("  ackit version");
        return ExitSuccess;
    }

    private static int RunVersion()
    {
        Console.WriteLine($"AgentContextKit {Version}");
        return ExitSuccess;
    }

    private static int RunInit(string repositoryPath, LanguageCode language, bool json, Services services)
    {
        var result = services.ConfigWriter.WriteDefaultIfMissing(repositoryPath, language);
        var agentFiles = new[] { "AGENTS.md", "CLAUDE.md", ".cursor/rules/project.mdc", ".github/copilot-instructions.md" }
            .Select(file =>
            {
                var fullPath = Path.Combine(repositoryPath, file.Replace('/', Path.DirectorySeparatorChar));
                return new
                {
                    path = file,
                    exists = services.FileSystem.FileExists(fullPath)
                };
            })
            .ToArray();

        if (json)
        {
            WriteJson(new
            {
                schemaVersion = JsonSchemaVersion,
                toolVersion = Version,
                generatedAtUtc = services.Clock.UtcNow,
                command = "init",
                config = ToGeneratedFileDto(result),
                agentInstructionFiles = agentFiles
            });
            return ExitSuccess;
        }

        PrintGeneratedResult(result, services.TextProvider, language);

        Console.WriteLine();
        Console.WriteLine(services.TextProvider.Get("detectedAgentInstructionFiles", language));
        foreach (var file in agentFiles)
        {
            var status = services.TextProvider.Get(file.exists ? "found" : "missing", language);
            Console.WriteLine($"- {file.path}: {status}");
        }

        return ExitSuccess;
    }

    private static int RunConfigCheck(
        string repositoryPath,
        LanguageCode language,
        bool json,
        Services services)
    {
        const string relativePath = ".ackit/config.yml";
        var fullPath = Path.Combine(repositoryPath, ".ackit", "config.yml");
        var exists = services.FileSystem.FileExists(fullPath);
        var result = exists
            ? services.ConfigValidator.Validate(services.FileSystem.ReadAllText(fullPath))
            : new ConfigValidationResult(Array.Empty<ConfigDiagnostic>());
        var errorCount = result.Diagnostics.Count(diagnostic => diagnostic.Severity == ConfigDiagnosticSeverity.Error);
        var warningCount = result.Diagnostics.Count(diagnostic => diagnostic.Severity == ConfigDiagnosticSeverity.Warning);
        var infoCount = result.Diagnostics.Count(diagnostic => diagnostic.Severity == ConfigDiagnosticSeverity.Info);
        var migrationRequired = result.Diagnostics.Any(diagnostic =>
            diagnostic.Code is ConfigDiagnosticCodes.ObsoleteKey or ConfigDiagnosticCodes.InvalidSchemaVersion);
        var status = !exists
            ? "default"
            : errorCount > 0
                ? "errors"
                : warningCount > 0
                    ? "warnings"
                    : "valid";
        var exitCode = errorCount > 0 ? ExitError : ExitSuccess;

        if (json)
        {
            WriteJson(new
            {
                schemaVersion = JsonSchemaVersion,
                toolVersion = Version,
                generatedAtUtc = services.Clock.UtcNow,
                command = "config-check",
                repositoryName = GetRepositoryName(repositoryPath),
                exitCode,
                config = new
                {
                    path = relativePath,
                    exists,
                    status,
                    supportedSchemaVersion = AckitConfig.Default.SchemaVersion,
                    migrationRequired
                },
                diagnosticSummary = new
                {
                    total = result.Diagnostics.Count,
                    info = infoCount,
                    warnings = warningCount,
                    errors = errorCount
                },
                diagnostics = result.Diagnostics.Select(ToConfigDiagnosticDto).ToArray()
            });
            return exitCode;
        }

        var turkish = string.Equals(language.Value, LanguageCode.Turkish.Value, StringComparison.OrdinalIgnoreCase);
        Console.WriteLine(turkish ? "Yapılandırma kontrolü" : "Configuration check");
        Console.WriteLine($"- {(turkish ? "Yol" : "Path")}: {relativePath}");
        Console.WriteLine($"- {(turkish ? "Durum" : "Status")}: {ToConfigStatusLabel(status, turkish)}");
        Console.WriteLine(turkish
            ? $"- Tanılar: {result.Diagnostics.Count} ({errorCount} hata, {warningCount} uyarı)"
            : $"- Diagnostics: {result.Diagnostics.Count} ({errorCount} errors, {warningCount} warnings)");

        if (!exists)
        {
            Console.WriteLine(turkish
                ? "Yapılandırma dosyası yok; varsayılan ayarlar geçerli."
                : "Configuration file is missing; defaults are valid.");
            return exitCode;
        }

        if (result.Diagnostics.Count == 0)
        {
            Console.WriteLine(turkish ? "Yapılandırma tanısı yok." : "No configuration diagnostics.");
            return exitCode;
        }

        foreach (var diagnostic in result.Diagnostics)
        {
            var key = diagnostic.Key is null
                ? ""
                : turkish
                    ? $" anahtar {diagnostic.Key}"
                    : $" key {diagnostic.Key}";
            var severity = turkish ? ToTurkishConfigSeverity(diagnostic.Severity) : diagnostic.Severity.ToString();
            var line = turkish ? "satır" : "line";
            Console.WriteLine($"- {severity} {diagnostic.Code} {line} {diagnostic.Line}{key}: {diagnostic.Message}");
        }

        if (migrationRequired)
        {
            Console.WriteLine(turkish
                ? "Geçiş incelemesi gerekli; dosya otomatik olarak değiştirilmedi."
                : "Migration review is required; the file was not changed automatically.");
        }

        return exitCode;
    }

    private static string ToConfigStatusLabel(string status, bool turkish)
    {
        if (!turkish)
        {
            return status;
        }

        return status switch
        {
            "default" => "varsayılan",
            "valid" => "geçerli",
            "warnings" => "uyarılar",
            "errors" => "hatalar",
            _ => status
        };
    }

    private static string ToTurkishConfigSeverity(ConfigDiagnosticSeverity severity)
    {
        return severity switch
        {
            ConfigDiagnosticSeverity.Info => "Bilgi",
            ConfigDiagnosticSeverity.Warning => "Uyarı",
            ConfigDiagnosticSeverity.Error => "Hata",
            _ => severity.ToString()
        };
    }

    private static int RunScan(string[] args, string repositoryPath, AckitConfig config, LanguageCode language, bool json, bool ci, Services services)
    {
        var scan = services.RepositoryScanner.Scan(repositoryPath, config);
        string? baselinePath;
        BaselineEvaluation? baseline;
        try
        {
            (baselinePath, baseline) = LoadBaseline(args, repositoryPath, scan, services);
        }
        catch (BaselineException ex)
        {
            return WriteBaselineError("scan", ex, json, services.Clock.UtcNow);
        }

        var exitCode = baseline is null
            ? GetScanExitCode(scan, ci)
            : GetBaselineScanExitCode(baseline, ci);
        if (json)
        {
            WriteJson(ToScanDto("scan", scan, services.Clock.UtcNow, ci, exitCode, baselinePath, baseline));
            return exitCode;
        }

        PrintScan(scan, language, services);
        if (baseline is not null)
        {
            PrintBaselineClassification(baselinePath!, baseline, language, services.TextProvider);
        }

        return exitCode;
    }

    private static int RunBaseline(
        string[] args,
        string repositoryPath,
        AckitConfig config,
        LanguageCode language,
        bool json,
        Services services)
    {
        var outputPath = GetOption(args, "--output") ?? DefaultBaselinePath;
        try
        {
            var scan = services.RepositoryScanner.Scan(repositoryPath, config);
            var manifest = services.BaselineClassifier.CreateManifest(scan.Findings);
            var result = services.BaselineStore.Write(repositoryPath, outputPath, manifest, HasFlag(args, "--update"));
            if (json)
            {
                WriteJson(new
                {
                    schemaVersion = JsonSchemaVersion,
                    toolVersion = Version,
                    generatedAtUtc = services.Clock.UtcNow,
                    command = "baseline",
                    repositoryName = GetRepositoryName(repositoryPath),
                    baseline = new
                    {
                        path = result.Path,
                        status = result.Status.ToString(),
                        schemaVersion = manifest.SchemaVersion,
                        fingerprintAlgorithm = manifest.FingerprintAlgorithm,
                        entryCount = result.EntryCount
                    }
                });
                return ExitSuccess;
            }

            var statusKey = result.Status == BaselineFileStatus.Created ? "baselineCreated" : "baselineUpdated";
            Console.WriteLine($"{services.TextProvider.Get(statusKey, language)}: {result.Path}");
            Console.WriteLine($"{services.TextProvider.Get("entries", language)}: {result.EntryCount}");
            Console.WriteLine(services.TextProvider.Get("baselineReview", language));
            return ExitSuccess;
        }
        catch (BaselineException ex)
        {
            return WriteBaselineError("baseline", ex, json, services.Clock.UtcNow);
        }
    }

    private static int RunSarif(string[] args, string repositoryPath, AckitConfig config, LanguageCode language, bool json, Services services)
    {
        var outputPath = GetOption(args, "--output");
        if (string.IsNullOrWhiteSpace(outputPath))
        {
            Console.Error.WriteLine(services.TextProvider.Get("sarifRequiresOutput", language));
            return ExitError;
        }

        var scan = services.RepositoryScanner.Scan(repositoryPath, config);
        string? baselinePath;
        BaselineEvaluation? baseline;
        try
        {
            (baselinePath, baseline) = LoadBaseline(args, repositoryPath, scan, services);
        }
        catch (BaselineException ex)
        {
            return WriteBaselineError("sarif", ex, json, services.Clock.UtcNow);
        }

        var result = services.SarifReportWriter.Generate(repositoryPath, outputPath, scan, Version, baseline);
        var criticalHighCount = scan.Findings.Count(finding => finding.Severity is RiskSeverity.Critical or RiskSeverity.High);

        if (json)
        {
            var response = new Dictionary<string, object?>
            {
                ["schemaVersion"] = JsonSchemaVersion,
                ["toolVersion"] = Version,
                ["generatedAtUtc"] = services.Clock.UtcNow,
                ["command"] = "sarif",
                ["repositoryName"] = GetRepositoryName(repositoryPath),
                ["riskSummary"] = ToRiskSummary(scan.Findings),
                ["criticalHighCount"] = criticalHighCount,
                ["sarif"] = ToGeneratedFileDto(result)
            };
            AddBaselineDto(response, baselinePath, baseline);
            WriteJson(response);
            return ExitSuccess;
        }

        PrintGeneratedResult(result, services.TextProvider, language);
        Console.WriteLine($"{services.TextProvider.Get("sarifFindings", language)}: {scan.Findings.Count}");
        Console.WriteLine($"{services.TextProvider.Get("criticalHighFindings", language)}: {criticalHighCount}");
        if (baseline is not null)
        {
            PrintBaselineClassification(baselinePath!, baseline, language, services.TextProvider);
        }
        return ExitSuccess;
    }

    private static int RunReport(string[] args, string repositoryPath, AckitConfig config, LanguageCode language, bool json, Services services)
    {
        var outputPath = GetOption(args, "--output");
        var scan = services.RepositoryScanner.Scan(repositoryPath, config);
        string? baselinePath;
        BaselineEvaluation? baseline;
        try
        {
            (baselinePath, baseline) = LoadBaseline(args, repositoryPath, scan, services);
        }
        catch (BaselineException ex)
        {
            return WriteBaselineError("report", ex, json, services.Clock.UtcNow);
        }

        var result = services.HtmlReportGenerator.Generate(repositoryPath, outputPath, language, scan, baseline);

        if (json)
        {
            var response = new Dictionary<string, object?>
            {
                ["schemaVersion"] = JsonSchemaVersion,
                ["toolVersion"] = Version,
                ["generatedAtUtc"] = services.Clock.UtcNow,
                ["command"] = "report",
                ["repositoryPath"] = repositoryPath,
                ["repositoryName"] = GetRepositoryName(repositoryPath),
                ["riskSummary"] = ToRiskSummary(scan.Findings),
                ["report"] = ToGeneratedFileDto(result)
            };
            AddBaselineDto(response, baselinePath, baseline);
            WriteJson(response);
            return ExitSuccess;
        }

        PrintGeneratedResult(result, services.TextProvider, language);
        Console.WriteLine($"{services.TextProvider.Get("riskFindings", language)}: {scan.Findings.Count}");
        if (baseline is not null)
        {
            PrintBaselineClassification(baselinePath!, baseline, language, services.TextProvider);
        }
        return ExitSuccess;
    }

    private static int RunWebUi(string[] args, string repositoryPath, AckitConfig config, LanguageCode language, bool json, Services services)
    {
        var outputPath = GetOption(args, "--output");
        var scan = services.RepositoryScanner.Scan(repositoryPath, config);
        string? baselinePath;
        BaselineEvaluation? baseline;
        try
        {
            (baselinePath, baseline) = LoadBaseline(args, repositoryPath, scan, services);
        }
        catch (BaselineException ex)
        {
            return WriteBaselineError("webui", ex, json, services.Clock.UtcNow);
        }

        var result = services.WebUiGenerator.Generate(repositoryPath, outputPath, language, scan, baseline);

        if (json)
        {
            var response = new Dictionary<string, object?>
            {
                ["schemaVersion"] = JsonSchemaVersion,
                ["toolVersion"] = Version,
                ["generatedAtUtc"] = services.Clock.UtcNow,
                ["command"] = "webui",
                ["repositoryPath"] = repositoryPath,
                ["repositoryName"] = GetRepositoryName(repositoryPath),
                ["riskSummary"] = ToRiskSummary(scan.Findings),
                ["webUi"] = ToGeneratedFileDto(result)
            };
            AddBaselineDto(response, baselinePath, baseline);
            WriteJson(response);
            return ExitSuccess;
        }

        PrintGeneratedResult(result, services.TextProvider, language);
        Console.WriteLine($"{services.TextProvider.Get("riskFindings", language)}: {scan.Findings.Count}");
        if (baseline is not null)
        {
            PrintBaselineClassification(baselinePath!, baseline, language, services.TextProvider);
        }
        return ExitSuccess;
    }

    private static int RunPromptPack(string[] args, string repositoryPath, AckitConfig config, LanguageCode language, bool json, Services services)
    {
        var outputPath = GetOption(args, "--output");
        var scan = services.RepositoryScanner.Scan(repositoryPath, config);
        var result = services.PromptPackGenerator.Generate(repositoryPath, outputPath, language, scan);

        if (json)
        {
            WriteJson(new
            {
                schemaVersion = JsonSchemaVersion,
                toolVersion = Version,
                generatedAtUtc = services.Clock.UtcNow,
                command = "prompt-pack",
                repositoryPath,
                repositoryName = GetRepositoryName(repositoryPath),
                riskSummary = ToRiskSummary(scan.Findings),
                promptPack = ToGeneratedFileDto(result)
            });
            return ExitSuccess;
        }

        PrintGeneratedResult(result, services.TextProvider, language);
        Console.WriteLine(services.TextProvider.Get("noRemoteCall", language));
        Console.WriteLine($"{services.TextProvider.Get("riskFindings", language)}: {scan.Findings.Count}");
        return ExitSuccess;
    }

    private static int RunContextExport(string[] args, string repositoryPath, AckitConfig config, LanguageCode language, bool json, Services services)
    {
        if (!HasFlag(args, "--approve"))
        {
            Console.Error.WriteLine(services.TextProvider.Get("contextExportRequiresApproval", language));
            return ExitError;
        }

        var promptPackPath = GetOption(args, "--prompt-pack");
        if (string.IsNullOrWhiteSpace(promptPackPath))
        {
            Console.Error.WriteLine(services.TextProvider.Get("contextExportRequiresPromptPack", language));
            return ExitError;
        }

        var outputPath = GetOption(args, "--output");
        var scan = services.RepositoryScanner.Scan(repositoryPath, config);
        var result = services.ContextExportManifestGenerator.Generate(
            repositoryPath,
            new ContextExportSpec(promptPackPath, outputPath, "explicit-cli-flag", language),
            scan);

        if (json)
        {
            WriteJson(new
            {
                schemaVersion = JsonSchemaVersion,
                toolVersion = Version,
                generatedAtUtc = services.Clock.UtcNow,
                command = "context-export",
                repositoryPath,
                repositoryName = GetRepositoryName(repositoryPath),
                riskSummary = ToRiskSummary(scan.Findings),
                contextExport = ToGeneratedFileDto(result)
            });
            return ExitSuccess;
        }

        PrintGeneratedResult(result, services.TextProvider, language);
        Console.WriteLine(services.TextProvider.Get("noRemoteCall", language));
        Console.WriteLine(services.TextProvider.Get("approvalRecorded", language));
        return ExitSuccess;
    }

    private static int RunGenerate(string[] args, string repositoryPath, AckitConfig config, LanguageCode language, bool json, Services services)
    {
        var target = ParseTarget(GetOption(args, "--target"));
        var scan = services.RepositoryScanner.Scan(repositoryPath, config);
        var results = services.AgentInstructionGenerator.Generate(repositoryPath, target, language, scan);

        if (json)
        {
            WriteJson(new
            {
                schemaVersion = JsonSchemaVersion,
                toolVersion = Version,
                generatedAtUtc = services.Clock.UtcNow,
                command = "generate",
                target = target.ToString(),
                fileSummary = ToGeneratedFileSummary(results),
                files = results.Select(ToGeneratedFileDto).ToArray()
            });
            return ExitSuccess;
        }

        foreach (var result in results)
        {
            PrintGeneratedResult(result, services.TextProvider, language);
        }

        return ExitSuccess;
    }

    private static int RunTask(string[] args, string repositoryPath, LanguageCode language, bool json, Services services)
    {
        var title = GetTaskTitle(args);
        if (string.IsNullOrWhiteSpace(title))
        {
            Console.Error.WriteLine(services.TextProvider.Get("taskRequiresTitle", language));
            Console.Error.WriteLine(services.TextProvider.Get("taskExample", language));
            return ExitError;
        }

        var result = services.TaskFileGenerator.CreateTask(repositoryPath, new TaskSpec(title, language));
        if (json)
        {
            WriteJson(new
            {
                schemaVersion = JsonSchemaVersion,
                toolVersion = Version,
                generatedAtUtc = services.Clock.UtcNow,
                command = "task",
                file = ToGeneratedFileDto(result)
            });
            return ExitSuccess;
        }

        PrintGeneratedResult(result, services.TextProvider, language);
        return ExitSuccess;
    }

    private static int RunRedactCheck(string[] args, string repositoryPath, AckitConfig config, LanguageCode language, bool json, Services services)
    {
        var profile = GetOption(args, "--profile") ?? "default";
        var scan = services.RepositoryScanner.Scan(repositoryPath, config);
        var findings = scan.Findings
            .Where(finding => finding.Category is RiskCategory.Secret or RiskCategory.Pii or RiskCategory.Brand or RiskCategory.LocalPath or RiskCategory.ProductionConfig)
            .ToArray();

        var exitCode = findings.Any(finding => finding.Severity == RiskSeverity.Critical)
            ? ExitCritical
            : findings.Length > 0 ? ExitError : ExitSuccess;

        if (json)
        {
            WriteJson(new
            {
                schemaVersion = JsonSchemaVersion,
                toolVersion = Version,
                generatedAtUtc = services.Clock.UtcNow,
                command = "redact-check",
                repositoryPath,
                repositoryName = GetRepositoryName(repositoryPath),
                profile,
                exitCode,
                riskSummary = ToRiskSummary(findings),
                findings = findings.Select(ToRiskFindingDto).ToArray()
            });
            return exitCode;
        }

        PrintFindings(findings, language, services);
        return exitCode;
    }

    private static int RunDoctor(string repositoryPath, AckitConfig config, LanguageCode language, bool json, Services services)
    {
        var scan = services.RepositoryScanner.Scan(repositoryPath, config);
        var result = services.Doctor.Check(repositoryPath, scan);
        var exitCode = result.Checks.Any(check => !check.Passed && check.Severity >= RiskSeverity.High)
            ? ExitError
            : ExitSuccess;

        if (json)
        {
            WriteJson(new
            {
                schemaVersion = JsonSchemaVersion,
                toolVersion = Version,
                generatedAtUtc = services.Clock.UtcNow,
                command = "doctor",
                repositoryPath,
                repositoryName = GetRepositoryName(repositoryPath),
                exitCode,
                checkSummary = ToDoctorCheckSummary(result.Checks),
                checks = result.Checks.Select(ToDoctorCheckDto).ToArray()
            });
            return exitCode;
        }

        Console.WriteLine(services.TextProvider.Get("doctor", language));
        foreach (var check in result.Checks)
        {
            var status = check.Passed ? "PASS" : "FAIL";
            Console.WriteLine($"- {status} [{check.Severity}] {check.Name}: {check.Message}");
        }

        return exitCode;
    }

    private static int RunHooks(string[] args, string repositoryPath, LanguageCode language, bool json, Services services)
    {
        var install = HasFlag(args, "--install");
        var shell = GetOption(args, "--shell")?.Trim().ToLowerInvariant() ?? "sh";
        var output = GetOption(args, "--output");
        var textProvider = services.TextProvider;

        if (shell is not ("pwsh" or "sh"))
        {
            Console.Error.WriteLine($"--shell must be pwsh or sh. Got: {shell}");
            return ExitError;
        }

        var targets = new List<(string Path, string Content)>();
        if (shell == "pwsh")
        {
            targets.Add(($".git/hooks/pre-commit", "ackit scan --ci\r\nif ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }\r\n"));
            targets.Add(($".git/hooks/pre-push", "ackit scan --ci\r\nif ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }\r\n"));
        }
        else
        {
            targets.Add(($".git/hooks/pre-commit", "#!/usr/bin/env sh\nackit scan --ci || exit $?\n"));
            targets.Add(($".git/hooks/pre-push", "#!/usr/bin/env sh\nackit scan --ci || exit $?\n"));
        }

        var isGitRepo = Directory.Exists(Path.Combine(repositoryPath, ".git"));
        if (!isGitRepo && output is null)
        {
            if (json)
            {
                WriteJson(new { schemaVersion = JsonSchemaVersion, command = "hooks", exitCode = ExitError, error = textProvider.Get("hooksNotGitRepo", language) });
            }
            else
            {
                Console.Error.WriteLine(textProvider.Get("hooksNotGitRepo", language));
            }
            return ExitError;
        }

        var baseDir = output is null
            ? repositoryPath
            : Path.Combine(repositoryPath, output.Replace('/', Path.DirectorySeparatorChar));

        var items = new List<object>();
        foreach (var (relPath, content) in targets)
        {
            var writePath = output is null ? relPath : relPath.Replace(".git/hooks/", string.Empty, StringComparison.Ordinal);
            var fullPath = Path.Combine(baseDir, writePath.Replace('/', Path.DirectorySeparatorChar));
            var exists = File.Exists(fullPath);
            string status;
            if (install && !exists)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
                File.WriteAllText(fullPath, content);
                if (shell == "sh")
                {
                    try { File.SetUnixFileMode(fullPath, UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute | UnixFileMode.GroupRead | UnixFileMode.GroupExecute | UnixFileMode.OtherRead | UnixFileMode.OtherExecute); } catch { }
                }
                status = textProvider.Get("hooksInstalled", language);
            }
            else if (exists)
            {
                status = textProvider.Get("hooksSkipped", language);
            }
            else
            {
                status = textProvider.Get("no", language);
            }
            items.Add(new { path = writePath, status });
        }

        if (json)
        {
            WriteJson(new { schemaVersion = JsonSchemaVersion, command = "hooks", install, shell, mode = install ? "install" : "preview", exitCode = ExitSuccess, files = items });
        }
        else if (!install)
        {
            Console.WriteLine(textProvider.Get("hooksPreview", language));
            foreach (var item in items)
            {
                var dyn = (dynamic)item;
                Console.WriteLine($"  {dyn.path}: {dyn.status}");
            }
        }
        else
        {
            foreach (var item in items)
            {
                var dyn = (dynamic)item;
                Console.WriteLine($"  {dyn.path}: {dyn.status}");
            }
        }
        return ExitSuccess;
    }

    private static int RunDiff(string[] args, string repositoryPath, LanguageCode language, bool json, Services services)
    {
        var from = GetOption(args, "--from");
        var to = GetOption(args, "--to");
        if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
        {
            if (json)
            {
                WriteJson(new { schemaVersion = JsonSchemaVersion, command = "diff", exitCode = ExitError, error = "Missing --from or --to" });
            }
            else
            {
                Console.Error.WriteLine("ackit diff requires --from and --to <repo-relative.json>.");
            }
            return ExitError;
        }

        try
        {
            var fromPath = Path.Combine(repositoryPath, from.Replace('/', Path.DirectorySeparatorChar));
            var toPath = Path.Combine(repositoryPath, to.Replace('/', Path.DirectorySeparatorChar));
            if (!File.Exists(fromPath) || !File.Exists(toPath))
            {
                if (json)
                {
                    WriteJson(new { schemaVersion = JsonSchemaVersion, command = "diff", exitCode = ExitError, error = "Baseline file not found" });
                }
                else
                {
                    Console.Error.WriteLine("Baseline file not found.");
                }
                return ExitError;
            }

            var fromJson = File.ReadAllText(fromPath);
            var toJson = File.ReadAllText(toPath);
            var fromManifest = BaselineSerializer.Deserialize(fromJson);
            var toManifest = BaselineSerializer.Deserialize(toJson);
            var diff = BaselineDiffCalculator.Compare(fromManifest, toManifest);

            if (json)
            {
                WriteJson(new
                {
                    schemaVersion = JsonSchemaVersion,
                    command = "diff",
                    exitCode = ExitSuccess,
                    fromBaseline = from,
                    toBaseline = to,
                    addedCount = diff.Added.Count,
                    removedCount = diff.Removed.Count,
                    unchangedCount = diff.Unchanged.Count,
                    severityChangedCount = diff.SeverityChanged.Count
                });
            }
            else
            {
                Console.WriteLine($"added: {diff.Added.Count}");
                Console.WriteLine($"removed: {diff.Removed.Count}");
                Console.WriteLine($"unchanged: {diff.Unchanged.Count}");
                Console.WriteLine($"severityChanged: {diff.SeverityChanged.Count}");
            }
            return ExitSuccess;
        }
        catch (Exception ex)
        {
            if (json)
            {
                WriteJson(new { schemaVersion = JsonSchemaVersion, command = "diff", exitCode = ExitError, error = ex.Message });
            }
            else
            {
                Console.Error.WriteLine($"ackit diff failed: {ex.Message}");
            }
            return ExitError;
        }
    }

    private static int RunTrim(string[] args, string repositoryPath, LanguageCode language, bool json, Services services)
    {
        var input = GetOption(args, "--input");
        var output = GetOption(args, "--output");
        var maxCharsStr = GetOption(args, "--max-chars");

        if (string.IsNullOrWhiteSpace(input) || string.IsNullOrWhiteSpace(output) || string.IsNullOrWhiteSpace(maxCharsStr))
        {
            if (json)
            {
                WriteJson(new { schemaVersion = JsonSchemaVersion, command = "trim", exitCode = ExitError, error = "Missing --input, --output, or --max-chars" });
            }
            else
            {
                Console.Error.WriteLine("ackit trim requires --input, --output, and --max-chars <N>.");
            }
            return ExitError;
        }

        if (!int.TryParse(maxCharsStr, out var maxChars) || maxChars <= 0)
        {
            if (json)
            {
                WriteJson(new { schemaVersion = JsonSchemaVersion, command = "trim", exitCode = ExitError, error = "Invalid --max-chars" });
            }
            else
            {
                Console.Error.WriteLine("--max-chars must be a positive integer.");
            }
            return ExitError;
        }

        var inputFull = Path.Combine(repositoryPath, input.Replace('/', Path.DirectorySeparatorChar));
        var outputFull = Path.Combine(repositoryPath, output.Replace('/', Path.DirectorySeparatorChar));
        if (string.Equals(Path.GetFullPath(inputFull), Path.GetFullPath(outputFull), StringComparison.OrdinalIgnoreCase))
        {
            if (json)
            {
                WriteJson(new { schemaVersion = JsonSchemaVersion, command = "trim", exitCode = ExitError, error = "Input and output must differ" });
            }
            else
            {
                Console.Error.WriteLine("Input and output paths must differ. Refusing to overwrite input.");
            }
            return ExitError;
        }

        try
        {
            if (!File.Exists(inputFull))
            {
                if (json) WriteJson(new { schemaVersion = JsonSchemaVersion, command = "trim", exitCode = ExitError, error = "Input file not found" });
                else Console.Error.WriteLine("Input file not found.");
                return ExitError;
            }
            var content = File.ReadAllText(inputFull);
            var originalChars = content.Length;
            var trimmed = TrimContent(content, maxChars);
            Directory.CreateDirectory(Path.GetDirectoryName(outputFull)!);
            File.WriteAllText(outputFull, trimmed);

            if (json)
            {
                WriteJson(new
                {
                    schemaVersion = JsonSchemaVersion,
                    command = "trim",
                    exitCode = ExitSuccess,
                    input,
                    output,
                    maxChars,
                    originalChars,
                    trimmedChars = trimmed.Length
                });
            }
            else
            {
                Console.WriteLine($"original: {originalChars}");
                Console.WriteLine($"trimmed: {trimmed.Length}");
                Console.WriteLine($"max-chars: {maxChars}");
            }
            return ExitSuccess;
        }
        catch (Exception ex)
        {
            if (json) WriteJson(new { schemaVersion = JsonSchemaVersion, command = "trim", exitCode = ExitError, error = ex.Message });
            else Console.Error.WriteLine($"ackit trim failed: {ex.Message}");
            return ExitError;
        }
    }

    private static string TrimContent(string content, int maxChars)
    {
        if (content.Length <= maxChars) return content;
        const string header = "# Trimmed by ackit trim";
        const string note = "\n<!-- trimmed: content exceeded max-chars; body truncated deterministically. -->\n";
        if (maxChars <= header.Length + note.Length)
        {
            return header + note;
        }
        var bodyBudget = maxChars - header.Length - note.Length;
        return header + note + content.Substring(0, bodyBudget);
    }

    private static int RunUnknown(string command, LanguageCode language, ITextProvider textProvider)
    {
        Console.Error.WriteLine($"{textProvider.Get("unknownCommand", language)}: {command}");
        RunHelp(language, textProvider);
        return ExitError;
    }

    private static void PrintScan(ScanResult scan, LanguageCode language, Services services)
    {
        Console.WriteLine(services.TextProvider.Get("scanSummary", language));
        Console.WriteLine($"{services.TextProvider.Get("repository", language)}: {scan.RepositoryPath}");
        Console.WriteLine($"{services.TextProvider.Get("files", language)}: {scan.Files.Count}");

        Console.WriteLine();
        Console.WriteLine(services.TextProvider.Get("stacks", language));
        if (scan.Stacks.Count == 0)
        {
            Console.WriteLine($"- {services.TextProvider.Get("unknown", language)}");
        }
        else
        {
            foreach (var stack in scan.Stacks)
            {
                Console.WriteLine($"- {stack.Name}: {stack.Signal}");
            }
        }

        Console.WriteLine();
        Console.WriteLine(services.TextProvider.Get("repositoryHealth", language));
        Console.WriteLine($"- README: {YesNo(scan.HasReadme, language, services.TextProvider)}");
        Console.WriteLine($"- LICENSE: {YesNo(scan.HasLicense, language, services.TextProvider)}");
        Console.WriteLine($"- SECURITY: {YesNo(scan.HasSecurityPolicy, language, services.TextProvider)}");
        Console.WriteLine($"- {services.TextProvider.Get("tests", language)}: {YesNo(scan.HasTests, language, services.TextProvider)}");
        Console.WriteLine($"- CI: {YesNo(scan.HasCi, language, services.TextProvider)}");
        Console.WriteLine($"- Docker: {YesNo(scan.HasDocker, language, services.TextProvider)}");
        Console.WriteLine($"- {services.TextProvider.Get("agentInstructions", language)}: {YesNo(scan.HasAgentInstructions, language, services.TextProvider)}");

        Console.WriteLine();
        PrintFindings(scan.Findings, language, services);
        PrintSuppressions(scan.Suppressions, language, services.TextProvider);
    }

    private static void PrintBaselineClassification(
        string baselinePath,
        BaselineEvaluation baseline,
        LanguageCode language,
        ITextProvider textProvider)
    {
        Console.WriteLine();
        Console.WriteLine(textProvider.Get("baselineClassification", language));
        Console.WriteLine($"- {textProvider.Get("file", language)}: {baselinePath}");
        Console.WriteLine($"- {textProvider.Get("existingFindings", language)}: {baseline.Existing.Count}");
        Console.WriteLine($"- {textProvider.Get("newFindings", language)}: {baseline.New.Count}");
        foreach (var finding in baseline.Findings.Take(25))
        {
            Console.WriteLine($"- {finding.Status}: {finding.Finding.Path} {RiskRuleCatalog.GetRuleId(finding.Finding)} [{finding.Finding.Severity}] {textProvider.Get("occurrence", language)} {finding.Occurrence}");
        }

        if (baseline.Findings.Count > 25)
        {
            Console.WriteLine($"- ... {baseline.Findings.Count - 25} {textProvider.Get("more", language)}");
        }
    }

    private static void PrintSuppressions(
        IReadOnlyList<RiskSuppression> suppressions,
        LanguageCode language,
        ITextProvider textProvider)
    {
        if (suppressions.Count == 0)
        {
            return;
        }

        Console.WriteLine();
        Console.WriteLine($"{textProvider.Get("suppressedFindings", language)}: {suppressions.Count}");
        foreach (var suppression in suppressions.Take(25))
        {
            Console.WriteLine($"- {suppression.Path}: {suppression.RuleId} [{suppression.Severity}/{suppression.Category}] {textProvider.Get("via", language)} {ToSuppressionReason(suppression.Reason)}");
        }

        if (suppressions.Count > 25)
        {
            Console.WriteLine($"- ... {suppressions.Count - 25} {textProvider.Get("more", language)}");
        }
    }

    private static void PrintFindings(IReadOnlyList<RiskFinding> findings, LanguageCode language, Services services)
    {
        if (findings.Count == 0)
        {
            Console.WriteLine(services.TextProvider.Get("noFindings", language));
            return;
        }

        foreach (var severity in new[] { RiskSeverity.Critical, RiskSeverity.High, RiskSeverity.Medium, RiskSeverity.Low, RiskSeverity.Info })
        {
            var group = findings.Where(finding => finding.Severity == severity).Take(25).ToArray();
            if (group.Length == 0)
            {
                continue;
            }

            Console.WriteLine($"{severity}:");
            foreach (var finding in group)
            {
                Console.WriteLine($"- {finding.Path}: {finding.Message}");
            }

            var omitted = findings.Count(finding => finding.Severity == severity) - group.Length;
            if (omitted > 0)
            {
                Console.WriteLine($"- ... {omitted} more");
            }
        }
    }

    private static void PrintGeneratedResult(GeneratedFileResult result, ITextProvider textProvider, LanguageCode language)
    {
        var status = result.Created
            ? textProvider.Get("created", language)
            : textProvider.Get("skipped", language);

        Console.WriteLine($"- {result.Path}: {status}");
    }

    private static void WriteJson(object value)
    {
        Console.WriteLine(JsonSerializer.Serialize(value, new JsonSerializerOptions
        {
            WriteIndented = true
        }));
    }

    private static object ToScanDto(
        string command,
        ScanResult scan,
        DateTimeOffset generatedAtUtc,
        bool ciMode,
        int exitCode,
        string? baselinePath = null,
        BaselineEvaluation? baseline = null)
    {
        var result = new Dictionary<string, object?>
        {
            ["schemaVersion"] = JsonSchemaVersion,
            ["toolVersion"] = Version,
            ["generatedAtUtc"] = generatedAtUtc,
            ["command"] = command,
            ["ciMode"] = ciMode,
            ["exitCode"] = exitCode,
            ["repositoryPath"] = scan.RepositoryPath,
            ["repositoryName"] = GetRepositoryName(scan.RepositoryPath),
            ["fileCount"] = scan.Files.Count,
            ["stacks"] = scan.Stacks.Select(stack => new
            {
                name = stack.Name,
                signal = stack.Signal
            }).ToArray(),
            ["health"] = new
            {
                hasReadme = scan.HasReadme,
                hasLicense = scan.HasLicense,
                hasSecurityPolicy = scan.HasSecurityPolicy,
                hasContributing = scan.HasContributing,
                hasCodeOfConduct = scan.HasCodeOfConduct,
                hasChangelog = scan.HasChangelog,
                hasTests = scan.HasTests,
                hasCi = scan.HasCi,
                hasDocker = scan.HasDocker,
                hasAgentInstructions = scan.HasAgentInstructions
            },
            ["riskSummary"] = ToRiskSummary(scan.Findings),
            ["findings"] = scan.Findings.Select(ToRiskFindingDto).ToArray(),
            ["suppressionSummary"] = new
            {
                total = scan.Suppressions.Count,
                safeDomains = scan.Suppressions.Count(suppression => suppression.Reason == RiskSuppressionReason.SafeDomain),
                ignoredPaths = scan.Suppressions.Count(suppression => suppression.Reason == RiskSuppressionReason.IgnoredPath),
                ignoredFindingIds = scan.Suppressions.Count(suppression => suppression.Reason == RiskSuppressionReason.IgnoredFindingId)
            },
            ["suppressions"] = scan.Suppressions.Select(suppression => new
            {
                ruleId = suppression.RuleId,
                severity = suppression.Severity.ToString(),
                category = suppression.Category.ToString(),
                path = suppression.Path,
                reason = ToSuppressionReason(suppression.Reason)
            }).ToArray()
        };

        AddBaselineDto(result, baselinePath, baseline);

        return result;
    }

    private static void AddBaselineDto(
        IDictionary<string, object?> result,
        string? baselinePath,
        BaselineEvaluation? baseline)
    {
        if (baseline is null)
        {
            return;
        }

        result["baseline"] = new
        {
            path = baselinePath,
            schemaVersion = BaselineSchema.CurrentVersion,
            fingerprintAlgorithm = BaselineSchema.FingerprintAlgorithm,
            entryCount = baseline.BaselineEntryCount,
            existing = baseline.Existing.Count,
            @new = baseline.New.Count,
            classifiedFindings = baseline.Findings.Select(finding => new
            {
                ruleId = RiskRuleCatalog.GetRuleId(finding.Finding),
                severity = finding.Finding.Severity.ToString(),
                path = finding.Finding.Path,
                fingerprint = finding.Fingerprint,
                status = finding.Status.ToString().ToLowerInvariant(),
                occurrence = finding.Occurrence
            }).ToArray()
        };
    }

    private static string ToSuppressionReason(RiskSuppressionReason reason)
    {
        return reason switch
        {
            RiskSuppressionReason.SafeDomain => "safeDomains",
            RiskSuppressionReason.IgnoredPath => "ignoredPaths",
            RiskSuppressionReason.IgnoredFindingId => "ignoredFindingIds",
            _ => "unknown"
        };
    }

    private static object ToRiskFindingDto(RiskFinding finding)
    {
        return new
        {
            ruleId = RiskRuleCatalog.GetRuleId(finding),
            severity = finding.Severity.ToString(),
            category = finding.Category.ToString(),
            path = finding.Path,
            message = finding.Message,
            match = (string?)null
        };
    }

    private static object ToDoctorCheckDto(DoctorCheck check)
    {
        return new
        {
            name = check.Name,
            severity = check.Severity.ToString(),
            passed = check.Passed,
            message = check.Message
        };
    }

    private static object ToConfigDiagnosticDto(ConfigDiagnostic diagnostic)
    {
        return new
        {
            code = diagnostic.Code,
            severity = diagnostic.Severity.ToString(),
            line = diagnostic.Line,
            key = diagnostic.Key,
            message = diagnostic.Message
        };
    }

    private static object ToGeneratedFileDto(GeneratedFileResult result)
    {
        return new
        {
            path = result.Path,
            status = result.Status.ToString(),
            created = result.Created,
            message = result.Message
        };
    }

    private static object ToRiskSummary(IReadOnlyList<RiskFinding> findings)
    {
        return new
        {
            total = findings.Count,
            critical = findings.Count(finding => finding.Severity == RiskSeverity.Critical),
            high = findings.Count(finding => finding.Severity == RiskSeverity.High),
            medium = findings.Count(finding => finding.Severity == RiskSeverity.Medium),
            low = findings.Count(finding => finding.Severity == RiskSeverity.Low),
            info = findings.Count(finding => finding.Severity == RiskSeverity.Info)
        };
    }

    private static object ToDoctorCheckSummary(IReadOnlyList<DoctorCheck> checks)
    {
        return new
        {
            total = checks.Count,
            passed = checks.Count(check => check.Passed),
            failed = checks.Count(check => !check.Passed),
            failedHighOrCritical = checks.Count(check => !check.Passed && check.Severity >= RiskSeverity.High)
        };
    }

    private static object ToGeneratedFileSummary(IReadOnlyList<GeneratedFileResult> results)
    {
        return new
        {
            total = results.Count,
            created = results.Count(result => result.Created),
            skipped = results.Count(result => !result.Created)
        };
    }

    private static string GetRepositoryName(string repositoryPath)
    {
        var trimmed = repositoryPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        return Path.GetFileName(trimmed);
    }

    private static string YesNo(bool value, LanguageCode language, ITextProvider textProvider)
    {
        return textProvider.Get(value ? "yes" : "no", language);
    }

    private static int GetScanExitCode(ScanResult scan, bool ci)
    {
        if (!ci)
        {
            return ExitSuccess;
        }

        if (scan.Findings.Any(finding => finding.Severity == RiskSeverity.Critical))
        {
            return ExitCritical;
        }

        if (scan.Findings.Any(finding => finding.Severity == RiskSeverity.High))
        {
            return ExitError;
        }

        return ExitSuccess;
    }

    private static int GetBaselineScanExitCode(BaselineEvaluation baseline, bool ci)
    {
        if (!ci)
        {
            return ExitSuccess;
        }

        if (baseline.New.Any(finding => finding.Finding.Severity == RiskSeverity.Critical))
        {
            return ExitCritical;
        }

        if (baseline.New.Any(finding => finding.Finding.Severity == RiskSeverity.High))
        {
            return ExitError;
        }

        return ExitSuccess;
    }

    private static int WriteBaselineError(string command, BaselineException exception, bool json, DateTimeOffset generatedAtUtc)
    {
        if (json)
        {
            WriteJson(new
            {
                schemaVersion = JsonSchemaVersion,
                toolVersion = Version,
                generatedAtUtc,
                command,
                exitCode = ExitError,
                error = new
                {
                    code = exception.Code,
                    message = exception.Message
                }
            });
            return ExitError;
        }

        Console.Error.WriteLine($"{exception.Code}: {exception.Message}");
        return ExitError;
    }

    private static (string? Path, BaselineEvaluation? Evaluation) LoadBaseline(
        string[] args,
        string repositoryPath,
        ScanResult scan,
        Services services)
    {
        var requestedPath = GetOption(args, "--baseline");
        if (string.IsNullOrWhiteSpace(requestedPath))
        {
            return (null, null);
        }

        var manifest = services.BaselineStore.Load(repositoryPath, requestedPath);
        var normalizedPath = BaselineFingerprint.NormalizeRelativePath(requestedPath);
        return (normalizedPath, services.BaselineClassifier.Classify(scan.Findings, manifest));
    }

    private static AgentTarget ParseTarget(string? value)
    {
        return value?.Trim().ToLowerInvariant() switch
        {
            "codex" => AgentTarget.Codex,
            "claude" => AgentTarget.Claude,
            "Anthropic" => AgentTarget.Anthropic,
            "cursor" => AgentTarget.Cursor,
            "copilot" => AgentTarget.Copilot,
            "continue" => AgentTarget.Continue,
            "all" or null or "" => AgentTarget.All,
            _ => AgentTarget.All
        };
    }

    private static string? GetOption(string[] args, string name)
    {
        for (var index = 0; index < args.Length; index++)
        {
            var current = args[index];
            if (current.StartsWith(name + "=", StringComparison.OrdinalIgnoreCase))
            {
                return current[(name.Length + 1)..];
            }

            if (string.Equals(current, name, StringComparison.OrdinalIgnoreCase) && index + 1 < args.Length)
            {
                return args[index + 1];
            }
        }

        return null;
    }

    private static bool HasFlag(string[] args, string name)
    {
        return args.Any(arg => string.Equals(arg, name, StringComparison.OrdinalIgnoreCase));
    }

    private static string GetTaskTitle(string[] args)
    {
        var parts = new List<string>();

        for (var index = 1; index < args.Length; index++)
        {
            var current = args[index];
            if (current.StartsWith("--", StringComparison.Ordinal))
            {
                if (OptionConsumesValue(current) && !current.Contains('=', StringComparison.Ordinal) && index + 1 < args.Length)
                {
                    index++;
                }

                continue;
            }

            parts.Add(current);
        }

        return string.Join(' ', parts).Trim();
    }

    private static bool OptionConsumesValue(string option)
    {
        return string.Equals(option, "--lang", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(option, "--target", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(option, "--profile", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(option, "--baseline", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(option, "--prompt-pack", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(option, "--output", StringComparison.OrdinalIgnoreCase);
    }

    private static Services CreateServices()
    {
        var fileSystem = new PhysicalFileSystem();
        var secretScanner = new SecretScanner();
        var brandPiiScanner = new BrandPiiScanner();
        var riskScanner = new RiskScanner(fileSystem, secretScanner, brandPiiScanner);
        var stackDetector = new StackDetector(fileSystem);
        var repositoryScanner = new RepositoryScanner(fileSystem, stackDetector, riskScanner);
        var templateRenderer = new TemplateRenderer();
        var textProvider = new TextProvider();
        var clock = new SystemClock();

        return new Services(
            fileSystem,
            new AckitConfigReader(fileSystem),
            new AckitConfigValidator(),
            new AckitConfigWriter(fileSystem),
            new BaselineStore(fileSystem),
            new BaselineClassifier(),
            repositoryScanner,
            new AgentInstructionGenerator(fileSystem, templateRenderer, clock),
            new HtmlReportGenerator(fileSystem, clock),
            new WebUiGenerator(fileSystem, clock),
            new PromptPackGenerator(fileSystem, clock),
            new ContextExportManifestGenerator(fileSystem, clock),
            new SarifReportWriter(fileSystem),
            new TaskFileGenerator(fileSystem, templateRenderer),
            new RepositoryDoctor(fileSystem),
            clock,
            textProvider);
    }

    private sealed record Services(
        IFileSystem FileSystem,
        IAckitConfigReader ConfigReader,
        IAckitConfigValidator ConfigValidator,
        IAckitConfigWriter ConfigWriter,
        IBaselineStore BaselineStore,
        IBaselineClassifier BaselineClassifier,
        IRepositoryScanner RepositoryScanner,
        IAgentInstructionGenerator AgentInstructionGenerator,
        IHtmlReportGenerator HtmlReportGenerator,
        IWebUiGenerator WebUiGenerator,
        IPromptPackGenerator PromptPackGenerator,
        IContextExportManifestGenerator ContextExportManifestGenerator,
        ISarifReportWriter SarifReportWriter,
        ITaskFileGenerator TaskFileGenerator,
        RepositoryDoctor Doctor,
        IClock Clock,
        ITextProvider TextProvider);
}
