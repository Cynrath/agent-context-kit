---
id: "TASK-0070"
title: "post-0.3.0 follow-up: complete MCP drift warning and input parity"
status: pending
schemaVersion: 2
dependencies:
  - "TASK-0066"
createdAt: "2026-09-02"
completedAt: null
---

## Purpose

Close the documented v0.3.0 limitation: the MCP `ackit_drift_check` tool has a residual parity divergence from the CLI `ackit drift check` surface (warning shapes and/or input handling). Audit both surfaces, enumerate the exact divergences, and bring the MCP tool to full parity (within the read-only boundary) or document any deliberate difference with rationale.

## Current-state evidence

- v0.3.0 CHANGELOG "Known limitations": "MCP drift warning/input parity has the documented residual divergence."
- Final-validation (TASK-0063/0064) recorded the divergence as non-blocking for the release with follow-up intent.
- `src/mcp/server.ts` registers `ackit_drift_check` (read-only); `src/cli/commands/drift.ts` implements the CLI surface (`--ci`, thresholds, output framing).

## Scope

- Enumerate divergences: input schema (args the CLI accepts vs the MCP tool parameters), warning/finding output framing, exit-vs-error semantics appropriate to MCP.
- Align the MCP tool's input handling and warning output with the CLI's semantics where parity is the goal; keep MCP read-only (no mutation) — any state change remains CLI-only per ADR-0028.
- Update `tests/contract/mcp/mcp-conformance.test.ts` and drift integration tests to lock parity.
- Update `docs/reference/mcp.md` (tool row) and CHANGELOG in the shipping release; remove the limitation line at that time.

## Out of scope

- Published v0.3.0 artifacts (immutable).
- Adding write tools to MCP (always prohibited without a new ADR); changing drift finding codes (frozen eight).

## Affected files

- `src/mcp/server.ts` (drift tool wiring)
- `tests/contract/mcp/mcp-conformance.test.ts`, `tests/integration/drift/drift-cli.test.ts`
- `docs/reference/mcp.md`, CHANGELOG (next release)

## Acceptance criteria

- [ ] Divergence enumeration recorded in this task (concrete list: which inputs, which warning shapes)
- [ ] Parity tests assert same findings/warnings for equivalent inputs across CLI and MCP (conformance test)
- [ ] Read-only boundary unchanged (no mutation tools/params added)
- [ ] Full gate matrix green; MCP stdio smoke green cross-platform

## Test steps

1. Enumerate: run equivalent drift scenarios through CLI and MCP; tabulate divergences.
2. Implement alignment; add conformance assertions.
3. Full `pnpm test` + `scan --ci`; MCP stdio smoke on Windows + Linux runners.

## Risks

- Over-eager parity could tempt adding mutating inputs — explicitly out of scope; keep parity to read-only semantics only.

## Rollback plan

Focused commit revert.

## Completion notes

(proposed post-0.3.0 maintenance chain; planned 2026-09-02 during the v0.3.0 release session per release-task §20 — not executed in the release itself)
