# Task lifecycle

Statuses: `[ ]` pending · `[~]` active · `[x]` completed+verified · `[!]` blocked.

Exactly one `[~]` item at a time. Never mark `[x]` without command output as
evidence in Completion notes. Blocked items stay visible with their blocker;
they are never silently skipped.

Active work lives in `docs/tasks/active/`; completed work lives in
`docs/tasks/archive/` and is resolved by ID (`ackit task show <id>`,
`ackit task list --all`). Archived completed tasks are not open work.

Workflow tasks complete only through the composed gate (evidence complete,
required verdict `PASS`/`PASS_WITH_WARNINGS`, stage complete, no unresolved
`fail`, no blocking drift). Archive completed work promptly with
`ackit task archive <id>`; completed work stays out of `active/`.
