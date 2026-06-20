using System.Text.Json.Nodes;
using AgentContextKit.Core;

namespace AgentContextKit.Tests;

public sealed class McpStdioTransportTests
{
    [Fact]
    public async Task InitializeReturnsServerInfoAndCapabilities()
    {
        var (transport, output) = MakeTransport(
            "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"initialize\",\"params\":{}}");

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());

        Assert.Equal("2024-11-05", response["result"]?["protocolVersion"]?.GetValue<string>());
        Assert.Equal("ackit", response["result"]?["serverInfo"]?["name"]?.GetValue<string>());
        Assert.Equal("AgentContextKit", response["result"]?["serverInfo"]?["title"]?.GetValue<string>());
        Assert.NotNull(response["result"]?["capabilities"]?["tools"]);
    }

    [Fact]
    public async Task ListToolsReturnsDocumentedOrder()
    {
        var (transport, output) = MakeTransport(
            "{\"jsonrpc\":\"2.0\",\"id\":\"2\",\"method\":\"tools/list\",\"params\":{}}");

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());
        var tools = response["result"]?["tools"]?.AsArray()
            .Select(node => node?["name"]?.GetValue<string>() ?? string.Empty)
            .ToArray() ?? [];

        Assert.Equal(
            ["ackit.scan", "ackit.findings", "ackit.context", "ackit.rules", "ackit.health"],
            tools);
    }

    [Fact]
    public async Task HealthToolReturnsStructuredDoctorSnapshot()
    {
        using var repo = CreateHealthyRepository();
        var (transport, output) = MakeToolCall("ackit.health", repo.Path);

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());
        var summary = response["result"]?["structuredContent"]?["checkSummary"];

        Assert.Null(response["error"]);
        Assert.NotNull(summary);
        Assert.True(summary?["total"]?.GetValue<int>() > 0);
        Assert.True(summary?["passed"]?.GetValue<int>() > 0);
        Assert.NotEmpty(response["result"]?["structuredContent"]?["checks"]?.AsArray() ?? []);
    }

    [Fact]
    public async Task ScanToolReturnsNonEmptySummary()
    {
        using var repo = CreateHealthyRepository();
        var (transport, output) = MakeToolCall("ackit.scan", repo.Path, extraArgs: ",\"format\":\"summary\"");

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());
        var text = response["result"]?["content"]?[0]?["text"]?.GetValue<string>();

        Assert.Null(response["error"]);
        Assert.False(string.IsNullOrWhiteSpace(text));
        Assert.Contains("Files:", text);
        Assert.True(response["result"]?["structuredContent"]?["fileCount"]?.GetValue<int>() > 0);
    }

    [Fact]
    public async Task FindingsToolFiltersByMinimumSeverity()
    {
        using var repo = CreateHealthyRepository();
        repo.Write("settings.txt", "pass" + "word=local-only-placeholder");
        var (transport, output) = MakeToolCall("ackit.findings", repo.Path, extraArgs: ",\"minSeverity\":\"high\"");

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());
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
    }

    [Fact]
    public async Task ContextToolReturnsWriteFreePreview()
    {
        using var repo = CreateHealthyRepository();
        var handoffPath = System.IO.Path.Combine(repo.Path, ".codex", "HANDOFF.md");
        var (transport, output) = MakeToolCall("ackit.context", repo.Path, extraArgs: ",\"target\":\"codex\"");

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());
        var text = response["result"]?["content"]?[0]?["text"]?.GetValue<string>();

        Assert.Null(response["error"]);
        Assert.False(string.IsNullOrWhiteSpace(text));
        Assert.Contains("Target: codex", text);
        Assert.Equal("codex", response["result"]?["structuredContent"]?["target"]?.GetValue<string>());
        Assert.False(File.Exists(handoffPath));
    }

    [Fact]
    public async Task UnknownToolReturnsInvalidParams()
    {
        using var repo = CreateHealthyRepository();
        var (transport, output) = MakeToolCall("ackit.unknown", repo.Path);

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());

        Assert.Equal(-32602, response["error"]?["code"]?.GetValue<int>());
    }

    [Fact]
    public async Task InvalidRepoPathReturnsErrorAndLoopContinues()
    {
        using var repo = CreateHealthyRepository();
        var input =
            "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"tools/call\",\"params\":{\"name\":\"ackit.health\",\"arguments\":{\"repoPath\":\"https://example.com\"}}}\n" +
            "{\"jsonrpc\":\"2.0\",\"id\":\"2\",\"method\":\"tools/call\",\"params\":{\"name\":\"ackit.health\",\"arguments\":{\"repoPath\":\"" + EscapeJson(repo.Path) + "\"}}}\n";
        var (transport, output) = MakeTransport(input);

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);
        var lines = output.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(0, exit);
        Assert.Equal(2, lines.Length);
        var first = JsonNode.Parse(lines[0])!.AsObject();
        var second = JsonNode.Parse(lines[1])!.AsObject();
        Assert.Equal(-32602, first["error"]?["code"]?.GetValue<int>());
        Assert.DoesNotContain("https://example.com", first["error"]?["message"]?.GetValue<string>() ?? string.Empty);
        Assert.Null(second["error"]);
    }

    [Fact]
    public async Task InvalidRepoPathAsFileUriReturnsError()
    {
        using var repo = CreateHealthyRepository();
        var (transport, output) = MakeToolCall("ackit.health", "file:///etc/passwd");

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());

        Assert.Equal(-32602, response["error"]?["code"]?.GetValue<int>());
    }

    [Fact]
    public async Task UnknownMethodReturnsMethodNotFound()
    {
        var (transport, output) = MakeTransport(
            "{\"jsonrpc\":\"2.0\",\"id\":\"8\",\"method\":\"tools/foo\",\"params\":{}}");

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());

        Assert.Equal(-32601, response["error"]?["code"]?.GetValue<int>());
    }

    [Fact]
    public async Task MalformedJsonReturnsParseError()
    {
        var (transport, output) = MakeTransport("{not valid json");

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());

        Assert.Equal(0, exit);
        Assert.Equal(-32700, response["error"]?["code"]?.GetValue<int>());
    }

    [Fact]
    public async Task MalformedJsonDoesNotCrashLoop()
    {
        var input =
            "{not valid\n" +
            "{\"jsonrpc\":\"2.0\",\"id\":\"2\",\"method\":\"tools/list\",\"params\":{}}\n";
        var (transport, output) = MakeTransport(input);

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);
        var lines = output.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(0, exit);
        Assert.Equal(2, lines.Length);
        Assert.Equal(-32700, JsonNode.Parse(lines[0])!.AsObject()["error"]?["code"]?.GetValue<int>());
        Assert.Null(JsonNode.Parse(lines[1])!.AsObject()["error"]);
    }

    [Fact]
    public async Task OversizedLineReturnsError()
    {
        var oversized = new string('x', 200) + "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"tools/list\"}";
        var input = oversized + "\n";
        var stdout = new StringWriter();
        var transport = new McpStdioTransport(
            CreateRouter(),
            new StringReader(input),
            stdout,
            options: new McpStdioOptions { MaxLineLength = 128 });

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(stdout.ToString());

        Assert.Equal(0, exit);
        Assert.Equal(-32700, response["error"]?["code"]?.GetValue<int>());
    }

    [Fact]
    public async Task NotificationsInitializedIsAcceptedSilently()
    {
        var (transport, output) = MakeTransport(
            "{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\",\"params\":{}}\n");

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, exit);
        Assert.Equal(string.Empty, output.ToString());
    }

    [Fact]
    public async Task NotificationsExitClosesLoopCleanly()
    {
        var (transport, output) = MakeTransport(
            "{\"jsonrpc\":\"2.0\",\"method\":\"notifications/exit\",\"params\":{}}\n");

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, exit);
        Assert.Equal(string.Empty, output.ToString());
    }

    [Fact]
    public async Task NotificationsShutdownClosesLoopCleanly()
    {
        var (transport, output) = MakeTransport(
            "{\"jsonrpc\":\"2.0\",\"method\":\"notifications/shutdown\",\"params\":{}}\n");

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, exit);
        Assert.Equal(string.Empty, output.ToString());
    }

    [Fact]
    public async Task EofClosesLoopCleanly()
    {
        var stdout = new StringWriter();
        var transport = new McpStdioTransport(CreateRouter(), new StringReader(string.Empty), stdout);

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, exit);
        Assert.Equal(string.Empty, stdout.ToString());
    }

    [Fact]
    public async Task RulesToolIsReachableThroughTransport()
    {
        var (transport, output) = MakeToolCall("ackit.rules", "");

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());
        var rules = response["result"]?["structuredContent"]?["rules"]?.AsArray()
            ?? throw new InvalidOperationException("rules array missing.");

        Assert.Null(response["error"]);
        Assert.NotEmpty(rules);
    }

    [Fact]
    public async Task MultipleSequentialRequestsAreAnsweredInOrder()
    {
        var input =
            "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"initialize\",\"params\":{}}\n" +
            "{\"jsonrpc\":\"2.0\",\"id\":\"2\",\"method\":\"tools/list\",\"params\":{}}\n" +
            "{\"jsonrpc\":\"2.0\",\"id\":\"3\",\"method\":\"ping\"}\n" +
            "{\"jsonrpc\":\"2.0\",\"method\":\"notifications/exit\",\"params\":{}}\n";
        var (transport, output) = MakeTransport(input);

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);
        var lines = output.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(0, exit);
        Assert.Equal(3, lines.Length);
        var r1 = JsonNode.Parse(lines[0])!.AsObject();
        var r2 = JsonNode.Parse(lines[1])!.AsObject();
        var r3 = JsonNode.Parse(lines[2])!.AsObject();
        Assert.Equal("1", r1["id"]?.GetValue<string>());
        Assert.Equal("2024-11-05", r1["result"]?["protocolVersion"]?.GetValue<string>());
        Assert.Equal("2", r2["id"]?.GetValue<string>());
        Assert.NotNull(r2["result"]?["tools"]);
        Assert.Equal("3", r3["id"]?.GetValue<string>());
        Assert.True(r3["result"]?["ok"]?.GetValue<bool>());
    }

    [Fact]
    public async Task StdoutContainsOnlyJsonRpcResponses()
    {
        var input =
            "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"initialize\",\"params\":{}}\n" +
            "{\"jsonrpc\":\"2.0\",\"id\":\"2\",\"method\":\"tools/list\",\"params\":{}}\n";
        var (transport, output) = MakeTransport(input);

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var text = output.ToString();

        Assert.DoesNotContain("Welcome", text, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Banner", text, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Server ready", text, StringComparison.OrdinalIgnoreCase);
        foreach (var line in text.Split('\n', StringSplitOptions.RemoveEmptyEntries))
        {
            var node = JsonNode.Parse(line);
            Assert.NotNull(node);
            Assert.Equal("2.0", node!["jsonrpc"]?.GetValue<string>());
        }
    }

    [Fact]
    public async Task SyntheticSecretDoesNotAppearInStdout()
    {
        const string marker = "this-is-only-a-test-marker-do-not-flag-9876";
        using var repo = CreateHealthyRepository();
        repo.Write("secrets-test.txt", $"first line with {marker} embedded inside");
        var (transport, output) = MakeToolCall("ackit.findings", repo.Path, extraArgs: ",\"minSeverity\":\"low\"");

        await transport.RunAsync(TestContext.Current.CancellationToken);

        Assert.DoesNotContain(marker, output.ToString());
    }

    [Fact]
    public async Task AbsolutePathDoesNotAppearInStdout()
    {
        using var repo = CreateHealthyRepository();
        var input =
            "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"tools/call\",\"params\":{\"name\":\"ackit.health\",\"arguments\":{\"repoPath\":\"" + EscapeJson(repo.Path) + "\"}}}\n" +
            "{\"jsonrpc\":\"2.0\",\"id\":\"2\",\"method\":\"tools/call\",\"params\":{\"name\":\"ackit.scan\",\"arguments\":{\"repoPath\":\"" + EscapeJson(repo.Path) + "\",\"format\":\"summary\"}}}\n" +
            "{\"jsonrpc\":\"2.0\",\"id\":\"3\",\"method\":\"tools/call\",\"params\":{\"name\":\"ackit.findings\",\"arguments\":{\"repoPath\":\"" + EscapeJson(repo.Path) + "\"}}}\n" +
            "{\"jsonrpc\":\"2.0\",\"id\":\"4\",\"method\":\"tools/call\",\"params\":{\"name\":\"ackit.context\",\"arguments\":{\"repoPath\":\"" + EscapeJson(repo.Path) + "\",\"target\":\"codex\"}}}\n";
        var (transport, output) = MakeTransport(input);

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var text = output.ToString();

        var normalized = repo.Path.Replace('\\', '/').TrimEnd('/');
        Assert.DoesNotContain(normalized, text);
        Assert.DoesNotContain(repo.Path, text);
    }

    [Fact]
    public async Task RecoverableErrorsDoNotWriteDiagnostics()
    {
        using var repo = CreateHealthyRepository();
        var input =
            "{not valid\n" +
            "{\"jsonrpc\":\"2.0\",\"id\":\"2\",\"method\":\"tools/list\",\"params\":{}}\n";
        var stdout = new StringWriter();
        var diagnostics = new StringWriter();
        var transport = new McpStdioTransport(CreateRouter(), new StringReader(input), stdout, diagnostics);

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var stdoutText = stdout.ToString();
        var lines = stdoutText.Split('\n', StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(2, lines.Length);
        Assert.Equal(-32700, JsonNode.Parse(lines[0])!.AsObject()["error"]?["code"]?.GetValue<int>());
        Assert.Null(JsonNode.Parse(lines[1])!.AsObject()["error"]);
        Assert.Equal(string.Empty, diagnostics.ToString());
    }

    [Fact]
    public async Task NotificationHandlerExceptionGoesToDiagnostics()
    {
        var server = new ThrowingNotificationServer();
        var input =
            "{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\",\"params\":{}}\n" +
            "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"tools/list\",\"params\":{}}\n";
        var stdout = new StringWriter();
        var diagnostics = new StringWriter();
        var transport = new McpStdioTransport(server, new StringReader(input), stdout, diagnostics);

        await transport.RunAsync(TestContext.Current.CancellationToken);

        Assert.Single(stdout.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries));
        Assert.Contains("notification handler threw", diagnostics.ToString(), StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("synthetic notification handler failure", stdout.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CancellationExitsLoopCleanly()
    {
        var stdout = new StringWriter();
        var transport = new McpStdioTransport(
            CreateRouter(),
            new StringReader("{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"tools/list\",\"params\":{}}\n"),
            stdout);

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        cts.Cancel();

        var exit = await transport.RunAsync(cts.Token);

        Assert.Equal(0, exit);
    }

    [Fact]
    public async Task DefaultRepositoryPathIsInjectedWhenMissing()
    {
        using var repo = CreateHealthyRepository();
        var input = "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"tools/call\",\"params\":{\"name\":\"ackit.health\",\"arguments\":{}}}\n";
        var (transport, output) = MakeTransport(input, new McpStdioOptions { DefaultRepositoryPath = repo.Path });

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());

        Assert.Equal(0, exit);
        Assert.Null(response["error"]);
        Assert.Equal(Path.GetFileName(repo.Path.TrimEnd('\\', '/')), response["result"]?["structuredContent"]?["repositoryName"]?.GetValue<string>());
    }

    [Fact]
    public async Task DefaultRepositoryPathIsNotOverriddenWhenPresent()
    {
        using var repoA = CreateHealthyRepository();
        using var repoB = CreateHealthyRepository();
        var input =
            "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"tools/call\",\"params\":{\"name\":\"ackit.health\",\"arguments\":{\"repoPath\":\"" + EscapeJson(repoB.Path) + "\"}}}\n";
        var (transport, output) = MakeTransport(input, new McpStdioOptions { DefaultRepositoryPath = repoA.Path });

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());

        Assert.Equal(0, exit);
        Assert.Null(response["error"]);
        Assert.Equal(Path.GetFileName(repoB.Path.TrimEnd('\\', '/')), response["result"]?["structuredContent"]?["repositoryName"]?.GetValue<string>());
    }

    [Fact]
    public async Task EmptyLineIsIgnored()
    {
        var input = "\n\n{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"tools/list\",\"params\":{}}\n\n";
        var (transport, output) = MakeTransport(input);

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);
        var lines = output.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(0, exit);
        Assert.Single(lines);
    }

    [Fact]
    public async Task MissingJsonrpcFieldReturnsInvalidRequest()
    {
        var (transport, output) = MakeTransport(
            "{\"id\":\"1\",\"method\":\"tools/list\",\"params\":{}}\n");

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());

        Assert.Equal(-32600, response["error"]?["code"]?.GetValue<int>());
    }

    [Fact]
    public async Task WrongJsonrpcVersionReturnsInvalidRequest()
    {
        var (transport, output) = MakeTransport(
            "{\"jsonrpc\":\"1.0\",\"id\":\"1\",\"method\":\"tools/list\",\"params\":{}}\n");

        await transport.RunAsync(TestContext.Current.CancellationToken);
        var response = ParseSingleResponse(output.ToString());

        Assert.Equal(-32600, response["error"]?["code"]?.GetValue<int>());
    }

    [Fact]
    public async Task NotificationHandlerThrowingDoesNotCrashLoop()
    {
        var server = new ThrowingNotificationServer();
        var input =
            "{\"jsonrpc\":\"2.0\",\"method\":\"notifications/initialized\",\"params\":{}}\n" +
            "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"tools/list\",\"params\":{}}\n";
        var stdout = new StringWriter();
        var transport = new McpStdioTransport(server, new StringReader(input), stdout);

        var exit = await transport.RunAsync(TestContext.Current.CancellationToken);
        var lines = stdout.ToString().Split('\n', StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(0, exit);
        Assert.Single(lines);
        Assert.Equal("1", JsonNode.Parse(lines[0])!.AsObject()["id"]?.GetValue<string>());
    }

    private static (McpStdioTransport Transport, StringWriter Output) MakeTransport(string input, McpStdioOptions? options = null)
    {
        var stdout = new StringWriter();
        var transport = new McpStdioTransport(CreateRouter(), new StringReader(input), stdout, options: options);
        return (transport, stdout);
    }

    private static (McpStdioTransport Transport, StringWriter Output) MakeToolCall(string tool, string repoPath, string extraArgs = "")
    {
        var input = "{\"jsonrpc\":\"2.0\",\"id\":\"1\",\"method\":\"tools/call\",\"params\":{\"name\":\"" + tool + "\",\"arguments\":{\"repoPath\":\"" + EscapeJson(repoPath) + "\"" + extraArgs + "}}}\n";
        return MakeTransport(input);
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

    private static string EscapeJson(string value)
    {
        return value
            .Replace("\\", "\\\\", StringComparison.Ordinal)
            .Replace("\"", "\\\"", StringComparison.Ordinal);
    }

    private static JsonObject ParseSingleResponse(string output)
    {
        var lines = output.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        if (lines.Length != 1)
        {
            throw new InvalidOperationException($"Expected exactly 1 response line, got {lines.Length}: {output}");
        }
        return JsonNode.Parse(lines[0])?.AsObject()
            ?? throw new InvalidOperationException("Response was not a JSON object.");
    }

    private sealed class ThrowingNotificationServer : IMcpServer
    {
        public string HandleJson(string input) => input;

        public McpResponse Handle(McpRequest request)
        {
            if (request.Id is null && request.Method == "notifications/initialized")
            {
                throw new InvalidOperationException("synthetic notification handler failure");
            }
            return new McpResponse("2.0", request.Id, Result: new { ok = true });
        }

        public McpResponse Initialize(McpRequest request) => Handle(request);

        public McpResponse ListTools(McpRequest request) => Handle(request);

        public McpResponse CallTool(McpRequest request) => Handle(request);
    }
}
