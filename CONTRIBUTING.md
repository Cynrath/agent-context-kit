# Contributing

This repository is built with its own product discipline (docs-first,
task-first). The workflow below is enforced by the shipped `ackit` CLI.

## Workflow

1. **Task first.** Every change needs a task under `docs/tasks/active/` created
   with the repository's own CLI: `node dist/cli/index.js task "<title>"`.
   IDs are tool-allocated; never invent one.
   Keep exactly one `[~]` active checklist item.
2. **Read the canonical context** before non-trivial work:
   `AGENTS.md` (governance), `docs/rebuild/VNEXT_REQUIREMENTS.md`,
   and the active task doc.
3. **Implement minimum correct scope.** No placeholders, no TODO-core, no
   disabled tests, weakened rules, or `any` holes to get green.
4. **Verify per the task's own test plan**, then run the standing chain:

   ```bash
   pnpm lint && pnpm format:check && pnpm typecheck
   pnpm build && pnpm test
   node dist/cli/index.js scan --ci
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
- Remote governance (see `AGENTS.md`): fast-forward pushes to
  `rebuild/ackit-vnext` are open; `master` merge, npm publish, tags, and GitHub
  Releases are user-authorized actions only; force-push and history rewrite are
  always prohibited.

## Development

```bash
pnpm install --frozen-lockfile
pnpm build && pnpm test
pnpm gen:schemas        # when config/schema surface changed
pnpm run smoke:package  # pack → temp install → CLI smoke
```

Node >= 22. Changes land via pull requests targeting `master` (or fast-forward
pushes to an open development branch); both run the same CI gate.
