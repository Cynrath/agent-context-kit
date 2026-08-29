# AGENTS.md — AgentContextKit v0.2.0

AgentContextKit (`ackit`, TypeScript + Node.js + npm) is feature-complete on
`master` and ships as the scoped npm package `@cynrath/agent-context-kit`
`0.2.0` (CLI binary `ackit`). The repository's own docs are the single
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
- The old global .NET `ackit` tool must not be used as a validation tool;
  all verification uses the repository-built CLI (see below).

## Canonical entry points (read in this order)

1. `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` — current governance (this file is authoritative)
2. The current active task under `docs/tasks/active/`
3. `docs/v0.2.0/REQUIREMENTS.md`, `docs/v0.2.0/TRACEABILITY.md`, `docs/v0.2.0/ROADMAP.md`, `docs/v0.2.0/EXECUTION_PLAN.md` — v0.2.0 canonical contract
4. `docs/decisions/ADR-0015..0024` (v0.2.0) + `docs/decisions/ADR-0001..0014` (baseline, reused)
5. `docs/rebuild/` — historical vNext Goal-2 evidence, preserved verbatim (not active)
6. Decisions: `docs/decisions/`

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

## Validation commands (repository-built CLI only)

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

- Canonical development branch is `master` (fast-forward pushes per governance).
- The `rebuild/ackit-vnext` branch is retired and preserved as historical evidence only; do not push to it.
- Everything else follows Controlled-release governance above.
- Never commit generated junk: `.ackit/`, `artifacts/`, `dist/`, `node_modules/`, coverage, reports, prompt packs, context exports, packed tarballs.

## Safety

- Offline-first product: no network calls, telemetry, or uploads in product code (REQ-GOV-001/002).
- No secret values or absolute local paths in any generated artifact or terminal output (REQ-GOV-004/005).
- User files are never overwritten without explicit intent flags (REQ-GOV-008).
- Out-of-scope list is binding: no LLM APIs, vector DB, RAG, untrusted plugin execution, cloud services (REQ-GOV-009).

## Browser Companion v0.3 — Corrective Hard Rules (mandatory; violation = NO-GO)

These rules exist because `feat/browser-companion-v0.3` round 1 violated task-first discipline and falsely completed work. They are binding for every agent working on Browser Companion or any multi-task feature.

### Rule 1 — TASK-FIRST IS MANDATORY

For any non-trivial feature, bug fix, migration, architecture change, security change, release work, or multi-file implementation: **no implementation code may be written before the corresponding ACKit task file exists and is fully planned.**

The task must contain, before implementation begins:

- Purpose
- Scope
- Out of scope
- Dependencies
- Affected files / expected areas
- Acceptance criteria
- Test steps
- Security considerations where applicable
- Risks
- Rollback plan

A title-only or placeholder task does **not** satisfy this rule. Creating the task and filling it after implementation has already begun is a violation.

### Rule 2 — PLAN THE COMPLETE TASK CHAIN FIRST

When a request clearly requires multiple dependent tasks:

1. inspect the repository,
2. determine the entire task breakdown,
3. create every planned task,
4. fully populate every task,
5. verify dependencies,
6. run task validation/doctor,
7. only then begin implementation.

Do not create only TASK-1/TASK-2, start coding, and invent TASK-3..N later unless genuinely new information appears. If scope changes during implementation, update/create the relevant task **before implementing the newly discovered work**.

### Rule 3 — TASK PLAN MUST PRECEDE IMPLEMENTATION IN GIT HISTORY

For substantial feature work, the task plan must be committed before the implementation it governs.

Preferred sequence:

```text
commit 1
docs/tasks + ADR/spec/threat model required before implementation

commit 2+
implementation

later commit
tests/evidence/task completion
```

Do not create implementation files first and task documentation afterward in the same or later commit merely to make the history appear task-driven.

### Rule 4 — NEVER FALSELY COMPLETE A TASK

A task may only be marked `completed` when **every required acceptance criterion has actually passed**.

The following phrases indicate that the task is NOT complete:

```text
pending
deferred
next round
not tested
not verified
could not run
blocked
TODO
manual test required
MCP unavailable
will add later
```

unless that item was explicitly out of scope **before implementation began**.

If a mandatory validation is blocked: `status != completed`. Keep the task in progress/blocked or create the correct supported task state. Never write `completed (deterministic portion; live verification pending)` — that is not completed.

### Rule 5 — EVIDENCE MUST MATCH REALITY

Do not tick an acceptance checkbox merely because code appears to implement the requirement. Evidence must come from the required validation mechanism.

- unit behavior → unit/contract test
- real Chrome behavior → real Chrome verification
- CI requirement → successful CI run
- performance claim → benchmark/trace
- cross-platform requirement → actual required platform matrix

Static source inspection is not equivalent to runtime proof.

### Rule 6 — NO QUALITY-GATE BYPASS

Do not make tests/typecheck/lint pass by weakening the gate. Prohibited unless explicitly approved and technically justified:

```text
// @ts-nocheck
// @ts-ignore
broad @ts-expect-error
strict: false
noImplicitAny: false
eslint disable everything
Biome global ignore
skip tests
remove assertions
turn failures into warnings
```

Fix the underlying defect. A green gate obtained by disabling the gate is not evidence.

### Rule 7 — STRICT TYPESCRIPT

New TypeScript subsystems must preserve strict typing unless an accepted ADR explicitly states otherwise. Browser Companion must target `strict = true` and `noImplicitAny = true`. Use actual Chrome API types. Avoid global `declare const chrome: any` when `@types/chrome` can provide the contract. Keep unavoidable third-party boundaries narrow and documented.

### Rule 8 — BROWSER WORK REQUIRES REAL BROWSER EVIDENCE

When implementing or modifying Chrome/Edge extension behavior and Chrome DevTools MCP is available: real Chrome verification is mandatory before final completion. At minimum verify relevant changes through: extension install/load, extension reload, service worker, Side Panel, console errors, runtime messages, network behavior, target-site adapter behavior. Static unit tests are complementary, not a replacement.

### Rule 9 — PROVIDER ADAPTERS ARE INDEPENDENT

Do not infer that an adapter works because another provider works. ChatGPT, Claude, Gemini and GitHub require independent DOM discovery and evidence. Provider-specific selectors remain isolated under provider-specific adapter modules. A broken provider adapter must fail closed and must not affect ACKit core, bridge, or other provider adapters.

### Rule 10 — DOM OPTIMIZATION MUST BE REVERSIBLE

Conversation Performance functionality must never destroy provider conversation state. Default stable mode must not: remove React-managed turn nodes, monkey-patch React/Vue internals, modify provider API traffic, alter conversation history, change model context. Every ACKit DOM optimization must be reversible. `Restore all` and `Emergency Disconnect` must remove ACKit-added attributes, classes, placeholders, observers, timers, listeners, injected UI.

### Rule 11 — EMERGENCY DISCONNECT IS RELEASE-BLOCKING

Browser Companion cannot be considered releasable unless Emergency Disconnect works in real Chrome. It must: (1) abort active bridge requests, (2) clear active session credentials, (3) revoke/stop the bridge session, (4) stop observers/timers/listeners, (5) restore reversible page mutations, (6) disable the affected integration, (7) require explicit reconnect. Failures inside one cleanup step must not prevent remaining cleanup steps.

### Rule 12 — PERFORMANCE CLAIMS REQUIRE MEASUREMENTS

Do not claim `faster`, `less DOM pressure`, `lower layout cost`, `better responsiveness` without measured evidence. For Conversation Performance changes record, where available: detected turn count, visible turn count, compacted turn count, DOM node impact, scripting duration, style/layout duration, paint duration, long tasks, heap/memory indicators, input/scroll responsiveness, trace configuration, browser/version, fixture size. Synthetic measurements and live-site measurements must be distinguished.

### Rule 13 — DO NOT HIDE PROCESS VIOLATIONS

If task-first or evidence rules were violated: document the violation, create corrective work, fix the process, continue forward. Do not rewrite git history merely to make it appear that the correct process happened.

### Rule 14 — COMPLETION ORDER

Before a task is marked complete:

```text
implementation
→ focused tests
→ full affected test suite
→ lint/format/typecheck/build
→ security/offline gates
→ required runtime/manual/MCP checks
→ evidence recorded
→ acceptance criteria checked
→ task completion notes
→ status completed
```

Never reverse this sequence.

### Rule 15 — FINAL FEATURE GO GATE

A multi-task feature cannot receive final GO while any child task has: missing acceptance evidence, pending tests, deferred mandatory scope, TODOs, disabled quality gates, unresolved security findings, failed live verification, missing CI evidence.

## Legacy v1 notes

The C#/.NET implementation was removed from this branch (TASK-0267). Historical v1 evidence lives in git history and `docs/tasks/archive/`; the published v1 NuGet line (`1.0.0-rc.1`) is immutable legacy. Do not reference deleted v1 scripts (`scripts/check-package-metadata.ps1`, `verify-release.ps1`, `.codex/*`) — they no longer exist.
