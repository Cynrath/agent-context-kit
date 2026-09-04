---
id: "TASK-0077"
title: "Builtin skill template audit and CLI parity hardening"
status: active
schemaVersion: 2
dependencies: []
createdAt: "2026-09-04"
completedAt: null
---

## Purpose

Audit all four shipped builtin ACKit skill templates against the real current CLI/product behavior, correct stale/wrong builtin skill instructions, add durable SKILL↔CLI parity tests, prove managed-sync behavior and package parity, classify the complete post-v0.4.0 delta, and decide under repository SemVer policy whether the delta is patch-valid as 0.4.1. Publish 0.4.1 through all established channels if and only if the full delta is patch-valid; otherwise stop publication and report 0.5.0 REQUIRED.

Session authorization (exact scope for THIS task): the session goal authorizes (1) auditing all four builtins in `templates/skills/`; (2) correcting existing shipped templates only (no new builtin skill names); (3) adding deterministic SKILL↔CLI parity tests; (4) classifying the full v0.4.0..candidate delta; (5) preparing 0.4.1 version surfaces/CHANGELOG/package/VS Code/README/docs/CI parity ONLY upon SEMVER DECISION 0.4.1 PATCH-VALID; (6) one temporary branch `fix/skill-template-parity-0077` and one product PR with exact-head CI and merge per repository convention ONLY upon PATCH-VALID; (7) upon PATCH-VALID and green merged master, publishing immutable tag `v0.4.1`, npm `@cynrath/agent-context-kit@0.4.1` via OIDC/provenance, VS Code `Cynrath.ackit-vscode 0.4.1`, GitHub Release, established Action state, and hosted docs via protected sync flow. It explicitly does NOT authorize blind 0.4.1 publication, SemVer-invalid patch publication, force-push/rebase/history rewrite, tag movement/deletion, workflow dispatch, deployments, weakening quality gates, legacy .NET/NuGet mutation, Browser Companion work on `feat/browser-companion-v0.3` (PAUSED/NO-GO/DO NOT TOUCH), hosted-docs theme redesign, or any master mutation beyond the single authorized PR/publish chain. If SEMVER DECISION is 0.5.0 REQUIRED, all tag/npm/VS Code/Release/Action/docs publish actions are prohibited.

## Current-state evidence (verified live 2026-09-04)

- `git fetch --prune`; `git status --short --branch` → `## fix/skill-template-parity-0077` (branched from `master` at `f6979fac7b545b3468a8ec461f4720b5069711c2`); `git branch --show-current` → `fix/skill-template-parity-0077`; `git rev-parse HEAD` == `git rev-parse origin/master` == `f6979fac7b545b3468a8ec461f4720b5069711c2`; `git branch -a` → `master`, `feat/browser-companion-v0.3` (+ remotes); tree clean at branch creation.
- `node dist/cli/index.js --version` → `0.4.0`; `node dist/cli/index.js doctor` → all checks passed (managed assets `conflict-user-modified (3 asset(s))` advisory, exit 0); `node dist/cli/index.js task doctor` → integrity OK; `node dist/cli/index.js scan --ci` → exit 0, readiness 88/100 pass (findings are known synthetic-secret fixtures/doc examples; no new real secrets).
- No `v0.4.1` tag (`git tag --list v0.4*` → `v0.4.0` only); no GitHub Release beyond `v0.4.0` (`gh release list` latest `v0.4.0`); npm `@cynrath/agent-context-kit` versions end at `0.4.0`; `package.json` version `0.4.0`; no open PR (`gh pr list --state open` → empty).
- Builtins ship from `templates/skills/ackit-workflow`, `ackit-scan-and-fix`, `ackit-context-optimization`, `ackit-policy-authoring`; `src/core/skills/install.ts` discovers/copies into `.agents/skills/<name>/` with checksum/ownership in `.ackit/skills.lock.json`; SKILL.md content is static, not synthesized.
- Known suspicious item confirmed present: `templates/skills/ackit-workflow/SKILL.md` line 13 references `ackit task "<title>"`, but current CLI requires `ackit task create <title>` (`task --help` shows subcommands only; `task create --help` shows `<title>` with `--depends-on/--intent/--spec/--decision/--plan`).
- Post-v0.4.0 range `v0.4.0..HEAD` is exactly 3 commits: `e646371` (task-0073 completion bookkeeping, docs-only), `e869261` (repository hygiene: `task archive --completed [--dry-run]` + `TASK-COMPLETED-IN-ACTIVE` + text-hygiene gate + 73 archive renames), `f6979fa` (TASK-0076 bookkeeping, docs-only). Full classification deferred to implementation evidence; `task archive --completed` is treated as new public CLI behavior unless proven otherwise.

## Scope

- Audit all four builtins with table `Skill | Purpose | Commands referenced | CLI parity | Feature parity | Stale/wrong? | Required correction`; for every command/example compare to built CLI (`--help`/parser), validate exact subcommands/options, verify docs/behavior, remove historical shorthand unless intentionally supported.
- `ackit-workflow`: within existing scope, ensure concise/progressive operational guidance covers where relevant: real `task create` syntax; task-first plan; intent when required; workflow profile/stages; plan/spec/decision refs; checkpoints/resume/handoff; evidence; verification/verdict; composed completion gate; no false completion; final `task archive` lifecycle; `doctor`/`task doctor`/`scan` gates; archived completed tasks are not open work. Not a full manual.
- `ackit-scan-and-fix`: current `scan`/`--ci` semantics, severity/remediation, suppression hygiene (`ackit-ignore:ACKITnnn`, ACKIT099 advisory visibility), policy/security boundaries, no gate weakening, offline/no-secret rules.
- `ackit-context-optimization`: deterministic/task-aware packs (`pack --max-tokens/--task/--resume`), budget behavior, `optimize` safety (`--fix` fenced to managed blocks), managed-block boundaries, no external upload.
- `ackit-policy-authoring`: current Policy v2/risk-tier/autonomy semantics where public, deterministic layered policy, locks, validation (`policy check`/`config check`), offline-only resolution.
- Patch discipline: correctness of existing shipped templates only; no new builtin skill names.
- Durable parity tests: discover all builtin SKILL.md; validate frontmatter/name/path; ensure each documented ACKit command/subcommand maps to a valid current CLI command; smoke `--help`/parser paths; catch removed/stale syntax; verify packaged npm tarball contains same corrected templates. Avoid brittle NL parser; maintain explicit machine-readable command cases paired with each skill where needed.
- Managed update proof (all 7): missing→installed; owned+unchanged old canonical→updated; owned+modified→conflict; owned+modified+force→update owned only; third-party collision→refused even with force; version-only change+identical content→zero write; canonical template change→content-driven update. Verify lock checksums and repo-relative paths.
- Package-level proof: build actual candidate tarball, install in fresh isolated repo, verify `ackit --version`, `ackit skills install`, `ackit skills validate`, `ackit sync --check`; inspect all four generated `.agents/skills/*/SKILL.md` and prove equality with corrected packaged templates.
- Full post-v0.4.0 delta classification `Change | Public? | bugfix/maintenance/new functionality/docs-test-only | SemVer class | Evidence`, explicitly inspecting `task archive --completed [--dry-run]`, `TASK-COMPLETED-IN-ACTIVE`, text-hygiene scripts/checks, skill template fixes. Do not hide new public CLI behavior.
- SemVer gate: read actual repository release/SemVer policy (CHANGELOG SemVer claim + ADR-0023 coupling + v0.4.0 minor precedent: new public CLI capability → minor); apply to FULL delta; emit exactly one of `SEMVER DECISION: 0.4.1 PATCH-VALID` or `SEMVER DECISION: 0.5.0 REQUIRED`. Do not branch from old tag to evade classification.
- If PATCH-VALID only: synchronize version surfaces/CHANGELOG/package/VS Code/README/current docs/CI parity; CHANGELOG accurately mentions builtin skill correctness, CLI parity, managed skill updates, and included post-v0.4.0 maintenance; full gates + fresh verifier (zero blockers); one PR via UTF-8 body file + text-hygiene PASS + `gh pr create --body-file`; exact-head CI; merge per convention; green post-merge master CI; then publish all established v0.4.1 channels (tag, npm OIDC/provenance, VS Code, GitHub Release, Action state, hosted docs via protected flow, design assets preserved).

## Out of scope

- New builtin skill names/catalog expansion (normally v0.5.0 candidate).
- Full-manual rewrite of any skill; unrelated feature work; unrelated refactors.
- Browser Companion (`feat/browser-companion-v0.3`) — do not touch/merge/inspect beyond branch listing.
- Blind 0.4.1 publication; SemVer-invalid patch; branching from old tag to evade classification.
- Force-push, rebase, history rewrite, tag movement/deletion, workflow dispatch, deployments, weakening gates, legacy .NET/NuGet mutation, hosted-docs theme redesign, paid services.
- Multiple branches/PRs (single branch `fix/skill-template-parity-0077`, single PR only if PATCH-VALID).

## Dependencies

- None (single-task chain head; no child tasks).

## Affected files / expected areas

- `templates/skills/ackit-workflow/SKILL.md` + `references/task-lifecycle.md`
- `templates/skills/ackit-scan-and-fix/SKILL.md` + `references/severity-playbook.md`
- `templates/skills/ackit-context-optimization/SKILL.md` + `references/ranking.md`
- `templates/skills/ackit-policy-authoring/SKILL.md` + `references/merge-order.md`
- `tests/` new deterministic parity suite (e.g. `tests/contract/skills-parity*.test.ts` or adjacent) + fixtures/cases as needed
- `tests/integration/skills/install.test.ts` and/or `tests/integration/onboarding/sync.test.ts` extensions only if required for 7-scenario proof (prefer new focused tests over broadening existing suites)
- `docs/tasks/active/TASK-0077-*.md` (this task) + verification bundle/verdict artifacts per verification flow
- If PATCH-VALID only: `package.json`, `pnpm-lock.yaml`, `extensions/vscode/package.json`, `extensions/vscode/README.md`, `extensions/vscode/CHANGELOG.md`, `CHANGELOG.md`, `README.md`, current `docs/**`, `.github/workflows/ci.yml` (only where version coupling requires), `action.yml` pin where convention requires
- Never: `dist/`, `.ackit/`, `artifacts/`, `node_modules/`, coverage, reports, packs, tarballs

## Acceptance criteria

- [x] Audit table complete for all four builtins; every command/example validated against built CLI `--help`/parser and current docs; stale/wrong items fixed; `ackit task "<title>"` shorthand removed unless intentionally supported (proven).
- [x] Corrected templates remain concise/progressive; no new builtin skill names added.
- [x] Parity tests green and fail on reintroduced stale syntax (proven by negative probe, e.g. old shorthand fixture).
- [x] Managed 7-scenario proof recorded with lock checksum/path evidence.
- [x] Package proof recorded: candidate tarball contains corrected templates; fresh isolated install shows four generated SKILL.md equal to packaged templates; `ackit --version`, `skills install`, `skills validate`, `sync --check` verified.
- [x] Post-v0.4.0 delta classification complete with evidence for `task archive --completed`, `TASK-COMPLETED-IN-ACTIVE`, text-hygiene, skill fixes; no new public CLI behavior hidden.
- [x] Exactly one SemVer decision emitted with policy citation; if 0.5.0 REQUIRED, no version-surface edits, no PR merge, no tag/npm/VS Code/Release/Action/docs publish attempted.
- [ ] If PATCH-VALID, all version surfaces synchronized, CHANGELOG accurate, full gates green, fresh verifier zero blockers, single PR merged on exact-head green, post-merge master green, all v0.4.1 channels published and verified.
- [ ] `SKILL-TEMPLATE-PATCH: SUCCESS` only upon completed audit+fixes+tests+proofs and (PATCH-VALID→published | 0.5.0 REQUIRED→correctly stopped); otherwise `SKILL-TEMPLATE-PATCH: NO-GO`.

## Test steps

1. `node dist/cli/index.js --version`, `doctor`, `task doctor`, `scan --ci` (record).
2. `node dist/cli/index.js <each documented command> --help` for every skill-referenced command; `task create --help`, `task archive --help`, `scan --help`, `pack --help`, `optimize --help`, `policy --help`, `config --help`, `skills --help`, `sync --help`, `workflow/intent/checkpoint/evidence/verification/drift --help`.
3. `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
4. Focused parity/install/sync tests, then `pnpm test` (record counts).
5. `pnpm gen:schemas` + `git diff --exit-code -- schemas` where applicable; `pnpm smoke:cli`, `pnpm run smoke:package` (real tarball).
6. `node scripts/check-offline-egress.mjs`; `node scripts/check-text-hygiene.mjs --repo`; `node scripts/check-version-parity.mjs` where present.
7. `node dist/cli/index.js config check`, `doctor`, `task doctor`, `skills validate`, `sync --check`, `scan --ci`, `git diff --check`, `git status`.
8. Managed 7-scenario proof via isolated temp repos (record checksums/paths).
9. Package proof via `pnpm pack` + fresh isolated consumer (record SKILL.md equality).
10. Fresh verifier bundle/record/show for TASK-0077 (zero blockers).

## Security considerations

- No secrets in templates/tests/docs; no absolute local paths in generated artifacts/terminal evidence; fixtures use synthetic values only.
- No gate weakening to obtain green (no `ts-nocheck`, no rule downgrade, no skipped assertions).
- Suppression hygiene preserved: inline `ackit-ignore:ACKITnnn` with reason only; no new suppressions to hide findings.
- Offline-first preserved: no network/telemetry/uploads in product code; parity tests run offline.
- User files never overwritten without explicit intent flags; `--force` semantics unchanged (third-party still refused).

## Risks

- Stale-syntax false negatives from NL parsing → mitigated by explicit command cases paired per skill.
- Parity tests brittle on help-text churn → assert command/option existence via parser, not prose.
- Template scope creep into full manual → keep concise/progressive, link to canonical docs.
- Post-v0.4.0 new CLI behavior forces 0.5.0 → mitigated by honest classification first; no version edits before SemVer gate.
- CI exact-head flakiness → rerun affected job only; never weaken gates; record run IDs.

## Rollback plan

- Before merge: `git revert <commit>` per commit granularity on `fix/skill-template-parity-0077`; no history rewrite. If SemVer is 0.5.0 REQUIRED, leave version surfaces untouched so branch contains only template+test fixes re-targetable to 0.5.0.
- After authorized merge (PATCH-VALID only): post-publish defect → new patch release, never same-version content mutation; tag/release immutable.

## Completion notes

Evidence 2026-09-04 on `fix/skill-template-parity-0077` (HEAD ee02c2c; base f6979fa; v0.4.0 cc44102). Status held `active` (not completed) because SemVer gate requires 0.5.0; no version-surface edits, no PR, no tag/publish attempted.

### Builtin skill audit

Skill | Was stale? | Wrong commands | Missing current semantics | Fix
ackit-workflow | YES | `ackit task "<title>"` (no subcommand; parser rejects; correct is `ackit task create <title>`) | task create options, active/archive layout + ID lookup, intent, workflow set/show/advance/verify, plan/spec/decision disk-existence, checkpoints/resume/handoff, evidence, verification/verdict, drift, composed completion gate, no false completion, `task archive --completed`, `TASK-COMPLETED-IN-ACTIVE`, doctor/task doctor/scan gates, archived-not-open | Rewrote SKILL.md (8 steps + notes) + expanded references/task-lifecycle.md (archive + gate + doctor code); linked reference; kept concise/progressive; no new skill names
ackit-scan-and-fix | PARTIAL | `ackit-ignore:ACKITnnn` (missing `# ` prefix + reason placement; correct is `# ackit-ignore:ACKITnnn <reason>` on finding line or line above, covers line+next) | exact suppression scope, ACKIT099 non-suppressible, rules reference, `--format/--baseline/--changed` sets, `policy check`/`config check`, locked-rule refusal, offline/no-secret | Rewrote SKILL.md + expanded severity-playbook.md (ACKIT001/002 critical, 003/004 high, 005/010/050/070/080 medium, 020/040 low, 099 advisory; suppression scope; config/policy sources)
ackit-context-optimization | PARTIAL | `ackit optimize` described as generic read-only without managed-surface fence (correct is `--fix` ONLY to ACKit-managed surfaces, with `--dry-run/--diff`) | `--task/--resume`, all pack options, manifest fields, greedy `budget exhausted`, deterministic weights, safety gates (secret exclude, dedupe, path scrub), estimates as soft targets | Rewrote SKILL.md + expanded ranking.md (weights, budget, manifest, gates, task/resume)
ackit-policy-authoring | YES | Verify via `ackit config check` / scan JSON only (omits `ackit policy check`; correct primary is `ackit policy check` chain+digest+autonomy+review+problems plus `config check` for schema) | `schemaVersion: 1`, `extends` local vs `npm:<pkg>/<file>` pre-installed-only + `POL-OFFLINE-BLOCKED`, `org`/`repo`/`pathScopes`, `locked` + `POL-LOCKED-CONFLICT` + sticky deny, suppressions `reason`/`expiresAt`, tiers tier0-4 + owned boundaries (`task complete --force`, `checkpoint export`, `verification record`) + `POLICY-TIER-DENIED` exit 4, `review:` + `VERDICT_BLOCKING`, merge order + digest | Rewrote SKILL.md + expanded merge-order.md (precedence, digest, offline/traversal refusals, locks, check commands)

Root cause: static templates in `templates/skills/` are copied verbatim by `src/core/skills/install.ts` (checksum/ownership in `.ackit/skills.lock.json`); content is never synthesized from current docs/CLI, so later workflow/intent/checkpoint/evidence/verdict/drift/policy-v2/sync work never flowed into shipped instructions until this audit.

### Tests

- New `tests/contract/skills-parity.test.ts` (10 tests): discovers 4 builtins sorted; frontmatter/name/path; stale-shorthand negative probe; workflow/policy/scan/pack content requirements; `--help` smoke for 30+ explicit cases via `runCli`; snippet→CLI prefix mapping; packaging whitelist (`templates` in `package.json` files + all template files readable). `pnpm vitest run tests/contract/skills-parity.test.ts` → 10/10 pass. Focused `parity + install + sync` → 32/32 pass. Full `pnpm test` → 593/594 pass with 1 transient flake (`sync.test.ts` #18 dist import race with parallel `pnpm pack` build; isolated rerun 17/17 pass; tarball-smoke 3/3 pass).
- `pnpm lint` exit 0, `pnpm format:check` exit 0, `pnpm typecheck` exit 0, `pnpm build` exit 0, `pnpm gen:schemas` idempotent, `pnpm smoke:cli` pass.
- `node scripts/check-version-parity.mjs` PASS (current 0.4.0), `node scripts/check-text-hygiene.mjs --repo` clean, `node scripts/check-offline-egress.mjs` PASS.
- `node dist/cli/index.js doctor` exit 0, `task doctor` integrity OK, `skills validate` 0 skills 0 issues exit 0, `scan --ci` exit 0 readiness 88/100 pass, `git diff --check` clean.

### Managed sync proof

API proof (`installSkills` with temp `builtinsDir`, all PASS): 1 missing→installed; 2 owned-unchanged-old-canonical→updated + content==v2; 3 owned-modified→conflict + no-clobber; 4 owned-modified+force→updated + content==v2; 5 third-party+force→refused + untouched; 6 version-only-identical→zero-write tree-same + status up-to-date + lock-unchanged; 7 canonical-change→content-driven chkOld!=chkNew + lock==source + no absolute paths + repo-relative paths. CLI proof with corrected templates: fresh `$base` missing→installed 4/4 + 8/8 files EQUAL + second run 4/4 up-to-date; local edit → `skills install` conflict exit 4; `sync --force` → updated (local edits discarded) exit 0. Lock entries show sha256 + `.agents/skills/<name>/...` forward-slash paths. Finding (out of scope, not fixed here): `skills install --force` / `skills sync --force` read force from parent opts, so CLI flag is ignored (API + `sync --force` work); filed as 0.5.0 follow-up to preserve patch discipline.

### Package proof

`pnpm pack --dry-run` lists all 8 template files; `pnpm pack` tarball `cynrath-agent-context-kit-0.4.0.tgz` extracts with 4/4 SKILL.md TARBALL-EQUAL to working-tree corrected templates. Fresh isolated consumer (`npm install <tarball>`): `ackit --version` 0.4.0, `skills install` 4/4 installed, `skills validate` 4 skills 0 issues, 4/4 FRESH-EQUAL, `sync --check` shows skills up-to-date (instruction shims would-create as expected for fresh repo, exit 1).

### Post-v0.4.0 delta classification (v0.4.0 cc44102..f6979fa + branch ee02c2c)

Change | Public? | Type | SemVer class | Evidence
e646371 TASK-0073 bookkeeping (1 task doc) | No | docs-test-only | patch/none | `git show --stat e646371`
e869261 `task archive --completed [--dry-run]` bulk helper (task.ts + store.ts::archiveCompleted + help + JSON + journal) | YES | new functionality (backward-compatible) | minor | `git diff v0.4.0..HEAD -- src/cli/commands/task.ts src/core/tasks/store.ts`; `task archive --help`; `docs/reference/cli.md` new row
e869261 `TASK-COMPLETED-IN-ACTIVE` doctor finding (store.ts::doctor) | YES | new functionality | minor | `TASK-COMPLETED-IN-ACTIVE` in store + cli docs + lifecycle guard
e869261 text-hygiene gate (scripts/check-text-hygiene.mjs/.d.mts + package.json check:text-hygiene + ci.yml step + AGENTS.md guidance + tests) | No (dev/CI, not in npm files, not CLI) | maintenance/docs-test-only | patch/none | `package.json` files excludes scripts; `pnpm pack --dry-run` omits scripts
e869261 73 archive renames + TASK-0074/0075 docs + lifecycle guard docs | Partial (docs describe new behavior) | docs (tied to minor above) | docs/minor-tied | `git show --name-status e869261` R100 renames
e869261 tests (archive.test.ts, text-hygiene.test.ts) | No | docs-test-only | patch/none | test files only
f6979fa TASK-0076 bookkeeping (1 task doc) | No | docs-test-only | patch/none | `git show --stat f6979fa`
ee02c2c skill template fixes (8 files, no new names) | YES (shipped `templates/` surface) | bugfix/maintenance | patch | template diff; parity tests
ee02c2c parity tests | No | docs-test-only | patch/none | `tests/contract/skills-parity.test.ts`

SemVer policy: CHANGELOG follows Semantic Versioning; ADR-0023 coupling (one logical release, immutable tag, no master publish); v0.4.0 precedent (`docs/evidence/TASK-0073-verification-bundle.md` § Version decision: new public CLI capability `ackit sync` + expanded behavior, backward-compatible, no breaking → minor 0.4.0); pre-1.0 additive → minor.

SEMVER DECISION: 0.5.0 REQUIRED

Full delta contains new public CLI functionality (`task archive --completed [--dry-run]`, `TASK-COMPLETED-IN-ACTIVE`), backward-compatible, no breaking change → minor under established precedent. Text-hygiene + skill fixes alone would be patch-valid, but FULL delta is not. No version-surface edits, no PR, no tag/npm/VS Code/Release/Action/docs publish attempted. No branch from old tag to evade classification. Browser Companion untouched. Branch `fix/skill-template-parity-0077` (plan f472944 + implementation ee02c2c + active-status evidence) left unmerged for 0.5.0 retarget.

SKILL-TEMPLATE-PATCH: NO-GO (for 0.4.1; audit+fixes+tests+correct stop complete; 0.5.0 required).

### Fresh verifier (independent, read-only)

Lightweight verifier `00efcfc6` OVERALL PASS, zero blockers, no writes. Templates PASS (no stale shorthand; all required semantics present per file/line). Command correctness 15/15 `--help` exit 0. Parity suite 10/10 (`pnpm vitest run tests/contract/skills-parity.test.ts`). Sync semantics PASS with `install.ts` line citations (all 7 scenarios + version-only no-dirty + absolute-path guard). Tarball PASS via files whitelist + 4/4 TARBALL-EQUAL fallback compare (`pnpm pack --dry-run` skipped by design to avoid prepack build race). Independent SEMVER DECISION: 0.5.0 REQUIRED (v0.4.0 precedent: new backward-compatible public CLI capability → minor). Publication guard PASS (only `v0.4.0` tag, version `0.4.0`, no open PRs, fix branch clean, Companion only listed). First verifier `187d9549` stalled across 4 rounds and was interrupted with no result; replacement scope avoided builds/packs/full suite.

### Cross-line TASK-ID clarification (no history rewrite, recorded 2026-09-04 v0.5 baseline)

- v0.4.1 was published from a separate maintenance line (`maintenance/v0.4.1`, branched from immutable `v0.4.0` tag commit `cc44102`, never from current master).
- The maintenance-line `TASK-0074` (`v0.4.1 patch-only maintenance release from v0.4.0 line`, branch-local under `maintenance/v0.4.1`) is branch-local historical release bookkeeping only.
- It is distinct from current-master historical `TASK-0074` (`Repository hygiene - archive completed task docs and lifecycle guard`, completed 2026-09-03, archived under `docs/tasks/archive/` on master).
- The ID collision is an expected consequence of branching the maintenance line from the old `v0.4.0` tag, which already contained a master `TASK-0074`.
- Current-master ownership of the skill-template/force forward-port is `TASK-0077` on branch `fix/skill-template-parity-0077`.
- No maintenance task document is being merged into master (verified: `git diff --name-status master..fix/skill-template-parity-0077` contains only `TASK-0077-*.md`, no `TASK-0074` doc).
- The forward-port commit `4b4045f` message mentions maintenance-line `TASK-0074` as provenance; history is NOT rewritten (no rebase/force-push). The eventual squash-merge commit title/body must reference `TASK-0077`, not the maintenance-line `TASK-0074`.

### v0.4.1 current truth update (recorded 2026-09-04, historical statements above preserved as evidence)

- v0.4.1 patch release: SUCCESS on separate maintenance line (`maintenance/v0.4.1` head `ba0ab64`; release commit `5dbd4cd`; annotated tag `v0.4.1` object `a2aa0a4`).
- Skill template corrections: public in v0.4.1 (backported from `ee02c2c` and adapted to the v0.4.x capability surface).
- Skills install/sync `--force` fix: public in v0.4.1 (maintenance `TASK-0074` scope) and forward-ported to this branch as `4b4045f` (`src/cli/commands/skills.ts` reads subcommand action `opts.force`; `tests/integration/skills/force-cli.test.ts` regression coverage).
- Richer current-master skill content: preserved on `TASK-0077` branch (master-only progressive guidance including `task archive --completed` and `TASK-COMPLETED-IN-ACTIVE` wording remains valid on the v0.5 line; it was intentionally excluded from the v0.4.1 backport).
- Forward-port force fix: present on this branch (`4b4045f`, verified by `git diff master..HEAD -- src/cli/commands/skills.ts`).
- TASK-0077 goal now: land the current-master version of these fixes cleanly onto `master` via one squash-merge PR (`fix/skill-template-parity-0077` -> `master`), with no version-surface edits, no tag/publish, and no maintenance-line merge.

### v0.5-baseline re-validation (recorded 2026-09-04 on `fix/skill-template-parity-0077`)

Branch-switch hygiene: switched `maintenance/v0.4.1` -> `fix/skill-template-parity-0077`, then ran `pnpm build` before any built-CLI validation (`dist/` is git-ignored and survives branch switches). Audit: no `clean`/`rebuild` helper exists in `package.json` scripts (`build`, `typecheck`, `lint`, `format:check`, `test`, `gen:schemas`, `smoke:cli`, `smoke:package` only). Smallest durable hardening applied: `docs/guides/ci.md` gains a `Local branch-switch build hygiene` note so future release/backport runbooks rebuild `dist/` after switching lines. No new build machinery, no dependency changes.

Gates (all on current branch head including the TASK-ID clarification above, after rebuild):

- `pnpm install --frozen-lockfile` PASS (up to date)
- `pnpm lint` PASS (306 files, no fixes)
- `pnpm format:check` PASS (290 files, no fixes)
- `pnpm typecheck` PASS (exit 0)
- `pnpm build` PASS (exit 0)
- `pnpm test` PASS (103 files, 598 tests passed)
- Focused `tests/contract/skills-parity.test.ts` + `tests/integration/skills/force-cli.test.ts` PASS (2 files, 14 tests: 10 parity + 4 force)
- `pnpm gen:schemas` idempotent (`git diff --exit-code -- schemas` exit 0)
- `pnpm smoke:cli` PASS (cli-scaffold smoke all assertions passed)
- `pnpm run smoke:package` PASS (`cynrath-agent-context-kit-0.4.0.tgz`, v0.4.0)
- `node scripts/check-offline-egress.mjs` PASS (194 files, no egress)
- `node scripts/check-version-parity.mjs` PASS (current 0.4.0, 14 files clean)
- `node scripts/check-text-hygiene.mjs --repo` clean (888 files)
- `node dist/cli/index.js config check` PASS (`ackit.yml` OK)
- `node dist/cli/index.js doctor` PASS (all checks passed)
- `node dist/cli/index.js task doctor` PASS (integrity OK)
- `node dist/cli/index.js skills validate` 0 skills 0 issues (repo root has no installed skills; installed-skill proof done in isolated temp repos)
- `node dist/cli/index.js scan --ci` PASS (readiness 88, threshold 80)
- `git diff --check` clean

Targeted proofs:

- 4 builtin skills only (`templates/skills`: `ackit-context-optimization`, `ackit-policy-authoring`, `ackit-scan-and-fix`, `ackit-workflow`)
- Skill-CLI parity green (parity suite 10/10 plus 15/15 `--help` command correctness from prior verifier, still valid: no CLI surface changed since)
- `skills install --force` works (live temp repo: local edit -> conflict, `--force` -> `updated - local edits discarded via --force`)
- `skills sync --force` works (live temp repo: re-edit -> `--force` -> `updated - local edits discarded via --force`)
- Third-party force refusal remains (force-cli suite: third-party collision stays refused even with `--force`, both subcommands)
- Richer master-only task-archive wording valid on current master (`ackit-workflow/SKILL.md` documents bulk `ackit task archive --completed [--dry-run]` and `TASK-COMPLETED-IN-ACTIVE`; `task archive --help` on this branch exposes `--completed`/`--dry-run`)
- No v0.4.1 package metadata copied (`package.json` version `0.4.0`; `CHANGELOG.md` has zero `## [0.4.1]` entries; diff `master..HEAD` touches no `package.json`/`CHANGELOG.md`/`pnpm-lock.yaml`)
