# TASK-0240: V100 1.0.0-rc.1 hosted RC evidence execution and recording

## Status

Planned; depends on TASK-0239 candidate push and exact-SHA standard CI success.

## Purpose

Use the single authorized manual dispatch of `release-candidate-evidence.yml` to validate the exact pushed `1.0.0-rc.1` candidate against published predecessor `0.2.0-alpha.4` on Windows, Ubuntu, and macOS, then record only evidence actually returned by that run.

## Entry state

- Candidate version: `1.0.0-rc.1`.
- Published predecessor: `0.2.0-alpha.4`.
- Candidate SHA: exact TASK-0239 commit, to be recorded after creation and push.
- Local HEAD and `origin/master` must match; working tree must be clean; the three standard candidate workflows must be green.

## Dependencies

- TASK-0239 complete, pushed, synchronized, and standard-CI green.
- Candidate-input validation passes with `-RequireOriginMaster`.
- The user authorizes exactly one dispatch for the prepared candidate SHA.

## Scope

- Validate exact SHA/version/predecessor inputs before dispatch.
- Dispatch `release-candidate-evidence.yml` once for the exact TASK-0239 SHA.
- Discover with at most one retry, watch once, view once, and download logs once using the prescribed blocking sequence.
- Record run/job IDs, conclusions, exact versions/SHA, test count, config/hash/baseline/JSON/SARIF/localization/contract/performance/memory/scan evidence, and disabled upload/publication state.
- Update hosted evidence, validation, V100, decision, queue, and handoff documentation.
- Create a local docs/evidence commit named `docs: record TASK-0240 hosted RC evidence`; do not push it yet.

## Out of scope

- Automatic rerun of a failed workflow, a second dispatch for the same SHA, or reuse of superseded evidence.
- Source, test, script, workflow, package/version metadata, schema, or behavioral fixture changes after hosted evidence.
- NuGet publish, release workflow dispatch, tag/GitHub Release/provenance creation, settings/permissions/secrets changes, or uploads.

## Planned files

- this task file
- `docs/RC_HOSTED_EVIDENCE.md`
- `docs/HOSTED_VALIDATION_STATUS.md`
- `docs/RELEASE_CANDIDATE_EVIDENCE.md`
- `docs/RELEASE_VALIDATION.md`
- `docs/V100_GAP_ANALYSIS.md`
- `docs/MAINTAINER_RC_DECISION.md`
- `docs/NEXT_TASKS.md`
- `docs/PROJECT_EXECUTION_QUEUE.md`
- `.codex/SESSION_HANDOFF.md`
- `.codex/CONTEXT_PACK.md`
- `.codex/NEXT_STEPS.md`

## Implementation sequence

1. Confirm clean/synchronized exact candidate state and pass candidate-input validation.
2. Record dispatch start time and perform the one authorized workflow dispatch.
3. Use the one prescribed discovery/watch/view/log block and wait for completion.
4. If successful, extract values without invention and mark unavailable fields explicitly.
5. If failed, do not rerun automatically; classify from the one downloaded log. A source correction creates a new candidate SHA and requires a separately justified new-SHA run under the controlling failure policy.
6. Update evidence and handoff documents, complete this task, verify docs-only diff, and create the TASK-0240 commit without pushing.

## Data/database impact

None.

## Admin impact

None.

## Security impact

The authorized workflow remains read-only and synthetic/local in its data handling. No secret, package, artifact, or SARIF upload is permitted.

## Permission/auth impact

Uses existing maintainer workflow-dispatch authority once. No GitHub permission, environment, secret, variable, or authentication configuration changes.

## SEO/i18n impact

Records localization parity evidence only; does not change public published-version claims.

## UX impact

None; evidence-only after the exact candidate is frozen.

## Logging/audit impact

Records public Actions metadata and sanitized observed values. The downloaded log stays in a disposable temp path and is not committed.

## Release impact

Provides hosted RC evidence but does not authorize or perform publication and does not establish publish-path provenance.

## Acceptance criteria

1. Exactly one manual RC dispatch occurs for the exact TASK-0239 SHA.
2. The run completes successfully on Windows, Ubuntu, and macOS.
3. Exact candidate/predecessor, config/hash/check, baseline, JSON/SARIF, localization/contract, test, resource, and final scan evidence is recorded from actual logs.
4. Artifact upload, SARIF upload, NuGet publish, tag, GitHub Release, and release workflow actions are absent.
5. Status is `HOSTED_RC_EVIDENCE_PASS / EXACT_CANDIDATE_SHA_VERIFIED / PUBLICATION_NOT_AUTHORIZED`.
6. All post-candidate changes are documentation/evidence/governance-only.
7. One local TASK-0240 commit exists and remains unpushed until TASK-0241 is separately committed.

## Validation commands

Use the exact pre-dispatch, dispatch, and one blocking discovery/watch/view/log blocks from the controlling objective. Then run candidate-to-HEAD name-status/diff checks and documentation hygiene checks.

## Risks

- Runner/transient failure may consume the one run. Mitigation: never rerun automatically; classify the one log and stop on an external failure.
- Evidence extraction may omit values. Mitigation: mark unavailable data explicitly rather than infer it.
- Post-candidate implementation drift invalidates evidence. Mitigation: TASK-0240 and TASK-0241 accept docs/evidence/governance-only diffs.

## Rollback plan

Correct evidence with a normal follow-up docs commit. Hosted run history is immutable. Never delete/rerun the run or rewrite Git history.

## Completion-state requirements

- Run ID/URL, job IDs, exact candidate SHA, versions, observed metrics, and prohibited-action checks are available for TASK-0241 and the Turkish final report.
- TASK-0241 becomes current; publication remains unauthorized.

## Completion notes

Pending the exact TASK-0239 candidate and authorized hosted run.
