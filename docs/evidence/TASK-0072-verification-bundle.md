schema: ackit.verification-bundle.v1
task: TASK-0072

# ACKit Verification Bundle

You are an INDEPENDENT verifier with a fresh context. Review the material
below, judge semantic compliance against the acceptance criteria, and emit
an ackit.verdict.v1 verdict (PASS | PASS_WITH_WARNINGS | REWORK_REQUIRED |
BLOCKED). You should not implement the feature you are judging.

## Intent

INTENT-0002: managed-asset lifecycle: unified version-aware sync with preview-first, check-gated, content-driven reconciliation of ACKit-owned instruction and skill assets [accepted]
fingerprint: 8887bff5f89d3ded95b5c09f11d1c4308216a8c076c5d7d1ecf69f56f16f1875
problem: ACKit owns managed instruction blocks (AGENTS.md, CLAUDE.md/GEMINI.md/.github/copilot-instructions.md shims) and builtin skills, but after an npm package upgrade there was no single explicit, preview-first command to reconcile ALL of them; the ownership primitives existed in two separate engines (init + skills install) with no unified dry-run/check/apply view, no CI-safe staleness gate, and no doctor report.
desired outcome: One first-class command `ackit sync` that reconciles all ACKit-owned managed assets in a single pass with stable statuses, zero-write preview/check modes, content-driven (never version-driven) write decisions, refusal/conflict semantics identical to the existing engines, a read-only doctor staleness row, and zero silent mutation from package install or CLI startup. Proven by a 19-scenario deterministic test matrix including mtime/checksum no-write proofs.
non-goals: Browser Companion (paused, separate branch); New distribution channels, releases, tags, publishes this session; Reimplementing managed-block or skills ownership engines; Changing canonical managed-block content; TASK-0067..0071 follow-up content
acceptance criteria: AC-001 ackit sync --dry-run/--check/apply/--json behave per spec with the stable status vocabulary (up-to-date, would-create, would-update-managed, updated-managed, installed, updated, conflict-user-modified, refused-non-managed, refused-third-party) | AC-002 Rule H: ACKit version change with unchanged canonical content produces zero file writes, proven by full-tree checksum snapshot plus mtime assertions on instruction files and the skills lock | AC-003 User files without ACKit managed markers are never touched, even with --force (refused-non-managed) | AC-004 Third-party skills are never overwritten, even with --force (refused-third-party); owned locally-modified skills conflict without --force and update only with --force | AC-005 Lock writes are material-change-gated and contain no absolute paths; doctor reports managed-asset staleness read-only and never writes | AC-006 Full gate matrix green: lint, format, typecheck, build, test (>=94 files/536 tests incl. new matrix), smokes, offline-egress, scan --ci exit 0

## Workflow

profile: standard, stage: verify

## Task document

source: docs/tasks/active/TASK-0072-managed-asset-lifecycle-unified-version-aware-sy.md [active]

````

## Purpose

Provide the one missing layer of ACKit's managed-asset lifecycle: a **unified, version-aware, preview-first reconciliation command** (`ackit sync`) that reconciles ALL ACKit-owned managed assets in one pass — the managed instruction block in `AGENTS.md`, the provider shims (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`), and the builtin skills — with content-driven (not version-number-driven) write decisions, so that upgrading the npm package never silently rewrites repository files and users get a single, safe, explicit command for post-upgrade reconciliation.

The audit (2026-09-02, this task's Current-state evidence) proves every *primitive* safety behavior already exists and is tested: managed-block ownership/refusal/idempotence (`ensureManagedBlock` + `planOrApplyInit`), skills lock/ownership/conflict/third-party-refusal (`installSkills` + `skills.lock.json`), packaged-template discovery (`findTemplatesSkillsDir`), and no postinstall/startup mutation (no `postinstall` script; scan/doctor read-only). This task does NOT reimplement any of that — it adds the orchestration layer that unifies them behind one first-class command with `--dry-run` / `--check` / `--json` / `--force`, and adds a read-only managed-asset staleness check to `doctor`.

## Current-state evidence (audit 2026-09-02)

- `src/core/onboarding/managed-block.ts`: `ensureManagedBlock` (created/updated/unchanged/repaired; owns only marker spans; duplicate repair; trailing-newline normalization only), `hasManagedBlock`. Tests: `tests/integration/init/init.test.ts` (dry-run zero-mutation snapshot, idempotent re-run zero diff, `refused-non-managed` on user CLAUDE.md with byte-prefix preservation, duplicate-block repair, graph+skills clean, lock no absolute paths).
- `src/core/onboarding/init.ts`: `planOrApplyInit` — 4 providers (`codex`→AGENTS.md, `claude`→CLAUDE.md `@AGENTS.md`, `gemini`→GEMINI.md, `copilot`→.github/copilot-instructions.md), refusal without markers, **no write when action==unchanged** (L104), skills install only on apply.
- `src/core/skills/install.ts`: `installSkills` with statuses `installed|up-to-date|updated|conflict-user-modified|refused-third-party|reinstalled`; checksum-based decisions (identical→up-to-date zero-diff; lock-tracked + changed→updated; lock-tracked + locally modified→conflict unless `--force`; no lock entry→refused-third-party); `SkillsLock` schemaVersion 1 at `.ackit/skills.lock.json`; `lockHasAbsolutePaths` guard; lock entries carry per-sync `version` (ACKit version at last sync) and `checksum`. Tests: `tests/integration/skills/install.test.ts` (clean install, zero-diff second run, third-party refusal untouched, lock paths, conflict-then-force with checksum update).
- CLI: `ackit init [--agents] [--dry-run]` (exit 4 on refusals), `ackit skills install|sync [--force]` (exit 4 on refusals/conflicts). **No top-level `sync` command exists** — no conflict with existing vocabulary.
- `doctor` (`src/cli/commands/doctor.ts`): config/tasks/skills checks only; no managed-asset staleness report; NEVER writes (verified).
- `package.json`: no `postinstall`/`preinstall`; `files` includes `dist`, `templates`, `schemas` — packaged CLI discovers builtin skills via `findTemplatesSkillsDir` (walk-up from dist/ to templates/skills).
- Exit codes (ADR-0007): 0 ok, 1 threshold, 2 usage, 3 environment, 4 security boundary, 5 internal.
- `ackit scan` / `ackit doctor` / CLI startup: no repository mutation paths (read-only; scan writes only `--write-baseline`/`--output` with explicit user flags).
- SDK surface (`src/index.ts` + `tests/contract/api-surface`): frozen allowlist; this task adds NO new SDK exports (orchestration is CLI-level; primitives stay internal as before — `planOrApplyInit` and `installSkills` are already non-exported internals today).

### Capability audit summary (gap = orchestration only)

| Requirement | Status |
|---|---|
| Managed AGENTS.md block, shims, refusal, byte preservation, idempotence, no-write-when-unchanged | Exists (see above) |
| Skills lock, install/update/conflict/force/third-party refusal, relative lock paths | Exists |
| Packaged template discovery | Exists |
| No silent postinstall/startup mutation | Exists |
| **Unified preview/check/apply over instructions+skills together** | **Missing** |
| **Content-driven (not version-driven) reconciliation across both engines** | **Missing** (each engine is content-driven individually, but there is no combined view; the skills lock's `version` field is informational today) |
| **`--check` read-only CI mode with stable statuses** | **Missing** |
| **doctor managed-asset staleness report (read-only)** | **Missing** |

## Scope

1. **New core module `src/core/onboarding/sync.ts`** (name: managed-asset sync engine):
   - `planOrApplyManagedSync(root, { dryRun, check, force, builtinsDir?, version? })` → `ManagedSyncResult`:
     - orchestrates the EXISTING engines: `planOrApplyInit`-equivalent instruction planning (reuse `ensureManagedBlock`/`hasManagedBlock`/`MANAGED_INNER`/`TARGET_FILES` via a refactored shared path, NOT a copy) + `installSkills` (with `force`).
     - MUST NOT duplicate ownership logic — call the existing functions; refactor `init.ts` minimally to expose a planning-only path (e.g. extract `planInstructionSurfaces(root)` that both `planOrApplyInit` and sync use).
     - Aggregates per-asset rows with stable statuses (vocabulary per session spec §8): `up-to-date`, `would-create`, `would-update-managed`, `updated-managed`, `installed`, `updated`, `conflict-user-modified`, `refused-non-managed`, `refused-third-party`.
     - `check` mode: zero writes, CI-safe; exit 1 (threshold) when any row is `would-*`, `conflict-*`, or `refused-*` — i.e. "not fully in sync"; exit 0 only when everything is `up-to-date`/`installed`/`updated` *after apply semantics* is not applicable (check never applies).
     - `dryRun`: zero writes; prints the plan (would-* statuses) but exit 0 regardless (preview, not gate).
     - default (apply): performs writes through the existing engines; exit 4 if any `refused-*`/`conflict-user-modified` remains (consistent with init/skills exit conventions); exit 0 otherwise.
   - **Content-driven rule (session spec H)**: the instruction-engine already decides by content (`unchanged` → no write). The skills engine decides by checksum. Sync NEVER rewrites purely because the ACKit version string differs. The lock's `version` field is refreshed in passing when a genuine content sync writes the lock anyway (existing `installSkills` behavior upserts version on up-to-date paths — acceptable: lock rewrite is metadata, not user content; but instruction files are never touched on `unchanged`).
   - **State**: NO new lock/state file. Reuse `.ackit/skills.lock.json` (skills) + marker-based ownership (instructions) as the complete ownership state. Adding a separate managed-asset state file would duplicate capability (session spec §7 "prefer extending/reusing existing").
2. **CLI `ackit sync`** (`src/cli/commands/sync.ts` + registration in `program.ts` after `init`):
   - `ackit sync [--dry-run] [--check] [--json] [--force]` (+ global `--root`/`--config`/`--quiet`/`--no-color`/`--verbose`/`--debug`/`--strict`).
   - `--check` and `--dry-run` mutually exclusive with apply; `--check` implies read-only gate; default is apply (explicit state-changing command).
   - Terminal + JSON output (schemaVersion `ackit.managed-sync.v1`); deterministic ordering (instructions sorted by provider, then skills by name).
3. **Doctor integration** (`src/cli/commands/doctor.ts` + `src/core/onboarding/sync.ts` read-only plan):
   - New check row `managed assets`: `up-to-date` / `updates available` / `conflict-user-modified` (+ refused-* surfaced in detail), derived from the read-only planning pass.
   - NEVER writes; NOT a hard failure by default (ok:true unless strict tiering policy exists — keep ok:true, report detail; hard CI gating stays with `ackit sync --check`).
4. **Tests** (new `tests/integration/onboarding/sync.test.ts` + doctor additions in an appropriate existing/new test file; full list in Acceptance criteria — 19 mandated scenarios from session spec §13 where applicable, using mtime/write-assertions where practical):
   - fixtures via `mkdtemp` (existing test pattern); builtins-dir test seam for version-simulation (existing pattern in `install.test.ts`).
   - **Crucially**: rule-H test — new ACKit version (simulate via `version` option/lock field) with unchanged canonical content → zero instruction-file writes (mtime + checksum assertions) and skills `up-to-date`.
5. **Docs**: `docs/reference/cli.md` (sync row), `docs/guides/agent-integration.md` (lifecycle section: init = first-time, sync = post-upgrade reconciliation; the two documented quotes from session spec §15), `docs/guides/getting-started.md` (brief mention), doctor docs if a doctor reference exists. No release-notes/CHANGELOG entry this session (no release authorized); CHANGELOG for the next release will be authored then.
6. **CLI smoke**: extend `tests/e2e/cli-scaffold.smoke.mjs` or add a focused e2e that runs `ackit sync --check --json` on the fixture (deterministic exit + JSON shape) — smallest viable addition.

## Out of scope

- Any new lock/state file (skills lock + markers are the state).
- New SDK exports (api-surface allowlist untouched).
- New ownership semantics/ADR: ownership rules are unchanged (refused-non-managed, third-party refusal, conflict+force) — no ADR required; this is orchestration over frozen semantics. If review finds semantics MUST change, stop and ADR first.
- npm publish / VS Code / GitHub release (prohibited this session).
- Moving `MANAGED_INNER` content (canonical block text unchanged).
- Postinstall/startup mutation of any kind (prohibited; nothing to remove — audit confirms absence).
- TASK-0067..0071 content (separate planned follow-ups).
- Browser Companion (paused).

## Dependencies

- TASK-0066 (completed; this is post-release product work on master).
- Existing engines: `src/core/onboarding/{init,managed-block}.ts`, `src/core/skills/install.ts` (frozen semantics, reused not duplicated).

## Affected files

- `src/core/onboarding/sync.ts` (new — sync engine)
- `src/core/onboarding/init.ts` (minimal refactor: extract shared planning path; public behavior unchanged)
- `src/core/onboarding/index.ts` (export sync types for internal CLI use)
- `src/cli/commands/sync.ts` (new — CLI command)
- `src/cli/program.ts` (register `sync`)
- `src/cli/commands/doctor.ts` (managed-assets read-only check row)
- `tests/integration/onboarding/sync.test.ts` (new — 19-scenario matrix)
- `tests/integration/doctor/managed-assets.test.ts` (new — doctor read-only/no-write + staleness)
- `tests/e2e/cli-scaffold.smoke.mjs` (sync --check smoke) OR a focused addition in an existing e2e — final placement decided during implementation
- `docs/reference/cli.md`, `docs/guides/agent-integration.md`, `docs/guides/getting-started.md`
- `docs/tasks/active/TASK-0072-*.md` (this file, evidence)

## Required tests (acceptance-gated; each must pass with recorded counts)

Mandated matrix (session spec §13):

1. initial managed AGENTS creation (sync on clean repo → `would-create`/`created`)
2. existing user AGENTS without managed block → refused/untouched (bytes+mtime)
3. managed AGENTS + user text outside block → only block updates; user prefix bytes preserved
4. canonical block unchanged → zero file write (mtime + checksum)
5. package version changes but canonical content does not → zero write (rule H)
6. canonical content changes → managed block updates
7. provider shims follow same ownership behavior (CLAUDE/GEMINI/copilot)
8. third-party skill collision → refusal, file untouched
9. owned skill unchanged locally + builtin changed → update
10. owned skill locally modified + builtin changed → conflict; file untouched
11. force overwrites only ACKit-owned skill (third-party still refused under force)
12. user text/third-party assets never overwritten by force
13. lock/state contains no absolute paths
14. dry-run produces no writes (full-tree snapshot)
15. check produces no writes (full-tree snapshot) + exit codes
16. JSON output deterministic (two runs byte-identical)
17. repeated sync idempotent (second run all up-to-date, zero writes)
18. packaged npm artifact discovers builtin templates (existing findTemplatesSkillsDir path exercised through sync in a dist-layout fixture)
19. legacy repositories retain current behavior (repo without any ackit assets: sync plans creation but a repo with assets pre-v0.3.0 keeps working — init/skills commands unchanged; run existing init/skills test suites)

Plus: doctor managed-assets row read-only proof (before/after tree identical), doctor never-writes (monkeypatch/spy on write APIs or snapshot), sync exit-code table (check: 0 in-sync/1 drift; apply: 0 ok/4 refusals-or-conflicts).

## Test steps

1. `pnpm build && pnpm test -- tests/integration/onboarding/sync.test.ts` (focused, expect all matrix cases green)
2. `pnpm test -- tests/integration/doctor/managed-assets.test.ts`
3. `pnpm test` full suite (baseline 92 files/517 tests; new files add counts — record actual)
4. `pnpm smoke:cli` (with sync smoke if added)
5. `pnpm run smoke:package` (packaged CLI still discovers templates; sync available in installed artifact)
6. Full gates per session spec §16

## Security considerations

- No new network/telemetry/LLM/plugin surface (offline-egress gate covers new files under src/).
- Ownership spoofing: reuse of existing engines keeps marker/lock semantics identical; `--force` scope remains owned-only (third-party refused even with force — existing engine guarantee, re-asserted in test 11/12).
- Path traversal/symlink escape: no new path resolution beyond existing `root.canonicalPath` joins (same pattern as init); lock `lockHasAbsolutePaths` re-asserted.
- Absolute-path leakage: JSON statuses contain only repository-relative paths (test 16 + spot assertions).
- Lock tampering: engine treats malformed lock as empty (existing readSkillsLock catch) → third-party refusal rather than overwrite — re-assert in test 8.
- `--check`/`--dry-run` write-freeness proven by full-tree snapshots (14/15).

## Risks

- Refactor of `init.ts` could regress init behavior → mitigation: zero public-behavior change, existing init tests stay green unchanged; the extraction is a pure function move.
- Exit-code choice for `--check` (1 = drift) might surprise users expecting 0 — mitigation: document explicitly in CLI help + docs; consistent with `scan --ci` semantics (findings → exit 1).
- Status vocabulary must match session spec exactly; drift would break the contract tests → tests pin the exact strings.
- Windows mtime granularity for no-write assertions → use both mtime AND checksum/content snapshot assertions (checksums are the primary proof; mtime as a secondary where the filesystem supports it).

## Rollback plan

Focused revert of the single implementation commit (new files + minimal init refactor + doctor row + docs); no data/lock format changes; existing engines untouched semantically.

## Acceptance criteria

- [ ] `ackit sync --dry-run`/`--check`/apply/`--json` behave per spec with the stable status vocabulary (verified by `tests/integration/onboarding/sync.test.ts` scenarios 1, 14, 15, 16)
- [ ] Rule H: ACKit version change with unchanged canonical content produces zero file writes (checksum snapshot + mtime proofs; scenario 5)
- [ ] User files without ACKit managed markers are never touched, even with `--force` (scenarios 2, 12b)
- [ ] Third-party skills are never overwritten even with `--force`; owned locally-modified skills conflict without `--force` and update only with `--force` (scenarios 8, 10, 11)
- [ ] Lock writes are material-change-gated with no absolute paths (scenarios 5, 13)
- [ ] Doctor reports managed-asset staleness read-only and never writes (`tests/integration/doctor/managed-assets.test.ts`)
- [ ] Provider shims follow the same ownership behavior as AGENTS.md (scenario 7); managed blocks preserve user text outside blocks (scenario 3); unchanged canonical content means zero write (scenario 4); changed canonical content updates only the managed block (scenario 6)
- [ ] Missing builtin installs; identical builtin is up-to-date; owned-unchanged + changed builtin updates (scenarios 1, 17, 9)
- [ ] Full gate matrix green: lint, format:check, typecheck, build, test (94 files/536 tests incl. new matrix), gen:schemas idempotence, smoke:cli, smoke:package, offline-egress, config check, doctor, task doctor, scan --ci exit 0, git diff --check
- [ ] Legacy repositories retain current behavior (scenario 19; existing init/skills tests unchanged and green)
- [ ] Docs updated: CLI reference sync row/options/statuses; agent-integration lifecycle section with the two mandated statements; getting-started tour line
- [ ] Independent verification bundle built; fresh-context verifier verdict registered via the real flow; no blocking findings before merge

## Completion notes

(plan; execution evidence appended below during implementation)

---

## Execution evidence log

**2026-09-02 — Implementation complete (feat/managed-asset-sync branch):**

- **Refactor `src/core/onboarding/init.ts`**: extracted `planInstructionSurfaces(root, {agents})` (read-only planning pass returning `InstructionSurfacePlan[]` with engine result + public action + detail). `planOrApplyInit` now consumes it — zero public behavior change; existing init tests (`tests/integration/init/init.test.ts`) green unchanged. Ownership logic exists exactly once.
- **New `src/core/onboarding/sync.ts`** (`planOrApplyManagedSync`): orchestrates `planInstructionSurfaces` + `installSkills`; statuses `up-to-date | would-create | would-update-managed | updated-managed | installed | updated | conflict-user-modified | refused-non-managed | refused-third-party`; modes `dry-run` (zero writes, exit-neutral) / `check` (zero writes, `inSync` gate) / `apply` (writes via existing engines; exit-class-4 on refusals/conflicts). Read-only skills assessment (`planSkillsReadOnly`) mirrors installSkills checksum/lock semantics WITHOUT lock writes.
- **Engine improvement `src/core/skills/install.ts`** (rule H compliance): lock write is now material-change-gated (`lockDirty`); `upsertLockEntry` returns whether checksum/files/ownership actually changed — a bare version-string difference never rewrites `.ackit/skills.lock.json`. `version` field is informational metadata recorded alongside genuine syncs.
- **New CLI `src/cli/commands/sync.ts` + `program.ts` registration**: `ackit sync [--dry-run] [--check] [--force]`; `--dry-run`+`--check` mutually exclusive (usage exit 2); `--check` exit 0 in-sync / 1 drift; apply exit 4 on ownership blocks; JSON `ackit.managed-sync.v1` (mode/inSync/blocked/rows); ownership diagnostics on stderr in all modes.
- **Doctor `src/cli/commands/doctor.ts`**: new read-only `managed assets` check row (`up-to-date` / `updates available` / `conflict-user-modified (n)` / `unavailable: ...`), `ok: true` always (advisory, never hard-fails; never writes — proven by test).
- **Tests**: `tests/integration/onboarding/sync.test.ts` (17 tests — full 19-scenario matrix incl. rule-H zero-write with mtime+checksum proofs, force-scope, third-party refusal under force, idempotence, determinism, packaged discovery, legacy behavior) + `tests/integration/doctor/managed-assets.test.ts` (2 tests — read-only full-tree proof, JSON row presence). Note: scenario 8's lock-tampering fixture required file removal for ownership restoration because `installSkills` refuses third-party names even with `--force` (by design — re-asserted).
- **Docs**: `docs/reference/cli.md` (sync row + options section + status vocabulary), `docs/guides/agent-integration.md` (Managed-asset lifecycle section with the two mandated statements: never-rewrite-on-upgrade + only-owned-assets-on-explicit-command; full rule list; doctor read-only note), `docs/guides/getting-started.md` (tour line).

**Full gate matrix (all exit 0, 2026-09-02):**
- `pnpm lint` (292 files), `pnpm format:check` (276 files), `pnpm typecheck` — clean.
- `pnpm build` — ok; `ackit sync --help` verified.
- `pnpm test`: **94 files / 536 tests PASS** (baseline 92/517; +2 files +19 tests).
- `pnpm gen:schemas` idempotent (`git diff --exit-code -- schemas` clean).
- `pnpm smoke:cli` all assertions; `pnpm run smoke:package` PASS (tarball v0.3.0).
- `node scripts/check-offline-egress.mjs` PASS; `config check` OK; `doctor` PASS (managed assets row advisory); `task doctor` OK; `scan --ci` exit 0 (readiness 88); `git diff --check` clean.

**Sandbox dogfood (controlled fixture, real repo's human files untouched):**
- Empty repo dry-run → 8 `would-create` rows, zero writes, exit 0.
- Apply → 8 `installed` rows (4 instruction surfaces + 4 skills), files created incl. `.ackit/skills.lock.json`.
- Re-run → all `up-to-date` (idempotent, zero diff).
- `sync --check` → `inSync: true`, exit 0.
- Real repo `ackit sync --check` → correctly refuses human-authored `AGENTS.md`/`CLAUDE.md`/copilot-instructions (no markers), exit 1 — never modifies them.


````

## Acceptance criteria + evidence

AC-001 [verified] `ackit sync --dry-run`/`--check`/apply/`--json` behave per spec with the stable status vocabulary (verified by `tests/integration/onboarding/sync.test.ts` scenarios 1, 14, 15, 16)
    evidence: test: tests/integration/onboarding/sync.test.ts scenarios 1/14/15/16: 17/17 PASS (pnpm vitest run)
AC-002 [verified] Rule H: ACKit version change with unchanged canonical content produces zero file writes (checksum snapshot + mtime proofs; scenario 5)
    evidence: test: sync.test.ts scenario 5: rule-H zero-write proof via full-tree checksum snapshot + mtime (version=99.0.0-simulated-upgrade, statuses all up-to-date, tree identical)
AC-003 [verified] User files without ACKit managed markers are never touched, even with `--force` (scenarios 2, 12b)
    evidence: test: sync.test.ts scenarios 2+12b: refused-non-managed with bytes+mtime untouched, including under --force
AC-004 [verified] Third-party skills are never overwritten even with `--force`; owned locally-modified skills conflict without `--force` and update only with `--force` (scenarios 8, 10, 11)
    evidence: test: sync.test.ts scenarios 8/10/11: refused-third-party under force; conflict-user-modified without force (file untouched); updated only with force
AC-005 [verified] Lock writes are material-change-gated with no absolute paths (scenarios 5, 13)
    evidence: test: sync.test.ts scenarios 5+13: lock not rewritten on version-only change (install.ts upsertLockEntry material-change gate); lockHasAbsolutePaths false
AC-006 [verified] Doctor reports managed-asset staleness read-only and never writes (`tests/integration/doctor/managed-assets.test.ts`)
    evidence: test: tests/integration/doctor/managed-assets.test.ts 2/2: full-tree snapshot proves doctor never writes; JSON row present (up-to-date/updates available/conflict-user-modified)
AC-007 [verified] Provider shims follow the same ownership behavior as AGENTS.md (scenario 7); managed blocks preserve user text outside blocks (scenario 3); unchanged canonical content means zero write (scenario 4); changed canonical content updates only the managed block (scenario 6)
    evidence: test: sync.test.ts scenarios 3/4/6/7: user-prefix byte preservation; unchanged zero-write (mtime+checksum); stale block refreshed in place; CLAUDE/GEMINI/copilot same ownership rules
AC-008 [verified] Missing builtin installs; identical builtin is up-to-date; owned-unchanged + changed builtin updates (scenarios 1, 17, 9)
    evidence: test: sync.test.ts scenarios 1/17/9: would-create/installed; second run all up-to-date zero diff; owned-unchanged + changed builtin -> updated
AC-009 [verified] Full gate matrix green: lint, format:check, typecheck, build, test (94 files/536 tests incl. new matrix), gen:schemas idempotence, smoke:cli, smoke:package, offline-egress, config check, doctor, task doctor, scan --ci exit 0, git diff --check
    evidence: build: Full gates 2026-09-02 all exit 0: pnpm lint (292 files), format:check (276), typecheck, build, pnpm test 94 files/536 tests PASS, gen:schemas idempotent, smoke:cli, smoke:package (tarball v0.3.0), offline-egress, config check, doctor, task doctor, scan --ci (readiness 88), git diff --check
AC-010 [verified] Legacy repositories retain current behavior (scenario 19; existing init/skills tests unchanged and green)
    evidence: test: sync.test.ts scenario 19: planOrApplyInit/installSkills unchanged behavior verified (init dry-run 4 created, apply codex created, skills installed); existing tests/integration/init/init.test.ts + tests/integration/skills/install.test.ts green unchanged in full suite
AC-011 [verified] Docs updated: CLI reference sync row/options/statuses; agent-integration lifecycle section with the two mandated statements; getting-started tour line
    evidence: manual: docs/reference/cli.md (sync row + options + statuses), docs/guides/agent-integration.md (Managed-asset lifecycle section: never-rewrite-on-upgrade + only-owned-assets-on-explicit-command + full rule list + doctor read-only note), docs/guides/getting-started.md (sync --check tour line)
AC-012 [unverified] Independent verification bundle built; fresh-context verifier verdict registered via the real flow; no blocking findings before merge

## Registered verdicts

(no verdicts registered yet — you are the fresh verifier)

## Latest checkpoint

(no checkpoint)

## Implementation surface

declared affected areas: `src/core/onboarding/sync.ts` (new — sync engine), `src/core/onboarding/init.ts` (minimal refactor: extract shared planning path; public behavior unchanged), `src/core/onboarding/index.ts` (export sync types for internal CLI use), `src/cli/commands/sync.ts` (new — CLI command), `src/cli/program.ts` (register `sync`), `src/cli/commands/doctor.ts` (managed-assets read-only check row), `tests/integration/onboarding/sync.test.ts` (new — 19-scenario matrix), `tests/integration/doctor/managed-assets.test.ts` (new — doctor read-only/no-write + staleness), `tests/e2e/cli-scaffold.smoke.mjs` (sync --check smoke) OR a focused addition in an existing e2e — final placement decided during implementation, `docs/reference/cli.md`, `docs/guides/agent-integration.md`, `docs/guides/getting-started.md`, `docs/tasks/active/TASK-0072-*.md` (this file, evidence)
current changed/untracked files (3): docs/tasks/active/TASK-0072-managed-asset-lifecycle-unified-version-aware-sy.md, docs/intent/INTENT-0002-managed-asset-lifecycle-unified-version-aware-sy.md, docs/plans/managed-asset-sync-TASK-0072.md

## Implementation diff

(diff omitted — pass --diff for the capped full diff)

## Verification-point gate requirements

- artifacts: task
- note: verification bundles carry the task's declared requirements

## Verifier role contract

verifier: Independent Verifier (ackit.role.v1)
Judges the implementation against the acceptance criteria with a fresh context; never implements what it judges.
required inputs: intent, spec, plan, task, diff, tests, evidence
allowed: inspect intent, spec, plan, task, diff, tests, and evidence; read repository content; emit an ackit.verdict.v1 verdict
forbidden: implement or modify the feature under judgment; edit source files; register evidence for the task being judged
required outputs: ackit.verdict.v1 verdict

## Verdict instructions

- Compare the implementation surface, diff, and evidence against every criterion.
- Blocking findings must carry the criterion id and a stable upper-snake code.
- PASS-family verdicts cannot carry blocking findings (registration rejects them).
- Register your verdict with: ackit verification record <task> --verdict <file>
