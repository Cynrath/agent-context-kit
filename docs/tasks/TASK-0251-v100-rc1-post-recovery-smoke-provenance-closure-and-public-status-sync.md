# TASK-0251: V100 RC1 post-recovery smoke, provenance closure, and public status synchronization

## Purpose

After complete TASK-0250 success, pin published-package smoke to immutable NuGet `1.0.0-rc.1`, synchronize public/release/supply-chain documentation, close V100-09 only with complete exact provenance, and finish with a clean synchronized repository and green standard CI.

## Verified starting state

- At planning time, `v0.2.0-alpha.4` remains the latest complete release and published smoke pin.
- NuGet RC1 exists, while tag/release/assets/attestations are absent until TASK-0250 succeeds.
- README sources accurately distinguish GitHub presentation from pure-Markdown NuGet presentation and preserve the immutable published-package README boundary.
- TASK-0242, TASK-0244, and TASK-0247 are historical partial/failure records and must remain intact.

## Dependencies

- TASK-0250 completed successfully with exact tag/release/body/assets/API digests, both verified attestations, and Windows/Ubuntu/macOS installed-tool smoke evidence.
- Exact recovery automation commit, workflow run/job IDs, source artifact evidence, and release URLs/hashes are available for documentation.

## Scope

- Update `.github/workflows/cross-platform-smoke.yml` from `0.2.0-alpha.4` to `1.0.0-rc.1` and verify the immutable package on all three operating systems.
- Update current public status, release validation/automation/recovery, V100, roadmap/queue/handoff, changelog, and README sources with exact recovery evidence.
- Present RC1 as the latest complete prerelease in English and Turkish without a 1.0 GA claim.
- Keep `README.nuget.md` pure Markdown and record that repository changes cannot retroactively change the already-published RC1 NuGet page.
- Close V100-09 only if every exact provenance and three-platform criterion is proven.
- Commit TASK-0250 evidence and TASK-0251 closure separately, push them together once, and wait for final standard CI.

## Out of scope

- Any NuGet republish/change/unlist/delete/replace, recovery rerun/dispatch, normal publish, tag/release/asset/attestation mutation outside the completed workflow, settings change, force push, history rewrite, `.ackit/` commit, or 1.0 GA claim.
- Rewriting TASK-0242, TASK-0244, or TASK-0247 as successful.

## Affected files

- `.github/workflows/cross-platform-smoke.yml`
- `README.md`, `README.tr.md`, `README.nuget.md`, `CHANGELOG.md`
- `docs/PUBLISHED_SUPPLY_CHAIN_STATUS.md`, `docs/HOSTED_VALIDATION_STATUS.md`
- `docs/RELEASE_VALIDATION.md`, `docs/RELEASE_AUTOMATION.md`, `docs/PACKAGE_RECOVERY.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`, `docs/MAINTAINER_RC_DECISION.md`
- `docs/V100_GAP_ANALYSIS.md`, `docs/V100_RC1_RELEASE_PLAN.md`
- `docs/ROADMAP.md`, `docs/NEXT_TASKS.md`, `docs/PROJECT_EXECUTION_QUEUE.md`
- `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`, `.codex/NEXT_STEPS.md`
- TASK-0249, TASK-0250, and this task

## Data/database impact

None.

## Admin impact

None. This task performs documentation, workflow-pin, normal git push, and CI verification only.

## Security impact

Public claims must be derived from exact immutable evidence. V100-09 remains open if any package/signature/commit/tag/body/asset/hash/attestation/smoke criterion is missing.

## Permission/auth impact

No new permissions or credentials. Normal `master` push is authorized; force push and repository-setting changes remain forbidden.

## SEO/i18n impact

English and Turkish public README status/install examples are synchronized. `README.nuget.md` stays platform-compatible pure Markdown without HTML/CSS or local relative images.

## UX impact

Users receive accurate RC1 install commands, release evidence, rollback context, and a clear distinction between prerelease readiness and GA readiness.

## Logging/audit impact

Record exact task commits, recovery automation/run/job IDs, source artifact/digest/hashes, tag target, release URL/body/assets, both attestations, three-platform smoke results, final workflow IDs, and clean-tree synchronization. Preserve prior failures verbatim.

## Exact implementation steps

1. Record successful TASK-0250 evidence and commit it separately.
2. Pin published smoke to `1.0.0-rc.1` and update all current public/release/V100/queue/handoff sources.
3. Keep README NuGet rendering constraints and immutable-page caveat explicit.
4. Evaluate V100-09 against every exact done criterion and close it only on complete evidence.
5. Run ACKit, build/test, recovery fixtures, release/V100/security/public/package/Markdown gates, Unicode temp guard, diff check, and `.ackit` tracking check.
6. Commit TASK-0251 separately, push TASK-0250/TASK-0251 commits together once, and wait for `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` with one discovery/watch/view sequence.
7. Verify final local/origin HEAD equality and clean working tree.

## Acceptance criteria

- Published smoke installs `AgentContextKit 1.0.0-rc.1` on Windows, Ubuntu, and macOS.
- README English/Turkish/NuGet sources are accurate, complete, platform-appropriate, and make no GA claim.
- Public status identifies exact NuGet release commit, recovery automation commit/run, tag/release/body/assets/hashes/attestations, and three-platform evidence.
- V100-09 closes only with OIDC publication, immutable package, exact tag/release/assets, verified nupkg/snupkg attestations, recovery ownership/procedure, and three-OS installed-package evidence.
- Historical TASK-0242/TASK-0244/TASK-0247 records remain unchanged in meaning.
- Final local validation and all three final standard workflows pass; local HEAD equals `origin/master`; working tree is clean.
- NuGet publish count is zero and recovery dispatch count is one for this session.

## Validation commands

Run the exact final validation suite specified by the TASK-0249–0251 authorization, including ACKit, build/test, recovery fixtures, release/V100/security/public/package/Markdown gates, Unicode temporary-path guard, `git diff --check`, and `git ls-files .ackit`.

## Risks

- Premature public synchronization could claim completeness without provenance; TASK-0251 is success-only.
- NuGet package README content is immutable for RC1; repository `README.nuget.md` changes affect future packages only unless equivalent content was already packed.
- Final hosted CI may uncover cross-platform documentation or smoke drift; fix with a normal successor commit only if no recovery rerun/mutation is required.

## Rollback/safe-stop behavior

If TASK-0250 is incomplete, do not execute this task. For local/final-CI-only issues, use a normal successor commit without changing release assets/tag/NuGet. Never reopen or rewrite remote immutable release history.

## Completion evidence

Status: `NOT EXECUTED / TASK-0250 SUCCESS CRITERIA NOT MET`.

TASK-0250 run `29341087462` failed when the GitHub App token's tag push was rejected for missing `workflows` permission. The one post-failure audit proved the tag, GitHub prerelease/assets, and both attestations remain absent. Therefore:

- published smoke remains pinned to `0.2.0-alpha.4`;
- `v0.2.0-alpha.4` remains the latest complete prerelease;
- V100-09 remains open;
- README current-release/install guidance remains alpha4; only the factual TASK-0250 failure note was synchronized;
- no TASK-0251 success commit, release mutation, or 1.0 GA claim is allowed.

This factual non-execution record does not rewrite TASK-0242, TASK-0244, TASK-0247, or TASK-0250.
