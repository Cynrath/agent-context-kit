# GOAL 2 BOOTSTRAP — AgentContextKit vNext Rebuild

You are a fresh agent. Everything needed to execute the rebuild is in this repository. Do not ask for prior conversation context; read, verify, and continue.

## Reality anchors

- Repository: `O:\projeler\agent-context-kit` (GitHub: `Cynrath/agent-context-kit`)
- Working branch: `rebuild/ackit-vnext` (local only — never push it)
- Planning base: branch created from `master` @ `c49f97f8eb2d520dc759c6fa603079f187b851b7`
- Goal 1 planning commit: see `git log --oneline -n 5` on this branch (docs(rebuild) commit)
- Runtime reality > any SHA written here. Verify with git first.

## Canonical documents (read in this order)

1. `docs/rebuild/VNEXT_REQUIREMENTS.md` — all REQ-* requirements (authoritative)
2. `docs/rebuild/VNEXT_EXECUTION_ORDER.md` — waves + BINDING next-task rule
3. `docs/rebuild/VNEXT_TRACEABILITY.md` — coverage invariants + v1 classification
4. `docs/rebuild/decisions/` — ADR-0001..0013 (ADR-0003 is Accepted invariant)
5. Master epic: `docs/tasks/TASK-0264-agentcontextkit-vnext-rebuild-master-epic.md`

## Installed ACKit (v1 .NET tool — use until vNext replaces it)

```powershell
ackit --version          # 1.0.0-rc.1
ackit doctor             # must exit 0
ackit scan --ci          # threshold gate
ackit task "<title>"     # ONLY sanctioned way to create new task docs
```

Task IDs are allocated by the tool. Never invent IDs.

## Mandatory preflight (every session)

1. `git status --short` + `git rev-parse HEAD` — reconcile unexpected dirt before work.
2. Confirm branch = `rebuild/ackit-vnext`.
3. Read next task file from `docs/tasks/` per selection rule below.
4. `ackit doctor` green before first commit of the session.

## Next-task selection (deterministic, no judgment calls)

First task where: status ≠ completed AND dependencies completed AND lowest wave AND lowest ID. Expected sequence starts: **TASK-0265** → TASK-0266 → TASK-0267 → {0268 ∥ 0269} → …

## Task execution loop (per task, mandatory order)

Read task doc → implement minimum correct scope → unit/integration/security tests per its Test steps → lint/typecheck/build (`pnpm ...`) → CLI smoke if command touched → `ackit scan --ci` → update docs touched by scope → tick acceptance criteria boxes → write evidence into Completion notes → `git diff --check` → focused Conventional Commit → mark completed → NEXT TASK (do not pause to ask).

## Global safety rules

- Offline-first product: zero network calls, telemetry, analytics (REQ-GOV-001/002).
- Never escape repository root via links/traversal (REQ-GOV-003).
- Never print secret values or absolute local paths into artifacts (REQ-GOV-004/005).
- Never overwrite user files without explicit intent flags (REQ-GOV-008).
- Out-of-scope list is binding (REQ-GOV-009): no LLM APIs, vector DB, RAG, plugins-exec, bots, cloud.
- Quality bar (MS§3.6): no placeholder implementations, no TODO-core, no disabled tests/lint to pass, no `any` holes, no fake snapshots.

## Prohibited external actions

Remote push · force-push · tags · GitHub Releases · npm publish · NuGet publish · workflow dispatch · deployments · paid services · history rewrite. Local commits on the rebuild branch are allowed and expected.

## Git discipline

Conventional Commits scoped to real diff (`feat(core):`, `fix(scan):`, `docs:` …). One focused commit per task when practical. Never touch `master`. Generated junk never committed: `.ackit/`, `artifacts/`, `dist/`, `node_modules/`, reports.

## Definition of final completion (all must hold)

1. Every task TASK-0265..0289 completed with evidence.
2. Traceability invariants hold (unmapped=0, cycles=0 — see VNEXT_TRACEABILITY.md).
3. MS§46 Final Acceptance Gate fully checked (TASK-0289).
4. Self-dogfood green: vNext `doctor`/`scan`/task-doctor on this repo; pack producible; MCP starts.
5. Clean-environment matrix green: frozen install, lint, format:check, typecheck, test, build, tarball smoke (MS§47).
6. Final report per MS§48 including "no external actions performed".
7. Working tree clean; remote untouched.

If context runs low mid-task: write honest state into the task's Completion notes (never mark complete), checkpoint-commit, and let the next session resume via this bootstrap.
