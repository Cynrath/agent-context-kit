# TASK-0257: V100 RC1 public status provenance and final CI closure

## Purpose

After TASK-0255 and TASK-0256 complete successfully, pin published-package smoke to immutable `1.0.0-rc.1`, synchronize all public/release/supply-chain/V100/task/handoff evidence, close V100-09 from exact proof, and finish on clean synchronized `master` with final green standard CI.

## Current verified state

- At entry, `v0.2.0-alpha.4` remains the latest complete release and published-smoke pin.
- NuGet RC1 and exact tag exist, but the repository truth sources currently record prerelease/assets/attestations/recovery matrix as incomplete after TASK-0253.
- English, Turkish, and NuGet README sources intentionally remain pinned to alpha4 and must change only after complete hosted proof.
- Historical TASK-0242/TASK-0244/TASK-0247/TASK-0250/TASK-0253 failure evidence must remain factual and distinct from the new successful chain.

## Dependencies

- TASK-0255 exact prerelease/body/two assets fully verified.
- TASK-0256 both attestations verified and Windows/Ubuntu/macOS installed-package smoke passed.
- Exact run/job/URL/digest/hash/commit/tag/signer evidence available for documentation.

## Scope

- Update `.github/workflows/cross-platform-smoke.yml` from `0.2.0-alpha.4` to `1.0.0-rc.1`.
- Synchronize `README.md`, `README.tr.md`, and pure-Markdown `README.nuget.md` with equivalent RC1 prerelease coverage and install examples without a GA claim.
- Update changelog, release automation/validation/recovery, supply-chain/hosted/decision/V100, roadmap/queue/task, and Codex handoff/context sources.
- Close V100-09 only after verifying OIDC NuGet publication, immutable package/commit/tag/release/body/assets, both attestations, recovery ownership, and Windows/Ubuntu/macOS installed-package proof.
- Run full local validation, logical closure commit/push, and final exact-HEAD standard CI.
- Verify final local/origin equality, clean tree, published-smoke version, release/attestations, and preserved historical evidence.

## Out of scope

- NuGet mutation/republication, tag/release/asset mutation, attestation deletion, new feature work, settings/PAT/secret change, force push, history rewrite, historical evidence rewriting, or `1.0.0` GA claims.

## Affected files

- `.github/workflows/cross-platform-smoke.yml`
- `README.md`, `README.tr.md`, `README.nuget.md`, `CHANGELOG.md`
- Release, packaging, supply-chain, hosted-validation, maintainer decision, V100, roadmap, next-task, execution-queue, task, and handoff/context documentation

## Data/database impact

None. No application database, migrations, or stored business data.

## Admin impact

None. Repository source/docs and push-triggered CI only.

## Security impact

Public claims must be derived from exact immutable evidence. V100-09 cannot close on a partial or mismatched release. Historical failures and accepted signing/SBOM boundaries remain visible.

## Release impact

Makes RC1 the latest complete prerelease in repository guidance, pins published smoke to it, and closes V100-09 only from exact release/provenance/platform proof. It does not claim `1.0.0` GA readiness.

## Permission/auth impact

No new permissions or credentials. Normal commits/pushes and read-only final verification only.

## SEO/i18n impact

English and Turkish GitHub README coverage, installation examples, release discoverability, and status language must remain equivalent. `README.nuget.md` stays plain Markdown without HTML/CSS/local images and states that the already-published package embeds immutable README content.

## UX impact

Users receive accurate RC1 install/update commands, release notes, provenance evidence, platform support proof, rollback guidance, and clear prerelease-versus-GA status.

## Logging/audit impact

Record task commits, release URL/ID, assets/digests/hashes, attestation/run/job evidence, final validation/CI, push and dispatch counts, local/origin equality, clean tree, and every prohibited-action confirmation.

## Implementation plan

1. Reconfirm complete TASK-0255/TASK-0256 evidence and immutable release state.
2. Update the published-smoke pin and all current public/status/evidence sources while preserving historical sections.
3. Evaluate and close V100-09 against its complete exact evidence set.
4. Run ACKit, full .NET, focused release, package, V100, supply-chain, public-release, Markdown, Unicode, diff, completeness, and `.ackit` gates.
5. Commit/push normally and wait for final `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke`.
6. Fix valid repository/CI failures with successor commits until green, then perform final equality/clean-state/read-only release verification.

## Acceptance criteria

- Published smoke installs `AgentContextKit 1.0.0-rc.1` on Windows, Ubuntu, and macOS.
- EN/TR/NuGet README sources identify RC1 as the latest complete prerelease, use RC1 install/update examples, retain the NuGet embedded-README boundary, and make no GA claim.
- Exact NuGet/source/tag/release/body/asset/attestation/platform evidence is recorded consistently.
- V100-09 is closed with exact hosted provenance and three-platform proof.
- All historical recovery failures remain preserved and clearly distinguished from TASK-0255/TASK-0256 success.
- Full local validation and final exact-HEAD standard CI pass.
- Local HEAD equals `origin/master`, working tree is clean, and no generated `.ackit/` artifact is tracked.

## Test steps

- Complete controlling Phase 5 and final validation command suites.
- Verify README EN/TR status/install parity and NuGet pure-Markdown/package metadata boundaries.
- Confirm published-smoke version marker and all three hosted jobs.
- Final structured release/attestation verification plus Git equality/status checks.

## Failure handling

Correct valid repository-only or CI failures with normal successor commits and retest. Do not mutate immutable NuGet/tag/release assets or weaken evidence to close V100-09.

## Risks

- Premature wording can overstate provenance or GA readiness.
- The NuGet RC1 package page embeds its already-published README and cannot be retroactively changed by this source sync.
- Cross-platform published smoke may expose package propagation or runner-specific issues.

## Rollback plan

Use normal successor commits for source/docs corrections and restore the previous smoke pin only if RC1 install evidence is invalidated. Never rewrite history or mutate immutable release artifacts.

## Completion evidence

Record closure commit, full local test/gate results, final CI runs/jobs, final release/attestation state, V100-09 evidence/classification, local/origin HEAD, clean tree, push/dispatch/NuGet-publish counts, and safety confirmations.

## Completion notes

Status: `CLOSURE IMPLEMENTED / LOCAL VALIDATION PASS / FINAL CI PENDING`.

TASK-0255 and TASK-0256 evidence is complete. Published smoke now installs `1.0.0-rc.1`; README EN/TR/NuGet and current release, supply-chain, hosted, V100, roadmap, queue, and handoff sources identify RC1 as the complete prerelease while retaining alpha4 as immutable predecessor evidence. V100-09 is closed from release `353913024`, exact asset IDs `476881883`/`476881892`, attestations `35295200`/`35295205`, and run `29350091782` platform jobs `87144074850`/`87144074884`/`87144074933`. No GA claim is made.

Local validation passed: restore; Release build with 0 warnings/0 errors; 431/431 tests; Unicode directory guard 0 before/0 after; ACKit doctor 13/13 and scan exit 0; exact release/recovery/supply-chain fixtures; release, package, V100, security, published-state, public-release, localization, Markdown-link, tracked/untracked, diff, RC1 smoke-pin, pure-Markdown NuGet README, and no-tracked-`.ackit` gates. The first full test attempt exposed a stale `alpha.3` canonical instruction assertion after agent surfaces were synchronized; the expectation and `DEVELOPMENT_STANDARD.md` were corrected to RC1, then the complete build/test suite passed. Closure commit/push, exact-HEAD standard CI, equality, and clean-tree evidence remain to record.
