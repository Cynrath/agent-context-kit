# Drift Findings

Deterministic, machine-checkable workflow drift detection (ADR-0025/0026).
Drift findings make only structural claims — "the code violates the spirit of
the spec" belongs to the independent verifier, never to this engine.

## Commands

```
ackit drift check TASK-0007 [--ci] [--json]
ackit drift check-active [--ci]     # gates the single active workflow task
```

`--ci` exits 1 when blocking findings exist (0 clean, 1 blocking, 2 usage, 3
environment). `drift check-active` is the managed pre-commit entry: without an
active workflow task it is a clean no-op (legacy repositories see no change).

## Finding codes

| Code | Severity | Meaning |
|---|---|---|
| `UNPLANNED_FILE_CHANGE` | warning (quick/standard) · blocking (high-risk) | A changed/untracked file is outside the task's declared `## Affected files` scope. Declared-scope-first updates never trigger it. `.ackit/**` state and `docs/tasks/**` churn are excluded. |
| `MISSING_REQUIRED_ARTIFACT` | blocking | A workflow-required artifact (intent/spec/plan/evidence/verdict) does not exist for the current stage. |
| `WORKFLOW_STAGE_INVALID` | blocking | The recorded stage is not part of the task's profile. |
| `ACCEPTANCE_CRITERIA_UNVERIFIED` | blocking | A registry criterion is not verified (implementation ≠ verified). |
| `MISSING_VERIFIER_VERDICT` | blocking | A non-quick profile requires an independent verdict and none is registered. |
| `STALE_CHECKPOINT` | warning | The latest checkpoint's recorded git state no longer matches reality (see `docs/concepts/checkpoints.md`). |
| `PLAN_REFERENCE_MISSING` | warning | A declared spec/decision/plan reference does not exist on disk. |
| `TASK_DEPENDENCY_NOT_SATISFIED` | blocking | A dependency task is not completed. |

Findings are ordered deterministically (code → task → detail) and severities
are fixed per code. The completion gate composes the blocking findings for
workflow-enabled tasks.
