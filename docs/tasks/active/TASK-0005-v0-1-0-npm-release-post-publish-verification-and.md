---
id: "TASK-0005"
title: "v0.1.0 npm release post-publish verification and tag GitHub Release"
status: active
schemaVersion: 2
dependencies:
  []
createdAt: "2026-08-25"
completedAt: null
---

## Purpose

Execute the single controlled v0.1.0 release chain for `@cynrath/agent-context-kit` on `master`: finalize release docs/metadata, pass all local gates and exact-SHA master CI, verify a real tarball in an isolated consumer, preflight npm registry/auth, then — only after explicit user authorization at each checkpoint — perform `npm publish`, post-publish registry/consumer/global-install verification, tag `v0.1.0` at the provenance SHA, create GitHub Release `v0.1.0`, and close with a full provenance audit.

## Scope

Phase A — pre-publish (normal authorized repo work):
- Release docs finalization with tense-neutral wording that stays true after publication (README status/install/versioning, CHANGELOG `0.1.0` entry, CLAUDE.md / `.github/copilot-instructions.md` release-status lines, AGENTS.md intro, CONTRIBUTING.md transition sentence, `docs/guides/getting-started.md` install section).
- package.json metadata audit (name/version/publishConfig/bin/types/exports/files/repository/homepage/bugs/keywords/license/engines/packageManager; no placeholders; not private).
- Full local gate on the final candidate SHA.
- Normal fast-forward push to `master`; verify exact-SHA hosted CI 10/10 success.
- Real `pnpm pack` tarball content audit + isolated temp consumer smoke (CLI battery + MCP stdio battery).
- Read-only npm registry/auth/ownership preflight (`npm whoami`, `npm view`, access check; official registry; OTP flow detection). No secret values in any record.

Phase B — npm publish (only at explicit user authorization checkpoint):
- Re-verify HEAD == origin/master == pre-publish SHA, clean tree, and `0.1.0` still absent from the registry; then `npm publish --access public`.

Phase C — post-publish verification:
- Registry metadata/integrity/shasum/dist-tags verification against local package metadata.
- Fresh temp-dir consumer: real `npm install @cynrath/agent-context-kit@0.1.0` from the registry + CLI/MCP smoke; `npx --yes @cynrath/agent-context-kit@0.1.0 --version|--help`.
- Local global install `npm install --global @cynrath/agent-context-kit@0.1.0`; verify `ackit` resolves from the npm global path (legacy .NET tool absent) and passes smoke in a disposable temp repo.
- Post-publish docs accuracy check; docs-only fix-forward commit only if canonical docs became factually wrong (preferred outcome: none, via tense-neutral Phase A wording).

Phase D — tag/GitHub Release (only at second explicit user authorization checkpoint):
- Verify `v0.1.0` tag absent locally/remotely; create annotated tag at the exact provenance SHA (source SHA the published package was built from); push tag; create GitHub Release `v0.1.0` with technical notes; read-only verification of tag target and release URL.
- Final provenance audit tuple + normal (no `--force`) task completion with real evidence.

## Out of scope

- Force-push, rebase, history rewrite, `git reset --hard`, tag movement/deletion, branch deletion, deletion/edit of existing releases.
- Workflow dispatch, deployments, any NuGet/.NET v1 release activity; use of the legacy global .NET `ackit` as a vNext validator.
- Version bump, dependency changes, scan-policy loosening, `--force` task completion.
- Publishing/tagging/releasing without the explicit per-checkpoint user authorization text; this prompt alone is not publish authorization.

## Affected files

- README.md
- CHANGELOG.md
- CLAUDE.md
- .github/copilot-instructions.md
- AGENTS.md
- CONTRIBUTING.md
- docs/guides/getting-started.md
- docs/tasks/active/TASK-0005-v0-1-0-npm-release-post-publish-verification-and.md
- package.json (audit-only unless a real defect is found)

## Requirement IDs

REQ-PKG-001, REQ-CI-001, REQ-CI-003, REQ-DOC-001, REQ-DOC-004, REQ-ARCH-009, REQ-ARCH-010, REQ-GOV-010 (controlled-release successor per AGENTS.md)

## Acceptance criteria

- [ ] Release docs carry tense-neutral final-release wording; stale `not yet published` / `Unreleased` claims removed from canonical current docs while preserved historical records stay untouched.
- [ ] package.json metadata verified publication-correct; no placeholders; not private.
- [ ] Full local gate green on the final candidate SHA (frozen install, lint, format:check, typecheck, gen:schemas, build, test, smoke:cli, smoke:package, config check, doctor, task doctor, skills validate, instructions, scan --ci, git diff --check).
- [ ] Master CI run for the exact candidate SHA: completed/success with 10/10 jobs.
- [ ] Real tarball content audit clean (dist/templates/schemas/README/CHANGELOG/LICENSE/package.json only; no src/tests/.git/.github/env/secrets/cache/reports/task-runtime/temp leakage) and isolated consumer smoke green incl. MCP stdio battery.
- [ ] npm registry/auth preflight documented (official registry, publish-capable account, scope access, pre-publish 404 expected, OTP requirement identified); no token/OTP/password values written to task, Git, or reports.
- [ ] CHECKPOINT 1 passed: explicit user authorization for npm publish received and recorded before any publish command.
- [ ] `npm publish --access public` executed only after re-verifying unchanged master SHA, clean tree, and empty registry state; publish succeeded.
- [ ] Registry metadata verified: version 0.1.0, latest -> 0.1.0, integrity/shasum present, metadata matches local package.
- [ ] Fresh registry-based consumer smoke green: temp-dir `npm install @cynrath/agent-context-kit@0.1.0` CLI/MCP battery plus `npx --yes @cynrath/agent-context-kit@0.1.0 --version/--help`.
- [ ] Local global install green: `ackit --version` == 0.1.0 resolving from the npm global prefix; legacy .NET `ackit` absent; disposable-temp-repo smoke green.
- [ ] Post-publish docs accuracy verified; fix-forward decision recorded either way.
- [ ] CHECKPOINT 2 passed: explicit user authorization for tag + GitHub Release received and recorded.
- [ ] Annotated tag `v0.1.0` created and pushed at the agreed provenance SHA; remote target verified read-only.
- [ ] GitHub Release `v0.1.0` created with technical notes (no NuGet publish implication, legacy v1 kept separate); URL/metadata verified.
- [ ] Final provenance tuple consistent (repo/npm/latest/integrity/shasum/package source SHA/master SHA/tag/release/local ackit/legacy absent) and working tree clean.

## Test steps

1. Preflight: git status/branch/SHAs/tags; canonical doc reads; dogfood `node dist/cli/index.js --version`, `doctor`, `scan --ci`.
2. Docs/metadata edits; `git status --short`, `git diff --stat`, `git diff`, `git diff --check`; focused conventional commit; normal push to `master`.
3. Full local gate chain (AGENTS.md validation block) on the final candidate SHA.
4. Hosted CI verification filtered to `head_sha == $(git rev-parse HEAD)`; require completed/success and all 10 jobs success (verify ubuntu+windows+macos x node22+24, self-scan, package-smoke x3).
5. `pnpm pack` + `npm pack --dry-run`; tarball name/version/listing audit; isolated temp consumer `npm init -y && npm install <exact-tarball>`; installed CLI battery (--version/--help/config check/doctor/scan/pack/task lifecycle) + MCP stdio initialize/tools-list/tools-call/resources/prompts/clean shutdown.
6. Registry/auth preflight: `npm --version`, `node --version`, registry URL, `npm whoami`, `npm profile get` (output treated as sensitive), `npm view @cynrath/agent-context-kit` (E404 expected), scope access check.
7. Checkpoint 1 -> publish-phase re-verification -> `npm publish --access public`; post-publish `npm view` field checks; fresh consumers; global install; `ackit --version`.
8. Checkpoint 2 -> tag absence re-check -> annotated tag at provenance SHA + push -> GitHub Release create -> read-only verification.
9. Final provenance audit commands; `task complete TASK-0005` without `--force`.

## Risks

- Wording drift: pre-publish docs could overstate publication state — mitigated by tense-neutral phrasing reviewed against REQ-DOC-004.
- Publish-time drift: `master` moving between CI and publish — mitigated by immediate pre-publish fetch/status/SHA-equality gate.
- Registry propagation delay misread as publish failure — mitigated by bounded backoff retries only; no spam, no version bump.
- OTP/2FA interactive flow may be required — handled interactively with the user; secret values never echoed or recorded.
- Tag-target ambiguity if a post-publish docs commit becomes necessary — mitigated by preferring zero fix-forward; if it happens, tag the package provenance SHA and disclose the follow-up commit in the release notes.

## Rollback plan / stop policy

Any failed stage halts the chain before the next stage; failures are reported with root cause before anything else runs. No destructive git operations under any circumstance. Publish failure: root-cause report first — no retry spam, no version bump, no tag, no GitHub Release. Post-publish docs regressions are fixed forward with new commits only; published 0.1.0 bytes are immutable and never overwritten.

## Completion notes

(placeholder — filled at closure with real evidence)
