# AGENTS.md — AgentContextKit vNext

AgentContextKit vNext (`ackit`, TypeScript + Node.js + npm) is feature-complete on
branch `rebuild/ackit-vnext` and is in the **release-transition stage**: the branch
is being prepared for merge to `master` and a future first npm publication of
`@cynrath/agent-context-kit` `0.1.0`. The repository's own docs are the single
source of truth for agents.

## Controlled-release governance

Release actions are **user-authorized, not agent-authorized**:

- `master` push/merge, npm publish, tag creation/movement, and GitHub Releases may
  be performed **only inside a task that carries explicit user authorization** for
  that exact action. Absent that authorization in the active task, they are
  prohibited — do not infer it from past tasks or this document.
- Always prohibited: force-push, rebase, history rewrite, tag movement/deletion,
  workflow dispatch, deployments.
- The frozen legacy .NET line stays immutable everywhere: published NuGet
  versions/tags/releases (`1.0.0-rc.1`, earlier alphas) are untouchable; no NuGet
  or .NET release pipeline exists or may be created for vNext.
- The old global .NET `ackit` tool must not be used as a vNext validation tool;
  all vNext verification uses the repository-built CLI (see below).
- Normal fast-forward pushes to `rebuild/ackit-vnext` are allowed and expected.

## Canonical entry points (read in this order)

1. `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` — current governance (this file is authoritative)
2. The current active task under `docs/tasks/active/`
3. `docs/rebuild/VNEXT_REQUIREMENTS.md` — authoritative requirements contract (REQ-*)
4. `docs/rebuild/VNEXT_EXECUTION_ORDER.md`, `docs/rebuild/VNEXT_TRACEABILITY.md` — Goal-2 wave/coverage records
5. `docs/rebuild/GOAL2_BOOTSTRAP.md` — completed Goal-2 bootstrap, preserved as historical execution record
6. Decisions: `docs/rebuild/decisions/ADR-0001..0013` and `docs/decisions/`

## ACKit-first / task-first / docs-first workflow

- New work requires a task doc created with the repository's own tool:
  `node dist/cli/index.js task "<title>"`. Never invent task IDs.
- Exactly one active checklist item at a time: `[ ]` pending, `[~]` active, `[x]` completed+verified, `[!]` blocked.
- Complete a task only with real evidence recorded in its Completion notes; then a focused Conventional Commit; then immediately continue with the next dependency-ready task.

## Continuous Execution Hard Rule (explicit user mandate)

There is no such thing as "next session" for open work. This is a HARD RULE:

- Do not stop, pause, defer, or hand off while any task in the active todo list / task graph is incomplete.
- Never propose "continue later", "next session", or partial wrap-up while open tasks remain.
- Work task-by-task through the dependency graph continuously; after each completed+committed task, immediately start the next dependency-ready task.
- Only a real external blocker may stop execution; report it and stop only on that blocker.

## vNext validation commands (repository-built CLI only)

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm gen:schemas   # when config/schema surface changed
pnpm build
pnpm test
pnpm smoke:cli
pnpm run smoke:package   # real-tarball isolated consumer smoke
node .\dist\cli\index.js config check
node .\dist\cli\index.js doctor
node .\dist\cli\index.js task doctor
node .\dist\cli\index.js skills validate
node .\dist\cli\index.js instructions
node .\dist\cli\index.js scan --ci
git diff --check
```

## Git discipline

- Branch `rebuild/ackit-vnext`: normal fast-forward pushes to this branch are allowed.
- Everything else follows Controlled-release governance above.
- Never commit generated junk: `.ackit/`, `artifacts/`, `dist/`, `node_modules/`, coverage, reports, prompt packs, context exports, packed tarballs.

## Safety

- Offline-first product: no network calls, telemetry, or uploads in product code (REQ-GOV-001/002).
- No secret values or absolute local paths in any generated artifact or terminal output (REQ-GOV-004/005).
- User files are never overwritten without explicit intent flags (REQ-GOV-008).
- Out-of-scope list is binding: no LLM APIs, vector DB, RAG, untrusted plugin execution, cloud services (REQ-GOV-009).

## Legacy v1 notes

The C#/.NET implementation was removed from this branch (TASK-0267). Historical v1 evidence lives in git history and `docs/tasks/archive/`; the published v1 NuGet line (`1.0.0-rc.1`) is immutable legacy. Do not reference deleted v1 scripts (`scripts/check-package-metadata.ps1`, `verify-release.ps1`, `.codex/*`) — they no longer exist.
