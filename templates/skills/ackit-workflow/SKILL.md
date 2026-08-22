---
name: ackit-workflow
description: Enforce the ACKit docs-first, task-first workflow with one active checklist item and evidence-based completion.
---

# ACKit Workflow

Activate for any repository work session so tasks stay auditable.

## Steps

1. Read the active task under `docs/tasks/`; if none matches the request,
   create one with `ackit task "<title>"` (never invent IDs).
2. Keep exactly one `[~]` active checklist item; implement only that item.
3. Run the task's own test plan; paste pass/fail counts into Completion notes.
4. Tick criteria, focused Conventional Commit, then immediately continue with
   the next dependency-ready task.
5. `ackit doctor` must be green before the first commit of a session.

## Notes

- Unfinished work is never marked complete; checkpoint commits are fine.
- Out-of-scope requests become new tasks instead of scope creep.
