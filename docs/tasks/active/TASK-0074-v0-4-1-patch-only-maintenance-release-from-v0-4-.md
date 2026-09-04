---
id: "TASK-0074"
title: "v0.4.1 patch-only maintenance release from v0.4.0 line"
status: pending
schemaVersion: 2
dependencies: []
createdAt: "2026-09-04"
completedAt: null
---

## Purpose

Patch-only v0.4.1 maintenance release sourced from the immutable `v0.4.0` tag commit (`cc4410250ab2dd263b220bf42f1f5b7f0a309050`), never from current master (which already carries minor-level additions and must not be labeled 0.4.1).

Backport source/reference: TASK-0077 / commit `ee02c2c818d186ff30d0e50da8d9e66cb27e3a62` on the future v0.5.0 line (`fix/skill-template-parity-0077`, preserved untouched). Only the actual skill implementation in that commit is backported, adapted to the v0.4.x capability surface. Additionally fix the existing `skills install --force` / `skills sync --force` CLI wiring bug (flag read from parent opts instead of subcommand opts, so `--force` is silently ignored).

Explicit exclusions: post-v0.4.0 `task archive --completed` helper; `TASK-COMPLETED-IN-ACTIVE` doctor finding; text-hygiene public/process work unless strictly required by release tooling; all other master-only minor features; Browser Companion (`feat/browser-companion-v0.3`, PAUSED/NO-GO/DO NOT TOUCH).

Release authorization (explicit user authorization for this exact release, per Controlled-release governance): the session goal authorizes completing the full v0.4.1 lifecycle on branch `maintenance/v0.4.1` — patch implementation, version 0.4.1 surfaces, full validation, annotated immutable tag `v0.4.1` creation + push (tag triggers the existing `release.yml` OIDC publish + GitHub Release), VS Code Marketplace publish `Cynrath.ackit-vscode 0.4.1` (separate explicit step), hosted-docs update via the site repo protected flow (branch → PR → docs-integrity → merge, no direct main push), and forward-porting only the force-wiring fix to `fix/skill-template-parity-0077`. Prohibited (unchanged): force-push, rebase, history rewrite, tag movement/deletion, workflow dispatch, deployments, weakening quality gates, legacy .NET/NuGet mutation, merging `maintenance/v0.4.1` wholesale into master, touching Browser Companion.

## Current-state evidence (verified live 2026-09-04 on maintenance/v0.4.1 at v0.4.0)

- `git switch --detach v0.4.0` + `git switch -c maintenance/v0.4.1`: HEAD == `cc4410250ab2dd263b220bf42f1f5b7f0a309050`; `git merge-base --is-ancestor v0.4.0 HEAD` exit 0; `git diff --exit-code v0.4.0...HEAD` clean before changes.
- v0.4.0 CLI (rebuilt via `pnpm install --frozen-lockfile` + `pnpm build`): `task create <title>` exists (`task --help` lists create/list/doctor/show/resume/start/complete/archive); `task archive <id>` takes required `<id>` (no `--completed`); `store.ts` has no `archiveCompleted`/`TASK-COMPLETED-IN-ACTIVE`.
- Force-wiring bug reproduced live: fresh temp repo → `skills install` (4 installed) → append local edit → `skills install` reports `conflict-user-modified` → `skills install --force` STILL reports `conflict-user-modified` and leaves the local edit in place. Source: `src/cli/commands/skills.ts` lines 338/398 read `(skillsCommand.opts() ?? {})` (parent, never carries `--force`) instead of the subcommand action opts (contrast `export` at line 415 which correctly uses action `opts`).
- No `v0.4.1` tag (`git tag --list v0.4*` → `v0.4.0` only); npm versions end at `0.4.0` (`@0.4.1` → E404); `gh release view v0.4.1` → not found; Marketplace page shows `0.4.0`; no open PRs.
- `fix/skill-template-parity-0077` local == remote == `ef97f1c6`, 4 ahead / 0 behind master; must not be altered except the final forward-port of the force fix.

## Scope

- Backport (via `git cherry-pick -n ee02c2c8`, reviewed line-by-line, never blindly) only: 8 template/reference files under `templates/skills/` + `tests/contract/skills-parity.test.ts`; adapt templates to v0.4.x surface (keep `task create`, intent, workflow set/show/advance/verify, plan/spec/decision refs, checkpoints/resume/handoff, evidence, verification/verdict, drift, completion gate, singular `task archive <id>` where available on v0.4.0, policy v2, task-aware packs, sync, doctor/task doctor/scan gates; REMOVE any `task archive --completed` / `TASK-COMPLETED-IN-ACTIVE` wording).
- Fix `skills install --force` + `skills sync --force` to read the subcommand's own opts; add focused CLI-level regression tests (owned-modified + force → updated; third-party + force → still refused; no force → still conflict).
- Adapt parity suite to v0.4.1 CLI (explicit command-case table, stale-shorthand probe, no-master-only-helper assertion, packaging whitelist, fresh-install canonical check).
- Managed 7-scenario proof incl. CLI force pass-through; version 0.4.1 surfaces (`package.json`, VS Code manifest, lock metadata as applicable, README/current docs/CI parity refs, CHANGELOG `## [0.4.1] - 2026-09-04` patch-oriented, no archive-`--completed` mention); full maintenance-line gates; real 0.4.1 tarball + fresh isolated consumer proof.
- Tag `v0.4.1` on the validated commit + push tag (release workflow publishes npm + GitHub Release); VS Code 0.4.1 publish + propagation check; hosted-docs 0.4.1 via site branch → PR → docs-integrity → merge; external registry verification; forward-port of force fix only to `fix/skill-template-parity-0077`; STOP before v0.5.0 roadmap work.

## Out of scope

- Merging `maintenance/v0.4.1` into master (or vice versa); rebasing/rewriting `fix/skill-template-parity-0077`; deleting either branch before tag reachability is confirmed.
- `task archive --completed`, `TASK-COMPLETED-IN-ACTIVE`, text-hygiene scripts/process, any master-only minor feature, new builtin skill names, hosted-docs theme redesign, Browser Companion, legacy .NET/NuGet.
- Force-push, rebase, history rewrite, tag movement/deletion, workflow dispatch, deployments, gate weakening.

## Dependencies

- None (single-task maintenance chain; v0.4.0 tag immutable and present; backport reference commit `ee02c2c8` available locally).

## Affected files / expected areas

- `templates/skills/ackit-workflow/SKILL.md` + `references/task-lifecycle.md`
- `templates/skills/ackit-scan-and-fix/SKILL.md` + `references/severity-playbook.md`
- `templates/skills/ackit-context-optimization/SKILL.md` + `references/ranking.md`
- `templates/skills/ackit-policy-authoring/SKILL.md` + `references/merge-order.md`
- `src/cli/commands/skills.ts` (force-opts fix only)
- `tests/contract/skills-parity.test.ts` (backported + adapted) + new CLI force regression test (e.g. `tests/integration/skills/force-cli.test.ts` or adjacent)
- `docs/tasks/active/TASK-0074-*.md` (this task)
- Version surfaces (only after green): `package.json`, `pnpm-lock.yaml` as applicable, `extensions/vscode/package.json` (+ README/CHANGELOG current sections), `README.md`, current `docs/**`, `.github/workflows/ci.yml` refs where version-coupled, `CHANGELOG.md`
- Tag `v0.4.1` (immutable, never moved)
- Never: `dist/`, `.ackit/`, `artifacts/`, `node_modules/`, coverage, reports, packs, tarballs

## Acceptance criteria

- [ ] Maintenance branch ancestry is exactly the v0.4.0 tag line (no master commits); `fix/skill-template-parity-0077` untouched except final force-fix forward-port.
- [ ] Backported templates contain no `archive --completed` / `TASK-COMPLETED-IN-ACTIVE`; every documented command validated against the v0.4.1 built CLI; stale `ackit task "<title>"` shorthand absent.
- [ ] `skills install --force` + `skills sync --force` update owned-modified skills, still refuse third-party even with force, and remain conflict without force (CLI-level regression tests green).
- [ ] Parity suite green incl. negative probes (stale shorthand + master-only helper).
- [ ] Managed 7-scenario proof recorded with lock checksum/path evidence.
- [ ] Version coupling 0.4.1 (`package.json` == extension manifest == README/docs current truth; historical refs preserved); CHANGELOG `## [0.4.1]` patch-oriented with no minor-helper mention.
- [ ] Full maintenance-line gates green; real 0.4.1 tarball + fresh consumer proof (`--version` 0.4.1, install/validate/force paths, SKILL.md equality).
- [ ] Independent verifier PASS with zero blockers on the 10-point patch checklist.
- [ ] Tag `v0.4.1` on the validated commit; release workflow green; npm `0.4.1` (`latest → 0.4.1`, provenance) + GitHub Release live; VS Code `0.4.1` propagated; hosted docs show 0.4.1 via site PR flow with theme hashes preserved.
- [ ] External registry verification green; force fix forward-ported to `fix/skill-template-parity-0077` (richer templates preserved, no version/CHANGELOG/task backport); both branches pushed; Companion untouched.

## Test steps

1. `git merge-base --is-ancestor v0.4.0 HEAD`; `git diff --exit-code v0.4.0...HEAD` (pre-change baseline).
2. `node dist/cli/index.js --version` (expect `0.4.0` pre-bump), `task doctor`, `skills install --force` repro (expect conflict pre-fix).
3. `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build`.
4. Focused parity + force tests, then `pnpm test` (record counts).
5. `pnpm gen:schemas` + `git diff --exit-code -- schemas`; `pnpm smoke:cli`; `pnpm run smoke:package`.
6. `node scripts/check-offline-egress.mjs`; `node scripts/check-version-parity.mjs`; `node dist/cli/index.js config check/doctor/task doctor/skills validate/sync --check/scan --ci`; `git diff --check`.
7. Managed 7-scenario proof (isolated temp repos, checksums/paths) + CLI force pass-through proof.
8. `pnpm pack` real 0.4.1 tarball + fresh isolated consumer (`--version/skills install/skills validate/skills install --force/skills sync --force/sync --check` + SKILL.md equality).
9. Independent verifier (10-point patch checklist, zero blockers).
10. Tag `v0.4.1`, push tag, watch release workflow to green; verify npm/latest/provenance + GitHub Release; VS Code publish + propagation; site branch → PR → docs-integrity → merge + live check.
11. External `npm install -g @cynrath/agent-context-kit@0.4.1` + `npx --yes ... --version` + installed SKILL.md inspection.
12. Forward-port force fix to `fix/skill-template-parity-0077`; run that branch's gates; confirm push state.

## Security considerations

- No secrets in templates/tests/docs; synthetic fixture values only; no absolute local paths in artifacts/evidence.
- Third-party skills never overwritten even with `--force` (regression-tested); no gate weakening to obtain green.
- Offline-first preserved: no network/telemetry/uploads in product code (static + runtime gates must stay green).
- User files never overwritten without explicit intent flags; `--force` semantics otherwise unchanged.

## Risks

- Cherry-pick drags master-only wording → mitigated by `-n` + line-by-line review + explicit grep for `--completed`/`TASK-COMPLETED-IN-ACTIVE` + parity negative test.
- v0.4.0-line test/API drift vs master assumptions → mitigated by running the line's own full suite, not master's.
- Release-workflow hosted flakiness → rerun affected job only via maintainer-visible runs; never move/recreate the tag; record workflow run IDs.
- npm/Marketplace propagation delay → bounded retries with version-pinned reads; never republish same version with different content.
- Site generator drift touching theme assets → hash proof before/after + protected PR flow only.

## Rollback plan

- Before tag push: `git revert <commit>` per-commit on `maintenance/v0.4.1`; no history rewrite; delete nothing (branch + tag absence keeps registry clean).
- After tag push: tag is immutable — never move/delete. Partial-publish state is fixed forward (new patch version), never by same-version content mutation. Record public state explicitly.

## Completion notes

Validation evidence 2026-09-04 on `maintenance/v0.4.1` @ `eb3e8c7` (ancestry `eb3e8c7 → 380a45a → 9c0e4d3 → v0.4.0 cc44102`; no master commits).

- Preflight: master == origin/master == `f6979fa`; `fix/skill-template-parity-0077` local == remote == `ef97f1c6` (4 ahead / 0 behind); `v0.4.0^{commit}` == `cc44102`; no `v0.4.1` tag; npm versions end at `0.4.0` (`@0.4.1` E404); `gh release view v0.4.1` not found; Marketplace shows `0.4.0`; no open PRs.
- Branch from tag verified: `merge-base --is-ancestor v0.4.0 HEAD` exit 0; `diff v0.4.0...HEAD` empty pre-change.
- Backport: `cherry-pick -n ee02c2c8` applied cleanly (9 files); adapted `ackit-workflow/SKILL.md` step 7 + `task-lifecycle.md` to singular `task archive <id>` (removed bulk `--completed` + `TASK-COMPLETED-IN-ACTIVE`); adapted parity suite (v0.4.1 required-list + master-only-helper negative probe). Grep clean: zero `archive --completed` / `TASK-COMPLETED-IN-ACTIVE` / stale `ackit task "` hits under `templates/skills/`.
- Force bug reproduced pre-fix on v0.4.0 line (`skills install --force` left conflict + local edit); fixed `src/cli/commands/skills.ts` install + sync actions to use subcommand `opts` (mirrors `export`); live post-fix proof: no-force → conflict kept; `--force` → updated for both subcommands; third-party + force → refused (regression tests).
- Gates: install 0, lint 0, format:check 0, typecheck 0, build 0, full `pnpm test` 101 files / 582 tests PASS exit 0, `gen:schemas` idempotent, `smoke:cli` pass, `smoke:package` → `package smoke OK — cynrath-agent-context-kit-0.4.1.tgz (v0.4.1)` exit 0, offline-egress PASS, version-parity PASS (current 0.4.1, extension coupled), doctor 0, task doctor OK, skills validate 0/0, `scan --ci` exit 0 (readiness 88 pass), `git diff --check` clean.
- Focused re-run on final tree: parity + version-parity + readme-current/parity + force-cli + install = 44/44 PASS.
- Tarball: `cynrath-agent-context-kit-0.4.1.tgz` (435704 bytes); 8 template files present; fresh isolated consumer: `--version` 0.4.1, `skills install` 4/4, `skills validate` 4/0, `skills install --force` + `skills sync --force` update owned, `sync --check` skills up-to-date, 4/4 SKILL.md EQUAL to tarball canonical.
- Branch pushed: `origin/maintenance/v0.4.1` == `eb3e8c7`.
- Note: `task start TASK-0074` refused — v0.4.0-line TASK-0073 is still `[active]` (pre-existing release-record state, out of scope to mutate); task proceeds as planned/pending per Rule 1 (existence + full plan + plan-before-implementation all satisfied).
- Independent verifier + tag/publication evidence to be appended.
