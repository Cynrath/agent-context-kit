# Contributing

This repository is built with its own product discipline (docs-first,
task-first). The workflow below is enforced by the shipped `ackit` CLI.

## Workflow

1. **Task first.** Every change needs a task under `docs/tasks/` created with
   the tool: `ackit task "<title>"`. IDs are tool-allocated; never invent one.
   Keep exactly one `[~]` active checklist item.
2. **Read the canonical context** before non-trivial work:
   `docs/rebuild/GOAL2_BOOTSTRAP.md`, `docs/rebuild/VNEXT_REQUIREMENTS.md`,
   `docs/rebuild/VNEXT_EXECUTION_ORDER.md`, and the active task doc.
3. **Implement minimum correct scope.** No placeholders, no TODO-core, no
   disabled tests, weakened rules, or `any` holes to get green.
4. **Verify per the task's own test plan**, then run the standing chain:

   ```bash
   pnpm lint && pnpm format:check && pnpm typecheck
   pnpm build && pnpm test
   ackit scan --ci --exclude pnpm-lock.yaml
   ```

5. **Record evidence** (commands + pass/fail counts) in the task's Completion
   notes, tick criteria, then a focused Conventional Commit
   (`feat(scope): …`). Never mark complete without evidence.
6. Continue immediately with the next dependency-ready task — there is no
   "later session" for open work (hard rule in `AGENTS.md`).

## Rules

- Offline-first: no network calls/telemetry in product code.
- No secret values or absolute local paths in outputs/artifacts.
- User files are never overwritten without explicit intent flags.
- Out-of-scope list is binding (`VNEXT_REQUIREMENTS.md` §1).
- Remote: fast-forward pushes to `rebuild/ackit-vnext` only; master push,
  force-push, tags, releases, publishes are prohibited.

## Development

```bash
pnpm install --frozen-lockfile
pnpm build && pnpm test
pnpm gen:schemas        # when config/schema surface changed
pnpm run smoke:package  # pack → temp install → CLI smoke
```

Node >= 22. PRs are not used during this rebuild phase; commits land on the
rebuild branch with review by the maintainer.
