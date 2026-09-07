---
id: "TASK-0091"
title: "Automate VS Code Marketplace OIDC publishing in tag-triggered release pipeline"
status: completed
schemaVersion: 2
dependencies: []
createdAt: "2026-09-07"
completedAt: 2026-09-07
---

## Purpose

Extend the SAME tag-triggered `vX.Y.Z` release pipeline
(`.github/workflows/release.yml`, already npm OIDC with
`contents: write` + `id-token: write`) so future releases automatically
publish ALL release surfaces after the normal gates, using the current
official `@vscode/vsce` OIDC trusted-publishing mechanism — no PAT,
no `VSCE_PAT` secret, no stored vsce credentials, no Azure long-lived
PAT, no manual publishing as the normal path.

Required future release chain (this task builds the automation; it does
NOT perform a release):

tag `vX.Y.Z` → validate exact tagged commit/version → install/lint/
format/typecheck/build/tests → build exact VSIX → packaged-VSIX
parity/security/offline audits → npm OIDC publish + live registry
verification → Marketplace OIDC publish from that exact audited VSIX
(`npx @vscode/vsce publish --oidc --packagePath <exact-vsix>`) →
bounded Marketplace live verification → create GitHub Release → attach
the exact audited VSIX → final public-surface verification.

Fail closed if OIDC auth or Marketplace publication cannot be verified.
GitHub Release must contain the same VSIX SHA-256 that was audited and
published. Normal release contract becomes: npm + GitHub Release +
VSIX + VS Code Marketplace = one automated tag-triggered release.

One-time Marketplace Trusted Publishing policy configuration that must
be performed manually by the user is reported in Completion notes (it
cannot be performed by the agent).

## Scope

- `.github/workflows/release.yml` (SAME job, tags-only `v*.*.*`
  unchanged, `contents: write` + `id-token: write` unchanged,
  SHA-pinned actions unchanged):
  - Keep all existing npm gates/ordering (validate → frozen install →
    lint/format/typecheck → build+schemas drift → tests → pack+shasum →
    smoke:package → npm absence → npm OIDC publish → registry verify →
    fresh consumer → npx smoke).
  - Insert after `Tests` (before any publish): build the exact VSIX
    from `extensions/vscode` (`esbuild` bundle + `npx --yes @vscode/vsce
    package --no-dependencies --no-yarn --out
    ackit-vscode-<RELEASE_VERSION>.vsix`), record `VSIX_PATH` +
    `VSIX_SHA256`, fail closed on version mismatch.
  - Insert deterministic VSIX preflight/audit BEFORE npm publish
    (proves root version == extension version == tag;
    VSIX manifest version == release version; packaged README
    `**Version:**` == release version; packaged CHANGELOG latest
    `## [X.Y.Z]` == release version; `publisher == Cynrath`;
    `vsce ls` contains no `node_modules`; VSIX size limit enforced;
    no secrets probe; `node scripts/check-offline-egress.mjs` gate).
  - Insert after npm verification (strictly after fresh + npx consumer
    gates, strictly before GitHub Release): Marketplace OIDC publish
    from the exact audited VSIX via
    `npx --yes @vscode/vsce publish --oidc --packagePath "$VSIX_PATH"`
    with duplicate-safe recovery (`--skipDuplicate` where supported)
    that never hides a mismatched existing version/artifact; fail
    closed on OIDC acquisition/exchange failure (vsce does not fall
    back to PAT); forbid `VSCE_PAT`/stored credentials/PAT secrets.
  - Insert bounded Marketplace live verification (read-only
    `npx --yes @vscode/vsce show Cynrath.ackit-vscode --json` loop,
    e.g. 30×20s): latest Marketplace version == `RELEASE_VERSION`;
    publisher/extension identity checked where mechanically
    verifiable; NO second publish attempt after successful visibility
    (verification loop never publishes).
  - Change GitHub Release creation to attach the exact audited VSIX
    (`gh release create ... "$VSIX_PATH"`), then verify the attached
    asset SHA-256 equals the audited/published `VSIX_SHA256`
    (download + compare, fail closed).
  - Append final public-surface verification (npm `latest` +
    Marketplace latest + `gh release view` + VSIX asset presence/SHA
    all equal `RELEASE_VERSION`/audited SHA; fail closed).
  - Update header comments to document the full automated chain and
    the no-PAT OIDC boundary.
- Contract tests (extend, never weaken):
  - `tests/contract/ci-pinning.test.ts`: assert VSIX build before any
    publish; preflight markers before npm publish; Marketplace OIDC
    publish (`--oidc` + `--packagePath`, no `VSCE_PAT`/`--pat`/
    `--azure-credential`, no `secrets.`); Marketplace verification
    bounded + read-only (no second publish); Release after ALL
    publishes+verifications with VSIX asset; final verification last
    (Release no longer strictly-last step, but still strictly after
    every publish); version-neutrality preserved.
  - `tests/contract/release-notes.test.ts`: assert Release after npm
    AND Marketplace verification, `--notes-file` unchanged.
- Release documentation (normal contract becomes one automated
  tag-triggered release):
  - New `docs/decisions/ADR-0033-vscode-marketplace-oidc-trusted-publishing.md`
    (Accepted; amends ADR-0023 §Decision-2/Alternatives/Consequences
    which required separate Marketplace authorization and forbade
    automatic `release.yml` Marketplace publishing; records OIDC
    audience `marketplace.visualstudio.com`, `id-token: write`,
    `--oidc --packagePath` + `--skipDuplicate` recovery semantics,
    fail-closed verification, SHA-bound Release asset).
  - `README.md` VS Code + Versioning sections: state the automated
    one-release chain (npm + GitHub Release + VSIX + Marketplace via
    tag-triggered OIDC, no PAT).
  - `extensions/vscode/README.md` release pointer if it claims manual
    publishing (no version bump; content pointer only).
- This task file + one PR (`chore/marketplace-oidc-release-automation`
  → `master`) with exact-head CI + Dogfood green. No version bump, no
  tag, no publish, no release in this task.

## Out of scope

- Any version bump (`package.json`, `extensions/vscode/package.json`,
  `ci.yml` contract strings stay at the current coupled version).
- Any tag creation/movement/deletion, npm publish, Marketplace
  publish, GitHub Release creation, hosted-docs sync, stable-pointer
  flip. This task builds and proves the automation only.
- Browser Companion (`feat/browser-companion-v0.3` stays
  paused/untouched; no files under its scope).
- Legacy .NET/NuGet line (frozen/immutable; no pipeline).
- Hosted site repo (`O:\projeler\Cynrath.github.io`) changes.
- Any `VSCE_PAT`/PAT/Azure credential creation, storage, or use.
- Force-push, rebase, history rewrite, workflow dispatch, deployments.

## Dependencies

- None (automation change on `master`; independent of the blocked
  historical TASK-0087 v0.5.0 failure record).

## Affected files / expected areas

- `.github/workflows/release.yml` (VSIX build + preflight + npm →
  Marketplace OIDC → Marketplace verify → Release+VSIX → final verify)
- `tests/contract/ci-pinning.test.ts` (new ordering/OIDC/VSIX/SHA assertions)
- `tests/contract/release-notes.test.ts` (Release-after-both-publishes assertion)
- `docs/decisions/ADR-0033-vscode-marketplace-oidc-trusted-publishing.md` (new)
- `docs/decisions/ADR-0023-multi-artifact-version-and-release-strategy.md` (status pointer only, history preserved)
- `README.md` (VS Code + Versioning release-contract wording)
- `extensions/vscode/README.md` (release pointer only if manual-publish wording exists; no version change)
- This task file `docs/tasks/active/TASK-0091-*`

## Acceptance criteria

- [x] `release.yml` still tags-only `v*.*.*`, still `contents: write` +
  `id-token: write` exactly, still SHA-pinned actions, still no
  `secrets.`/`NPM_TOKEN`/`NODE_AUTH_TOKEN`/`VSCE_PAT`/`--pat`/
  `--azure-credential`, still no `workflow_dispatch`/branch triggers.
- [x] Exact VSIX is built from the tagged commit (`VSIX_PATH` +
  `VSIX_SHA256` recorded); preflight proves root == extension == tag,
  VSIX manifest == release, packaged README == release, packaged
  CHANGELOG latest == release, publisher `Cynrath`, no `node_modules`,
  size limit, no secrets, offline-egress gate — all BEFORE npm publish.
- [x] Marketplace publish uses exactly
  `npx --yes @vscode/vsce publish --oidc --packagePath "$VSIX_PATH"`
  (duplicate-safe `--skipDuplicate` for recovery, never hiding a
  mismatched existing version/artifact); fails closed on OIDC/market
  errors; occurs strictly after npm verification, strictly before
  GitHub Release.
- [x] Bounded Marketplace verification proves
  `Cynrath.ackit-vscode` latest == `RELEASE_VERSION` via read-only
  `vsce show --json` retries; no second publish after visibility;
  Overview/packaged metadata checked where mechanically verifiable.
- [x] GitHub Release attaches the exact audited VSIX; post-create check
  proves attached asset SHA-256 == audited/published `VSIX_SHA256`;
  final verification proves npm + Marketplace + Release + VSIX all
  equal `RELEASE_VERSION`/audited SHA.
- [x] Contract tests updated and green (no gate weakened; new
  ordering/OIDC/VSIX assertions fail on the old npm-only workflow).
- [x] Release docs state the new normal contract (npm + GitHub Release
  + VSIX + Marketplace = one automated tag-triggered release); ADR-0033
  records the OIDC mechanism + one-time manual policy step.
- [x] Full local validation green + ONE PR exact-head CI/Dogfood green;
  no version changed, no tag/publish/release performed, Browser
  Companion untouched.
- [x] Completion notes report the exact one-time Marketplace Trusted
  Publishing policy configuration the user must perform manually.

## Test steps

1. `pnpm install --frozen-lockfile && pnpm lint && pnpm format:check && pnpm typecheck`
2. `pnpm build && pnpm gen:schemas && git diff --exit-code -- schemas && pnpm test`
3. `pnpm smoke:cli && pnpm run smoke:package`
4. `node scripts/check-version-parity.mjs && node scripts/check-offline-egress.mjs && node scripts/check-text-hygiene.mjs --repo`
5. `node dist/cli/index.js config check && node dist/cli/index.js doctor && node dist/cli/index.js task doctor && node dist/cli/index.js scan --ci && git diff --check`
6. Extension parity on demand: `pnpm --filter ackit-vscode exec esbuild src/extension.ts --bundle --platform=node --target=node20 --outfile=dist/extension.js --external:vscode --sourcemap` then `npx --yes @vscode/vsce package --no-dependencies --no-yarn --out ackit-vscode-<ver>.vsix` in `extensions/vscode`, then unzip-audit manifest/README/CHANGELOG/publisher + `vsce ls` no-node_modules + size + secrets probe (mirrors release preflight).
7. Contract suites: `pnpm vitest run tests/contract/ci-pinning.test.ts tests/contract/release-notes.test.ts tests/contract/version-parity.test.ts tests/contract/release-tag-context.test.ts`
8. Workflow static proof: `node -e "require('yaml')"` or equivalent YAML parse of `release.yml` (tags-only, permissions, single job, ordering markers via grep); `git diff --check`.
9. PR exact-head CI + Dogfood green (12/12 pattern); `gh pr view` + checks evidence recorded; no tag/publish performed (`git tag --list v*` unchanged, `npm view` unchanged).

## Security considerations

- Offline-first product preserved: automation touches workflow/docs/tests
  only; no network/telemetry in product code; `check-offline-egress`
  stays a release gate.
- No secrets in repo: no `VSCE_PAT`, no PAT, no Azure credential, no
  `secrets.` reference in `release.yml`; OIDC short-lived Marketplace
  credential only inside the tag-triggered run (audience
  `marketplace.visualstudio.com`); vsce `--oidc` never falls back to PAT.
- No absolute local paths or secret values in task/docs/output.
- Supply-chain: SHA-pinned Actions unchanged; `--provenance` unchanged;
  VSIX SHA-256 bound from audit → publish → Release asset.

## Risks

- Marketplace propagation delay → bounded read-only retries; never
  republish during delay; fail closed on timeout.
- Partial publication (npm done, Marketplace failed) → ordering + SHA
  binding make state auditable; rerun fails safely at npm absence gate
  (existing behavior); repair is manual Release/Marketplace state only,
  never tag movement.
- `--skipDuplicate` hiding a mismatched same-version artifact →
  verification still requires Marketplace latest == `RELEASE_VERSION`
  plus publisher/identity checks and SHA-bound Release asset; any
  mismatch fails closed with explicit error.
- Vsce OIDC policy not yet configured on the Marketplace side → release
  run fails closed at publish; mitigation: Completion notes give the
  exact one-time user policy step (publisher member + trusted
  publishing policy for repo/workflow).
- Contract-test brittleness after reordering (Release no longer
  strictly-last) → update assertions to the new verified order, keep
  the fail-closed intent (no publish after Release).

## Rollback plan

- Pre-merge: revert focused commits on the automation branch or abandon
  the PR (`master` untouched until user-authorized squash merge).
- Post-merge pre-tag: forward fix on `master` via PR (no history
  rewrite); no tag/publish exists to roll back.
- Post-tag (future release, not this task): immutable artifacts only —
  forward patch release on user authorization; never move/delete tags.

## Completion notes

TASK-0091 automation COMPLETE (no release performed; PR #26 open for
user-authorized merge).

- Plan-first: TASK-0091 created via `task create`, fully planned, then
  `task start`; plan commit `3b1ff69` (task + ADR-0033) precedes
  implementation commit `9f339ac` (release.yml, tests, README,
  ADR-0023 pointer) in git history. No implementation before task.
- Implementation (branch `chore/marketplace-oidc-release-automation`):
  `release.yml` extended to the full chain (VSIX build + preflight
  before any publish; npm OIDC + verification; Marketplace OIDC
  `npx --yes @vscode/vsce publish --oidc --packagePath "$VSIX_PATH"
  --skipDuplicate` after npm verification/before Release; bounded
  read-only `vsce show Cynrath.ackit-vscode --json` verification 30x20s;
  Release with exact VSIX attached + asset SHA proof; final
  public-surface verification last). Permissions unchanged
  (`contents: write` + `id-token: write`); tags-only `v*.*.*`;
  SHA-pinned Actions; no `secrets.*`/PAT/`VSCE_PAT`/`--pat`/
  `--azure-credential`; fail-closed OIDC (no PAT fallback).
- Contract tests: `ci-pinning` 22/22 + `release-notes` 2/2 +
  `version-parity` 32/32 green locally and in CI; new assertions fail
  on the old npm-only workflow (verified by markers).
- Docs: ADR-0033 Accepted (amends ADR-0023 for Marketplace OIDC only);
  ADR-0023 status pointer (history preserved); README VS Code +
  Versioning state the automated one-release contract.
- Local validation (branch head `9f339ac`):
  `pnpm lint` + `format:check` + `typecheck` green;
  `pnpm build` + `gen:schemas` idempotent;
  `pnpm test` full run 716 passed / 2 worker-contention timeouts
  (`verification.test.ts` bundle, `state-binding.test.ts` matrix-A)
  both re-passed in isolation (3.5s/3.0s);
  `smoke:cli` PASS; `smoke:package` exit 0;
  `check-version-parity` PASS source 0.5.2 stable 0.5.2 coupled;
  `check-offline-egress` PASS 200 files;
  `check-text-hygiene --repo` clean 939 files;
  `config check` OK; `doctor` PASS; `task doctor` OK;
  `scan --ci` exit 0 (169 findings, baseline-identical; one transient
  new HIGH from `PASS:` log wording fixed to `verified`, re-verified);
  `git diff --check` clean.
- Extension proof (0.5.2, on demand): typechecks + esbuild bundle +
  `vsce package` 830356 bytes (<2MB); unzip audit manifest 0.5.2,
  publisher Cynrath, README `**Version:** 0.5.2`, CHANGELOG latest
  `## [0.5.2]`, no `node_modules`, offline gate PASS; artifact removed
  after audit (not committed).
- PR: #26 `chore/marketplace-oidc-release-automation` -> `master`,
  head `9f339acf0ea81f70a938ea10b644ecd3ddff0258` (== local HEAD,
  exact-head, tree clean).
- Exact-head CI/Dogfood (PR #26):
  CI run `34102404593` success (extension 1m43s, verify 6/6,
  package-smoke 3/3, self-scan 17s);
  Dogfood run `34102404574` success (`action smoke` 16s);
  `gh pr checks 26` 12/12 pass.
- No-publish proof: `package.json` 0.5.2 + `extensions/vscode`
  0.5.2 unchanged; `git tag --list v0.5*` still v0.5.2/v0.5.1/v0.5.0;
  no `npm publish`/`vsce publish`/`gh release create` executed;
  `git diff --name-only` touches only release.yml/README/ADR-0023/
  contract tests (+ new ADR-0033/task).
- Browser Companion untouched: no files under its scope; branch
  `feat/browser-companion-v0.3` listed only, never checked out/modified.
- Process note: one scanner-driven reword (`PASS:` -> `verified` in
  release.yml) to keep `scan --ci` at baseline; no gate weakened.

ONE-TIME MANUAL PREREQUISITE (user-performed, cannot be automated):

1. Go to https://marketplace.visualstudio.com/manage/publishers/Cynrath
   (logged in as the `Cynrath` publisher owner).
2. Open the `ackit-vscode` extension -> Trusted Publishing (or
   Publisher Settings -> Trusted Publishing, per current Marketplace UI).
3. Add a policy: repository `Cynrath/agent-context-kit`, workflow
   `release.yml` (the tag-triggered Release workflow). No secret value
   is created or stored.
4. Until this policy exists, the new `Publish to VS Code Marketplace
   via OIDC` step fails closed (`Marketplace OIDC token exchange`
   error, no PAT fallback); npm gates are unaffected.
5. After configuring, verify with the NEXT tag-triggered release only
   (do NOT publish manually, do NOT re-run this automation task):
   the workflow will `vsce show Cynrath.ackit-vscode` the new version
   within the bounded retries.

Merge of PR #26 remains user-authorized (not performed here).
