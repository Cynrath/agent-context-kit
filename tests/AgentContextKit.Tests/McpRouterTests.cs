using AgentContextKit.Core;
using System.Text.Json.Nodes;

namespace AgentContextKit.Tests;

public sealed class McpRouterTests
{
    [Fact]
    public void InitializeReturnsServerInfoAndCapabilities()
    {
        var router = CreateRouter();

        var response = Invoke(router, "initialize");

        Assert.Null(response["error"]);
        Assert.Equal("2024-11-05", response["result"]?["protocolVersion"]?.GetValue<string>());
        Assert.Equal("ackit", response["result"]?["serverInfo"]?["name"]?.GetValue<string>());
        Assert.Equal("AgentContextKit", response["result"]?["serverInfo"]?["title"]?.GetValue<string>());
        Assert.NotNull(response["result"]?["capabilities"]?["tools"]);
    }

    [Fact]
    public void ListToolsReturnsDocumentedOrder()
    {
        var router = CreateRouter();

        var response = Invoke(router, "tools/list");
        var tools = response["result"]?["tools"]?.AsArray()
            .Select(node => node?["name"]?.GetValue<string>() ?? string.Empty)
            .ToArray() ?? [];

        Assert.Equal(
            ["ackit.scan", "ackit.findings", "ackit.context", "ackit.rules", "ackit.health"],
            tools);
    }

    [Fact]
    public void ScanToolReturnsNonEmptySummary()
    {
        using var repo = CreateHealthyRepository();
        var router = CreateRouter();

        var response = InvokeTool(router, "ackit.scan", new JsonObject
        {
            ["repoPath"] = repo.Path,
            ["format"] = "summary"
        });

        var text = response["result"]?["content"]?[0]?["text"]?.GetValue<string>();
        Assert.Null(response["error"]);
        Assert.False(string.IsNullOrWhiteSpace(text));
        Assert.Contains("Files:", text);
        Assert.True(response["result"]?["structuredContent"]?["fileCount"]?.GetValue<int>() > 0);
    }

    [Fact]
    public void FindingsToolFiltersByMinimumSeverity()
    {
        using var repo = CreateHealthyRepository();
        repo.Write("settings.txt", "pass" + "word=local-only-placeholder");
        repo.Write("notes.txt", TestData.WindowsWorkspacePath());
        var router = CreateRouter();

        var response = InvokeTool(router, "ackit.findings", new JsonObject
        {
            ["repoPath"] = repo.Path,
            ["minSeverity"] = "high"
        });

        var findings = response["result"]?["structuredContent"]?["findings"]?.AsArray()
            ?? throw new InvalidOperationException("findings array missing.");

        Assert.Null(response["error"]);
        Assert.NotEmpty(findings);
        Assert.All(findings, finding =>
        {
            var severity = finding?["severity"]?.GetValue<string>();
            Assert.True(severity is "High" or "Critical");
            Assert.True(finding?.AsObject().ContainsKey("match"));
            Assert.Null(finding?["match"]);
        });
        Assert.Contains(findings, finding => finding?["path"]?.GetValue<string>() == "settings.txt");
        Assert.DoesNotContain(findings, finding => finding?["path"]?.GetValue<string>() == "notes.txt");
    }

    [Fact]
    public void ContextToolReturnsWriteFreePromptFragment()
    {
        using var repo = CreateHealthyRepository();
        var handoffPath = System.IO.Path.Combine(repo.Path, ".codex", "HANDOFF.md");
        var router = CreateRouter();

        var response = InvokeTool(router, "ackit.context", new JsonObject
        {
            ["repoPath"] = repo.Path,
            ["target"] = "codex"
        });

        var text = response["result"]?["content"]?[0]?["text"]?.GetValue<string>();
        Assert.Null(response["error"]);
        Assert.False(string.IsNullOrWhiteSpace(text));
        Assert.Contains("Target: codex", text);
        Assert.Equal("codex", response["result"]?["structuredContent"]?["target"]?.GetValue<string>());
        Assert.False(File.Exists(handoffPath));
    }

    [Fact]
    public void HealthToolReturnsStructuredDoctorSnapshot()
    {
        using var repo = CreateHealthyRepository();
        var router = CreateRouter();

        var response = InvokeTool(router, "ackit.health", new JsonObject
        {
            ["repoPath"] = repo.Path
        });

        var summary = response["result"]?["structuredContent"]?["checkSummary"];
        Assert.Null(response["error"]);
        Assert.True(summary?["total"]?.GetValue<int>() > 0);
        Assert.True(summary?["passed"]?.GetValue<int>() > 0);
        Assert.NotEmpty(response["result"]?["structuredContent"]?["checks"]?.AsArray() ?? []);
    }

    [Fact]
    public void RulesToolReturnsCatalogInAscendingIdOrder()
    {
        var router = CreateRouter();
        var response = InvokeTool(router, "ackit.rules", new JsonObject());

        var rules = response["result"]?["structuredContent"]?["rules"]?.AsArray()
            ?? throw new InvalidOperationException("rules array missing.");
        var ids = rules.Select(node => node?["id"]?.GetValue<string>() ?? string.Empty).ToArray();

        Assert.Null(response["error"]);
        Assert.NotEmpty(rules);
        Assert.Equal(ids.OrderBy(id => id, StringComparer.Ordinal).ToArray(), ids);
    }

    [Fact]
    public void RulesToolReturnsStableRuleShape()
    {
        var router = CreateRouter();
        var response = InvokeTool(router, "ackit.rules", new JsonObject());
        var rules = response["result"]?["structuredContent"]?["rules"]?.AsArray()
            ?? throw new InvalidOperationException("rules array missing.");

        Assert.All(rules, rule =>
        {
            Assert.NotNull(rule?["id"]?.GetValue<string>());
            Assert.NotNull(rule?["name"]?.GetValue<string>());
            Assert.NotNull(rule?["category"]?.GetValue<string>());
            Assert.NotNull(rule?["defaultSeverity"]?.GetValue<string>());
            Assert.NotNull(rule?["description"]?.GetValue<string>());
            Assert.NotNull(rule?["recommendation"]?.GetValue<string>());
        });
    }

    [Fact]
    public void RulesToolReturnsServerVersionInPayload()
    {
        var router = CreateRouter();
        var response = InvokeTool(router, "ackit.rules", new JsonObject());

        Assert.Equal("0.2.0-alpha.2-test", response["result"]?["structuredContent"]?["version"]?.GetValue<string>());
        Assert.Equal(response["result"]?["structuredContent"]?["count"]?.GetValue<int>(),
            response["result"]?["structuredContent"]?["rules"]?.AsArray()?.Count);
    }

    [Fact]
    public void RulesToolIsDeterministic()
    {
        var router = CreateRouter();
        var first = InvokeTool(router, "ackit.rules", new JsonObject());
        var second = InvokeTool(router, "ackit.rules", new JsonObject());

        var firstJson = first.ToJsonString();
        var secondJson = second.ToJsonString();
        Assert.Equal(firstJson, secondJson);
    }

    [Fact]
    public void RulesToolIgnoresArguments()
    {
        var router = CreateRouter();
        var response = InvokeTool(router, "ackit.rules", new JsonObject
        {
            ["repoPath"] = "https://example.com"
        });

        Assert.Null(response["error"]);
        Assert.NotNull(response["result"]);
    }

    [Fact]
    public void UnknownToolReturnsInvalidParamsError()
    {
        using var repo = CreateHealthyRepository();
        var router = CreateRouter();

        var response = InvokeTool(router, "ackit.unknown", new JsonObject
        {
            ["repoPath"] = repo.Path
        });

        Assert.Equal(-32602, response["error"]?["code"]?.GetValue<int>());
        Assert.Contains("Unknown tool", response["error"]?["message"]?.GetValue<string>());
    }

    private static McpRouter CreateRouter()
    {
        var fileSystem = new PhysicalFileSystem();
        var secretScanner = new SecretScanner();
        var brandPiiScanner = new BrandPiiScanner();
        var riskScanner = new RiskScanner(fileSystem, secretScanner, brandPiiScanner);
        var repositoryScanner = new RepositoryScanner(fileSystem, new StackDetector(fileSystem), riskScanner);
        var doctor = new RepositoryDoctor(fileSystem);
        return new McpRouter(
            fileSystem,
            new AckitConfigReader(fileSystem),
            repositoryScanner,
            new RepositoryDoctorHealthProbe(doctor),
            "0.2.0-alpha.2-test");
    }

    private static JsonObject Invoke(McpRouter router, string method, JsonObject? parameters = null)
    {
        var request = new JsonObject
        {
            ["jsonrpc"] = "2.0",
            ["id"] = "test-1",
            ["method"] = method
        };

        if (parameters is not null)
        {
            request["params"] = parameters;
        }

        return JsonNode.Parse(router.HandleJson(request.ToJsonString()))?.AsObject()
            ?? throw new InvalidOperationException("MCP response was not a JSON object.");
    }

    private static JsonObject InvokeTool(McpRouter router, string name, JsonObject arguments)
    {
        return Invoke(router, "tools/call", new JsonObject
        {
            ["name"] = name,
            ["arguments"] = arguments
        });
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
        repo.Write("src/AgentContextKit.Cli/AgentContextKit.Cli.csproj", """
        <Project Sdk="Microsoft.NET.Sdk">
          <PropertyGroup>
            <PackAsTool>true</PackAsTool>
            <ToolCommandName>ackit</ToolCommandName>
          </PropertyGroup>
        </Project>
        """);
        return repo;
    }
}
