# ADR-0014: Task system & docs-first workflow model

Status: Accepted · Date: 2026-08-22

## Decision
The vNext product ships a first-class task system implementing REQ-TASKS-001..004. Canonical decisions:

- Task documents live under `docs/tasks/` during work and `docs/tasks/archive/` on completion; no giant handoff accumulation files (REQ-TASKS-003).
- One Markdown file per task: human-readable sections plus parseable metadata block carrying id, title, status, dependencies, related ADRs/specs, acceptance criteria checkboxes, test plan, evidence, and completion summary (REQ-TASKS-002).
- Command family `ackit task create|list|show|start|complete|archive|doctor` operates on these files; `complete` gates on unchecked criteria, missing test evidence, invalid references, and still requires explicit user intent for overrides (`--force`) (REQ-TASKS-004).
- Task IDs are allocated by the tool from a monotonic registry; agents never invent IDs.
- Status vocabulary is fixed: pending / active / completed / blocked / cancelled; exactly one active task per repository at a time.

## Rationale
The workflow that built AgentContextKit itself is the product's strongest dogfood surface (REQ-GOV-012); encoding it as a deterministic file format + command family makes agent discipline machine-checkable instead of convention-based.

## Alternatives rejected
Free-form status in a single handoff file (unbounded growth, merge conflicts, no per-task evidence); database-backed tracking (violates offline plain-text repo-first principle).
