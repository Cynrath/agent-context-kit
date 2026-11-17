# Task record namespaces

The current TypeScript task store reads `docs/tasks/active/` and, with `--all`,
`docs/tasks/archive/`. Those two directories share one live ID namespace. Create
new records with the repository-built CLI; `task doctor` validates their IDs,
dependencies and single-active state.

Root-level `TASK-*.md` and `PROJECT-CONTROL-*.md` files preserve the earlier
implementation and migration history. They use a separate namespace: a matching
numeric ID in that history and in the current store is not a duplicate live
task. The historical files are intentionally not loaded or renumbered by the
current task store. Keep their contents and paths as evidence.

Completed current tasks are archived only after their literal acceptance
criteria and completion evidence pass. Historical blocked records retain the
unperformed/superseded acceptance items they describe; a later successful release
does not retroactively complete them.
