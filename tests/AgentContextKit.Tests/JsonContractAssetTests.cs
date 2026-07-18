using System.Text.Json.Nodes;

namespace AgentContextKit.Tests;

public sealed class JsonContractAssetTests
{
    private static readonly string[] ExpectedCommands =
    [
        "init",
        "config-check",
        "scan",
        "optimize",
        "baseline",
        "sarif",
        "report",
        "webui",
        "prompt-pack",
        "context-export",
        "generate",
        "task",
        "redact-check",
        "doctor"
    ];

    [Fact]
    public void CommandSchemaGoldenCatalogAndLiveOutputsStayAligned()
    {
        var root = LocateRepositoryRoot();
        var schema = LoadObject(root, "docs/schemas/ackit-command-output-v2.schema.json");
        var golden = LoadObject(root, "tests/fixtures/contracts/command-output-v2-golden.json");
        var commonRequired = ReadStrings(schema["required"]);
        var commandRequirements = ReadCommandRequirements(schema);
        var schemaCommands = ReadStrings(schema["properties"]?["command"]?["enum"]);

        Assert.Equal(2, schema["properties"]?["schemaVersion"]?["const"]?.GetValue<int>());
        Assert.Equal(ExpectedCommands.Order(), schemaCommands.Order());
        Assert.Equal(ExpectedCommands.Order(), commandRequirements.Keys.Order());

        var goldenExamples = golden["examples"]?.AsArray()
            .Select(node => node?.AsObject() ?? throw new InvalidOperationException("Golden command example must be an object."))
            .ToArray() ?? [];
        Assert.Equal(ExpectedCommands.Order(), goldenExamples.Select(GetCommand).Order());

        foreach (var example in goldenExamples)
        {
            AssertRequiredFields(example, commonRequired, commandRequirements[GetCommand(example)]);
            AssertEnvelope(example);
        }

        using var repo = CreateHealthyRepository();
        var liveOutputs = RunLiveJsonCommands(repo.Path);
        Assert.Equal(ExpectedCommands.Order(), liveOutputs.Keys.Order());

        foreach (var (command, output) in liveOutputs)
        {
            AssertRequiredFields(output, commonRequired, commandRequirements[command]);
            AssertEnvelope(output);
        }
    }

    [Fact]
    public void BaselineSchemaAndGoldenFixtureKeepVersionedFingerprintContract()
    {
        var root = LocateRepositoryRoot();
        var schema = LoadObject(root, "docs/schemas/ackit-baseline-v1.schema.json");
        var golden = LoadObject(root, "tests/fixtures/contracts/baseline-v1-golden.json");

        Assert.Equal(1, schema["properties"]?["schemaVersion"]?["const"]?.GetValue<int>());
        Assert.Equal(
            "sha256-rule-path-location-occurrence-v1",
            schema["properties"]?["fingerprintAlgorithm"]?["const"]?.GetValue<string>());
        AssertRequiredFields(golden, ReadStrings(schema["required"]), []);
        Assert.Equal(1, golden["schemaVersion"]?.GetValue<int>());
        Assert.Equal("sha256-rule-path-location-occurrence-v1", golden["fingerprintAlgorithm"]?.GetValue<string>());

        var entry = Assert.Single(golden["entries"]?.AsArray() ?? []);
        var entrySchema = schema["properties"]?["entries"]?["items"]?.AsObject();
        Assert.NotNull(entrySchema);
        AssertRequiredFields(entry?.AsObject(), ReadStrings(entrySchema["required"]), []);
        Assert.Matches("^[a-f0-9]{64}$", entry?["fingerprint"]?.GetValue<string>() ?? "");
    }

    [Fact]
    public void SarifProfileAndGoldenFixtureKeepToolAndPrivacyProfile()
    {
        var root = LocateRepositoryRoot();
        var schema = LoadObject(root, "docs/schemas/ackit-sarif-profile-v1.schema.json");
        var golden = LoadObject(root, "tests/fixtures/contracts/sarif-profile-v1-golden.json");

        AssertRequiredFields(golden, ReadStrings(schema["required"]), []);
        Assert.Equal("2.1.0", golden["version"]?.GetValue<string>());
        Assert.Equal("AgentContextKit", golden["runs"]?[0]?["tool"]?["driver"]?["name"]?.GetValue<string>());

        var result = Assert.Single(golden["runs"]?[0]?["results"]?.AsArray() ?? []);
        var uri = result?["locations"]?[0]?["physicalLocation"]?["artifactLocation"]?["uri"]?.GetValue<string>();
        Assert.NotNull(uri);
        Assert.DoesNotContain(':', uri);
        Assert.DoesNotContain('\\', uri);
        Assert.Null(result?["match"]);
    }

    [Fact]
    public void OptimizeSarifProfileAndGoldenFixtureKeepInstructionReviewContract()
    {
        var root = LocateRepositoryRoot();
        var schema = LoadObject(root, "docs/schemas/ackit-optimize-sarif-profile-v1.schema.json");
        var golden = LoadObject(root, "tests/fixtures/contracts/optimize-sarif-profile-v1-golden.json");

        AssertRequiredFields(golden, ReadStrings(schema["required"]), []);
        Assert.Equal("2.1.0", golden["version"]?.GetValue<string>());
        Assert.Equal("AgentContextKit Optimize", golden["runs"]?[0]?["tool"]?["driver"]?["name"]?.GetValue<string>());
        var rule = Assert.Single(golden["runs"]?[0]?["tool"]?["driver"]?["rules"]?.AsArray() ?? []);
        Assert.Matches("^ACKITOPT[0-9]{3}$", rule?["id"]?.GetValue<string>() ?? "");

        var result = Assert.Single(golden["runs"]?[0]?["results"]?.AsArray() ?? []);
        Assert.Matches("^ACKITOPT[0-9]{3}$", result?["ruleId"]?.GetValue<string>() ?? "");
        Assert.Matches("^[a-f0-9]{64}$", result?["fingerprints"]?["ackitOptimize/v1"]?.GetValue<string>() ?? "");
        Assert.True(result?["locations"]?[0]?["physicalLocation"]?["region"]?["startLine"]?.GetValue<int>() >= 1);
        var uri = result?["locations"]?[0]?["physicalLocation"]?["artifactLocation"]?["uri"]?.GetValue<string>() ?? "";
        Assert.DoesNotContain(':', uri);
        Assert.DoesNotContain('\\', uri);
        Assert.NotNull(result?["properties"]?["deterministic"]);
        Assert.NotNull(result?["properties"]?["heuristic"]);
        Assert.Null(result?["match"]);
    }

    [Fact]
    public void ContractAssetsDoNotContainPrivateLiteralPatterns()
    {
        var root = LocateRepositoryRoot();
        var paths = new[]
        {
            "docs/schemas/ackit-command-output-v2.schema.json",
            "docs/schemas/ackit-baseline-v1.schema.json",
            "docs/schemas/ackit-sarif-profile-v1.schema.json",
            "docs/schemas/ackit-optimize-sarif-profile-v1.schema.json",
            "tests/fixtures/contracts/command-output-v2-golden.json",
            "tests/fixtures/contracts/baseline-v1-golden.json",
            "tests/fixtures/contracts/sarif-profile-v1-golden.json",
            "tests/fixtures/contracts/optimize-sarif-profile-v1-golden.json"
        };

        foreach (var path in paths)
        {
            var content = File.ReadAllText(Path.Combine(root, path.Replace('/', Path.DirectorySeparatorChar)));
            Assert.DoesNotContain("sk" + "-proj-", content, StringComparison.Ordinal);
            Assert.DoesNotContain("github" + "_pat_", content, StringComparison.Ordinal);
            Assert.DoesNotContain("OPENAI_API_KEY" + "=", content, StringComparison.Ordinal);
            Assert.DoesNotContain("O:" + "\\", content, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("C:" + "\\", content, StringComparison.OrdinalIgnoreCase);
        }
    }

    private static Dictionary<string, JsonObject> RunLiveJsonCommands(string repositoryPath)
    {
        var commands = new (string Command, string[] Args)[]
        {
            ("init", ["init", "--json"]),
            ("config-check", ["config-check", "--json"]),
            ("scan", ["scan", "--json"]),
            ("optimize", ["optimize", "--json"]),
            ("baseline", ["baseline", "--output", ".ackit-baseline.json", "--json"]),
            ("sarif", ["sarif", "--output", ".ackit/reports/contract.sarif", "--json"]),
            ("report", ["report", "--output", ".ackit/reports/contract.html", "--json"]),
            ("webui", ["webui", "--output", ".ackit/webui/contract.html", "--json"]),
            ("prompt-pack", ["prompt-pack", "--output", ".ackit/prompt-packs/contract.md", "--json"]),
            ("context-export", ["context-export", "--prompt-pack", ".ackit/prompt-packs/contract.md", "--approve", "--output", ".ackit/context-exports/contract.json", "--json"]),
            ("generate", ["generate", "--target", "codex", "--json"]),
            ("task", ["task", "Contract fixture task", "--json"]),
            ("redact-check", ["redact-check", "--profile", "public-release", "--json"]),
            ("doctor", ["doctor", "--json"])
        };

        var outputs = new Dictionary<string, JsonObject>(StringComparer.Ordinal);
        foreach (var (command, args) in commands)
        {
            var result = RunCli(repositoryPath, args);
            Assert.Equal(0, result.ExitCode);
            Assert.True(string.IsNullOrWhiteSpace(result.Error), result.Error);
            outputs.Add(command, JsonNode.Parse(result.Output)?.AsObject()
                ?? throw new InvalidOperationException($"{command} JSON output was not an object."));
        }

        return outputs;
    }

    private static TempRepository CreateHealthyRepository()
    {
        var repo = TempRepository.Create();
        repo.Write("README.md", "# Demo");
        repo.Write("LICENSE", "MIT");
        repo.Write("SECURITY.md", "# Security");
        repo.Write("CONTRIBUTING.md", "# Contributing");
        repo.Write("CODE_OF_CONDUCT.md", "# Code of Conduct");
        repo.Write("CHANGELOG.md", "# Changelog");
        repo.Write(".gitignore", "bin/");
        repo.Write("AGENTS.md", "# Agents");
        repo.Write("tests/DemoTests.cs", "// tests");
        return repo;
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

    private static Dictionary<string, string[]> ReadCommandRequirements(JsonObject schema)
    {
        var result = new Dictionary<string, string[]>(StringComparer.Ordinal);
        foreach (var node in schema["allOf"]?.AsArray() ?? [])
        {
            var command = node?["if"]?["properties"]?["command"]?["const"]?.GetValue<string>()
                ?? throw new InvalidOperationException("Command condition is missing const.");
            result.Add(command, ReadStrings(node?["then"]?["required"]));
        }

        return result;
    }

    private static string[] ReadStrings(JsonNode? node)
    {
        return node?.AsArray()
            .Select(item => item?.GetValue<string>() ?? throw new InvalidOperationException("Expected string array item."))
            .ToArray() ?? [];
    }

    private static void AssertRequiredFields(JsonObject? instance, IEnumerable<string> common, IEnumerable<string> specific)
    {
        Assert.NotNull(instance);
        foreach (var field in common.Concat(specific).Distinct(StringComparer.Ordinal))
        {
            Assert.True(instance.ContainsKey(field), $"Required field '{field}' is missing.");
        }
    }

    private static void AssertEnvelope(JsonObject instance)
    {
        Assert.Equal(2, instance["schemaVersion"]?.GetValue<int>());
        Assert.False(string.IsNullOrWhiteSpace(instance["toolVersion"]?.GetValue<string>()));
        Assert.True(DateTimeOffset.TryParse(instance["generatedAtUtc"]?.GetValue<string>(), out _));
        Assert.Contains(GetCommand(instance), ExpectedCommands);
    }

    private static string GetCommand(JsonObject instance)
    {
        return instance["command"]?.GetValue<string>()
            ?? throw new InvalidOperationException("Command field is missing.");
    }

    private static JsonObject LoadObject(string root, string relativePath)
    {
        var path = Path.Combine(root, relativePath.Replace('/', Path.DirectorySeparatorChar));
        return JsonNode.Parse(File.ReadAllText(path))?.AsObject()
            ?? throw new InvalidOperationException($"JSON object could not be parsed: {relativePath}");
    }

    private static string LocateRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "AgentContextKit.sln")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new InvalidOperationException("Repository root could not be located.");
    }
}
