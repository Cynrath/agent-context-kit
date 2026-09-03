---
id: "TASK-0073"
title: "v0.4.0 release — version hygiene, release preparation, publication, hosted docs sync"
status: completed
schemaVersion: 2
dependencies:
  - "TASK-0066"
  - "TASK-0067"
  - "TASK-0068"
  - "TASK-0069"
  - "TASK-0070"
  - "TASK-0071"
  - "TASK-0072"
createdAt: "2026-09-03"
completedAt: 2026-09-03
---

## Purpose

Execute the full logical minor release `v0.4.0` of AgentContextKit per ADR-0023 coupling
(root npm `0.4.0` == VS Code extension `0.4.0` == tag `v0.4.0` == GitHub Release `v0.4.0` ==
Action `@v0.4.0`), shipping TASK-0067..TASK-0072 on top of published `v0.3.0`, with
current-facing version-hygiene cleanup (instruction files converted to version-agnostic
truth), a deterministic current-vs-historical version-parity guard, CHANGELOG `0.4.0`,
release branch `release/v0.4.0` → `master` PR with exact-SHA CI, tag-triggered OIDC npm
publish + GitHub Release, VSIX Marketplace publication, hosted-docs generator update +
site regeneration + live verification.

Starting master SHA: `57d68df3d4e741ab0f9ba750c2668aa258a97d1f` (local == origin/master,
clean, verified 2026-09-03). Current public stable: npm
`@cynrath/agent-context-kit@0.3.0`, VS Code `Cynrath.ackit-vscode` `0.3.0`, GitHub Release
`v0.3.0`. Browser Companion (`feat/browser-companion-v0.3`) is PAUSED / NO-GO and fully
out of scope.

## Publish authorization (explicit user authorization for this exact release)

The release session goal (`ACKit v0.4.0 — Release Preparation, Version Hygiene, Hosted
Docs Sync & Full Publication`) explicitly authorizes completing the full v0.4.0 release
lifecycle, including: current-facing version-hygiene cleanup; release preparation;
product PR/merge; exact-SHA CI; version/tag/release; npm publication; VS Code
Marketplace publication; GitHub Release / GitHub Action release state; hosted
documentation generator update; `O:\projeler\Cynrath.github.io\agent-context-kit`
regeneration; site push/merge per that repo's governance; live hosted-doc verification.
This task records that authorization. Prohibited (unchanged): force-push, rebase,
history rewrite, tag movement/deletion, workflow dispatch, deployments, weakening
quality gates, legacy .NET/NuGet mutation, Browser Companion work.

## Current-state evidence (verified live 2026-09-03)

- `git -C O:\projeler\agent-context-kit rev-parse HEAD` ==
  `rev-parse origin/master` == `57d68df3d4e741ab0f9ba750c2668aa258a97d1f`; working
  tree clean; branches: `master`, `feat/browser-companion-v0.3` (+ remotes); no open
  product PR doing v0.4.0 work; no `v0.4.0` tag/release/package.
- `package.json` `0.3.0`, `extensions/vscode/package.json` `0.3.0` (coupling holds).
- `CHANGELOG.md` top section `## [0.3.0] - 2026-09-02`; TASK-0067..0072 completed on
  master after v0.3.0, none yet in any stable CHANGELOG section.
- `AGENTS.md` header claims `v0.2.0` / package `0.2.0` / `docs/v0.2.0/**` canonical
  contract; `CLAUDE.md` + `.github/copilot-instructions.md` Release Status claim
  `0.2.0` current — all stale (current-facing blockers).
- `.github/workflows/ci.yml` `extension` job hardcodes `0.3.0` in manifest contract +
  VSIX filename — must move to `0.4.0` in sync.
- `.github/workflows/release.yml` unchanged: tags-only `v*.*.*`, OIDC Trusted
  Publishing + provenance, full gate, fresh isolated consumer, GitHub Release last.
- Site repo `O:\projeler\Cynrath.github.io` on `main` `c43c5147e1dd8564455633435078ebc6ae2bb72a`
  (clean, synced); generator `scripts/sync-ackit-docs.mjs` reflects older product
  surface (nav lacks Workflows/Intent/Checkpoints/Evidence/Verification/Drift/Policy/
  Roles/Skills/Managed Asset Sync pages); theme assets `ackit-docs.css/js` hand-maintained.
- `node dist/cli/index.js --version` → `0.3.0`; `task doctor` → integrity OK.

## Version decision

- **Chosen version: `0.4.0` / `v0.4.0`** (SemVer minor). Rationale: TASK-0072 adds a
  new public CLI capability (`ackit sync`); TASK-0067..0070 materially expand supported
  behavior (workflow-config wiring, disk-proven advance gate, atomic checkpoints,
  MCP drift parity); all backward-compatible (legacy repos retain supported defaults);
  no breaking change. Matches session authorization.

## Current-vs-historical version policy

Historical references are legitimate and MUST be preserved where they describe history:
`CHANGELOG.md` historical sections, `docs/v0.2.0/**`, old ADRs describing old
releases, completed task titles/history, release evidence, migration/history docs,
immutable old GitHub releases/tags, legacy compatibility fixtures, historical VS Code
changelog sections. Protocol/generation names (`Instruction Graph v2`, `Evidence
Contract v2`, `Policy v2`, `schemaVersion: 2`, `SDK v1`) are NOT package versions.

Old versions must NOT remain as current truth in: `AGENTS.md`, `CLAUDE.md`,
`GEMINI.md` if managed, `.github/copilot-instructions.md`, README current
status/install, current docs/guides, current docs/reference, extension current
README/metadata, package manifests, current examples/install snippets, current
hosted-doc pages, `llms.txt`/`llms-full.txt` current summaries, SEO/JSON-LD
`softwareVersion`, Pages overview/footer/install commands.

Classification matrix (`Path | Version reference | CURRENT | HISTORICAL | ACTION`)
is maintained during the audit (§8/§20); rule:
`CURRENT-facing stale = blocker`, `HISTORICAL accurate = keep`,
`PROTOCOL generation = keep`. Completed task filenames containing `post-0.3.0` are
NOT renamed (identity/history stability).

## Scope

1. Release branch `release/v0.4.0` (single product branch; all fixes stay on it).
2. Instruction hygiene (version-agnostic, NOT hard-coding 0.4.0):
   - `AGENTS.md`: remove `v0.2.0` current-package/canonical-contract claims, retired
     branch/process claims, stale master-push wording; replace with
     package.json-authoritative / latest-immutable-release-authoritative /
     historical-docs-are-historical truth; keep task-first/evidence/gates/security/
     controlled-release/history-integrity rules undiminished.
   - `CLAUDE.md` / `.github/copilot-instructions.md`: thin shims to `AGENTS.md`;
     preserve hand-maintained rules, drop stale current-release numbers/branch claims.
   - `GEMINI.md`: only if managed (repo has `fixtures/profile-gemini/GEMINI.md`
     fixture, not a root managed file — verify; do not overwrite non-managed user content;
     respect TASK-0072 managed ownership model).
3. Version-parity guard: smallest deterministic classifier distinguishing
   CURRENT-facing vs HISTORICAL files; verifies `package.json` /
   `extensions/vscode/package.json` / README current snippets / current docs+reference /
   agent instructions (version-agnostic OR correct); never fails on legitimate
   historical refs; no brittle repo-wide regex ban; deterministic tests for
   classifier/guard.
4. Synchronized `0.3.0 → 0.4.0` bump: `package.json`, `pnpm-lock.yaml` (via install),
   `extensions/vscode/package.json`, VS Code current metadata (`README.md`,
   `CHANGELOG.md` new `0.4.0` entry), `README.md` current status/install, current docs
   install snippets, release-workflow assumptions (`ci.yml` extension-job `0.4.0`),
   Action references if coupled. Historical changelog sections untouched.
5. `CHANGELOG.md` `## [0.4.0] - 2026-09-03` (repo date convention): TASK-0067..0072
   accurately (sync command, managed reconciliation, content-driven zero-write,
   workflow-config gate wiring, disk-existence planning checks, atomic checkpoints,
   MCP/core/CLI drift parity, docs/instruction hygiene, parity guard); Compatibility
   (backward compatible, legacy defaults, no new network/LLM, MCP read-only,
   Browser Companion excluded).
6. Full current-vs-historical audit over `0.1./0.2./0.3.` patterns; fix every
   CURRENT-facing stale hit.
7. Full RC gates (repo scripts): frozen install, lint, format:check, typecheck,
   build, test, gen:schemas + idempotence, smoke:cli, smoke:package (real 0.4.0
   tarball, fresh isolated consumer: `--version/--help/sync --help`),
   offline-egress/security, `config check`, `doctor`, `task doctor`, `sync --check`,
   `scan --ci`, parity guard, `git diff --check`, `git status`; `--version` == `0.4.0`.
8. TASK-0072 regression after cleanup: managed blocks canonical, user files
   untouched, unchanged canonical → zero write, changed managed bytes only,
   `sync --check`/`doctor` read-only, no postinstall mutation.
9. Fresh independent verifier bundle (version coupling, classification, instruction
   truth, CHANGELOG, metadata, 0.4.0 smoke, sync availability, security/offline,
   full tests, history preserved); verdict PASS or PASS_WITH_WARNINGS (zero
   blockers); CURRENT-facing 0.2/0.3 claim = blocker; register via ACKit
   verification flow.
10. ONE product PR `release/v0.4.0 → master` (body: task ID, SemVer rationale,
    version policy, cleanup, guard, TASK-0067..0072 content, test count, smokes,
    sync regression, verifier, Companion excluded); exact-head required CI green →
    merge per convention → sync master → post-merge master CI green. No tag/publish
    until merged master is green.
11. Tag `v0.4.0` on validated release commit (immutable; never move/delete); tag
    triggers `release.yml` (npm OIDC + GitHub Release). npm verify
    (`@cynrath/agent-context-kit@0.4.0`, `latest → 0.4.0`, provenance) + fresh
    global/npx verification (`ackit --version`, `ackit sync --help`).
12. VS Code Marketplace `Cynrath.ackit-vscode` `0.4.0` publish + propagation verify.
13. GitHub Release `AgentContextKit v0.4.0` (not draft/prerelease; notes match
    CHANGELOG; Companion excluded); GitHub Action `@v0.4.0` per immutable-tag
    convention only.
14. Hosted docs (second repo; separate task in that repo only if its governance
    requires): preserve generator safety contract (canonical source = product repo;
    writes only `agent-context-kit/**` + `sitemap.xml`/`robots.txt`; `index.html` /
    `assets/**` / `404.html` / docs CSS-JS protected; no network/telemetry/CDN);
    hash theme assets before/after (must be unchanged); expand content model to
    0.4.0 (Workflows, Intent, Checkpoints/Resume/Handoff, Evidence,
    Verification/Verdicts, Drift, Policy, Roles, Skills, Managed Asset Sync; no
    empty marketing pages; derive from canonical docs/help); site = published
    stable 0.4.0 (title/h1/footer/install/JSON-LD/llms/sitemap/robots; sync
    described RELEASED); run `node .\scripts\sync-ackit-docs.mjs --source
    O:\projeler\agent-context-kit`; validate (0.4.0 current, install 0.4.0, no
    stale 0.2/0.3 current claims, nav/SEO/links, existing verify script);
    commit/push per site governance; record site SHA; verify live URLs (HTTP 200,
    0.4.0 visible, sync released wording, JSON-LD 0.4.0, nav + assets load).
15. Final classification-aware audit across BOTH repos (stale CURRENT = 0;
    historical preserved); branch cleanup (product: `master` +
    `feat/browser-companion-v0.3` only; delete merged `release/v0.4.0`; site temp
    branch deleted); final report in session-mandated structure with
    `ACKIT V0.4.0 RELEASE: SUCCESS` only after product publication AND hosted
    live verification.

## Out of scope

- Browser Companion (PAUSED/NO-GO; separate branch untouched; no merge/publish/
  version reservation/claims).
- New product features beyond TASK-0067..0072 + hygiene/guard/CHANGELOG/release
  metadata + generator update.
- Redesign of hosted docs theme (hashes must match; explicit bug fix only).
- New distribution channels/accounts/services; moving/alias tags; legacy
  .NET/NuGet line (frozen `1.0.0-rc.1` immutable).
- Automatic npm-postinstall repository rewrites.
- Renaming completed task files for `post-0.3.0` substrings.
- Force-push, rebase, history rewrite, tag movement/deletion, workflow dispatch,
  deployments.

## Dependencies

- TASK-0066 (v0.3.0 baseline) + TASK-0067..0072 (shipped content), all completed.
- ADR-0023 (coupling), ADR-0025..0028 (feature baselines), TASK-0072 managed
  ownership model.
- Green exact-head PR CI + green post-merge master CI before any tag/publish.
- Site repo `main` clean at `c43c514`; product publication before hosted 0.4.0
  stable wording.

## Affected files

- `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`
  (+ `GEMINI.md` only if managed — verify first)
- Version-parity guard: new script (e.g. `scripts/check-version-parity.mjs`) +
  deterministic tests (e.g. `tests/security/version-parity*.test.ts` or adjacent
  contract test) + wiring (package script / CI gate where repo convention puts it)
- `package.json`, `pnpm-lock.yaml`, `extensions/vscode/package.json`,
  `extensions/vscode/README.md`, `extensions/vscode/CHANGELOG.md`,
  `.github/workflows/ci.yml` (extension job `0.4.0`)
- `README.md` (current status/install), current `docs/**` install/reference
  snippets, `CHANGELOG.md` (`## [0.4.0]`)
- `docs/tasks/active/TASK-0073-*.md` (this task) + verification bundle/verdict
  artifacts per verification flow
- Tag `v0.4.0`; GitHub Release `v0.4.0`
- Site repo: `scripts/sync-ackit-docs.mjs`, `agent-context-kit/**`,
  `sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt` (generated only)

## Security considerations

- Offline-first invariant preserved: no network calls/telemetry/uploads in product
  code; guard + generator add no network; static `check-offline-egress.mjs` +
  runtime contract tests must stay green.
- No secrets in artifacts: VSIX/tarball audits, no `NPM_TOKEN`/PAT in repo,
  OIDC Trusted Publishing only; redaction rules unchanged.
- No absolute local paths in generated artifacts/terminal evidence.
- User files never overwritten without explicit intent flags (sync semantics
  unchanged; `--check`/`doctor` read-only verified).
- Out-of-scope list binding (no LLM APIs, vector DB, RAG, untrusted plugin exec,
  cloud services).

## Risks

- Stale-current misses in secondary pages → mitigated by classification matrix +
    guard + final audit (blocker if any remain).
- Guard brittleness on historical refs → mitigated by classifier tests with
  historical fixtures.
- CI exact-head flakiness (Windows/node-24 load-sensitive) → rerun affected job
  only; never weaken gates; record run IDs.
- Marketplace/npm propagation delay → bounded retries; never republish same
  version with different content (new patch on post-publish defect).
- Site generator drift touching theme assets → hash proof + sandbox assertions.

## Required tests

- New parity-guard unit tests (current/historical/protocol classification +
  guard pass/fail semantics).
- Full `pnpm test` suite green; targeted sync/managed-asset tests green.
- `pnpm smoke:cli`, `pnpm run smoke:package` (real 0.4.0 tarball).
- Extension gates (manifest contract, typecheck, build, vsce ls/package/audit).
- Verifier bundle re-execution green.

## Acceptance criteria

- [x] Classification matrix complete; zero CURRENT-facing stale refs (0.2/0.3 as
  current); historical/protocol refs preserved.
- [x] `AGENTS.md` version-agnostic truth; `CLAUDE.md`/Copilot thin shims; no
  managed-ownership violations.
- [x] Parity guard implemented + tested + green in gates.
- [x] `package.json` + extension `0.4.0` coupled; `ci.yml` `0.4.0`; READMEs/docs
  current surfaces `0.4.0`; historical sections untouched.
- [x] `CHANGELOG.md` `## [0.4.0] - 2026-09-03` complete per scope §5.
- [x] All RC gates green; `--version` == `0.4.0`; real-tarball smoke
  (`--version/--help/sync --help`) green.
- [x] Sync regression proven (zero-write, managed-only updates, read-only checks).
- [x] Independent verifier PASS/PASS_WITH_WARNINGS (zero blockers), registered.
- [x] PR merged on exact-head green CI; post-merge master CI green.
- [x] `v0.4.0` tag on release commit; npm `0.4.0` (`latest → 0.4.0`, provenance)
  + fresh global/npx verify; Marketplace `0.4.0` verified; GitHub Release live
  (notes match CHANGELOG); Action `@v0.4.0` per convention.
- [x] Hosted docs regenerated from published 0.4.0; theme hashes unchanged;
  nav/SEO/llms/sitemap valid; site commit recorded; live URLs verified
  (200 + 0.4.0 + sync released + JSON-LD + assets).
- [x] Final audit: stale CURRENT refs 0; branches `master` +
  `feat/browser-companion-v0.3` only.

## Test steps

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm format:check`
4. `pnpm typecheck`
5. `pnpm build`
6. `pnpm test` (record count)
7. `pnpm gen:schemas` + `git diff --exit-code -- schemas`
8. `pnpm smoke:cli`
9. `pnpm run smoke:package`
10. `node scripts/check-offline-egress.mjs`
11. `node dist/cli/index.js config check`
12. `node dist/cli/index.js doctor`
13. `node dist/cli/index.js task doctor`
14. `node dist/cli/index.js sync --check`
15. `node dist/cli/index.js scan --ci`
16. Parity-guard script + its tests
17. `node dist/cli/index.js --version` (expect `0.4.0`)
18. `git diff --check`, `git status`
19. Extension gates (tsc, esbuild, vsce ls/package/audit, icon)
20. Site: `node .\scripts\sync-ackit-docs.mjs --source O:\projeler\agent-context-kit`
    + existing site verification + live URL checks

## Rollback plan

- Before any public publish: fix on `release/v0.4.0`; `ACKIT V0.4.0 RELEASE: NO-GO`
  on gate failure; no tag/publish until green.
- After partial public publish: never rewrite/move/delete published history;
  record public state; fix remaining channels forward; post-publish defect → new
  patch release, never same-version content mutation.
- Site: revert to pre-sync commit; re-run generator after fix.

## Classification matrix (Path | Version reference | CURRENT | HISTORICAL | ACTION)

CURRENT-facing (fixed on `release/v0.4.0`):

| Path | Version reference | Action |
|---|---|---|
| `AGENTS.md` | `v0.2.0` header, `0.2.0` package claim, `docs/v0.2.0` as canonical contract, direct-push wording | version-agnostic truth (done) |
| `CLAUDE.md` | `0.2.0` Release Status, direct-push wording | version-agnostic shim (done) |
| `.github/copilot-instructions.md` | `0.2.0` Release Status | version-agnostic shim (done) |
| `package.json` | `0.3.0` | `0.4.0` (done) |
| `extensions/vscode/package.json` | `0.3.0` | `0.4.0` (done) |
| `.github/workflows/ci.yml` | `0.3.0` manifest contract + VSIX names (6x) | `0.4.0` (done) |
| `README.md` | `0.3.0` badges/install/Action/VS Code/Versioning | `0.4.0` (done) |
| `extensions/vscode/README.md` | `0.3.0` version + changelog link | `0.4.0` (done) |
| `extensions/vscode/CHANGELOG.md` | missing 0.4.0 | new `0.4.0` section, history kept (done) |
| `CHANGELOG.md` | missing 0.4.0 | new `0.4.0` section, history kept (done) |
| `docs/guides/getting-started.md` | `0.3.0` pins, sync next-release caveat | `0.4.0`, sync shipped (done) |
| `docs/guides/agent-integration.md` | sync NOT-in-0.3.0 caveat | RELEASED in 0.4.0 (done) |
| `docs/reference/cli.md` | sync next-release caveat (2x) | released in 0.4.0 (done) |
| `examples/demo-github-action/README.md` | `v0.2.1` Action pins (2x) | `v0.4.0` (done) |
| `src/cli/commands/optimize.ts` | SARIF driver `0.2.0` hard-code | dynamic `getPackageIdentity()` (done) |
| `tests/contract/readme-current.test.ts` | hard-coded `0.2.0` assertions | dynamic release-proof (done) |
| `tests/contract/readme-parity.test.ts` | hard-coded `0.2.2` name/comments | dynamic (done) |

HISTORICAL (intentionally preserved): `CHANGELOG.md` old sections;
`docs/v0.2.0/**`; ADRs incl. ADR-0015 `v0.3.0/v0.4.0` planning record;
`docs/tasks/**` (incl. `post-0.3.0` filenames, TASK-0073 baseline refs);
`docs/evidence/**`, `docs/plans/**`, `docs/intent/INTENT-0003`;
`docs/rebuild/**`, `docs/history/v1.md`, `docs/MAINTENANCE_MODE.md`;
`docs/architecture/overview.md` v0.2.0 baseline pin;
`docs/reference/sdk.md` since-notes, `policy.md` v0.2.2 pin,
`config.md` v0.3.0-defaults pin; `examples/demo-readiness` validated-against
note; `extensions/vscode/CHANGELOG.md` old sections; test fixtures
(changelog-extract, legacy-repository v0.2.2-shaped, api-surface comment);
`pnpm-lock.yaml` third-party 0.x deps; `GEMINI.md` untouched (no root managed
file exists — only `fixtures/profile-gemini/GEMINI.md` test fixture).

PROTOCOL/generation (kept, not package versions): Instruction Graph v2,
Evidence Contract v2, Policy v2, `schemaVersion: 2`, SDK v1, SARIF 2.1.0,
`ackit.*.v1` schemas, `ENGINE_VERSION 0.2.0-readiness.1`.

Final count: current-facing stale refs 0 (guard green); historical refs
intentionally preserved.

## Completion notes

- RC gates (release/v0.4.0 @ 02fa985): frozen install OK; lint OK; format:check
  OK; typecheck OK; build OK; `pnpm test` 99 files / 566 tests PASS;
  gen:schemas idempotent; smoke:cli PASS; smoke:package PASS
  (cynrath-agent-context-kit-0.4.0.tgz, v0.4.0); offline-egress exit 0; config
  check OK; doctor OK (managed-assets row informational); task doctor OK; sync
  --check exit 1 by design (refused-non-managed own files + would-create
  GEMINI/skills — REQ-GOV-008 refusal proven, zero writes); scan --ci exit 0
  (readiness 88); parity guard exit 0; `--version` 0.4.0; diff-check clean.
- Sync regression: tests/integration/onboarding + skills + init + task-refs —
  5 files / 38 tests PASS. No postinstall script. Extension: tsc (both
  configs) OK, esbuild OK, vsce ls clean, vsce package
  ackit-vscode-0.4.0.vsix 653208 bytes (<2MB), icon 256x256, no node_modules.
  (mocha-direct run fails with Cannot-find-module-vscode outside Electron —
  same as CI, which gates on the xvfb Electron job instead.)
- Independent verifier (fresh subagent 2d35c2ea): VERDICT PASS_WITH_WARNINGS,
  zero blocking findings, registered as VR-0001 (`verification show
  TASK-0073`). Evidence registry synced (12 criteria AC-001..AC-012);
  checked AC-001..AC-008. Bundle: docs/evidence/TASK-0073-verification-bundle.md.
- Pre-tag absence (2026-09-03): `git tag --list v0.4.0` empty; npm
  `@cynrath/agent-context-kit@0.4.0` E404; dist-tags.latest 0.3.0.
- Release branch pushed: origin/release/v0.4.0 (commits b07d6d1, 02fa985 on
  top of master incl. c86d92d).
- Remaining: PR → exact-head CI → merge → post-merge CI → tag v0.4.0 → release.yml
  (npm + GitHub Release) → Marketplace → Action → hosted docs → final audit.
