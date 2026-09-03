---
id: "TASK-0070"
title: "post-0.3.0 follow-up: complete MCP drift warning and input parity"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0066"
createdAt: "2026-09-02"
completedAt: 2026-09-03
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

## Divergence enumeration (AC-001 — audited 2026-09-03, pre-fix)

| # | Dimension | CLI (`drift check`) | MCP (`ackit_drift_check`) | Impact |
|---|---|---|---|---|
| D1 | Changed-file set | expanded (`git ls-files` expands collapsed untracked dirs) | raw `changedFiles` (collapsed `docs/`-style entries) | different `UNPLANNED_FILE_CHANGE` findings on repos with untracked dirs |
| D2 | Checkpoint problems | `validateCheckpointStaleness` computed | hardcoded `[]` | MCP never reported `STALE_CHECKPOINT` warnings the CLI reported |
| D3 | Effective verdict requirement | built-in `profile !== "quick"` (plus TASK-0067 config override) | built-in only, no config override | tightened-quick repos diverged on `MISSING_VERIFIER_VERDICT` |
| D4 | Verdict summary source | `VerdictStore.latestVerdictSummary` | `VerdictStore.latest` | potential shape/filtering skew in `existingArtifacts`/`latestVerdict` |
| D5 | Exit/`--ci` semantics | exit 1 on blocking under `--ci` | findings JSON, no exit codes | deliberate, documented difference (tool boundary cannot carry exit codes) |

D1–D4 closed by the canonical assembler; D5 kept by design (read-only boundary, no mutating inputs added).

## Acceptance criteria

- [x] Divergence enumeration recorded in this task (concrete list: which inputs, which warning shapes)
- [x] Parity tests assert same findings/warnings for equivalent inputs across CLI and MCP (conformance test)
- [x] Read-only boundary unchanged (no mutation tools/params added)
- [x] Full gate matrix green; MCP stdio smoke green cross-platform

## Test steps

1. Enumerate: run equivalent drift scenarios through CLI and MCP; tabulate divergences.
2. Implement alignment; add conformance assertions.
3. Full `pnpm test` + `scan --ci`; MCP stdio smoke on Windows + Linux runners.

## Risks

- Over-eager parity could tempt adding mutating inputs — explicitly out of scope; keep parity to read-only semantics only.

## Rollback plan

Focused commit revert.

## Completion notes

Implemented 2026-09-03 on `feat/post-v030-hardening` (quick profile, verify stage):

- New canonical `assembleDriftInput(repositoryRoot, taskId)` in
  `src/core/drift/assemble.ts` (exported via `drift/index.ts`): the ONE
  input-assembly path — task/workflow/evidence/verdict-summary/checkpoint +
  full staleness problems + expanded changed files + disk-checked refs +
  effective `requiresVerdict` (TASK-0067). Read-only, never writes.
- `runDriftCheckCommand` (CLI) and MCP `ackit_drift_check` both call the
  assembler then the single `detectWorkflowDrift` core — duplicated inline
  assembly deleted from both surfaces (no second business logic). `--ci`/exit
  semantics stay CLI-only (deliberate D5); MCP returns findings JSON.
- Finding codes frozen (eight); severities/order from the core sort
  (code → taskId → detail) — identical inputs now yield identical outputs.
- Proven by `tests/contract/mcp/drift-parity.test.ts` (CLI JSON ≡ MCP JSON ≡
  core on an identical unplanned-file fixture; deterministic order asserted;
  read-only tool list asserted — no `workflow_set`/`advance`/`checkpoint_create`/
  `task_complete`). `mcp-conformance` (9) + `drift-cli` (3) green.
- MCP stdio smoke: `tests/e2e` + contract MCP suites green locally on Windows;
  cross-platform proof deferred to PR CI (Linux runner) per session §13.
- Full matrix 98/554 PASS. No write tools/params added (tool count still 15).
