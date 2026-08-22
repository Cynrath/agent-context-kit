# ADR-0008: Official MCP TypeScript SDK adoption

Status: Proposed (version pin in TASK-0266) · Date: 2026-08-22

## Decision
MCP support is implemented exclusively on the official Model Context Protocol TypeScript SDK (2026-07-28 spec line, v2 packages), stdio transport. No custom JSON-RPC/MCP framing anywhere in the codebase (grep-gated). Remote transports out of core scope. Write-capable tools are not shipped by default; future write tools require explicit capability config.

## Rationale
The v1 home-grown protocol layer was a flagged audit risk and a maintenance sink. SDK adoption buys conformance, cancellation, and malformed-input handling for free; our tests cover integration behavior rather than protocol re-implementation (REQ-MCP-004).

## Consequences
SDK version upgrades are deliberate, lockfile-pinned changes; breaking upstream changes block minor releases only after conformance suite passes.
