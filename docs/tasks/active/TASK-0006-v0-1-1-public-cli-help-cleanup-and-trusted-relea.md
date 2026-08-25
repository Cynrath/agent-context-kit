---
id: "TASK-0006"
title: "v0.1.1 public CLI help cleanup and trusted release automation"
status: active
schemaVersion: 2
dependencies:
  []
createdAt: "2026-08-25"
completedAt: null
---


## Purpose

Prepare a clean `v0.1.1` patch release of `@cynrath/agent-context-kit`: remove internal requirement identifiers (`REQ-*`) from public CLI help text, audit the entire public CLI/MCP surface for other internal/rebuild/governance leaks while keeping all internal traceability IDs on internal surfaces, add regression coverage so internal IDs cannot leak into public help again, complete a post-v0.1.0 public/package/release audit, and introduce a secure tag-triggered npm release workflow using npm Trusted Publishing / GitHub Actions OIDC — without publishing anything until the explicit user authorization checkpoint.

## Scope

Phase A — implementation + audit (normal repo work):
- Public CLI help cleanup: replace internal `REQ-*` identifiers in user-visible Commander descriptions with clean product-facing wording (no command/flag/behavior/exit-code changes).
- Public-surface leak audit: every user-visible Commander help string (top-level + nested subcommands) and human-facing MCP descriptions/prompts; remove only genuine internal-traceability/rebuild leaks; keep legitimate task-ID syntax (e.g., `TASK-####` option help), historical docs, and test traceability intact.
- Regression tests: contract tests asserting top-level and registered command help outputs contain no `REQ-`, `ADR-`, `VNEXT`, or `rebuild/ackit-vnext`, without making legitimate `TASK-####` documentation impossible.
- Post-v0.1.0 canonical-surface audit: README.md, CHANGELOG.md, package.json, docs/guides/getting-started.md, CONTRIBUTING.md, AGENTS.md, CLAUDE.md, .github/copilot-instructions.md checked for stale release-state language; fix only current/canonical content.
- Bounded v0.1.0 release-quality audit: registry metadata views, fresh temp-dir consumer comparison against source, tarball content inspection via `npm pack --dry-run`.

Phase B — release automation setup:
- `.github/workflows/release.yml`: tags-only trigger (`v*.*.*`), SHA-pinned actions, minimal permissions (`contents: write` + `id-token: write`), tag↔package.json↔package-name validation, npm-absence check, frozen install + gates before publish, OIDC Trusted Publishing (`npm publish` with no long-lived token), bounded registry verification, GitHub Release creation strictly after successful publish, release concurrency group.
- Verify npm Trusted Publisher configuration state for `@cynrath/agent-context-kit` (GitHub Actions / Cynrath/agent-context-kit / release.yml); report exactly what the user must configure if absent.

Phase C — v0.1.1 pre-release verification:
- Version 0.1.1 in package.json (+ synchronized lockfile metadata), real CHANGELOG entry, full local gate chain, exact-tarball isolated consumer battery, clean-help verification of the built CLI, normal master push + exact-SHA hosted CI 10/10 green.

Phase D — authorized tag-triggered automated release (ONLY at explicit user authorization):
- Re-verify remote state, then create/push annotated tag `v0.1.1`; let `release.yml` perform publish + verification + GitHub Release.

Phase E — post-publish consumer verification:
- Registry metadata, npx smoke, local global install upgrade to 0.1.1, published help cleanliness.

## Out of scope

- Running `npm publish`, creating/pushing `v0.1.1`, creating GitHub Release v0.1.1, changing dist-tags, or workflow dispatch before the explicit authorization text is recorded in this task.
- Any mutation of immutable v0.1.0 (npm version, tag, GitHub Release) or the legacy .NET/NuGet v1 line.
- Force-push, rebase, history rewrite, `git reset --hard`, branch/tag/release deletion.
- Removing internal requirement IDs from requirements/ADRs/tests/task-evidence docs; blind repo-wide `REQ-` replacement; command/flag/behavior/exit-code changes.
- Long-lived npm publish tokens in GitHub Secrets; NuGet publishing.

## Affected files

- src/cli/program.ts (public descriptions)
- src/cli/commands/task.ts (public description)
- src/mcp/server.ts (human-facing prompt text)
- docs/guides/monorepo.md, docs/concepts/context-budget.md, docs/reference/schemas.md (public-doc internal-ID parentheticals found by the audit)
- tests/contract/cli-core.test.ts or a new focused contract test file
- package.json, pnpm-lock.yaml (version 0.1.1)
- CHANGELOG.md (real 0.1.1 entry)
- .github/workflows/release.yml (new)
- docs/tasks/active/TASK-0006-v0-1-1-public-cli-help-cleanup-and-trusted-relea.md

## Requirement IDs

REQ-DX-001, REQ-DX-003, REQ-PKG-001, REQ-CI-001, REQ-CI-003, REQ-SEC-004, REQ-SEC-005, REQ-GOV-010 (controlled-release successor per AGENTS.md), REQ-ARCH-009, REQ-ARCH-010

## Acceptance criteria

- [x] Top-level `ackit --help` and every registered top-level/nested command help contain no `REQ-`, `ADR-`, `VNEXT`, or `rebuild/ackit-vnext` strings; wording stays concise product-facing text.
- [x] Command names, flags, behaviors, and exit codes are unchanged versus 0.1.0 (verified by help matrix + consumer battery).
- [x] Internal traceability IDs remain intact in requirements, ADRs, tests, and task/evidence documents (no blind stripping).
- [x] New regression contract tests fail when an internal requirement ID reappears in any registered command's public help, and pass on the cleaned surface; legitimate `TASK-####` syntax remains documentable.
- [x] MCP human-facing surfaces carry no internal rebuild/governance references.
- [x] Canonical public surfaces carry no stale/unpublished release-state language; README install instructions match the real published package.
- [x] Published 0.1.0 audited read-only (metadata, tarball contents, consumer behavior vs source); findings recorded; no functional bug found requiring scope creep.
- [x] package.json version is exactly `0.1.1`; lockfile synchronized (no root-version strings in pnpm-lock.yaml); CHANGELOG has a real, dated 0.1.1 entry claiming nothing about publication.
- [x] `.github/workflows/release.yml` exists: tags-only trigger, SHA-pinned actions, `contents: write` + `id-token: write`, tag/version/name parity gate, npm-absence gate, full gates before publish, OIDC publish without long-lived tokens, registry verification, GitHub Release only after successful publish, concurrency group.
- [ ] npm Trusted Publisher state verified and reported (CONFIGURED / NOT CONFIGURED with exact required configuration if absent).
- [x] Full local gate green on the candidate SHA (frozen install, lint, format:check, typecheck, gen:schemas, build, test, smoke:cli, smoke:package, config check, doctor, task doctor, skills validate, instructions, scan --ci, git diff --check).
- [x] Real 0.1.1 tarball installed in an isolated fresh consumer: version/help cleanliness/CLI core battery/task lifecycle/MCP stdio battery green; no workspace/source fallback.
- [ ] Exact-SHA master CI run completed/success with 10/10 jobs.
- [ ] CHECKPOINT: explicit user authorization for tag push + automated release received and recorded BEFORE any tag/publish; npm `0.1.1` and tag `v0.1.1` still absent at report time.

## Test steps

1. Preflight evidence: git status/branch/SHAs/tags, toolchain versions, dogfood `node dist/cli/index.js --version|doctor|scan --ci`.
2. Baseline capture: `ackit --help` + per-command help matrix from source and from global npm 0.1.0; grep for internal identifiers across `src/cli/**`, `src/mcp/**`.
3. Apply description/text edits; rebuild; re-run help matrix; verify zero `REQ-|ADR-|VNEXT|rebuild/ackit-vnext` matches in help outputs and unchanged command/flag sets.
4. `pnpm lint && pnpm format:check && pnpm typecheck && pnpm gen:schemas && pnpm build && pnpm test && pnpm smoke:cli && pnpm run smoke:package`.
5. Repo-local CLI: `config check`, `doctor`, `task doctor`, `skills validate`, `instructions`, `scan --ci`; `git diff --check`.
6. `pnpm pack` + `npm pack --dry-run` listing audit; fresh temp-dir install of the exact tarball; version/help/battery incl. MCP stdio.
7. Read-only npm registry audits of published 0.1.0 (`npm view` fields, fresh consumer comparison).
8. Normal push to master; verify hosted CI filtered to `head_sha == $(git rev-parse HEAD)` completed/success 10/10 jobs.
9. Record Trusted Publisher verification result; compile the PRE-RELEASE CHECKPOINT GO/NO-GO report and stop for explicit authorization.

## Risks

- Wording drift changing documented semantics — mitigated by keeping descriptions semantically identical minus internal IDs and by the help-matrix diff review.
- Regression test over-breadth blocking legitimate task-ID documentation — mitigated by scoping assertions to `REQ-`, `ADR-`, `VNEXT`, `rebuild/ackit-vnext` only.
- Release workflow misconfiguration (wrong trigger, missing id-token, unpinned actions) — mitigated by static contract checks plus manual review against official npm Trusted Publishing behavior.
- Trusted Publisher not yet configured on npmjs.com — detected and reported as a checkpoint blocker; never inferred from workflow existence.
- Registry propagation delay after eventual publish — handled later with bounded backoff only.

## Rollback plan

Focused commit revert per logical change; no destructive git operations. If the release workflow cannot be made secure/correct, it ships disabled-by-design (tags-only) or not at all — never half-configured with credentials. Published artifacts are never overwritten; failures halt before the next stage and are reported with root cause.

## Completion notes

Phase A/B/C progress record (2026-08-25) — task intentionally kept OPEN through Phases D/E:

1. Preflight: branch `master`, HEAD == origin/master == `f1b71605d24dfca45a63d00b367a5221dfdd4fc6` (expected SHA confirmed), tree clean, only tag `v0.1.0` local+remote (annotated object `c8af5b5e...`, target `890a874f...`). Toolchain: Node 24.13.0 / npm 11.19.0 / pnpm 11.22.0; global npm `ackit --version` = 0.1.0 resolving from `%APPDATA%\npm`; `.dotnet\tools\ackit.exe` absent. Hosted CI for f1b7160: run `32893030044` completed/success. Dogfood: dist CLI `--version` 0.1.0, doctor all-pass, `scan --ci` exit 0 under existing suppressions. NOTE: documented `node dist/cli/index.js task "<title>"` bare form fails (`unknown command`, exit 2); correct tool syntax is `ackit task create "<title>"` — TASK-0006 created via the tool itself.
2. Leak source identified: user-visible Commander descriptions carried REQ-* IDs at `src/cli/program.ts` (init/pack/policy/workspaces/optimize/hooks), `src/cli/commands/task.ts` (task), plus an MCP human-facing prompt body referencing internal rebuild doc `docs/rebuild/GOAL2_BOOTSTRAP.md` at `src/mcp/server.ts`. All other REQ-/ADR-/VNEXT matches are internal comments/docs/tests and were preserved.
3. Fixes applied: 7 public descriptions rewritten as product-facing text (semantics preserved); MCP onboarding prompt line replaced with repository-facing guidance ("Then skim README.md for a product overview."); public-doc parentheticals cleaned in docs/guides/monorepo.md, docs/concepts/context-budget.md, docs/reference/schemas.md. Command names/flags/behavior/exit codes untouched; `--depends-on <ids...>` help keeps legitimate `TASK-####` syntax.
4. Regression coverage: new `tests/contract/cli-help-contract.test.ts` (6 tests): top-level help clean; full registered command set discovered from parsed help matrix; every top-level+nested `--help` output asserted free of `REQ-`, `ADR-`, `VNEXT`, `GOAL2`, `rebuild/ackit-vnext`; positive control that `task create --help` still documents `TASK-####`; MCP tools/resources metadata + every prompt body asserted clean via InMemoryTransport. Negative verification performed: temporarily reintroducing `(REQ-SCAN-001)` into scan description failed the suite (top-level + scan help assertions), then reverted and green again. `tests/contract/ci-pinning.test.ts` extended (+8 tests) for release.yml hardening contract.
5. Post-v0.1.0 audit: registry state verified read-only — versions=[0.1.0], latest→0.1.0, integrity/shasum match TASK-0005 records, bin normalized `dist/cli/index.js`, engines node>=22. Fresh temp consumer of registry 0.1.0: config check / doctor JSON / scan JSON / pack manifest / task create / MCP initialize+9 tools ALL functional (behavior parity), while `topHelpHasReqLeak=true`, task/init descriptions carry REQ-*, and MCP onboarding prompt mentions GOAL2_BOOTSTRAP — confirming both leak classes exist in the published copy and this patch is purely textual. No functional bug found → no scope creep. Tarball shape audit of local 0.1.1 pack: 297 entries = dist(282)+templates(8)+schemas(3)+README/CHANGELOG/LICENSE/package.json; zero source/test/docs/.github/env/cache entries.
6. Release automation: `.github/workflows/release.yml` added — tags-only trigger `v*.*.*`; permissions exactly contents:write + id-token:write; per-tag concurrency group; validates exact tag regex, checkout==tagged commit, package name == @cynrath/agent-context-kit, package.json version == tag, npm >= 11.5.1; frozen install → lint/format/typecheck → build+schema-drift gate → tests → tarball shasum capture → real-tarball consumer smoke → registry version-absence gate (404 required, bounded retries) → `npm publish --access public --provenance` (OIDC Trusted Publishing; no NODE_AUTH_TOKEN/NPM_TOKEN/secrets anywhere) → bounded registry verification (version visibility, shasum equality vs local pack, dist-tag latest) → npx consumer smoke → `gh release create --verify-tag` LAST. If publish succeeds but release creation fails, rerun fails safely at the absence gate; repair only GitHub Release state. Actions reuse ci.yml's SHA pins (checkout f548e57e..., setup-node ae0d4ed0..., pnpm/action-setup b906affc...).
7. Version prep: package.json 0.1.0→0.1.1; CHANGELOG `[0.1.1] - 2026-08-25` entry (Changed/Added, claims nothing about publication); README status block + npx pin → 0.1.1; getting-started npx pin → 0.1.1; AGENTS.md intro, CLAUDE.md + copilot-instructions.md Release Status lines updated with tags-only automation sentence.
8. Full local gate on candidate tree: frozen install OK; lint exit 0 (5 pre-existing non-blocking infos in tests/security/policy-wiring.test.ts identical to CI-green master state); format:check exit 0; typecheck exit 0; gen:schemas OK; build OK; test **304/304 passed** (59 files); smoke:cli all assertions; smoke:package `cynrath-agent-context-kit-0.1.1.tgz (v0.1.1)` isolated-consumer battery incl. MCP stdio ALL GREEN; config check digest 03eaf27e3577; doctor all-pass; task doctor OK; skills validate 0 issues; instructions OK; `scan --ci` exit 0; `git diff --check` exit 0; dist `--help` grep clean. Fresh exact-tarball consumer re-verified separately: install → `--version` 0.1.1 → help clean.
9. Trusted Publisher state: `npm trust list @cynrath/agent-context-kit` (read-only, npm 11.19.0) returns EOTP — account 2FA blocks agent-side verification/configuration by policy. No evidence of prior configuration exists. Status: NOT CONFIGURED (as far as verifiable). Required one-time user action AFTER release.yml lands on master: EITHER `npm trust github @cynrath/agent-context-kit --file release.yml --repo Cynrath/agent-context-kit --allow-publish` completing the web-auth prompt personally, OR npmjs.com → package settings → Trusted Publishing (GitHub Actions / Cynrath/agent-context-kit / release.yml / allow publish); then verify with `npm trust list @cynrath/agent-context-kit`.
10. Remaining before closure: normal master push + exact-SHA hosted CI 10/10 verification; PRE-RELEASE CHECKPOINT report (GO/NO-GO ×3) and explicit user authorization text; then Phases D (annotated v0.1.1 tag push → automated workflow) and E (post-publish consumers/global upgrade) under that authorization.
