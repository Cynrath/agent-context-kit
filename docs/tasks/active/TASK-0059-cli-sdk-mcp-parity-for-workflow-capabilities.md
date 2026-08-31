---
id: "TASK-0059"
title: "CLI/SDK/MCP parity for workflow capabilities"
status: pending
schemaVersion: 2
dependencies: ["TASK-0048", "TASK-0052", "TASK-0054", "TASK-0056"]
createdAt: "2026-08-31"
completedAt: null
---

## Purpose

Expose the new workflow capability families across the three public surfaces intentionally and consistently (§19): focused SDK exports, read-only MCP tools (no mutation service — that boundary is preserved by explicit decision in ADR-0028), and zero-disturbance CLI parity.

## Scope

- SDK (`src/index.ts`) — intentional additions only, each with `AbortSignal` where IO-bound, typed errors, no `process.exit`:
  - `listWorkflowProfiles()`, `resolveWorkflowState(root, taskId)`, `validateWorkflow(root, taskId)`
  - `IntentStore`, `intentFingerprint(intent)`
  - `CheckpointStore`, `renderResumeContext(root, taskId, opts)`
  - `loadEvidenceRegistry(root, taskId)`, `validateEvidence(registry, requirements)`
  - `buildVerificationBundle(root, taskId, opts)`, `validateVerdict(verdict, registry)`
  - `detectWorkflowDrift(input)`
  - `listRoles(root)`, `loadRole(root, id)`
  - Update `tests/contract/api-surface` allowlist (contract change, intentional, documented in CHANGELOG `Unreleased`).
- MCP (`src/mcp/server.ts`) — read-only tools only (the mutation boundary is unchanged; documented decision):
  - `ackit_workflow_status` (task workflow state + missing artifacts), `ackit_get_intent`, `ackit_get_checkpoint`, `ackit_verification_bundle` (bundle text), `ackit_drift_check`, `ackit_list_roles` — all root-confined like existing tools; update `tests/contract/mcp/mcp-conformance.test.ts` exact tool list and the docs-gate/readme parity surfaces that mirror the tool list.
- CLI: verify every family is reachable and documented in `docs/reference/cli.md`; `--help` texts follow existing conventions (no internal traceability tokens — enforced by existing cli-help contract test).
- VS Code: no extension changes in this task (evaluated and deferred — extension consumption of workflow state is future work; recorded in ADR-0028 consequences).
- Tests: SDK contract allowlist update + typed-shape tests; MCP conformance (exact new tool list, every tool answers on a fixture); CLI help matrix green.

## Out of scope

- Any MCP write tool (explicit non-goal; ADR-0028 documents the boundary).
- VS Code workflow UI (deferred, documented).

## Affected files

- `src/index.ts`, `tests/contract/api-surface/api-surface.test.ts`
- `src/mcp/server.ts`, `tests/contract/mcp/mcp-conformance.test.ts`
- `docs/reference/sdk.md`, `docs/reference/mcp.md`, `docs/reference/cli.md`
- `CHANGELOG.md` (Unreleased — public surface additions)

## Acceptance criteria

- [ ] SDK allowlist test updated and passing; every new export is a function/class with documented stable signature; no internal module leaks.
- [ ] MCP tools/list is exactly the old nine plus the six new read-only tools; write tools remain absent; conformance test updated and green.
- [ ] CLI reference docs cover every new command family; readme/docs parity tests green.
- [ ] CHANGELOG `Unreleased` section records the additive public-surface change.
- [ ] Full `pnpm test` green with recorded counts.

## Test steps

1. `pnpm typecheck && pnpm lint && pnpm format:check`
2. `pnpm build && pnpm test`
3. `pnpm smoke:cli && pnpm run smoke:package` (SDK consumers compile against new exports).

## Security considerations

- MCP stays read-only: no state-mutating tool added (boundary preserved; test asserts absence of write tools).
- All MCP tools remain root-confined at construction (no `root` parameter — audit 6A pattern held).

## Risks

- SDK surface creep — mitigated by the allowlist contract (any addition beyond this task's list fails CI).

## Rollback plan

Focused revert; allowlist and MCP list revert with it.

## Completion notes

(placeholder)
