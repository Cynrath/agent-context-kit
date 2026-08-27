---
id: "TASK-0007"
title: "v0.2.0 requirements + architecture baseline (pin & preflight)"
status: pending
schemaVersion: 2
dependencies: []
createdAt: "2026-08-27"
completedAt: null
---

## Purpose

Establish the implementation-ready baseline for the consolidated v0.2.0 release: freeze `docs/v0.2.0/{REQUIREMENTS,TRACEABILITY,ROADMAP,EXECUTION_PLAN,DEFINITION_OF_DONE}`, re-confirm the vNext architecture ADRs 0001–0014 plus new ADRs 0015–0024, pin Node/pnpm/MCP SDK/dependency versions, bump `ackit.yml` `schemaVersion` design (planning-only, no `package.json` version bump), and verify that `master` at HEAD == `origin/master` == `595f468...` with zero drift before any engine work starts. This is the single gate that unlocks the SDK-contract task.

## Context / current state

- Repo at `master` `595f468` (`0.1.1` on `@cynrath/agent-context-kit`), `ackit.yml` schemaVersion 1 (`schemas/ackit.schema.json` is the build source), release workflow `release.yml` is tags-only `v*.*.*` with OIDC Trusted Publishing (no `NPM_TOKEN`), CI matrix 10 jobs (`ci.yml`: ubuntu/windows/macos × node22/24 + self-scan + package-smoke).
- Filesystem engine (`src/core/filesystem/*`), scan pipeline (`src/core/scanner/pipeline.ts`), instruction graph (`src/core/instructions/graph.ts`), context pack (`src/core/context/pack.ts`), policy engine (`src/core/policy/*`), task system (`src/core/tasks/*`), watch (`src/core/watch/watch.ts` polling), reporting (`src/core/reporting/serve.ts` localhost-only) are all working and green on 0.1.1.
- New ADRs 0015–0024 have been authored in this planning run and mirrored in `docs/decisions/` + `docs/rebuild/decisions/`; they need a preflight re-verification that no placeholder architecture decision remains (check no `TODO`/`TBD`/`decide later` in the 10 new ADRs).
- Existing dependency pins: `engines.node >=22`, `pnpm@11.22.0`, `@modelcontextprotocol/sdk@^1.30.0`, `vitest@^4.1.11`, `biome@^2.5.10`, `commander@^15.0.0`, `yaml@^2.9.0`, `zod@^4.4.3`, GitHub Actions SHAs (`actions/checkout@f548...`, `setup-node@ae0d...`, `pnpm/action-setup@b906...`). Any drift must be justified.
- Attempting a count: `pnpm-lock.yaml` is committed; `package.json` `packageManager` field is exact; `gen:schemas` must be drift-free before wave start.

Relevant files/modules:
- `package.json`, `pnpm-lock.yaml`, `tsconfig*.json`, `ackit.yml`, `schemas/ackit.schema.json`, `schemas/policy.schema.json`, `schemas/task.schema.json`
- `docs/v0.2.0/*`, `docs/decisions/ADR-00*.md`, `docs/rebuild/decisions/ADR-00*.md`, `docs/architecture/overview.md`
- `.github/workflows/ci.yml`, `.github/workflows/release.yml`
- `src/index.ts` (SDK surface, 25 lines), `src/shared/version.ts` (identity source)

## Goal

One concrete outcome: a verified, drift-free baseline where every v0.2.0 requirement has a traced task, every ADR is Accepted without placeholders, and the engine wave can start without "decide later" items.

## In scope

- Re-verify starting SHA invariant: `git status --short` clean, `git branch --show-current` == `master`, `git rev-parse HEAD == origin/master`, `git fetch origin --prune --tags` + `git tag --list` shows `v0.1.0, v0.1.1` only, toolchain `node --version` (24.13.0), `pnpm --version` (11.22.0), `ackit --version` (0.1.1 via `dist/cli/index.js`).
- Re-confirm the 14 vNext ADRs are still valid (node LTS still ≥22, MCP SDK still 1.30.x pin, package identity still `@cynrath/agent-context-kit`) and the 10 new v0.2.0 ADRs contain no placeholder (`grep -R "TBD|TODO.*ADR|decide later" docs/decisions/ADR-0015* docs/rebuild/decisions/ADR-0015*` returns 0).
- Pin audit: run `pnpm outdated` (informational, not install) and record that no runtime dep requires a forced bump; if a security pin must move, file an ADR note; otherwise keep pins stable.
- Draft the `ackit.yml` schemaVersion v2 addition design (additive: `readiness: { weights?: ... }`, `profile?: string`, `policy.rulePacks?: string[]`, `diagnostics?: {}`) without changing `schemas/ackit.schema.json` yet (design doc only, stored as `docs/v0.2.0/config-v2-design.md` or appendix in REQUIREMENTS).
- Validate planning artifacts: `node dist/cli/index.js task doctor` (ID allocation + deps acyclic), custom traceability check (`scripts/check-v020-traceability.mjs` if created, otherwise manual table audit recorded), `node dist/cli/index.js config check`, `node dist/cli/index.js doctor`, `node dist/cli/index.js scan --ci`.
- Update `docs/architecture/overview.md` diagram note to mention upcoming `src/core/readiness`, `src/core/profiles`, `src/core/policy/packs`, `src/core/dashboard`, `src/core/diagnostics`, `extensions/vscode` as reserved subsystems (no code yet, just doc pointer).
- Freeze `docs/v0.2.0/EXECUTION_PLAN.md` dependency numbers to the actually allocated `TASK-0007..0024` IDs (edit placeholder table to real IDs) so the next agent sees exact IDs.

## Out of scope

- No product feature implementation (no new `src/core/readiness` code, no profile code, no rule-pack code).
- No `package.json` version bump (stays `0.1.1` until TASK-0024).
- No `npm publish`, tag, GitHub Release, workflow_dispatch.
- No change to `release.yml` pin set or permissions (audited, not mutated).
- No rebase/history rewrite, no force-push.

## Technical design

- **Files to touch**: `docs/v0.2.0/EXECUTION_PLAN.md` (replace placeholder IDs with allocated IDs, fix dash duplicate row), `docs/v0.2.0/REQUIREMENTS.md` (if any missing AC wording), `docs/architecture/overview.md` (add reserved subsystem note), optional `docs/v0.2.0/config-v2-design.md` (additive config sketch).
- **Schema design (for next tasks)**: sketch additive `ackit.schema.json` v2 fragment:
  ```json
  "readiness": { "type": "object", "properties": {
    "weights": { "type": "object", "properties": {
      "instructions": { "type": "number", "minimum": 0 },
      "security": { "type": "number", "minimum": 0 },
      "contextEfficiency": { "type": "number" },
      "taskHygiene": { "type": "number" },
      "skills": { "type": "number" },
      "policy": { "type": "number" }
    } }
  }},
  "profile": { "type": "string", "enum": ["codex","claude","copilot","gemini","generic"] },
  "policy": { "properties": { "rulePacks": { "type": "array", "items": { "type": "string" } } } }
  ```
  This sketch is not applied in this task; it is the contract the next tasks implement.
- **Pin verification script**: `scripts/check-pins.mjs` (optional, not required but useful): parse `package.json` devDeps/runtimeDeps and print current requested versions vs lockfile-resolved for audit trace.
- **Traceability**: this task maps to REQ-V020-GOV-001..010 preflight and owns `docs/v0.2.0/*` initial verification.

## User-facing behavior

No CLI behavior change in this task. Exact-SHA invariant commands must still produce clean outputs:

```powershell
git status --short               # empty
git branch --show-current        # master
git rev-parse HEAD               # candidate SHA (e.g., <new planning commit>)
git fetch origin --prune --tags && git tag --list   # v0.1.0  v0.1.1 only
node dist/cli/index.js --version # 0.1.1
node dist/cli/index.js config check   # config check OK
node dist/cli/index.js doctor         # doctor OK
```

## Security

- Verify no pending tool writes escaped `repo root` (reuse fs engine boundary).
- Confirm `release.yml` still triggers only on `v*.*.*`, still has `permissions: contents: write, id-token: write` and SHA-pinned actions only; grep `secrets.*NPM_TOKEN|NODE_AUTH_TOKEN` → 0 in `.github/workflows/*`.
- Any pin bump must have a security note (why: CVE count, advisory ID).

## Performance

No new perf work. Baseline for perf suite is frozen: `benchmarks/thresholds.json` default multiplier 1.5, committed baselines in `benchmarks/baselines/*.json` must remain untouched until TASK-0018 intentionally re-baselines.

## Compatibility

- Windows/macOS/Linux: no path assumptions; any script uses `path.posix` for repo-relative comparisons and `path.join(canonicalPath, ...split("/"))` for FS joins.
- Node 22 + Node 24: this baseline task must pass `pnpm build && pnpm typecheck` on both (CI will enforce).
- v0.1.1 backward compat: no breaking config change yet; unknown future keys like `readiness` are ignored for now (task docs say TBD).

## Acceptance criteria

- [ ] `git status --short` is empty, `git branch --show-current` == `master`, `git rev-parse HEAD` == `git rev-parse origin/master`, `git tag --list` == `v0.1.0\nv0.1.1` (no `v0.2.0`).
- [ ] `docs/v0.2.0/{REQUIREMENTS,TRACEABILITY,ROADMAP,EXECUTION_PLAN,DEFINITION_OF_DONE}` exist, are committed, and `docs/v0.2.0/EXECUTION_PLAN.md` dependency table uses the real allocated IDs `TASK-0007…0024` with no placeholder row and `git diff --check` clean.
- [ ] All 24 ADRs (0001–0024) are `Accepted` and `grep -E "TBD|decide later" docs/decisions/ADR-0015* docs/rebuild/decisions/ADR-0015*` returns zero; reuse decisions are explicitly justified (e.g., ADR-0006 remains, ADR-0017 extends).
- [ ] Pin audit recorded in Completion notes: Node `>=22` still valid (LTS schedule note checked), `@modelcontextprotocol/sdk@^1.30.0` still latest 1.30.x line, SHA pins unchanged from `ci.yml`, `packageManager` field is `pnpm@11.22.0`.
- [ ] `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm format:check && pnpm typecheck && pnpm test` all exit 0 (at least 304 existing tests); `node dist/cli/index.js task doctor` OK; `config check` OK; `doctor` OK; `scan --ci` OK.
- [ ] No `package.json` version change (still `0.1.1`), no tag, no publish, no workflow_dispatch (verified via `git diff --stat` not containing `package.json` version line and workflow triggers still tags-only).

## Tests

- **docs-review**: existing contract tests `tests/contract/api-surface`, `cli-help-contract`, `ci-pinning` still relevant — run full `pnpm test` and record pass count.
- **cli-smoke**: `node dist/cli/index.js --version` + `doctor` + `task doctor` as above.
- **ci-config**: `actionlint`-less: assert `.github/workflows/release.yml` is still valid YAML (`yaml.parse`) and tags-only (grep `push.*tags.*v\*` exists, no `workflow_dispatch`).
- **traceability**: `task doctor` + manual REQ↔task audit recorded (or `scripts/check-v020-traceability.mjs` if created) showing `unmapped=0`, `cycles=0`.
- **security**: grep `NPM_TOKEN|NODE_AUTH_TOKEN` == 0; check no `child_process.exec(` in `src/` (reuse `scripts/check-security-boundaries.mjs` if exists).
- **config**: `node dist/cli/index.js config check` on repo root shows `config check OK (digest 03eaf27...)` deterministic.

## Documentation

- Update: `docs/architecture/overview.md` (reserved subsystem note), `docs/v0.2.0/EXECUTION_PLAN.md` (real IDs), `docs/v0.2.0/README.md` stub if desired.
- Create: `docs/v0.2.0/config-v2-design.md` (optional sketch, ≤1 page).
- No stale v1 doc edits.

## Evidence

Record in Completion notes: starting SHA (`git rev-parse HEAD`), ending SHA (planning commit), `git status --short`, `git branch -a`, `git tag --list`, toolchain `node -v && pnpm -v && ackit --version`, pin audit table, `task doctor` output, `doctor` output, `scan --ci` exit, `pnpm test` pass count (files+tests), `grep TBD` output (zero), `release.yml` trigger snippet.

## Completion gate

No `--force`. Task is not completed until every acceptance criterion is checked and evidence recorded; the next in-graph task (`TASK-0013` SDK) becomes runnable only after this task is `completed`.
