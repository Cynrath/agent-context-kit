# TASK-0267: vNext TypeScript repository skeleton reset

## Metadata

- Parent epic: TASK-0264
- Dependencies: TASK-0266
- Unlocks: TASK-0268, TASK-0269
- Requirement IDs: REQ-ARCH-001, REQ-ARCH-004, REQ-ARCH-005, REQ-ARCH-007, REQ-ARCH-008, REQ-ARCH-011 (code standard adopted with toolchain), REQ-DX-001, REQ-DX-002, REQ-DX-003, REQ-DOC-003 (docs layout start)
- Related ADR/spec: ADR-0001 (TS/Node migration), ADR-0002 (single package), ADR-0006 (target tree); MS§5, §6

## Purpose

Replace the C# v1 implementation with the vNext TypeScript/npm skeleton on this branch: pnpm + strict TS + ESM package, modular `src/` tree per ADR-0006, minimal runnable `ackit` CLI (version/help/zero-command stub with real plumbing), test/build/lint toolchain wired, docs layout created.

## Scope

- Remove C# sources/projects/solution from working tree (branch-local; history preserved). Keep: LICENSE, SECURITY.md, historical evidence under `docs/tasks/archive/` decision recorded in completion notes, `.github/` replaced later by TASK-0286.
- Create `package.json` (name per ADR-0013 result, `bin.ackit`, `packageManager` exact pin, engines per Node LTS decision), `tsconfig.json` (strict), `pnpm-lock.yaml`.
- Tooling: Vitest config, single lint/format tool (ADR-0001 records choice), typecheck/build scripts emitting ESM+source maps to `dist/`.
- Minimal CLI entry implementing global options parsing (--root/--config/--json/--quiet/--no-color/--verbose/--debug/--strict), exit-code plumbing per ADR-0007, zero-command summary scaffold, `--version` reading single source of truth (package.json).
- Directory skeleton: src/{cli,core/*,mcp,shared}, templates/, tests/{unit,integration,contract,e2e,security,fixtures}, schemas/, examples/, benchmarks/, .agents/skills/ placeholder layout, updated .gitignore (incl. artifacts/rebuild-baseline/, .ackit/ cache).
- Docs layout dirs: docs/{architecture,concepts,guides,reference,security,decisions,tasks} — canonical planning docs stay at docs/rebuild/.

## Out of scope

Any engine behavior (fs/scan/etc. = later waves); CI workflow rewrite (TASK-0286); README content rewrite (TASK-0287).

## Affected files

- Root: package.json, tsconfig.json, vitest config, lint config, .gitignore, CHANGELOG.md (new-version note stub per ADR-0012)
- Deleted: *.sln(x), src/**/*.csproj, all C# sources, stale v1-only scripts that reference dotnet build/test (list in completion notes)
- Created: full target tree from ADR-0006

## Data/database impact

None.

## Security impact

Fresh dependency set installed via pinned lockfile; no leftover generated artifacts committed.

## Permission/auth impact

None.

## Localization impact

CLI strings English-only from day one.

## UX impact

`ackit --help`, `ackit --version`, bare `ackit` must already behave predictably (stub output documented as such).

## Logging/audit impact

None beyond diagnostics plumbing.

## Acceptance criteria

- [ ] `pnpm install` succeeds with frozen lockfile.
- [ ] `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build` all pass (empty-tree-safe configs).
- [ ] `node dist/cli/index.js --version` prints package version (single-source check contract test).
- [ ] Bare command prints deterministic quick-summary scaffold; JSON mode emits parseable stdout only.
- [ ] No `.cs`/`.csproj`/`.sln*` remain in working tree; removal list recorded.
- [ ] Invalid usage exits with code 2 per ADR-0007.

## Test steps

MS§38 Task C acceptance block verbatim + smoke script `tests/e2e/cli-scaffold.smoke.ts`.

## Risks

Deleting too much (losing LICENSE/docs needed later) → keep-list reviewed in completion notes before commit.

## Rollback plan

Single commit; `git revert` restores C# tree if reset must be undone.

## Completion notes

(placeholder)
