# AGENTS.md — AgentContextKit vNext Rebuild

This repository is being rebuilt as **AgentContextKit vNext** (`ackit`, TypeScript + Node.js + npm) on branch `rebuild/ackit-vnext`. The repository's own docs are the single source of truth for agents.

## Canonical entry points (read in this order)

1. `docs/rebuild/GOAL2_BOOTSTRAP.md` — fresh-context bootstrap and execution loop
2. `docs/rebuild/VNEXT_REQUIREMENTS.md` — authoritative requirements (REQ-*)
3. `docs/rebuild/VNEXT_EXECUTION_ORDER.md` — dependency waves + binding next-task rule
4. `docs/rebuild/VNEXT_TRACEABILITY.md` — coverage invariants
5. The current active task under `docs/tasks/`

## Task-first workflow

- New work requires a task doc created with the installed tool: `ackit task "<title>"`. Never invent task IDs.
- Exactly one active checklist item at a time: `[ ]` pending, `[~]` active, `[x]` completed+verified, `[!]` blocked.
- Complete a task only with real evidence recorded in its Completion notes; then a focused Conventional Commit; then immediately continue with the next dependency-ready task.

## Continuous Execution Hard Rule (explicit user mandate)

There is no such thing as "next session" for open work. This is a HARD RULE:

- Do not stop, pause, defer, or hand off while any task in the active todo list / task graph is incomplete.
- Never propose "continue later", "next session", or partial wrap-up while open tasks remain.
- Work task-by-task through the dependency graph continuously; after each completed+committed task, immediately start the next dependency-ready task.
- Only a real external blocker may stop execution; report it and stop only on that blocker.

## vNext validation commands (this branch)

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
pnpm test
pnpm smoke:cli
pnpm gen:schemas   # when config/schema surface changed
ackit scan --ci --exclude pnpm-lock.yaml   # legacy v1 scanner; lockfile exclusion documented in TASK-0267
git diff --check
```

## Git discipline

- Branch `rebuild/ackit-vnext`: normal fast-forward pushes to this branch are allowed.
- Hard prohibitions at all times: master push, force-push, history rewrite, tags, GitHub releases, npm/NuGet publish, workflow dispatch, deployments.
- Never commit generated junk: `.ackit/`, `artifacts/`, `dist/`, `node_modules/`, coverage, reports, prompt packs, context exports.
- v1 release immutability: published NuGet versions/tags/releases of the frozen .NET line remain untouchable on every branch.

## Safety

- Offline-first product: no network calls, telemetry, or uploads in product code (REQ-GOV-001/002).
- No secret values or absolute local paths in any generated artifact or terminal output (REQ-GOV-004/005).
- User files are never overwritten without explicit intent flags (REQ-GOV-008).
- Out-of-scope list is binding: no LLM APIs, vector DB, RAG, untrusted plugin execution, cloud services (REQ-GOV-009).

## Legacy v1 notes

The C#/.NET implementation was removed from this branch (TASK-0267). Historical v1 evidence lives in git history and `docs/tasks/archive/`; the published v1 NuGet line (`1.0.0-rc.1`) is immutable legacy. Do not reference deleted v1 scripts (`scripts/check-package-metadata.ps1`, `verify-release.ps1`, `.codex/*`) — they no longer exist.
