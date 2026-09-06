---
id: "TASK-0090"
title: "v0.5.2 VS Code Marketplace content parity patch release"
status: active
schemaVersion: 2
dependencies:
  - TASK-0089
createdAt: "2026-09-06"
completedAt: null
---

## Purpose

Forward patch release v0.5.2 to close the final public-surface drift left by
immutable v0.5.1: the v0.5.1 manifest/version metadata is current (npm/GitHub/
Marketplace all 0.5.1) but the packaged v0.5.1 VSIX carries a stale
Marketplace README (says `Version: 0.4.1`, `0.5.0-dev.0`) and a stale
Marketplace CHANGELOG (top section `0.4.0`, no `0.5.1`/`0.4.1` sections,
`0.3.0` heading missing), so Marketplace Overview/Changelog content drifted
from version metadata. Fix via new patch release v0.5.2 — never by mutating
the immutable v0.5.1 tag/package. No feature release scope: runtime behavior
is unchanged from 0.5.1.

Explicit user authorization (this task only, session brief 2026-09-06):
open exactly ONE product PR `release/v0.5.2` → `master` and squash-merge
when exact-head CI/Dogfood green; create immutable annotated tag `v0.5.2`
on the validated master commit and push it; run the existing release
workflow (npm publish with provenance, GitHub Release); publish
`Cynrath.ackit-vscode 0.5.2` to Marketplace exactly once; attach
`ackit-vscode-0.5.2.vsix` to GitHub Release v0.5.2 (SHA-256 recorded);
open exactly ONE site PR `chore/ackit-v0.5.2-site-sync` → `main` in
`O:\projeler\Cynrath.github.io` and merge when docs-integrity/deploy
green; flip `release-state.json.publishedStable` 0.5.1 → 0.5.2 in exactly
ONE minimal bookkeeping PR only after all public surfaces verify 0.5.2;
delete temp branches after success; complete + archive this task and then
TASK-0089 (no `--force`) only after live parity. Prohibited: mutating/
moving/deleting any existing tag (incl. v0.5.1), overwriting the historical
v0.5.1 Marketplace package in place, Browser Companion changes,
force-push/rebase/history rewrite/workflow dispatch, extra branches.

## Scope

- Extension README correction (`extensions/vscode/README.md`): header
  `Version: 0.5.2`, Marketplace-stable/source-build copy, accurate UI
  coverage (Readiness, Findings, Instruction Graph, Tasks with explicit
  `buildStatusReport` / `ackit.status.v1` / task-stage / verbatim blockers /
  verification freshness / checkpoint freshness / derived next actions /
  read-only, Policy, Optimize, Problems integration, multi-root,
  offline-first). No handoff-import UI, verifier-recording UI, MCP-write,
  cloud/network, or telemetry claims.
- Extension CHANGELOG repair: add `0.5.2`, add `0.5.1 - 2026-09-06`
  (extension-visible truth), restore verbatim `0.4.1 - 2026-09-04` (lost in
  v0.5.0; text recovered from immutable `v0.4.1` tag), keep `0.4.0`, restore
  missing `0.3.0 - 2026-09-02` heading around existing orphaned bullets
  (verbatim from immutable `v0.3.0` tag), keep `0.2.2/0.2.1/0.2.0`.
- Extension package metadata: `0.5.1 → 0.5.2`, accurate description,
  refreshed keywords (no stuffing).
- Coupled root bump `package.json` (+ extension manifest) `0.5.1 → 0.5.2`
  per ADR-0023; keep `release-state.json.publishedStable = 0.5.1` until
  0.5.2 is public.
- Permanent parity guards: source parity (extension manifest == root;
  README Version == extension version; CHANGELOG latest == extension
  version) in `scripts/check-version-parity.mjs` + contract test; packaged
  VSIX parity (manifest/README/CHANGELOG inside the built VSIX) in CI
  `extension` job. Keeps publisher/no-node_modules/no-secrets/<2MB/icon/
  offline-egress checks.
- Current-facing product docs audit: `README.md`, getting-started/current
  install docs, CI version contract (`0.5.1 → 0.5.2` in manifest/VSIX
  strings), root `CHANGELOG.md` 0.5.2 entry. No historical release-note
  edits.
- Release: product PR → squash merge → tag `v0.5.2` → release workflow →
  npm/GitHub/Marketplace/VSIX publication → site sync PR → stable-pointer
  flip → TASK-0090 + TASK-0089 closure with evidence.

## Out of scope

- Any runtime feature/behavior change beyond 0.5.1; v0.5 feature set frozen.
- Mutating v0.5.1 (tag, Marketplace package, GitHub asset) in place.
- Browser Companion (`feat/browser-companion-v0.3` untouched).
- Site redesign; generator changes beyond version sync.
- TASK-0087 (blocked historical v0.5.0 failure — stays blocked).

## Dependencies

- TASK-0089 (active; stays active until v0.5.2 live parity, then closes).
- TASK-0088 (completed v0.5.1 recovery — historical baseline only).

## Affected files / expected areas

- `extensions/vscode/README.md`
- `extensions/vscode/CHANGELOG.md`
- `extensions/vscode/package.json`
- `package.json`
- `scripts/check-version-parity.mjs`
- `tests/contract/version-parity.test.ts` (extend only if guard API changes)
- `.github/workflows/ci.yml` (extension job: 0.5.2 contract + VSIX parity)
- `README.md`, `docs/guides/getting-started.md`,
  `docs/guides/agent-integration.md` (current 0.5.1 → 0.5.2 pins)
- `CHANGELOG.md` (new 0.5.2 section; history untouched)
- `release-state.json` (flip to 0.5.2 only post-publish, separate PR)
- Site repo `O:\projeler\Cynrath.github.io` (later phase, own branch/PR)
- This task file `docs/tasks/active/TASK-0090-*`

## Acceptance criteria

- [ ] Defect reproduced and recorded: Marketplace version metadata 0.5.1
  CURRENT, Overview content STALE (0.4.1/0.5.0-dev.0); master README 0.5.1
  correct; v0.5.1 README/CHANGELOG stale as tagged.
- [ ] Extension README header names 0.5.2 + all §5 UI/Tasks terms present,
  zero false VS Code feature claims (fresh-verifier inspected).
- [ ] Extension CHANGELOG has 0.5.2/0.5.1/0.4.1/0.4.0/0.3.0/0.2.2/0.2.1/
  0.2.0 sections with correct dates; 0.4.1 + 0.3.0 text verbatim from
  immutable tags; 0.5.1/0.5.2 entries factual.
- [ ] `package.json` + `extensions/vscode/package.json` both 0.5.2;
  description/keywords refreshed; `publishedStable` still 0.5.1 pre-publish.
- [ ] New guards fail on the old defect shape (manifest 0.5.1 + README
  0.4.1 + CHANGELOG 0.4.0) at source level AND packaged-VSIX level.
- [ ] Full validation green (§11 incl. extension typecheck/build/test,
  `vsce ls`, real 0.5.2 VSIX audited: manifest/README/CHANGELOG 0.5.2,
  publisher Cynrath, size < 2MB, SHA-256 recorded, no secrets).
- [ ] ONE product PR merged (squash, exact-head CI/Dogfood green); post-merge
  RC rebuilt from master proves 7-way 0.5.2 parity.
- [ ] npm `@cynrath/agent-context-kit@0.5.2` + latest 0.5.2; GitHub Release
  v0.5.2 (+ VSIX asset, SHA-256); Marketplace `Cynrath.ackit-vscode` 0.5.2
  with current Overview/Changelog content verified live.
- [ ] Site PR merged, `verify-site.mjs` green, hosted docs + root site 0.5.2.
- [ ] `publishedStable` flipped to 0.5.2 only after all surfaces verified.
- [ ] TASK-0090 completed (no force) + archived with evidence; `task doctor`
  green; then TASK-0089 completed (no force) + archived with §20 notes.
- [ ] Final branches: product `master` + `feat/browser-companion-v0.3`;
  site `main`. Final matrix + SUCCESS decision reported.

## Test steps

1. `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck`
2. `pnpm build && pnpm test && pnpm gen:schemas` (+ schema idempotence) `&& pnpm smoke:cli && pnpm smoke:package`
3. `node scripts/check-version-parity.mjs && node scripts/check-offline-egress.mjs && node scripts/check-text-hygiene.mjs --repo`
4. `node dist/cli/index.js config check && doctor && task doctor && skills validate && scan --ci; git diff --check`
5. Extension: `tsc -p tsconfig.json --noEmit`, `tsc -p tsconfig.test.json --noEmit`, build, test (via `pnpm --filter ackit-vscode`); `vsce ls`; package real `ackit-vscode-0.5.2.vsix`; unzip-audit manifest/README/CHANGELOG versions + markers.
6. Negative probes: new source guard rejects README 0.4.1 / CHANGELOG 0.4.0 fixture at manifest 0.5.2; CI VSIX-parity step rejects stale-content VSIX.
7. Live: npm view, GitHub release, Marketplace Overview/Changelog content checks, site `verify-site.mjs`, final matrix.

## Security considerations

Offline-first preserved: no network/telemetry in product code; extension
audit keeps offline-egress + no-fetch checks. No secrets in VSIX (AKIA
probe kept). No absolute local paths or secret values in artifacts/output.

## Risks

- Marketplace propagation delay → verify live separately; do not flip
  stable pointer early.
- Changelog date for 0.5.2 fixed at release day 2026-09-06; if release
  slips a day, amend date before tagging.
- Accidental v0.5.1 mutation → all writes target new 0.5.2 surfaces only;
  old tags never checked out for writing.

## Rollback plan

Before tag: revert focussed commits on `release/v0.5.2` or abandon branch
(`master` untouched until squash merge). After tag/publish: forward-fix
only — never move/delete `v0.5.2` (or older) tags; a bad publish becomes a
new patch release task with fresh user authorization.

## Completion notes

(pending — filled with real evidence at closure: product PR + merge SHA,
tag, release workflow run, npm/GitHub/Marketplace proofs, VSIX SHA-256,
site PR + merge SHA, stable-pointer PR, task closures)
