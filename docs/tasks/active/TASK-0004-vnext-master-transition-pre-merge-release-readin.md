---
id: "TASK-0004"
title: "vnext master transition pre-merge release readiness"
status: completed
schemaVersion: 2
dependencies:
  []
createdAt: "2026-08-25"
completedAt: 2026-08-25
---

## Purpose

Prepare `rebuild/ackit-vnext` for the master merge (release transition): make GitHub CI run for `master` push/PR triggers, move agent governance from rebuild-only to controlled-release rules, bring README/CHANGELOG to an honest release-candidate state, complete public npm package metadata, and re-validate everything locally plus a real-tarball isolated consumer smoke — without performing any master mutation, publish, tag, or GitHub Release.

## Scope

- `.github/workflows/ci.yml`: add `push` → `master` and `pull_request` target → `master` triggers; keep the existing 3 OS × Node 22/24 verify matrix, self-scan, and package-smoke jobs and all action SHA pins unchanged.
- `tests/contract/ci-pinning.test.ts`: flip the rebuild-era "no master trigger" guard into a positive master push/PR trigger requirement (behavioral change mandated by this task); SHA-pinning and no-publish-workflow guards unchanged.
- `.github/pull_request_template.md`: replace stale v1 dotnet checklist commands with the vNext local gate; keep release-safety checklist items.
- `AGENTS.md`: replace rebuild-only absolute-ban governance with controlled-release governance (master/publish/tag/release require explicit user authorization; force-push/rebase/history rewrite stay banned); replace legacy global .NET `ackit` validation examples with the repo-internal Node CLI (`node dist/cli/index.js ...`).
- `CLAUDE.md`, `.github/copilot-instructions.md`: sync the same controlled-release governance and vNext validation commands; remove stale v1/.NET instructions that no longer exist on this branch.
- `README.md`: honest release-candidate status (vNext `0.1.0` candidate, not yet published) without branch-specific rebuild narration; keep source-usage path; npm usage only in clearly marked post-publish context.
- `CHANGELOG.md`: rewrite the `0.1.0` entry as release-ready but unreleased (no invented date, no publish claim); legacy .NET section preserved verbatim.
- `package.json`: add `publishConfig.access: "public"`, `repository`, `homepage`, `bugs`, `keywords` with real values; keep name/version/engines/bin unchanged.
- `CONTRIBUTING.md`, `docs/guides/getting-started.md`: repo-internal CLI examples + release-candidate wording.
- `docs/rebuild/GOAL2_BOOTSTRAP.md`: add a top banner marking it as the completed Goal-2 historical record and pointing current governance to `AGENTS.md` (body preserved).
- Stale-statement consistency sweep across canonical docs (`unpublished`, `0.1.0-dev`, `active rebuild`, branch-specific claims, absolute master/publish bans, legacy-scanner-as-validator).

## Out of scope

- master push/merge, force-push, history rewrite, tags, GitHub Releases, npm/NuGet publish, workflow dispatch, deployments.
- Any change to workflow matrix, job set, action SHA pins; no new release/publish workflow.
- Rewriting historical task/evidence/ADR records (`docs/tasks/TASK-*`, `PROJECT-CONTROL-*`, `docs/rebuild/VNEXT_REQUIREMENTS.md`, ADRs) — they remain preserved evidence.
- Dependency or stack changes; version/name changes; scan policy suppression loosening.

## Affected files

- .github/workflows/ci.yml
- tests/contract/ci-pinning.test.ts
- .github/pull_request_template.md
- AGENTS.md
- CLAUDE.md
- .github/copilot-instructions.md
- README.md
- CHANGELOG.md
- package.json
- CONTRIBUTING.md
- docs/guides/getting-started.md
- docs/rebuild/GOAL2_BOOTSTRAP.md
- docs/tasks/active/TASK-0004-vnext-master-transition-pre-merge-release-readin.md

## Requirement IDs

REQ-GOV-010 (controlled-release successor), REQ-CI-001, REQ-SEC-005, REQ-DOC-001, REQ-DOC-004, REQ-PKG-001, REQ-ARCH-010

## Acceptance criteria

- [x] CI triggers include `push`→`master` and `pull_request`→`master`; `rebuild/**` triggers retained; matrix/jobs/pins unchanged.
- [x] `AGENTS.md` states controlled-release governance: master/publish/tag/release only via explicit user authorization (not granted to this task); force-push/rebase/history rewrite prohibited; NuGet/.NET line frozen; repo-internal Node CLI used for vNext validation; ACKit-first/task-first/docs-first preserved.
- [x] README presents `0.1.0` as a release candidate not yet published; no `unpublished`/`0.1.0-dev`/branch-specific status block; source usage path kept; post-publish install clearly labeled.
- [x] CHANGELOG `0.1.0` entry is release-ready, explicitly unreleased, no fabricated date/publish result; legacy section byte-preserved.
- [x] `package.json` gains real `publishConfig`(access public), `repository`, `homepage`, `bugs`, `keywords`; name/version/engines/bin untouched; lockfile-compatible (no dependency changes).
- [x] Canonical docs contain no stale rebuild-status/legacy-validator statements; historical records left intact.
- [x] Full local gate green: frozen install, lint, format:check, typecheck, gen:schemas, build, test, smoke:cli, smoke:package, config check, doctor, task doctor, skills validate, instructions, scan --ci, git diff --check.
- [x] Real `.tgz` content audit + isolated temp consumer install green (--version/--help/config check/doctor/scan/pack/task lifecycle/MCP tools).
- [x] Normal (no `--force`) task completion with real evidence recorded below.
- [x] Branch fast-forward pushed; GitHub Actions run for the exact final HEAD is success with all 10 jobs green (head_sha == local rev-parse HEAD) — verified post-push per the chronology convention in Completion notes item 8; the verdict pair (final SHA + run ID) is recorded in the session closure report.

## Test steps

1. `pnpm install --frozen-lockfile`
2. `pnpm lint && pnpm format:check && pnpm typecheck && pnpm gen:schemas && pnpm build`
3. `pnpm test`
4. `pnpm smoke:cli && pnpm run smoke:package`
5. `node dist/cli/index.js config check / doctor / task doctor / skills validate / instructions / scan --ci`
6. `git diff --check`
7. Tarball audit: `pnpm pack` (or `npm pack --dry-run`) → inspect file list/metadata; install the produced `.tgz` into an isolated temp dir; run installed CLI battery incl. MCP initialize/tools-list.
8. Push; verify hosted CI run head_sha equals final commit SHA and every job concluded `success`.

## Risks

- README/CHANGELOG wording could overstate publication state — mitigated by explicit "not yet published / release candidate" framing reviewed against REQ-DOC-004.
- CI trigger widening could pull master PR builds with failing config — mitigated by keeping job definitions identical to the currently green rebuild/** runs.
- Metadata additions could break strict consumers — mitigated by using standard npm field formats only; no dependency changes; lockfile frozen install proves compatibility.

## Rollback plan

Focused revert of this single documentation/config commit on the rebuild branch (fast-forward history only). No destructive git operation is required or allowed.

## Completion notes

1. CI triggers (`.github/workflows/ci.yml`): `push` and `pull_request` branch lists are now `["master", "rebuild/**"]`; job definitions, matrix, and all three action SHA pins untouched; no release/publish workflow added. The contract guard `tests/contract/ci-pinning.test.ts` previously asserted NO master trigger (rebuild-era policy); it now positively requires master push/PR triggers while keeping the SHA-pin and no-publish-workflow guards. New test added (suite total 290).
2. Governance: `AGENTS.md` rewritten around Controlled-release governance (user-authorized master/publish/tag/release; always-prohibited force-push/rebase/history-rewrite/tag-movement/workflow-dispatch/deployments; frozen .NET line immutable; global .NET `ackit` banned as vNext validator; repo CLI validation command block). `CLAUDE.md`, `.github/copilot-instructions.md`, `CONTRIBUTING.md` synced to the same rules and to the TS/Node/pnpm/vitest/biome stack, removing stale dotnet/`ackit scan --ci --exclude` guidance. `.github/pull_request_template.md` checklist switched from deleted v1 dotnet commands to the vNext gate.
3. README/CHANGELOG: status block now "release candidate … not yet published"; Install keeps checkout usage and labels registry commands as post-publish-only; Versioning section states candidate-not-published honestly. CHANGELOG `0.1.0` retitled "Unreleased" with explicit "has not been published yet" and no date/publish fabrication; legacy v1 section preserved verbatim below the edit boundary. `docs/guides/getting-started.md` aligned. `docs/rebuild/GOAL2_BOOTSTRAP.md` got a historical-record banner (body unchanged). Remaining `unpublished` matches are confined to preserved records (`docs/rebuild/VNEXT_REQUIREMENTS.md` REQ-DOC-004 row, ADR-0013 consequence note) — intentional historical evidence.
4. `package.json`: added `publishConfig {"access":"public"}`, `repository` (git+https GitHub URL), `homepage`, `bugs`, and 14 real keywords; name/version/engines/bin/files/dependencies untouched. Initial homepage value with a `#readme` fragment tripped ACKIT080 (fragment heuristic) in self-scan → resolved by using the fragment-free repo URL instead of weakening the rule or adding a suppression. Frozen-lockfile install proves no dependency drift.
5. Full local gate on final tree (all exit 0): install(frozen) · lint · format:check · typecheck · gen:schemas · build · test (**58 files / 290 tests passed**) · smoke:cli · smoke:package (`cynrath-agent-context-kit-0.1.0.tgz` v0.1.0) · config check · doctor · task doctor · skills validate · instructions · scan --ci · git diff --check. scan --ci exits 0 under the configured policy gate (findings displayed remain suppressed by existing `ackit-policy.yml` entries; no suppression was loosened).
6. Tarball audit (read-only extraction of the packed tgz): exactly dist/, schemas/, templates/, README.md, CHANGELOG.md, LICENSE, package.json (297 files); packaged metadata verified (name/version/bin/engines/publishConfig/repository/homepage/bugs/keywords); packaged README/CHANGELOG carry the release-candidate wording; zero src/tests/docs/node_modules leakage, zero test files.
7. Isolated consumer smoke (separate temp dir, own minimal package.json, real `npm install <tgz>`): installed CLI --version == package version; --help lists core commands; config check / doctor / scan / scan --json / pack --format json all exit 0; task lifecycle create→start→completion-gate BLOCKED (exit 2)→document repair→normal complete WITHOUT `--force`→archive all exit 0; MCP battery over stdio from installed package: initialize identity match, tools/list incl. ackit_scan/pack/doctor/list_tasks, tools/call, resources/list+repo://summary read, prompts/list+get, clean shutdown exit 0.
8. Chronology convention (established in TASK-0002/TASK-0003): this docs-inclusive commit cannot contain its own hosted CI verdict for a SHA that does not exist yet. At completion time every local criterion above is fully evidenced; the final criterion (hosted run green on exact HEAD) is verified immediately after push and recorded in the session closure report (final SHA + run ID + 10/10 job list).
