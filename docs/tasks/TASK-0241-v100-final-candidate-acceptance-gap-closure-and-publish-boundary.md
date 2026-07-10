# TASK-0241: V100 final-candidate acceptance gap closure and publish boundary

## Status

Completed and hosted-verified. Final candidate accepted; publication remained a separate TASK-0242 boundary.

## Purpose

Evaluate every V100 gap against the exact TASK-0239 candidate and TASK-0240 hosted evidence, record maintainer-authorized conditional acceptance only where done criteria pass, and stop at the separate publication authorization boundary.

## Entry state

- Candidate: `1.0.0-rc.1` at exact TASK-0239 hosted SHA `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`.
- Predecessor: published immutable `0.2.0-alpha.4`.
- TASK-0240 must report successful three-OS hosted RC evidence for that exact SHA.
- TASK-0240 and TASK-0241 diffs from the hosted candidate must remain documentation/evidence/governance-only.

## Dependencies

- TASK-0239 complete and exact candidate standard CI green.
- TASK-0240 successful and committed locally.
- Maintainer authorization in the controlling objective to record final candidate acceptance when exact criteria pass.

## Scope

- Verify the hosted-candidate-to-HEAD bridge contains no source/test/script/workflow/package/version/schema/fixture changes.
- Evaluate V100-01 through V100-12 individually and close only gaps with complete local and hosted evidence.
- Preserve V100-06 closure; retain V100-09 open pending publish-path provenance; keep V100-11 deferred and V100-12 at its current screenshot/docs-site status.
- Record `CONDITIONAL GO` only if all P0 and all targeted non-V100-09 P1 criteria pass.
- Run the final local validation suite once, create the separate TASK-0241 docs commit, then push TASK-0240 and TASK-0241 together once.
- Wait once for final standard CI and verify clean synchronized state.

## Out of scope

- Creating TASK-0242, publishing NuGet, dispatching `release.yml`, creating/moving a tag, creating/editing a GitHub Release, or claiming publish provenance.
- GA readiness or `1.0.0-rc.1` published claims.
- Any implementation or candidate metadata change after hosted evidence.

## Planned files

- this task file
- `docs/V100_GAP_ANALYSIS.md`
- `docs/MAINTAINER_RC_DECISION.md`
- hosted/release validation, blocker/decision, roadmap/queue/index, and handoff documents requiring final-state reconciliation

## Implementation sequence

1. Bind the bridge review to the exact TASK-0239 hosted SHA and reject any prohibited post-candidate change.
2. Reconcile V100-01 through V100-12 one by one using actual local/hosted evidence and the controlling done criteria.
3. Record the exact maintainer decision and publication boundary without overstating provenance or GA readiness.
4. Complete the final local validation, Unicode temp guard, Markdown/hygiene, and candidate-version checks once.
5. Complete this task and create `docs: accept TASK-0241 V100 release candidate` as a separate local commit after TASK-0240.
6. Protect against remote advance, push both docs commits once, wait for three final standard workflows once, and verify clean local/origin state.

## Data/database impact

None.

## Admin impact

None.

## Security impact

Final security/supply-chain decisions remain evidence-bound. V100-09 stays open until the authorized OIDC publish path creates and verifies exact package/release attestation.

## Permission/auth impact

Normal final `master` push is authorized after validation. No settings, collaborator, security, secret, variable, environment, ruleset, or publication permission changes.

## SEO/i18n impact

Final localization contract evidence is accepted only if EN/TR and JSON-invariance gates pass. Public docs continue to distinguish the published alpha4 from the prepared RC candidate.

## UX impact

None; this task is documentation/evidence/governance-only and accepts the already frozen CLI contract.

## Logging/audit impact

Records exact candidate/run/CI IDs and gap decisions. No private logs, temp paths, secrets, or generated artifacts are committed.

## Release impact

May establish `CONDITIONAL GO FOR A SEPARATELY AUTHORIZED PUBLISH TASK`. It does not authorize or perform publication, tag/release creation, or provenance completion.

## Acceptance criteria

1. Candidate bridge is docs/evidence/governance-only and `git diff --check` passes.
2. V100-01 through V100-05 close only with their exact candidate criteria; V100-06 remains closed.
3. V100-07, V100-08, and V100-10 close only with exact three-OS/contract evidence.
4. V100-09 remains `OPEN_PENDING_PUBLISH_PATH_PROVENANCE`; V100-11 and V100-12 retain their authorized status.
5. If evidence supports it: open P0 gaps are 0 and decision is `CONDITIONAL GO`, publication authorized `No`.
6. Full final local validation passes with source reporting `1.0.0-rc.1` and no tracked `.ackit/` files.
7. TASK-0240 and TASK-0241 are separate local commits, pushed together once.
8. Final `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` succeed for final HEAD; local/origin are equal and the tree is clean.
9. No publication, tag, GitHub Release, release workflow, upload, settings, or provenance action occurs.

## Validation commands

Use the exact bridge review, focused/full local validation, Unicode guard, pre-push protection, final blocking CI, and final-state commands in the controlling objective. Do not duplicate long-running commands or poll Actions.

## Risks

- Governance text may close a gap without exact evidence. Mitigation: retain any unsupported gap open and report NO-GO if necessary.
- Evidence could become stale through a prohibited post-candidate change. Mitigation: enforce path-based bridge review before acceptance.
- Final docs commit may break documentation gates. Mitigation: run the final suite and tracked/untracked/links checks before commit and final standard CI after push.

## Rollback plan

Before push, normally revert/correct the relevant local docs commit. After push, create a corrective commit; never rewrite history. Candidate/package rollback is unnecessary because nothing is published.

## Completion-state requirements

- Three task commits, two push events, one manual RC dispatch, both standard-CI rounds, exact hosted evidence, final gap matrix, and maintainer decision are available for the Turkish final report.
- Stop at `TASK-0242: Authorized 1.0.0-rc.1 OIDC publication and provenance verification` with `PUBLISH AUTHORIZATION REQUIRED`; do not create or execute TASK-0242.

## Completion notes

TASK-0241 acceptance was recorded on 2026-07-10 from exact candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b` and hosted run `29118452246`:

- the candidate-to-TASK-0240 bridge contains documentation/evidence/governance paths only and passes `git diff --check`
- V100-01 through V100-05 close from exact local/standard/hosted evidence and explicit acceptance; V100-06 remains closed
- V100-07 closes after three-OS time/memory thresholds and local interruption/unreadable-file evidence review
- V100-08 closes after exact-candidate Windows/Ubuntu/macOS confirmation under the unchanged .NET 10 support policy
- V100-10 closes after exact-candidate localization parity and JSON-invariance evidence
- V100-09 remains `OPEN_PENDING_PUBLISH_PATH_PROVENANCE`; author signing and SBOM accepted-risk dispositions remain active
- V100-11 remains deferred post-V100; V100-12 retains the sanitized screenshot and deferred docs-site/GitHub Pages state
- open P0 gaps are 0 and the decision is `CONDITIONAL GO FOR A SEPARATELY AUTHORIZED PUBLISH TASK`
- publication authorized: No
- final source CLI reports `AgentContextKit 1.0.0-rc.1`; Release build passed with 0 warnings/0 errors; tests passed 431/431; Windows Unicode temp guard remained 0 before/after
- all V100/docs/CLI/config/JSON/localization/RC-readiness gates passed after retaining the required historical freeze markers; the final successful RC-gate benchmark was 5.342 seconds / 44.5 MiB
- final Markdown audit covered 428 files and 231 local targets with zero broken targets; diff/bridge checks pass and no `.ackit/` file is tracked

The acceptance commit `b1fae4d18ce738be6a8679abd7333f95e044e3a6` remained documentation/evidence/governance-only. TASK-0240/TASK-0241 were pushed together; final runs `29119747553` (`ci`), `29119747558` (`cross-platform-smoke`), and `29119747534` (`cross-platform-source-smoke`) passed for exact acceptance HEAD. TASK-0241 completed with a clean synchronized tree. TASK-0242 was not created or executed until separate explicit authorization arrived on 2026-07-11.
