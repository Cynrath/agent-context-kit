# ADR-0033: VS Code Marketplace OIDC Trusted Publishing in the Tag-Triggered Release

Status: Accepted · Date: 2026-09-07 · Task: TASK-0091 (amends ADR-0023 §Decision-2/Alternatives/Consequences, which remains in force otherwise)

## Context

ADR-0023 defined one logical release (npm + VSIX + Action pin) with
`package.json` as the single source-of-truth version and the release tag
pointing at the commit whose `package.json` matches. For Marketplace it
required a SEPARATE explicit authorization (`vsce publish` with a PAT
never stored in repo) and explicitly rejected automatic
`release.yml` Marketplace publishing as enlarging the blast radius:

- `release.yml` is not changed to publish VSIX/Marketplace automatically;
  if a future decision wants that, a new ADR is required.

Since then the upstream `@vscode/vsce` shipped official OIDC
trusted publishing (`vsce publish --oidc`, README `Trusted publishing`
section): GitHub Actions requests an OIDC token for audience
`marketplace.visualstudio.com` (requires `permissions: id-token: write`)
and exchanges it for a short-lived Marketplace credential. It does not
fall back to a PAT when acquisition or exchange fails (fail-closed).
The existing `release.yml` already carries `contents: write` +
`id-token: write` for npm OIDC, and the v0.5.x line proved the
version-coupling + packaged-VSIX parity model (manifest/README/CHANGELOG
inside the built VSIX must match; publisher `Cynrath`; no
`node_modules`; `<2MB`; no secrets; offline-egress gate).

Manual Marketplace publishing as the normal path is now the drift risk:
npm + GitHub Release are automated and verified, Marketplace lags behind
or is published from a different artifact. The goal (TASK-0091) requires
the SAME tag-triggered `vX.Y.Z` pipeline to publish ALL surfaces after
the normal gates, with no PAT, no `VSCE_PAT` secret, no stored vsce
credentials, no Azure long-lived PAT, and fail-closed verification.

## Decision

The normal release contract is now ONE automated tag-triggered release:

npm + GitHub Release + VSIX + VS Code Marketplace.

`release.yml` (same job, tags-only `v*.*.*`, `contents: write` +
`id-token: write`, SHA-pinned Actions, no `secrets.*`) implements this
ordered chain:

```text
tag vX.Y.Z
→ validate exact tagged commit/version (tag shape, checkout identity,
  package name, root == extension == tag, publisher Cynrath, npm OIDC capability)
→ install/lint/format/typecheck/build/tests (+ schemas drift)
→ build exact VSIX (esbuild bundle + `vsce package --no-dependencies
  --no-yarn --out ackit-vscode-<RELEASE_VERSION>.vsix`; record
  VSIX_PATH + VSIX_SHA256)
→ deterministic VSIX preflight BEFORE any publish (root == extension ==
  tag; VSIX manifest == release; packaged README **Version:** ==
  release; packaged CHANGELOG latest ## [X.Y.Z] == release; publisher
  Cynrath; no node_modules via unzip + vsce ls; size ≤2MB; no secrets
  probe; check-offline-egress gate; SHA re-assertion)
→ pack tarball + shasum + real-tarball smoke
→ confirm npm absence (404 required)
→ npm OIDC publish (`npm publish --access public --provenance`)
→ npm verify (30× registry visibility, shasum equality, dist-tag
  latest) + fresh isolated consumer + secondary npx smoke
→ Marketplace OIDC publish from the exact audited VSIX:
  `npx --yes @vscode/vsce publish --oidc --packagePath "$VSIX_PATH"
  --skipDuplicate`
  (`--skipDuplicate` is duplicate-safe recovery only: a rerun after a
  successful publish skips instead of failing, but verification below
  must still pass; any mismatched existing version/artifact fails
  closed there; single attempt per run, no PAT fallback)
→ bounded Marketplace live verification (read-only
  `vsce show Cynrath.ackit-vscode --json` loop, 30×20s; latest ==
  RELEASE_VERSION; publisher/extension identity checked where
  mechanically verifiable; NO second publish after visibility)
→ create GitHub Release with the exact audited VSIX attached
  (`gh release create --verify-tag ... "$VSIX_PATH"`), then prove the
  attached asset SHA-256 equals the audited/published VSIX_SHA256
  (download + compare, fail closed)
→ final public-surface verification (npm latest + Marketplace latest +
  Release tag + VSIX asset presence, all == RELEASE_VERSION/SHA).
```

Credential boundary:

- Marketplace OIDC audience is `marketplace.visualstudio.com`
  (vsce `OIDC_AUDIENCE`); the workflow only needs the already-present
  `id-token: write` (no new permission, no secret).
- Forbidden as normal-path mechanisms: `VSCE_PAT`, `--pat`,
  `--azure-credential`, `vsce login` / stored credentials, any
  `secrets.*` Marketplace credential, Azure long-lived PATs, manual
  publishing. The workflow fails closed if `VSCE_PAT` is set and never
  passes a PAT flag.
- OIDC acquisition/exchange failure fails the run (vsce `--oidc`
  never falls back to PAT).

Recovery semantics (unchanged philosophy, extended to Marketplace):

- Reruns fail safely at the npm absence gate after a successful npm
  publish (existing behavior); repair is manual downstream state only,
  never tag movement/deletion.
- Within a run, propagation delay never triggers a republish; the
  bounded verification fails closed on timeout.
- `--skipDuplicate` never hides a mismatch: verification requires
  Marketplace latest == `RELEASE_VERSION` plus identity checks and the
  SHA-bound Release asset; any mismatch fails closed with an explicit
  error.

## Rationale

OIDC removes the reason ADR-0023 rejected automation (PAT blast
radius). The same short-lived-credential model already trusted for npm
now covers Marketplace, with a strictly stronger audit trail than
manual publishing: the exact audited bytes (SHA-256) are the published
bytes and the Release bytes, proven in-run. Ordering (VSIX audit before
any publish; npm before Marketplace before Release; verification before
Release; final verification last) preserves the existing fail-closed
guarantees while closing the manual-publish drift gap.

## Alternatives considered

- Keep Marketplace manual with separate `marketplace: yes`
  authorization: rejected — preserves the drift class (npm/Release
  current, Marketplace stale or from different bytes) that v0.5.2 had
  to repair forward.
- Separate Marketplace workflow/tag: rejected — reintroduces
  coordination drift; single tag already carries the coupled version.
- Publish Marketplace before npm: rejected — npm remains the primary
  source-of-truth surface with the absence gate; Marketplace follows
  verified npm, never precedes it.

## Consequences

- ADR-0023 §Decision-2 step 4, Alternatives (automatic VSIX/Marketplace
  rejected), and Consequences (`release.yml` not changed) are superseded
  by this ADR for Marketplace OIDC; all other ADR-0023 governance
  (single tag, version coupling, no master publish, no force-push/
  rebase/tag movement/`workflow_dispatch`) remains in force.
- `README.md` (VS Code + Versioning) now states the automated
  one-release contract.
- Contract tests (`ci-pinning`, `release-notes`) pin the new ordering,
  OIDC mechanism, bounded verification, and SHA binding; the old
  strictly-last-Release assertion is replaced by Release-after-every-
  publish + final-verification-last (same fail-closed intent).
- One-time manual prerequisite (user-performed, never agent-performed):
  publisher `Cynrath` must have a Marketplace Trusted Publishing policy
  for repository `Cynrath/agent-context-kit` + workflow `release.yml`.
  Until configured, the Marketplace OIDC step fails closed; npm +
  verification gates are unaffected.

## References

- `.github/workflows/release.yml` (automated chain)
- `@vscode/vsce` README `Trusted publishing` + `src/oidc.ts`
  (`OIDC_AUDIENCE = marketplace.visualstudio.com`, GitHub Actions only,
  no PAT fallback) + `src/publish.ts` (`--packagePath` + `--skipDuplicate`)
- `package.json`, `extensions/vscode/package.json` (ADR-0023 coupling)
- `tests/contract/ci-pinning.test.ts`, `tests/contract/release-notes.test.ts`
- TASK-0091 (automation; no version/tag/publish performed)
