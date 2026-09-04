---
id: "TASK-0077"
title: "Builtin skill template audit and CLI parity hardening"
status: pending
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

- [ ] Audit table complete for all four builtins; every command/example validated against built CLI `--help`/parser and current docs; stale/wrong items fixed; `ackit task "<title>"` shorthand removed unless intentionally supported (proven).
- [ ] Corrected templates remain concise/progressive; no new builtin skill names added.
- [ ] Parity tests green and fail on reintroduced stale syntax (proven by negative probe, e.g. old shorthand fixture).
- [ ] Managed 7-scenario proof recorded with lock checksum/path evidence.
- [ ] Package proof recorded: candidate tarball contains corrected templates; fresh isolated install shows four generated SKILL.md equal to packaged templates; `ackit --version`, `skills install`, `skills validate`, `sync --check` verified.
- [ ] Post-v0.4.0 delta classification complete with evidence for `task archive --completed`, `TASK-COMPLETED-IN-ACTIVE`, text-hygiene, skill fixes; no new public CLI behavior hidden.
- [ ] Exactly one SemVer decision emitted with policy citation; if 0.5.0 REQUIRED, no version-surface edits, no PR merge, no tag/npm/VS Code/Release/Action/docs publish attempted.
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

(in progress — evidence appended as gates complete)
