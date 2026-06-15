# TASK-0175 MCP stdio Design-Only

## Purpose
Design a future local-only `ackit mcp --stdio` server that exposes read-only repository tools over the Model Context Protocol without implementing it this cycle.

## Current State
- No MCP integration exists.
- The agent context kit is offline-first; no network calls are made.
- A future MCP server would expose the same deterministic Core operations as the CLI.

## Evidence
- `ackit --help` does not list an `mcp` command.
- The Core pipeline already exposes deterministic, file-local operations.

## Scope
- Write `docs/MCP_STDIO_DESIGN.md` describing the tool surface, transport, and security boundaries.
- Update `docs/INTEROPERABILITY_DESIGN.md`, `docs/ROADMAP.md`, and `docs/NO_NETWORK_DEFAULT_POLICY.md`.
- Document the proposed tools: `ackit_scan`, `ackit_doctor`, `ackit_prompt_pack_preview`, `ackit_context_export_manifest`, `ackit_rule_catalog`.

## Out Of Scope
- Adding an MCP SDK dependency.
- Implementing a server.
- Any network transport.
- Any persistent server state.

## Affected Files
- `docs/MCP_STDIO_DESIGN.md` (new)
- `docs/INTEROPERABILITY_DESIGN.md`
- `docs/ROADMAP.md`
- `docs/NO_NETWORK_DEFAULT_POLICY.md`

## Implementation Steps
1. Draft `docs/MCP_STDIO_DESIGN.md` with tool catalog, transport, and security boundaries.
2. Update `docs/INTEROPERABILITY_DESIGN.md` to mention the MCP design.
3. Update `docs/ROADMAP.md` to record the design-only milestone.
4. Update `docs/NO_NETWORK_DEFAULT_POLICY.md` to reaffirm no-network design.

## Security/Privacy Boundary
- stdio only.
- No network transport.
- No persistent server state.
- Tools must be local repo operations.
- No LLM provider integration.

## Backward Compatibility
- Design-only; no code or schema change.

## Acceptance Criteria
- `docs/MCP_STDIO_DESIGN.md` exists with tool catalog and security boundary.
- `docs/INTEROPERABILITY_DESIGN.md`, `docs/ROADMAP.md`, and `docs/NO_NETWORK_DEFAULT_POLICY.md` reference the design.
- Existing test suite remains green.

## Tests
None beyond the docs gates.

## Validation
- `powershell -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues`
- `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues`

## Rollback
Revert the commit.

## Completion Evidence
Pending. Will be filled after the design docs are merged.

## Commit
- `docs: design local mcp stdio integration`

## Push
- Normal `master` push after validation.

## Hosted Checks
- ci
- cross-platform-smoke
- cross-platform-source-smoke
