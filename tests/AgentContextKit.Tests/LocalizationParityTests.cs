using System.Text.Json.Nodes;

namespace AgentContextKit.Tests;

public sealed class LocalizationParityTests
{
    private static readonly CommandCase[] JsonCommandCases =
    [
        new("init", ["init"]),
        new("config-check", ["config-check"]),
        new("scan", ["scan"]),
        new("optimize", ["optimize"]),
        new("baseline", ["baseline"]),
        new("sarif", ["sarif", "--output", ".ackit/reports/parity.sarif"]),
        new("report", ["report", "--output", ".ackit/reports/parity.html"]),
        new("webui", ["webui", "--output", ".ackit/webui/parity.html"]),
        new("prompt-pack", ["prompt-pack", "--output", ".ackit/prompt-packs/parity.md"]),
        new("context-export", ["context-export", "--prompt-pack", ".ackit/prompt-packs/input.md", "--approve", "--output", ".ackit/context-exports/parity.json"]),
        new("generate", ["generate", "--target", "codex"]),
        new("task", ["task", "Localization parity task"]),
        new("redact-check", ["redact-check"]),
        new("doctor", ["doctor"]),
        new("trim", ["trim", "--lang", "en", "--json"]),
        new("watch", ["watch", "--once", "--lang", "en", "--json"]),
    ];

    private static readonly HumanCommandCase[] HumanCommandCases =
    [
        new("init", ["init"], "Detected agent instruction files:", "Algılanan agent yönerge dosyaları:"),
        new("config-check", ["config-check"], "Configuration check", "Yapılandırma kontrolü"),
        new("scan", ["scan"], "Repository health:", "Repository sağlığı:"),
        new("optimize", ["optimize"], "ACKit Optimize instruction audit", "ACKit Optimize yönerge denetimi"),
        new("baseline", ["baseline"], "Baseline created", "Baseline oluşturuldu"),
        new("sarif", ["sarif", "--output", ".ackit/reports/parity.sarif"], "SARIF findings", "SARIF bulguları"),
        new("report", ["report", "--output", ".ackit/reports/parity.html"], "Risk findings", "Risk bulguları"),
        new("webui", ["webui", "--output", ".ackit/webui/parity.html"], "Risk findings", "Risk bulguları"),
        new("prompt-pack", ["prompt-pack", "--output", ".ackit/prompt-packs/parity.md"], "No remote LLM provider call was made.", "Uzak LLM provider çağrısı yapılmadı."),
        new("context-export", ["context-export", "--prompt-pack", ".ackit/prompt-packs/input.md", "--approve", "--output", ".ackit/context-exports/parity.json"], "Approval recorded locally only.", "Onay yalnızca local olarak kaydedildi."),
        new("generate", ["generate", "--target", "codex"], "created", "oluşturuldu"),
        new("task", ["task", "Localization parity task"], "created", "oluşturuldu"),
        new("redact-check", ["redact-check"], "No risk findings.", "Risk bulgusu yok."),
        new("doctor", ["doctor"], "Doctor checks", "Sağlık kontrolleri"),
        new("trim-success", ["trim", "--input", "README.md", "--output", ".ackit/cache/trim-out.md", "--max-chars", "10000", "--lang", "en"], "original", "original"),
        new("watch", ["watch", "--once"], "watching", "izleniyor"),
    ];

    [Fact]
    public void HelpLocalizesHeadingAndKeepsCommandSignaturesStable()
    {
        using var repository = CreatePreparedRepository();

        var english = RunCli(repository.Path, ["--help", "--lang", "en"]);
        var turkish = RunCli(repository.Path, ["--help", "--lang", "tr"]);

        Assert.Equal(0, english.ExitCode);
        Assert.Equal(english.ExitCode, turkish.ExitCode);
        Assert.Contains("Usage:", english.Output);
        Assert.Contains("Kullanım:", turkish.Output);

        foreach (var command in JsonCommandCases.Select(item => item.Command).Append("version"))
        {
            Assert.Contains($"ackit {command}", english.Output);
            Assert.Contains($"ackit {command}", turkish.Output);
        }
    }

    [Fact]
    public void HumanCommandMatrixPreservesExitParityAndUsesLocalizedMarkers()
    {
        foreach (var commandCase in HumanCommandCases)
        {
            using var englishRepository = CreatePreparedRepository();
            using var turkishRepository = CreatePreparedRepository();

            var english = RunCli(englishRepository.Path, [.. commandCase.Arguments, "--lang", "en"]);
            var turkish = RunCli(turkishRepository.Path, [.. commandCase.Arguments, "--lang", "tr"]);

            if (commandCase.Command.StartsWith("watch", StringComparison.OrdinalIgnoreCase))
            {
                Console.Error.WriteLine("DEBUG watch english: " + english.Output.Substring(0, Math.Min(200, english.Output.Length)));
                Console.Error.WriteLine("DEBUG watch turkish: " + turkish.Output.Substring(0, Math.Min(200, turkish.Output.Length)));
            }

            Assert.Equal(english.ExitCode, turkish.ExitCode);
            Assert.Contains(commandCase.EnglishMarker, english.Output, StringComparison.Ordinal);
            Assert.Contains(commandCase.TurkishMarker, turkish.Output, StringComparison.Ordinal);
        }
    }

    [Fact]
    public void KnownArgumentErrorsAreLocalizedAndKeepExitParity()
    {
        var cases = new[]
        {
            new ErrorCase(["sarif"], "requires --output", "gerektirir"),
            new ErrorCase(["optimize", "--format", "markdown"], "require --output", "--output"),
            new ErrorCase(["context-export"], "requires explicit --approve", "açık bir --approve onayı gerektirir"),
            new ErrorCase(["context-export", "--approve"], "requires --prompt-pack", "--prompt-pack <repo-relative.md> gerektirir"),
            new ErrorCase(["task"], "requires a title", "bir başlık gerektirir"),
            new ErrorCase(["unknown-command"], "Unknown command", "Bilinmeyen komut"),
            new ErrorCase(["trim"], "requires --input", "--input"),
            new ErrorCase(["trim", "--input", "a.md", "--output", "b.md", "--max-chars", "abc"], "positive integer", "pozitif"),
            new ErrorCase(["trim", "--input", "a.md", "--output", "a.md", "--max-chars", "10"], "must differ", "farkli"),
            new ErrorCase(["mcp"], "ackit mcp requires", "gerektirir")
        };

        foreach (var errorCase in cases)
        {
            using var englishRepository = CreatePreparedRepository();
            using var turkishRepository = CreatePreparedRepository();

            var english = RunCli(englishRepository.Path, [.. errorCase.Arguments, "--lang", "en"]);
            var turkish = RunCli(turkishRepository.Path, [.. errorCase.Arguments, "--lang", "tr"]);

            Assert.Equal(1, english.ExitCode);
            Assert.Equal(english.ExitCode, turkish.ExitCode);
            Assert.Contains(errorCase.EnglishMarker, english.Error, StringComparison.Ordinal);
            Assert.Contains(errorCase.TurkishMarker, turkish.Error, StringComparison.Ordinal);
        }
    }

    [Fact]
    public void JsonCommandMatrixIsLanguageInvariant()
    {
        foreach (var commandCase in JsonCommandCases)
        {
            using var englishRepository = CreatePreparedRepository();
            using var turkishRepository = CreatePreparedRepository();

            var english = RunCli(englishRepository.Path, [.. commandCase.Arguments, "--lang", "en", "--json"]);
            var turkish = RunCli(turkishRepository.Path, [.. commandCase.Arguments, "--lang", "tr", "--json"]);
            var englishJson = ParseAndNormalize(english.Output);
            var turkishJson = ParseAndNormalize(turkish.Output);

            Assert.Equal(english.ExitCode, turkish.ExitCode);
            Assert.Equal(commandCase.Command, englishJson["command"]?.GetValue<string>());
            Assert.Equal(2, englishJson["schemaVersion"]?.GetValue<int>());
            Assert.True(
                JsonNode.DeepEquals(englishJson, turkishJson),
                $"JSON output changed with language for command '{commandCase.Command}'.");
        }
    }

    [Fact]
    public void BaselineAndSuppressionLabelsAreLocalizedWithoutChangingTechnicalTokens()
    {
        using var repository = CreatePreparedRepository();
        repository.Write(".ackit/config.yml", """
            schemaVersion: 1
            defaultLanguage: tr
            ignoredFindingIds:
              - ACKIT003
            """);
        repository.Write("artifacts/tool.nupkg", "fixture content");

        var suppression = RunCli(repository.Path, ["scan", "--lang", "tr"]);
        Assert.Equal(0, suppression.ExitCode);
        Assert.Contains("Bastırılan bulgular: 1", suppression.Output);
        Assert.Contains("ACKIT003", suppression.Output);
        Assert.Contains("ignoredFindingIds", suppression.Output);

        repository.Write("settings.txt", "token" + "=" + TestData.OpenAiProjectKey());
        Assert.Equal(0, RunCli(repository.Path, ["baseline", "--lang", "tr"]).ExitCode);
        var baselineScan = RunCli(repository.Path, ["scan", "--baseline", ".ackit-baseline.json", "--lang", "tr"]);

        Assert.Equal(0, baselineScan.ExitCode);
        Assert.Contains("Baseline sınıflandırması:", baselineScan.Output);
        Assert.Contains("Mevcut bulgular:", baselineScan.Output);
        Assert.Contains("Yeni bulgular: 0", baselineScan.Output);
        Assert.Contains("ACKIT", baselineScan.Output);
    }

    private static TempRepository CreatePreparedRepository()
    {
        var repository = TempRepository.Create();
        repository.Write("README.md", "# Localization parity fixture");
        repository.Write("LICENSE", "MIT");
        repository.Write("SECURITY.md", "# Security");
        repository.Write("CONTRIBUTING.md", "# Contributing");
        repository.Write("CODE_OF_CONDUCT.md", "# Code of Conduct");
        repository.Write("CHANGELOG.md", "# Changelog");
        repository.Write(".gitignore", "bin/\nobj/\n.ackit/");
        repository.Write("tests/DemoTests.cs", "// tests");
        repository.Write(".github/workflows/ci.yml", "name: ci");
        repository.Write(".ackit/prompt-packs/input.md", "# Sanitized prompt pack");
        return repository;
    }

    private static JsonObject ParseAndNormalize(string output)
    {
        var json = JsonNode.Parse(output)?.AsObject()
            ?? throw new InvalidOperationException("CLI output was not a JSON object.");
        RemoveVolatileFields(json);
        return json;
    }

    private static void RemoveVolatileFields(JsonNode? node)
    {
        if (node is JsonObject value)
        {
            value.Remove("generatedAtUtc");
            value.Remove("repositoryPath");
            value.Remove("repositoryName");
            foreach (var child in value.ToArray())
            {
                RemoveVolatileFields(child.Value);
            }
        }
        else if (node is JsonArray array)
        {
            foreach (var child in array)
            {
                RemoveVolatileFields(child);
            }
        }
    }

    private static (int ExitCode, string Output, string Error) RunCli(string workingDirectory, string[] args)
    {
        var originalDirectory = Directory.GetCurrentDirectory();
        var originalOut = Console.Out;
        var originalError = Console.Error;

        using var output = new StringWriter();
        using var error = new StringWriter();

        try
        {
            Directory.SetCurrentDirectory(workingDirectory);
            Console.SetOut(output);
            Console.SetError(error);
            var exitCode = AgentContextKit.Cli.Program.Main(args);
            return (exitCode, output.ToString(), error.ToString());
        }
        finally
        {
            Console.SetOut(originalOut);
            Console.SetError(originalError);
            Directory.SetCurrentDirectory(originalDirectory);
        }
    }

    private sealed record CommandCase(string Command, string[] Arguments);

    private sealed record HumanCommandCase(
        string Command,
        string[] Arguments,
        string EnglishMarker,
        string TurkishMarker);

    private sealed record ErrorCase(string[] Arguments, string EnglishMarker, string TurkishMarker);
}
