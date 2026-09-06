---
id: "TASK-0089"
title: "v0.5.1 public surface parity, hosted docs and VS Code distribution audit"
status: active
schemaVersion: 2
dependencies: []
createdAt: "2026-09-06"
completedAt: null
---

## Purpose

Correct v0.5.1 public-surface drift without a new product release: verify the full intended v0.5 implementation exists in source/tests, fix current-facing product README/docs to describe v0.5 accurately, add parity regression guards, verify VS Code 0.5.1 implementation and live Marketplace truth (publish only if actually behind), attach the audited 0.5.1 VSIX to the existing GitHub Release v0.5.1 if absent, update generated hosted docs (Status / Provider Surfaces / Trust Flow) via the site generator, manually update the hand-maintained root Cynrath UI from stale 0.4.1/pre-v0.5 messaging, and add site parity guards so drift cannot recur.

Explicit user authorization (this task only): open exactly ONE product PR `chore/v0.5.1-public-surface-parity` → `master`, squash-merge it when exact-head CI/Dogfood green, open exactly ONE site PR `chore/ackit-v0.5.1-public-surface-parity` → `main` and merge when `docs-integrity` (+ protected checks) green, upload `ackit-vscode-0.5.1.vsix` (built from the immutable `v0.5.1` tag worktree) to the EXISTING GitHub Release `v0.5.1` only if the asset is absent (record SHA-256), publish `Cynrath.ackit-vscode 0.5.1` to Marketplace ONLY if live `vsce show` proves Marketplace < 0.5.1, and delete both temporary branches locally/remotely after success. No v0.5.2, no tag move/create/delete, no Browser Companion changes, no force-push/rebase/history rewrite/workflow dispatch.

## Scope

- A. Verify all seven intended v0.5 capabilities exist (state-bound verification, verifier independence + replay/staleness, canonical status, handoff v2, provider/surface parity, containment hardening, trust-flow demo) with a Capability | Source | Contract | Tests | Status matrix; NO-GO if any is missing.
- B. Correct `README.md` (feature table stale `ackit.verdict.v1`, commands, architecture trust chain, docs index) and all current-facing product docs (classify v1 hits as CURRENT-STALE vs LEGITIMATE-AUTHORING vs LEGACY vs HISTORICAL; no mass-replace).
- C. Add/extend product doc-parity regression tests (README/CLI/verification/checkpoint markers); historical v1 stays allowed.
- D. VS Code: verify 0.5.1 source (Tasks view consumes canonical status snapshot, blockers/next-actions, no mutation, offline), build+test extension; live Marketplace check; publish only if behind; build+AUDIT VSIX from detached `v0.5.1` tag worktree; attach to existing GitHub Release if absent with SHA-256.
- E. Site: fix `scripts/sync-ackit-docs.mjs` (source generator, not hand-edited HTML), regenerate, add Status / Provider Surfaces / Trust Flow pages + nav, update Overview/CLI/Verification/Checkpoints/Security content, update `llms.txt`/`llms-full.txt`, prove generator idempotence (run twice, second zero-diff).
- F. Manually update hand-maintained root `index.html` (0.4.1 → 0.5.1: JSON-LD, hero terminal, featured card, install snippets, docs snippet) + v0.5 feature messaging (evidence → bound verification → independence → status → handoff → parity); preserve design/layout/animations.
- G. Extend `scripts/verify-site.mjs` with dynamic version-parity + v0.5 capability-marker guards (zero-dependency contract kept).
- H. Full validation (product §21 + site §24), exactly one product PR + one site PR, live verification (§26), branch cleanup (§27).

## Out of scope

- Any new product release (no v0.5.2), no version bump, no tag move/delete/recreate of `v0.5.1` (or `v0.4.1`/`v0.5.0`).
- Browser Companion (`feat/browser-companion-v0.3` stays paused/untouched); no MCP write controls without proof; no false cryptographic-identity claims.
- Hosted-docs redesign; marketing beyond accurate v0.5 representation; dozens of redundant root cards.
- Force-push, rebase, history rewrite, workflow dispatch, deployments.

## Dependencies

- TASK-0088 (completed v0.5.1 recovery — public baseline: npm/GitHub/Marketplace/hosted-docs 0.5.1) — historical input only, no machine edge needed.
- TASK-0087 stays blocked/superseded history; never completed.

## Affected files / expected areas

- `README.md` (feature table, commands, architecture, docs index)
- `docs/architecture/overview.md`, `docs/concepts/evidence-verification.md`, `docs/concepts/checkpoints.md`, `docs/guides/agent-integration.md`, `docs/guides/workflow-adoption.md`, `docs/guides/workflow-example.md`, `docs/guides/demo-trust-flow.md`, `docs/reference/cli.md`, `docs/reference/sdk.md`, `docs/reference/mcp.md`, `docs/reference/provider-surfaces.md`, `docs/reference/policy.md`, `docs/security/THREAT_MODEL.md`, `extensions/vscode/README.md`
- Parity tests (extend existing README/current-doc/version-parity tests)
- `extensions/vscode/**` (verify only; no version bump)
- Site repo (separate checkout `O:\projeler\Cynrath.github.io`): `scripts/sync-ackit-docs.mjs`, generated `agent-context-kit/**`, `agent-context-kit/llms.txt`, `sitemap.xml`/`robots.txt`, hand-maintained root `index.html`, `scripts/verify-site.mjs`
- Task file `docs/tasks/active/TASK-0089-*` (this task)

## Acceptance criteria

- [ ] 4.x matrix proves every intended v0.5 capability present (source + contract + tests) or reports PUBLIC-SURFACE-PARITY: NO-GO with the missing item.
- [ ] README exposes State-Bound Verification, Verifier Independence, Canonical Status, Portable Handoff v2, Provider/Surface Parity, Security Containment Hardening, Trust-Flow Demo; commands include `status`, `checkpoint import`, `verification bundle/record --bundle`; architecture shows trust chain; docs index links status/provider/trust-flow.
- [ ] Current docs audit classified every v1/0.4.1 hit; only CURRENT-STALE changed; valid v1-authoring/legacy/historical retained.
- [ ] Parity regression tests guard README/CLI/verification/checkpoint v0.5 markers; historical v1 still allowed.
- [ ] VS Code 0.5.1 implementation verified (status snapshot, blockers/next-actions, no mutation, offline); build+tests green; live Marketplace truth recorded; publish iff behind; VSIX from `v0.5.1` tag worktree audited (manifest 0.5.1, publisher Cynrath, no node_modules/secrets, size < limit, status integration present); temp worktree removed.
- [ ] GitHub Release `v0.5.1` carries audited `ackit-vscode-0.5.1.vsix` (or pre-existing asset verified, no blind duplicate); SHA-256 recorded; no new tag/release.
- [ ] Site generator fixed at source, safety contract preserved; Status/Provider-Surfaces/Trust-Flow pages + nav exist; Overview/CLI/Verification/Checkpoints/Security/llms.txt current; generator 2-run idempotent; theme hashes preserved.
- [ ] Root `index.html` has zero stale `0.4.1` in current surfaces (JSON-LD/hero/featured/install/docs), shows 0.5.1, and covers the v0.5 trust chain while keeping offline-first/deterministic/no-key/MCP-read-only visible; design preserved.
- [ ] `verify-site.mjs` asserts dynamic version parity + hosted v0.5 markers; `verify-site.mjs` green.
- [ ] Product validation (§21) fully green with no version bump (package 0.5.1, stable 0.5.1, npm latest 0.5.1); site validation (§24) green; rendered HTML inspected.
- [ ] Exactly one product PR merged (exact-head CI/Dogfood green, squash) + one site PR merged (`docs-integrity` green); branches cleaned to `master` + `feat/browser-companion-v0.3` and `main`; live verification (§26) recorded.

## Test steps

1. Preflight (§2/§13): fetch/prune, branch/HEAD/tags, install/build, CLI version/doctor/scan, release-state, npm/GitHub/Marketplace live, site verifier baseline + theme hashes.
2. Task-first: this plan committed before implementation; `task doctor` green.
3. Capability matrix (§4): source/contract/test evidence per capability; trust-flow demo test + guide.
4. Product docs (§5-§7): README/docs corrections, focused parity tests, then `pnpm lint/format:check/typecheck/build/test/gen:schemas/smokes/version-parity/offline/hygiene/config/doctor/task-doctor/skills/scan/diff-check`.
5. VS Code (§8-§12): extension build/test, live `vsce show`, tag-worktree VSIX build + audit, conditional publish, conditional Release upload with SHA-256.
6. Site (§14-§20): generator fix, regenerate, 2-run idempotence, `verify-site.mjs` + rendered-HTML inspection.
7. PRs (§22-§25): UTF-8 body + hygiene, exact-head CI/Dogfood, squash merges, post-merge rebuild + re-sync from merged master, branch deletions verified both sides.
8. Live (§26): npm/Release/Marketplace/VSIX/hosted URLs/root UI independently verified.

## Security considerations

- Offline-first invariant holds: no network/telemetry/uploads in product code; generator adds no network/exec/telemetry/CDN.
- No secret values or absolute local paths in artifacts, VSIX, task evidence, or terminal output.
- Link-aware root-contained output guard stays proven-gap-only; MCP remains read-only; no redundant write controls without proof.
- VSIX audited for secrets/credentials/payload before any upload; Release upload is additive asset only.

## Risks

- Marketplace propagation delay → distinguish publish-accepted vs visible; no republish during delay.
- Valid v1-authoring examples broken by naive replace → classify before editing; keep authoring schema valid.
- Generated-HTML hand-edit drift → fix generator first; prove idempotence.
- Protected-master mechanics → exactly one PR per repo; task completion rides the product PR if mechanically possible.

## Rollback plan

- Pre-merge: focused revert on the single temp branch per repo; PR stays draft.
- Post-merge: forward fix via new parity PR (no history rewrite); never move/delete tags.
- Post-publish asset: no Release/tag rollback; duplicate upload avoided by pre-check.

## Completion notes

(pending — filled with §28 report evidence on completion)
