# ADR-0008: Official MCP TypeScript SDK adoption

Status: Accepted · Date: 2026-08-22 (version verified in TASK-0266)

## Decision
MCP support is implemented exclusively on the official Model Context Protocol TypeScript SDK package `@modelcontextprotocol/sdk`, stdio transport. No custom JSON-RPC/MCP framing anywhere in the codebase (grep-gated). Remote transports out of core scope. Write-capable tools are not shipped by default; future write tools require explicit capability config.

Version reality verified 2026-08-22 via `registry.npmjs.org`: official SDK `dist-tags.latest` = **1.30.0** (engines `node>=18`). No 2.x dist-tag exists; the "v2 packages" wording from early planning does not match registry reality and is superseded by this evidence. The 2026-07-28 protocol spec line is implemented by the current 1.x SDK. Pinned dependency: `@modelcontextprotocol/sdk@^1.30.0`, lockfile-frozen, upgradeable only through deliberate conformance-tested bumps.

## Rationale
The v1 home-grown protocol layer was a flagged audit risk and a maintenance sink. SDK adoption buys conformance, cancellation, and malformed-input handling for free; our tests cover integration behavior rather than protocol re-implementation (REQ-MCP-004).

## Consequences
SDK version upgrades are deliberate, lockfile-pinned changes; breaking upstream changes block minor releases only after conformance suite passes.
