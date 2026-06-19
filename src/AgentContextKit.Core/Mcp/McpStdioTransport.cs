using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace AgentContextKit.Core;

public sealed class McpStdioOptions
{
    public int MaxLineLength { get; init; } = 1024 * 1024;

    public TimeSpan RequestTimeout { get; init; } = TimeSpan.FromSeconds(30);

    public string? DefaultRepositoryPath { get; init; }
}

public sealed class McpStdioTransport
{
    internal static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private readonly IMcpServer _server;
    private readonly TextReader _input;
    private readonly TextWriter _output;
    private readonly TextWriter _diagnostics;
    private readonly McpStdioOptions _options;

    public McpStdioTransport(
        IMcpServer server,
        TextReader input,
        TextWriter output,
        TextWriter? diagnostics = null,
        McpStdioOptions? options = null)
    {
        _server = server;
        _input = input;
        _output = output;
        _diagnostics = diagnostics ?? TextWriter.Null;
        _options = options ?? new McpStdioOptions();
    }

    public static McpStdioTransport CreateConsole(IMcpServer server, McpStdioOptions? options = null)
    {
        return new McpStdioTransport(server, Console.In, Console.Out, Console.Error, options);
    }

    public async Task<int> RunAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                string? line;
                try
                {
                    using var requestCts = new CancellationTokenSource(_options.RequestTimeout);
                    using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, requestCts.Token);
                    line = await _input.ReadLineAsync(linkedCts.Token).ConfigureAwait(false);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    return 0;
                }
                catch (OperationCanceledException)
                {
                    await WriteErrorAndFlushAsync(null, -32603, "Request timed out.").ConfigureAwait(false);
                    continue;
                }

                if (line is null)
                {
                    return 0;
                }

                if (line.Length == 0)
                {
                    continue;
                }

                if (line.Length > _options.MaxLineLength)
                {
                    await WriteErrorAndFlushAsync(null, -32700, $"Line exceeds maximum length of {_options.MaxLineLength} characters.").ConfigureAwait(false);
                    continue;
                }

                string? responseText;
                bool shouldExit;
                try
                {
                    (responseText, shouldExit) = ProcessLine(line);
                }
                catch (Exception ex)
                {
                    WriteDiagnosticsSync($"processing error: {SanitizeMessage(ex.Message)}");
                    await WriteErrorAndFlushAsync(null, -32603, "Internal error.").ConfigureAwait(false);
                    continue;
                }

                if (responseText is not null)
                {
                    await _output.WriteLineAsync(responseText).ConfigureAwait(false);
                    await _output.FlushAsync().ConfigureAwait(false);
                }

                if (shouldExit)
                {
                    return 0;
                }
            }
            return 0;
        }
        catch (Exception ex)
        {
            await WriteDiagnosticsAsync($"stdio loop crashed: {SanitizeMessage(ex.Message)}").ConfigureAwait(false);
            return 3;
        }
    }

    private (string? Response, bool ShouldExit) ProcessLine(string line)
    {
        JsonNode? root;
        try
        {
            root = JsonNode.Parse(line);
        }
        catch (JsonException)
        {
            return (BuildErrorResponse(null, -32700, "Parse error."), false);
        }

        if (root is not JsonObject obj)
        {
            return (BuildErrorResponse(null, -32600, "Request must be a JSON object."), false);
        }

        string? id = ReadId(obj);
        bool isNotification = !obj.ContainsKey("id");

        if (!TryReadStringField(obj, "jsonrpc", out var jsonrpc, out var jsonrpcError))
        {
            return (BuildErrorResponse(id, -32600, jsonrpcError ?? "jsonrpc is required."), false);
        }
        if (!string.Equals(jsonrpc, "2.0", StringComparison.Ordinal))
        {
            return (BuildErrorResponse(id, -32600, "jsonrpc must be \"2.0\"."), false);
        }

        if (!TryReadStringField(obj, "method", out var method, out var methodError))
        {
            return (BuildErrorResponse(id, -32600, methodError ?? "method is required."), false);
        }

        if (method is "notifications/exit" or "notifications/shutdown" or "exit" or "shutdown")
        {
            return (null, true);
        }

        JsonObject? parameters = null;
        if (obj.TryGetPropertyValue("params", out var paramsNode) && paramsNode is not null)
        {
            if (paramsNode is not JsonObject parametersObj)
            {
                return (BuildErrorResponse(id, -32602, "params must be a JSON object."), false);
            }
            parameters = parametersObj;
        }

        if (!isNotification && method == "tools/call" && _options.DefaultRepositoryPath is not null)
        {
            parameters = InjectDefaultRepoPath(parameters, _options.DefaultRepositoryPath);
        }

        if (isNotification)
        {
            try
            {
                _server.Handle(new McpRequest(jsonrpc, null, method, parameters));
            }
            catch (Exception ex)
            {
                WriteDiagnosticsSync($"notification handler threw: {SanitizeMessage(ex.Message)}");
            }
            return (null, false);
        }

        McpResponse response;
        try
        {
            response = _server.Handle(new McpRequest(jsonrpc, id, method, parameters));
        }
        catch (Exception ex)
        {
            WriteDiagnosticsSync($"handler threw: {SanitizeMessage(ex.Message)}");
            return (BuildErrorResponse(id, -32603, "Internal error."), false);
        }
        return (JsonSerializer.Serialize(response, JsonOptions), false);
    }

    private static JsonObject InjectDefaultRepoPath(JsonObject? source, string defaultRepositoryPath)
    {
        var clone = new JsonObject();
        if (source is not null)
        {
            foreach (var kvp in source)
            {
                clone[kvp.Key] = kvp.Value?.DeepClone();
            }
        }

        if (clone.TryGetPropertyValue("arguments", out var argsNode) && argsNode is JsonObject argsObj)
        {
            if (!argsObj.ContainsKey("repoPath"))
            {
                var newArgs = new JsonObject();
                foreach (var kvp in argsObj)
                {
                    newArgs[kvp.Key] = kvp.Value?.DeepClone();
                }
                newArgs["repoPath"] = defaultRepositoryPath;
                clone["arguments"] = newArgs;
            }
        }
        else
        {
            clone["arguments"] = new JsonObject { ["repoPath"] = defaultRepositoryPath };
        }

        return clone;
    }

    private static bool TryReadStringField(JsonObject obj, string key, out string value, out string? error)
    {
        if (!obj.TryGetPropertyValue(key, out var node) || node is null)
        {
            value = string.Empty;
            error = $"{key} is required.";
            return false;
        }
        if (node is not JsonValue jsonValue)
        {
            value = string.Empty;
            error = $"{key} must be a string.";
            return false;
        }
        try
        {
            value = jsonValue.GetValue<string>();
            error = null;
            return true;
        }
        catch (InvalidOperationException)
        {
            value = string.Empty;
            error = $"{key} must be a string.";
            return false;
        }
        catch (FormatException)
        {
            value = string.Empty;
            error = $"{key} must be a string.";
            return false;
        }
    }

    private static string? ReadId(JsonObject obj)
    {
        if (!obj.TryGetPropertyValue("id", out var node) || node is null)
        {
            return null;
        }
        if (node is JsonValue jsonValue)
        {
            if (jsonValue.TryGetValue<string>(out var str)) return str;
            if (jsonValue.TryGetValue<int>(out var i)) return i.ToString(CultureInfo.InvariantCulture);
            if (jsonValue.TryGetValue<long>(out var l)) return l.ToString(CultureInfo.InvariantCulture);
        }
        return node.ToJsonString();
    }

    private string BuildErrorResponse(string? id, int code, string message)
    {
        return JsonSerializer.Serialize(
            new McpResponse("2.0", id, Error: new McpError(code, message)),
            JsonOptions);
    }

    private async Task WriteErrorAndFlushAsync(string? id, int code, string message)
    {
        try
        {
            var json = BuildErrorResponse(id, code, message);
            await _output.WriteLineAsync(json).ConfigureAwait(false);
            await _output.FlushAsync().ConfigureAwait(false);
        }
        catch
        {
        }
    }

    private async Task WriteDiagnosticsAsync(string message)
    {
        try
        {
            await _diagnostics.WriteLineAsync(message).ConfigureAwait(false);
        }
        catch
        {
        }
    }

    private void WriteDiagnosticsSync(string message)
    {
        try
        {
            _diagnostics.WriteLine(message);
        }
        catch
        {
        }
    }

    private static string SanitizeMessage(string? message)
    {
        if (string.IsNullOrEmpty(message))
        {
            return "(no message)";
        }
        return message.Length > 256
            ? message.Substring(0, 256) + "..."
            : message;
    }
}
