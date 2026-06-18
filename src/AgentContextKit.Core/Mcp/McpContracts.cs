using System.Text.Json.Nodes;
using System.Text.Json.Serialization;

namespace AgentContextKit.Core;

public sealed record McpRequest(
    [property: JsonPropertyName("jsonrpc")] string JsonRpc,
    [property: JsonPropertyName("id")] string? Id,
    [property: JsonPropertyName("method")] string Method,
    [property: JsonPropertyName("params")] JsonObject? Params = null);

public sealed record McpResponse(
    [property: JsonPropertyName("jsonrpc")] string JsonRpc,
    [property: JsonPropertyName("id")] string? Id,
    [property: JsonPropertyName("result")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    object? Result = null,
    [property: JsonPropertyName("error")]
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    McpError? Error = null);

public sealed record McpError(
    [property: JsonPropertyName("code")] int Code,
    [property: JsonPropertyName("message")] string Message);

public sealed record McpToolDefinition(
    string Name,
    string Description,
    IReadOnlyDictionary<string, object?> InputSchema);

public sealed record McpServerInfo(string Name, string Title, string Version);

public sealed record McpCapabilities(IReadOnlyDictionary<string, object?> Tools);

public interface IMcpServer
{
    string HandleJson(string input);

    McpResponse Handle(McpRequest request);

    McpResponse Initialize(McpRequest request);

    McpResponse ListTools(McpRequest request);

    McpResponse CallTool(McpRequest request);
}
