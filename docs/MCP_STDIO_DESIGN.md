# MCP Stdio Transport Design (Design-Only)

## Purpose
Sketch a local-only MCP (Model Context Protocol) stdio transport for `ackit`, so an editor or agent that speaks MCP can request a scan report without any HTTP, network, or cloud dependency. **This document is design-only.** No implementation is committed in the current task. Implementation will be queued in a follow-up project control task and will be subject to the same no-network, offline-first, and redaction policies as the rest of `ackit`.

## Why Stdout JSON-RPC, Not HTTP

- `ackit` is offline-first. An HTTP listener (even on `127.0.0.1`) would broaden the threat surface.
- A long-lived `ackit mcp` process spawned by the editor (Cursor, Continue, VS Code MCP clients) on stdio fits the existing CLI surface.
- A new HTTP transport is the wrong default; if it becomes necessary, it must be opt-in, loopback-only, and bound to `127.0.0.1`.

## Command Surface

```text
ackit mcp [--lang en|tr] [--repo <path>]
```

- `--lang`: human output language for tool responses.
- `--repo`: repository to scan; default is the current working directory.
- The process is line-buffered, reads JSON-RPC 2.0 messages on stdin, and writes JSON-RPC 2.0 messages on stdout. Logs and errors go to stderr.

## Wire Format

JSON-RPC 2.0 over stdio, one JSON object per line:

- Each request has `jsonrpc: "2.0"`, a string `id`, a `method`, and a `params` object.
- Each response is either a `result` or an `error` with the same `id`.
- `notifications` (no `id`) are accepted for `initialized` and `exit`.

### Methods

| Method | Purpose | Required |
| --- | --- | --- |
| `initialize` | Handshake: client capability exchange, server returns name, version, and capabilities. | yes |
| `tools/list` | List available tools. | yes |
| `tools/call` | Invoke a tool by name with structured arguments. | yes |
| `notifications/initialized` | Client confirms handshake. | yes |
| `ping` | Liveness check. | optional |

### Initial Capabilities

```json
{
  "protocolVersion": "2024-11-05",
  "serverInfo": { "name": "ackit", "title": "AgentContextKit", "version": "<local>0.2.0-alpha.2+<sha>" },
  "capabilities": { "tools": {} }
}
```

The reported `version` is the local `AssemblyInformationalVersion` of the running CLI, not a published version, and never includes user data.

## Tools (Initial Set)

| Tool | Description | Key Arguments |
| --- | --- | --- |
| `ackit.scan` | Run a scan and return a compact summary. | `repoPath: string`, `lang?: "en"\|"tr"`, `format: "summary"\|"json"\|"sarif"` |
| `ackit.findings` | Return full risk findings, filtered by severity. | `repoPath: string`, `minSeverity?: "info"\|"low"\|"medium"\|"high"\|"critical"`, `lang?: "en"\|"tr"` |
| `ackit.context` | Build a context pack for a given target. | `repoPath: string`, `target: "codex"\|"claude"\|"anthropic"\|"cursor"\|"copilot"\|"continue"\|"all"`, `lang?: "en"\|"tr"` |
| `ackit.health` | Return a structured health snapshot (doctor). | `repoPath: string`, `lang?: "en"\|"tr"` |

Each tool argument is validated; unknown or missing required arguments return a JSON-RPC `-32602 Invalid params` error.

## Security and Privacy Boundary

- No network: the server only writes to stdout and reads from stdin.
- No telemetry: there is no analytics, no remote call, no third-party SDK.
- Path allow-list: every `repoPath` argument is resolved and must point to a directory under the current user's permissions. The scanner already validates the path.
- Redaction: any tool response that contains file content is passed through the existing `ackit redact-check` rules. Matched secrets are replaced with `[REDACTED:ACKIT001]` markers.
- No persistent state: the process keeps no on-disk state between calls.
- Cancellation: client disconnect is detected via broken pipe; the server exits cleanly with code `0`.
- No shell exec: the server never spawns a shell or runs external binaries.
- `repoPath` must be a real local path; URLs, `file://` URIs, and remote paths are rejected.

## Process Lifecycle

1. Editor launches `ackit mcp --repo <path>` with stdio pipes.
2. The server sends no message until it receives a JSON-RPC request.
3. On `initialize`, the server replies with the handshake and capabilities.
4. On `tools/call`, the server runs the same Core pipeline that powers the CLI; no extra side effects.
5. On EOF or `notifications/exit`, the server exits with code `0`.
6. The server treats unparseable lines and unknown methods as recoverable errors; it does not crash.

## Exit Codes

- `0`: clean shutdown (EOF, `exit`, `shutdown`).
- `2`: invalid invocation (e.g. `--repo` not a directory).
- `3`: scanner or internal error.

## Versioning

- The transport follows the documented MCP protocol version pinned in the handshake.
- Adding a new method or tool is a backward-compatible change.
- Removing a method or tool requires a major `ackit` version bump and a CHANGELOG entry.

## Out of Scope (For This Design)

- HTTP / SSE / streamable HTTP transport.
- Authentication, authorization, multi-tenant routing, quotas, or rate limiting (stdio is per-process).
- A persistent daemon, service installation, or auto-start behavior.
- A binary protocol, gRPC, or websockets.
- An SDK that depends on a specific AI vendor.

## Linked Docs

- `docs/NO_NETWORK_DEFAULT_POLICY.md`
- `docs/CLI_REFERENCE.md`
- `docs/CLI_CONTRACT.md`
- `docs/SCANNER_RULES.md`
- `docs/SARIF_OUTPUT.md`

## Testability and Implementation Plan

- The transport is wrapped behind an interface in `AgentContextKit.Core` so unit tests can drive it without spawning a real process.
- End-to-end tests launch the server as a child process with redirected stdio and assert on JSON-RPC round-trips.
- A new task (`ackit mcp`) will be queued under a future project control document and will not be picked up automatically.
