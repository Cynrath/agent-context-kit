---
name: ackit-workflow
description: Enforce the ACKit docs-first, task-first workflow with one active checklist item and evidence-based completion.
---

# ACKit Workflow

Activate for any repository work session so tasks stay auditable.

See [task lifecycle](references/task-lifecycle.md) for statuses, gates, and archive rules.

## Steps

1. Discover work with `ackit task list` / `ackit task show <id>`; active work lives in `docs/tasks/active/` (completed work lives in `docs/tasks/archive/` and is resolved by ID, never treated as open). If none matches, create one with `ackit task create "<title>" [--intent INTENT-####] [--spec <path>] [--decision <path>] [--plan <path>]` (never invent IDs).
2. Keep exactly one `[~]` active checklist item; implement only that item; plan before code.
3. For workflow-enabled tasks, honor the declared profile: `ackit workflow set <id> --profile quick|standard|high-risk`, `ackit workflow show <id>`, `ackit workflow advance <id>`, `ackit workflow verify <id> --outcome pass|fail`. Provide `intentRef`/`specRefs`/`decisionRefs`/`planRef` when the stage requires them; referenced files must exist on disk.
4. Checkpoint long work: `ackit checkpoint create <id> --next-objective "<text>"`, `ackit checkpoint show <id>`, `ackit checkpoint validate <id>`, `ackit checkpoint export <id> [--out <file>]`; resume with `ackit task resume <id>`.
5. Link proof, do not assert it: `ackit evidence sync <id>`, `ackit evidence verify <id> --criterion AC-001 --type test --ref "<proof>"`, `ackit evidence validate <id>`; independent check via `ackit verification bundle <id>` then `ackit verification record <id> --verdict <file>` / `ackit verification show <id>`; watch drift with `ackit drift check <id>` (`ackit drift check-active` at the pre-commit gate).
6. Complete only through the composed gate: evidence complete, required verdict `PASS`/`PASS_WITH_WARNINGS` with zero blocking findings, stage complete, no unresolved `fail` attempt, no blocking drift. `VERIFY failed -> completed` is impossible without explicit `ackit task complete <id> --force` (tier2 boundary). Never mark `[x]` without command output in Completion notes.
7. Archive after final evidence: `ackit task archive <id>` (bulk `ackit task archive --completed [--dry-run]` moves completed-only; pending/active/blocked never move). `ackit task doctor` reports `TASK-COMPLETED-IN-ACTIVE` for completed work left in `active/`.
8. Gates before commit: `ackit doctor`, `ackit task doctor`, `ackit scan --ci`; run the task's own test plan and paste pass/fail counts into Completion notes; focused Conventional Commit, then immediately continue with the next dependency-ready task.

## Notes

- Unfinished work is never marked complete; checkpoint commits are fine.
- Out-of-scope requests become new tasks instead of scope creep.
- Tasks without workflow state keep pre-expansion behavior; workflow tasks enforce the gate.
