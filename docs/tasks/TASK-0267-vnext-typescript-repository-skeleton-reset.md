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

- [x] `pnpm install` succeeds with frozen lockfile.
- [x] `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build` all pass (empty-tree-safe configs).
- [x] `node dist/cli/index.js --version` prints package version (single-source check contract test).
- [x] Bare command prints deterministic quick-summary scaffold; JSON mode emits parseable stdout only.
- [x] No `.cs`/`.csproj`/`.sln*` remain in working tree; removal list recorded.
- [x] Invalid usage exits with code 2 per ADR-0007.

## Test steps

MS§38 Task C acceptance block verbatim + smoke script `tests/e2e/cli-scaffold.smoke.ts`.

## Risks

Deleting too much (losing LICENSE/docs needed later) → keep-list reviewed in completion notes before commit.

## Rollback plan

Single commit; `git revert` restores C# tree if reset must be undone.

## Completion notes

Executed 2026-08-22 on `rebuild/ackit-vnext`.

Removal list (branch-local; history preserved):
- C# runtime: `AgentContextKit.sln`, `AgentContextKit.slnx`, `global.json`, `src/AgentContextKit.Cli/**`, `src/AgentContextKit.Core/**`, `tests/AgentContextKit.Tests/**`, v1 golden fixtures under `tests/fixtures/`.
- v1 sample repos: entire `samples/` (contained tracked `.cs`/`.csproj`/`.sln`; untracked generated `bin/`/`obj/` leftovers also removed from working tree).
- Stale root files: `README.tr.md`, `winrar_exclude.txt`, tracked handoff junk `.codex/*.md`, provider shim `.cursor/rules/project.mdc`.
- Scripts: 41 of 42 deleted (all dotnet/release-specific: check-package-metadata, verify-release, prepare-release, test-existing-*-recovery, etc.). Kept only generic `scripts/check-tracked-vs-untracked-md.ps1`.
- Note: root `AGENTS.md` still references some deleted scripts and the Handoff section references `.codex/*`; this temporary inconsistency is resolved by TASK-0276 (canonical workflow + provider shims). `.github/workflows` intentionally untouched until TASK-0286.

Created skeleton (all verified working):
- `package.json`: name `@cynrath/agent-context-kit` (per ADR-0013 registry decision), version 0.1.0, ESM, `bin.ackit -> dist/cli/index.js`, engines `>=22`, `packageManager` pnpm@11.22.0. Runtime dep commander ^15.0.0 only.
- Dev deps verified against registry 2026-08-22: typescript ^7.0.2 (native compiler, current latest), vitest ^4.1.11 + @vitest/coverage-v8 ^4.1.11, @biomejs/biome ^2.5.10 (registry latest; earlier guess 2.9.4 did not exist), @types/node ^24.x (matches oldest supported LTS line).
- `tsconfig.json` strict NodeNext ESM (+noUncheckedIndexedAccess etc.), `tsconfig.build.json` emits dist with declarations+source maps; shebang preserved in emitted CLI.
- `src/shared/exit-codes.ts` (ADR-0007 frozen taxonomy), `src/shared/version.ts` (package.json single source of truth via createRequire, works from src/dist/installed layout), `src/shared/diagnostics.ts` (ANSI/control-char terminal sanitation REQ-SEC-003; two justified biome-ignore noControlCharactersInRegex suppressions — the regexes exist to strip control characters).
- `src/cli/index.ts`: all global options per REQ-DX-003, exitOverride mapping help/version→0 and usage errors→2 (ADR-0007), deterministic bare summary scaffold + pure JSON stdout (`ackit.summary.v0`).
- Tests: unit exit-codes/diagnostics; contract in-process CLI behavior + version single-source + built-artifact contract (dist spawn); e2e smoke script `tests/e2e/cli-scaffold.smoke.mjs`.
- Dirs: docs/{architecture,concepts,guides,reference,security}, schemas/, examples/, benchmarks/, templates/skills/, tests/{unit,integration,contract,e2e,security,fixtures}; new node `.gitignore`; CHANGELOG rewritten with 0.1.0 rebuild entry atop verbatim legacy v1 section (ADR-0013).

Validation evidence:
- `pnpm install --frozen-lockfile` → 0. Chain: lint=0, format:check=0, typecheck=0 (tsc -p TS7), build=0, vitest 5 files / 20 tests passed=0, `pnpm smoke:cli`=0.
- Contract checks confirmed: unknown option exits 2; excess argument exits 2; `--version` prints package.json version; `--json` stdout parses cleanly.
- `ackit scan --ci --exclude pnpm-lock.yaml` → 0. Justified suppression: the legacy v1 scanner flags pnpm lockfile integrity hashes as high-entropy secrets (false positive; scanner predates pnpm awareness). Persistent exclude impossible while `.ackit/config.yml` is gitignored by design; the vNext scanner (TASK-0271) will handle lockfiles natively and remove this suppression.
- Working tree contains zero .cs/.csproj/.sln/.slnx files after cleanup.
- External actions: none.
