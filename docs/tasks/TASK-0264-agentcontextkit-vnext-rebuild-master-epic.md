# TASK-0264: AgentContextKit vNext rebuild master epic

Epic container for the full vNext rebuild. Executed by Goal 2 via the canonical planning docs under `docs/rebuild/`. This task is complete only when every child task is complete and REQ-FIN-001..003 pass.

## Purpose

Rebuild AgentContextKit as a TypeScript + Node.js + npm/npx product (`ackit`) that turns any repository into an agent-ready repository: instruction graph resolution, agent skills support, security/hygiene scanning, context budgeting, task-first workflow enforcement, policy-as-code, and official MCP v2 integration. Offline-first, deterministic, cross-platform, enterprise-grade.

Authoritative requirements: `docs/rebuild/VNEXT_REQUIREMENTS.md`.
Execution order: `docs/rebuild/VNEXT_EXECUTION_ORDER.md`.
Fresh-context entry point: `docs/rebuild/GOAL2_BOOTSTRAP.md`.

## Scope

- All child tasks TASK-0265 .. TASK-0289 (dependency graph below).
- Final tree: TypeScript single-package implementation replacing the C# v1 runtime on this branch.
- Full docs rewrite, CI/supply-chain hardening, performance suite, final acceptance gate.

## Out of scope

- Everything in REQ-GOV-009 (`VNEXT_REQUIREMENTS.md` §1): LLM APIs, vector DB, embeddings/RAG, orchestrators, SAST/SBOM platforms, chat bots, IDE suite, untrusted plugin execution, telemetry, cloud services.
- Any remote push, tag, release, npm publish during Goal 2 (REQ-GOV-010).
- Preserving v1 C# runtime in the final product path.

## Affected files

- Entire `src/`, `tests/`, `docs/`, `.github/workflows/ci.yml`, root package files after TASK-0267 reset; see each child task.

## Data/database impact

None. No database or server component (REQ-GOV-009).

## Security impact

This epic owns the v1 lessons list (MS§4): symlink/root escape, absolute path leakage, extension-allowlist blind spots, home-grown MCP, monolithic Program.cs/tests, missing cancellation/budget/cache/incremental, source/package drift, unpinned CI actions. Each is closed by a dedicated requirement (REQ-FS-*, REQ-SEC-*, REQ-MCP-001, REQ-ARCH-*, REQ-CI-*, REQ-PKG-001).

## Permission/auth impact

None. Local-only tool; no accounts.

## Localization impact

CLI language: English output by default for vNext (v1 tr/en duality is superseded); final decision recorded in ADR-0001 scope notes if changed.

## UX impact

Zero-command health summary, stable global options, documented exit codes, actionable errors (REQ-DX-001..004).

## Logging/audit impact

No telemetry; local diagnostics only; findings carry fingerprints/evidence for auditability (REQ-SCAN-002).

## Dependencies

None (epic root). Children depend per `VNEXT_EXECUTION_ORDER.md`.

## Unlocks

Goal 2 execution of the entire rebuild; final publish authorization remains a separate user decision.

## Acceptance criteria

- [ ] All child tasks TASK-0265..TASK-0289 completed with evidence.
- [ ] `docs/rebuild/VNEXT_TRACEABILITY.md` shows unmapped=0, cycles=0, all REQ verified.
- [ ] REQ-FIN-001 Final Acceptance Gate checklist fully checked in TASK-0289.
- [ ] REQ-GOV-012 self-dogfooding passes on this repo (doctor/scan/task doctor/pack/MCP smoke).
- [ ] Working tree clean; no external actions performed (REQ-GOV-010).

## Test steps

Final matrix defined in TASK-0289 (full verification) plus per-task test plans.

## Risks

- Scope size: mitigated by wave-based focused tasks and deterministic next-task rule.
- Upstream dependency drift (MCP SDK/Node LTS): TASK-0266 re-verifies before implementation starts.

## Rollback plan

Branch-local only; `master` untouched throughout; branch can be discarded without remote impact.

## Completion notes

(placeholder — filled at closeout)
