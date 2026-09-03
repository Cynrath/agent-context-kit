# AGENTS.md — AgentContextKit

AgentContextKit (`ackit`, TypeScript + Node.js + npm) ships as the scoped npm
package `@cynrath/agent-context-kit` (CLI binary `ackit`). The repository's own
docs are the single source of truth for agents.

## Version truth (authoritative — do not hard-code a release number here)

- `package.json` is authoritative for the source-checkout package version.
- The latest immutable npm/GitHub Release is authoritative for the published
  stable version.
- Historical versioned documents (`docs/v0.2.0/**`, old ADRs, CHANGELOG history,
  completed task records) are historical and not current governance.
- This file must stay version-agnostic: it never names a current release number.

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
3. Current product docs: `docs/reference/`, `docs/concepts/`, `docs/guides/`, `docs/architecture/` — current behavior contracts
4. `docs/decisions/` — architecture decisions (baseline reused; release-wave ADRs describe the release that introduced them)
5. `docs/v0.2.0/` — v0.2.0 historical contract (history only, not current governance)
6. `docs/rebuild/` — historical vNext Goal-2 evidence, preserved verbatim (not active)

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

- Canonical development branch is `master`. Changes land via pull request with
  exact-head required CI green — direct pushes are rejected by branch protection.
- PR/release bodies must avoid shell interpolation corruption: write a UTF-8
  body file, pass `node scripts/check-text-hygiene.mjs <file>`, then use
  `gh pr create/edit --body-file <file>` (releases: `--notes-file <file>`).
  Never compose multiline `--body` inline.
- The `rebuild/ackit-vnext` branch is retired and preserved as historical evidence only; do not push to it.
- Everything else follows Controlled-release governance above.
- Never commit generated junk: `.ackit/`, `artifacts/`, `dist/`, `node_modules/`, coverage, reports, prompt packs, context exports, packed tarballs.

## Safety

- Offline-first product: no network calls, telemetry, or uploads in product code (REQ-GOV-001/002).
- No secret values or absolute local paths in any generated artifact or terminal output (REQ-GOV-004/005).
- User files are never overwritten without explicit intent flags (REQ-GOV-008).
- Out-of-scope list is binding: no LLM APIs, vector DB, RAG, untrusted plugin execution, cloud services (REQ-GOV-009).

## Hard Rules — Task-first, Evidence, and Quality Gates (generalized from corrective work; violation = NO-GO)

These rules generalize durable lessons from multi-task corrective work. They apply to any non-trivial feature, bug fix, migration, architecture change, security change, or release work — not only browser work.

### Rule 1 — TASK-FIRST IS MANDATORY

For any non-trivial change: **no implementation code may be written before the corresponding ACKit task file exists and is fully planned.**

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

A title-only or placeholder task does **not** satisfy this rule.

### Rule 2 — PLAN THE COMPLETE TASK CHAIN FIRST

When a request clearly requires multiple dependent tasks:

1. inspect the repository,
2. determine the entire task breakdown,
3. create every planned task,
4. fully populate every task,
5. verify dependencies,
6. run task validation/doctor,
7. only then begin implementation.

### Rule 3 — TASK PLAN MUST PRECEDE IMPLEMENTATION IN GIT HISTORY

For substantial feature work, the task plan must be committed before the implementation it governs.

Preferred sequence:

```text
commit 1 — docs/tasks + ADR/spec/threat model required before implementation
commit 2+ — implementation
later commit — tests/evidence/task completion
```

### Rule 4 — NEVER FALSELY COMPLETE A TASK

A task may only be marked `completed` when **every required acceptance criterion has actually passed**.

Phrases that indicate NOT complete: `pending`, `deferred`, `next round`, `not tested`, `not verified`, `blocked`, `TODO`, `manual test required`, `will add later` — unless explicitly out of scope **before** implementation began.

If mandatory validation is blocked: `status != completed`.

### Rule 5 — EVIDENCE MUST MATCH REALITY

Do not tick acceptance criteria because code appears to implement the requirement. Evidence must come from the required validation mechanism:

- unit behavior → unit/contract test
- browser/platform behavior → real browser/platform verification (not static inspection)
- CI requirement → successful CI run
- performance claim → benchmark/trace
- cross-platform requirement → actual required platform matrix

### Rule 6 — NO QUALITY-GATE BYPASS

Do not make tests/typecheck/lint pass by weakening the gate. Prohibited unless explicitly approved and technically justified:

```text
// @ts-nocheck
// @ts-ignore
broad @ts-expect-error
strict: false
noImplicitAny: false
eslint/biome global ignore disabling
skip tests / remove assertions / turn failures into warnings
```

Fix the underlying defect. A green gate obtained by disabling the gate is not evidence.

### Rule 7 — STRICT TYPESCRIPT WHERE APPLICABLE

New TypeScript subsystems should preserve `strict: true` and `noImplicitAny: true` unless an accepted ADR explicitly states otherwise. Prefer real API types (e.g., `@types/chrome`, `@types/node`) over `any` and keep unavoidable boundaries narrow and documented.

### Rule 8 — PERFORMANCE CLAIMS REQUIRE MEASUREMENTS

Do not claim `faster`, `less DOM pressure`, `lower layout cost`, `better responsiveness` without measured evidence. Record where available: input counts, output counts, timing breakdown (scripting/style/layout/paint), heap/memory, trace config, browser/version, fixture size. Distinguish synthetic vs live-site measurements.

### Rule 9 — DO NOT HIDE PROCESS VIOLATIONS

If task-first or evidence rules were violated: document the violation, create corrective work, fix the process, continue forward. Do not rewrite git history merely to make it appear that the correct process happened.

### Rule 10 — COMPLETION ORDER

Before a task is marked complete:

```text
implementation
→ focused tests
→ full affected test suite
→ lint/format/typecheck/build
→ security/offline gates
→ required runtime/manual checks
→ evidence recorded
→ acceptance criteria checked
→ task completion notes
→ status completed
```

Never reverse this sequence.

### Rule 11 — FINAL FEATURE GO GATE

A multi-task feature cannot receive final GO while any child task has: missing acceptance evidence, pending tests, deferred mandatory scope, TODOs, disabled quality gates, unresolved security findings, failed live verification, or missing CI evidence.

## Legacy v1 notes

The C#/.NET implementation was removed from this branch (TASK-0267). Historical v1 evidence lives in git history and `docs/tasks/archive/`; the published v1 NuGet line (`1.0.0-rc.1`) is immutable legacy. Do not reference deleted v1 scripts (`scripts/check-package-metadata.ps1`, `verify-release.ps1`, `.codex/*`) — they no longer exist.
