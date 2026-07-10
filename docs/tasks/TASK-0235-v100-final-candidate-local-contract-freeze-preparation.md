# TASK-0235: V100 final-candidate local contract freeze preparation

## Purpose

Refresh the conditional contract-freeze package against the selected local source base and the maintainer-authorized V100 target contract, while keeping final-candidate acceptance and publication explicitly pending.

## Verified starting state

- The freeze document still describes alpha3 preparation and older test/hosted evidence.
- CLI/JSON/schema/localization gates pass against alpha4 source per TASK-0230.
- TASK-0232 records the current shipped/documented surface as the V100 target contract.

## Dependencies

- TASK-0234 exact local source selection record.

## Scope

- Update `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md` to current alpha4/local-source truth.
- Update CLI/JSON/schema contract docs where necessary to state the V100 stability boundary, including rule/diagnostic IDs, exit semantics, SARIF profile, and language-independent technical tokens.
- Record a local contract review matrix and exact validation evidence.
- Keep V100-02 `OPEN_PENDING_FINAL_CANDIDATE_ACCEPTANCE`.

## Out of scope

- Any command/option/schema behavior change.
- Final maintainer GO, hosted evidence, version bump, publish, tag, or release.

## Planned files

- `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md`
- `docs/CLI_CONTRACT.md`
- `docs/JSON_OUTPUT.md`
- `docs/schemas/README.md`
- `docs/V100_GAP_ANALYSIS.md`
- this task file and active queue/handoff state

## Implementation steps

1. Replace stale current-state freeze text while retaining historical evidence labels.
2. Enumerate the authorized machine-readable stability surface.
3. Bind the local review to the TASK-0234 selected source base.
4. Run CLI/config/JSON/localization/V100 documentation gates.
5. Record local preparation complete and final acceptance pending.

## Data/database impact

None.

## Admin impact

None.

## Security impact

Positive contract clarity; no runtime or remote security control change.

## Permission/auth impact

None.

## SEO/i18n impact

Localized human text remains free to differ; technical tokens and machine-readable contracts stay language-independent.

## Logging/audit impact

Adds dated local contract-review evidence.

## Acceptance criteria

1. Freeze status reflects alpha4/current source and the exact selected local base.
2. Commands/options, JSON fields/schemas, command identifiers, diagnostic/rule IDs, exit semantics, and SARIF expectations are explicit.
3. Localized human text is explicitly excluded from byte-for-byte stability.
4. All focused contract/localization gates pass.
5. V100-02 remains open pending final-candidate acceptance.
6. One local commit contains this task only.

## Validation commands

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-config-generated-conventions.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-json-contract-assets.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-v100-documentation-release-gates.ps1 -FailOnIssues
git diff --check
```

## Risks

- Presenting preparation as acceptance. Mitigation: preserve exact open status and remote boundary.
- Omitting a machine-readable contract family. Mitigation: mirror CLI/JSON/schema/SARIF/rule/diagnostic/exit sources and gate them.

## Rollback plan

Revert the TASK-0235 commit; no runtime or remote rollback is needed.

## Completion-state requirements

- Actual gate results and commit are recorded.
- TASK-0236 becomes current.

## Completion notes

Completed on 2026-07-10.

- Refreshed the conditional local freeze from stale alpha3 preparation text to current alpha4/source-base truth.
- Bound local preparation to `b1604ae1e73017521d28e5a83f328bb1347406b6` and the docs-only bridge policy.
- Explicitly included commands/options, JSON fields/schemas, command/status identifiers, rule/diagnostic IDs, exit semantics, SARIF expectations, and localization technical-token invariance.
- Updated CLI, JSON, schema-catalog, and V100 references without changing runtime behavior.
- Focused validation passed: CLI contract, config/generated conventions, JSON contract assets, localization parity, V100 documentation/release gates, and `git diff --check`.
- V100-02 remains `MAINTAINER_DECISION_RECORDED / LOCAL_FREEZE_PREPARED / OPEN_PENDING_FINAL_CANDIDATE_ACCEPTANCE`.
- No version, package, tag, release, workflow, remote state, or final acceptance changed.

Commit: `683eec7`. The next task is TASK-0236.
