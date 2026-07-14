# TASK-0254: V100 RC1 three platform smoke public status and provenance closure

## Purpose

After complete TASK-0253 success, pin the published-package smoke workflow to immutable NuGet `1.0.0-rc.1`, synchronize public/release/supply-chain/V100 evidence, close V100-09 only with complete exact proof, and finish with clean synchronized `master` plus green final standard CI.

## Verified starting state

- At planning time `v0.2.0-alpha.4` is the latest complete prerelease and published-smoke pin.
- NuGet RC1 and its exact existing tag are immutable; GitHub prerelease/assets/attestations and recovery smoke depend on TASK-0253.
- README sources distinguish GitHub presentation from pure-Markdown NuGet presentation and state the immutable embedded-README boundary.
- TASK-0242, TASK-0244, TASK-0247, and TASK-0250 remain factual historical failure records.

## Dependencies

- TASK-0253 complete success with exact prerelease, body, two assets, two verified attestations, and Windows/Ubuntu/macOS recovery smoke evidence.
- Exact recovery automation commit, run/job IDs, release URL, asset hashes/digests, and attestation evidence.

## Scope

- Update `.github/workflows/cross-platform-smoke.yml` from `0.2.0-alpha.4` to `1.0.0-rc.1`.
- Update current public, release, supply-chain, hosted-validation, decision, V100, roadmap/queue, task, changelog, and handoff sources with exact evidence.
- Finalize `README.md`, `README.tr.md`, and pure-Markdown `README.nuget.md` with RC1 installation guidance and no GA claim.
- Close V100-09 only if OIDC publication, immutable package/commit/tag/release/assets, both attestations, recovery ownership/procedure, and all three installed-package platforms are verified.
- Run final local validation, commit TASK-0254 separately, push TASK-0253/TASK-0254 commits together once, and wait for final standard CI.

## Out of scope

- NuGet mutation/republication, recovery rerun/dispatch, tag/release/asset/attestation mutation, settings changes, force push, history rewrite, rewriting historical failures, or claiming `1.0.0` GA readiness.

## Affected files

- `.github/workflows/cross-platform-smoke.yml`
- `README.md`, `README.tr.md`, `README.nuget.md`, `CHANGELOG.md`
- `docs/PUBLISHED_SUPPLY_CHAIN_STATUS.md`, `docs/HOSTED_VALIDATION_STATUS.md`
- `docs/RELEASE_VALIDATION.md`, `docs/RELEASE_AUTOMATION.md`, `docs/PACKAGE_RECOVERY.md`
- `docs/MAINTAINER_DECISION_REGISTER.md`, `docs/MAINTAINER_RC_DECISION.md`
- `docs/V100_GAP_ANALYSIS.md`, `docs/V100_RC1_RELEASE_PLAN.md`
- `docs/ROADMAP.md`, `docs/NEXT_TASKS.md`, `docs/PROJECT_EXECUTION_QUEUE.md`
- `.codex/SESSION_HANDOFF.md`, `.codex/CONTEXT_PACK.md`, `.codex/NEXT_STEPS.md`
- TASK-0252, TASK-0253, and this task

## Data/database impact

None.

## Admin impact

None. This task changes repository source/docs and observes push-triggered CI only.

## Security impact

Public claims and V100 closure must derive only from immutable exact evidence. Any missing criterion leaves V100-09 open.

## Permission/auth impact

No new permissions or credentials. One normal final `master` push is authorized after local validation and remote-advance protection.

## SEO/i18n impact

English and Turkish GitHub README coverage and installation examples must remain equivalent. `README.nuget.md` remains pure Markdown without HTML/CSS, local relative images, or a claim that repository edits retroactively change the published RC1 package page.

## UX impact

Users receive accurate RC1 installation commands, release/provenance evidence, rollback context, and a clear prerelease-versus-GA distinction.

## Logging/audit impact

Record exact task commits, recovery evidence, final validation, final CI run IDs, local/origin equality, clean tree, push count two, dispatch count one, and NuGet publish count zero.

## Implementation plan

1. Confirm complete TASK-0253 evidence and update the published-smoke pin.
2. Synchronize all current public/release/supply-chain/V100/queue/handoff sources while preserving historical failures.
3. Evaluate and close V100-09 only against every exact criterion.
4. Run the full authorized local suite plus Unicode-path and tracked/untracked guards.
5. Commit TASK-0254 separately, push TASK-0253/TASK-0254 once, and watch the exact final three workflows.
6. Verify final local/origin HEAD equality, clean tree, immutable tag/package state, release assets, attestations, and smoke evidence.

## Acceptance criteria

- Published smoke installs `AgentContextKit 1.0.0-rc.1` on Windows, Ubuntu, and macOS.
- English, Turkish, and NuGet README sources accurately present RC1 as the latest complete prerelease without a GA claim.
- Exact publication commit, tag target, automation commit/run, prerelease URL/body, assets/hashes, attestations, and three-platform evidence are recorded.
- V100-09 is closed only with complete evidence.
- Historical TASK-0242/TASK-0244/TASK-0247/TASK-0250 meanings remain intact.
- Final local validation and the three exact-HEAD standard workflows pass.
- Local HEAD equals `origin/master`, working tree is clean, recovery dispatch count is one, NuGet publish count is zero, and total push count is two.

## Validation commands

Run the exact final local validation suite, tracked/untracked Markdown guard, Unicode temporary-path guard, pre-push ancestry checks, one run-discovery block, one blocking watch per workflow, one final view per run, and final local/remote state checks specified by the controlling request.

## Failure boundary

This task must not start if TASK-0253 is incomplete. Local or final-CI-only failures may be corrected with normal successor commits without any release/tag/NuGet/recovery mutation.

## Risks

- Premature documentation could overstate provenance or GA readiness.
- The already-published RC1 package README is immutable; source edits apply only to a future separately authorized package.
- Cross-platform final CI may expose pin or documentation drift.

## Rollback or safe-stop procedure

Use normal successor commits for repository-only corrections. Never mutate immutable release artifacts or rewrite history. If any V100-09 criterion is missing, keep it open and record the exact gap.

## Completion evidence requirements

Record TASK-0253/TASK-0254 commits, final validation results and test count, final CI run/job IDs, release URL/assets/attestations, three-platform published smoke, V100-09 decision/evidence, local/origin HEAD, clean-tree result, and prohibited-action confirmations.

## Completion notes

Status: `PLANNED / SUCCESS-ONLY AFTER TASK-0253`.
