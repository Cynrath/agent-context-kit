---
schemaId: "ackit.intent.v1"
id: "INTENT-0002"
title: "managed-asset lifecycle: unified version-aware sync with preview-first, check-gated, content-driven reconciliation of ACKit-owned instruction and skill assets"
status: accepted
createdAt: "2026-09-02"
source: "TASK-0072 user session goal (branch cleanup + managed asset upgrade/sync lifecycle)"
problem: "ACKit owns managed instruction blocks (AGENTS.md, CLAUDE.md/GEMINI.md/.github/copilot-instructions.md shims) and builtin skills, but after an npm package upgrade there was no single explicit, preview-first command to reconcile ALL of them; the ownership primitives existed in two separate engines (init + skills install) with no unified dry-run/check/apply view, no CI-safe staleness gate, and no doctor report."
desiredOutcome: "One first-class command `ackit sync` that reconciles all ACKit-owned managed assets in a single pass with stable statuses, zero-write preview/check modes, content-driven (never version-driven) write decisions, refusal/conflict semantics identical to the existing engines, a read-only doctor staleness row, and zero silent mutation from package install or CLI startup. Proven by a 19-scenario deterministic test matrix including mtime/checksum no-write proofs."
constraints:
  - "Offline-first: no network, telemetry, LLM APIs, or plugin execution"
  - "No new lock/state file: reuse skills.lock.json + managed-block markers as the ownership state"
  - "No SDK surface change (frozen allowlist untouched)"
  - "No ownership-semantics change: refused-non-managed, third-party refusal, conflict+force stay identical (no ADR needed)"
  - "No silent postinstall/startup mutation (audit confirmed absence; must stay absent)"
  - "Doctor remains read-only; managed-asset staleness is advisory, never a hard failure"
  - "Exit codes per ADR-0007 (0/1/2/4); --check gates like scan --ci"
nonGoals:
  - "Browser Companion (paused, separate branch)"
  - "New distribution channels, releases, tags, publishes this session"
  - "Reimplementing managed-block or skills ownership engines"
  - "Changing canonical managed-block content"
  - "TASK-0067..0071 follow-up content"
affectedSystems:
  - "src/core/onboarding (instruction surfaces planning, sync engine)"
  - "src/core/skills/install (lock write material-change gating)"
  - "src/cli (sync command, program registration, doctor row)"
  - "docs (cli reference, agent-integration guide, getting-started)"
acceptanceCriteria:
  - id: "AC-001"
    requirement: "ackit sync --dry-run/--check/apply/--json behave per spec with the stable status vocabulary (up-to-date, would-create, would-update-managed, updated-managed, installed, updated, conflict-user-modified, refused-non-managed, refused-third-party)"
  - id: "AC-002"
    requirement: "Rule H: ACKit version change with unchanged canonical content produces zero file writes, proven by full-tree checksum snapshot plus mtime assertions on instruction files and the skills lock"
  - id: "AC-003"
    requirement: "User files without ACKit managed markers are never touched, even with --force (refused-non-managed)"
  - id: "AC-004"
    requirement: "Third-party skills are never overwritten, even with --force (refused-third-party); owned locally-modified skills conflict without --force and update only with --force"
  - id: "AC-005"
    requirement: "Lock writes are material-change-gated and contain no absolute paths; doctor reports managed-asset staleness read-only and never writes"
  - id: "AC-006"
    requirement: "Full gate matrix green: lint, format, typecheck, build, test (>=94 files/536 tests incl. new matrix), smokes, offline-egress, scan --ci exit 0"
openQuestions: []
risks:
  - "Status vocabulary drift -> pinned by contract tests"
  - "Windows mtime granularity -> checksums are primary no-write proof"
  - "init.ts refactor regression -> zero public behavior change, existing tests unchanged and green"
---

# managed-asset lifecycle: unified version-aware sync with preview-first, check-gated, content-driven reconciliation of ACKit-owned instruction and skill assets

Intent document (ackit.intent.v1).

## Notes

- The audit (TASK-0072 Current-state evidence) proved all primitive ownership
  behaviors already existed and were tested; the only real gap was the
  unified, version-aware orchestration layer.
- Design decision: reuse, do not duplicate. `planOrApplyManagedSync` calls
  `planInstructionSurfaces` (extracted from init) and `installSkills`; no
  second lock, no second ownership engine.
- Content-driven rule (H) is enforced structurally: the instruction engine
  decides by block content, the skills engine by checksum; the lock write is
  now material-change-gated so a version bump alone rewrites nothing.
