# V100 Final-Candidate Local Source Selection

## Selection

Selection date: 2026-07-10.

| Field | Value |
| --- | --- |
| Source-impacting local evidence base | `b1604ae1e73017521d28e5a83f328bb1347406b6` |
| Commit title | `test: expand TASK-0233 V100 resource evidence` |
| Current source/package metadata | `0.2.0-alpha.4` |
| Hosted predecessor input | Published immutable `0.2.0-alpha.3` |
| Release version selected | None |
| Publication authorized | No |
| Final-candidate acceptance | Pending |

This record selects the last planned source/script/test-impacting commit in the TASK-0232–0238 safe/local chain as the local V100 evidence base. It does not create a new package version, reuse or replace the published alpha4 package, approve a release candidate, dispatch a workflow, or authorize publication.

## Source-Impact Review

TASK-0233 changed the performance benchmark and added focused resource-evidence tests:

- `scripts/measure-scan-performance.ps1`;
- `tests/AgentContextKit.Tests/PerformanceResourceEvidenceTests.cs`.

The same commit updated only supporting V100 performance, task, queue, release-evidence, and handoff documentation. The source-impacting behavior is the mixed-corpus/time/peak-working-set/interruption benchmark contract plus unreadable-file test coverage.

TASK-0234 through TASK-0238 are constrained to contract preparation, hosted-input documentation, source-of-truth synchronization, and final evidence/closeout. If any later task changes source, test behavior, scripts, package metadata, or workflows, this selection must be reopened and moved to the later source-impacting commit.

## Input Validation

The local input checker passed for:

```text
CommitSha: b1604ae1e73017521d28e5a83f328bb1347406b6
CandidateVersion: 0.2.0-alpha.4
PredecessorVersion: 0.2.0-alpha.3
Result: PASS
```

The `0.2.0-alpha.4` value is current source metadata used by the hosted evidence workflow to build a run-unique local candidate package such as `0.2.0-alpha.4.ci.<run-id>`. It is not a new release version and must not be published over the immutable alpha4 package.

## Docs-Only Bridge Policy

The manual hosted workflow requires `commit_sha == HEAD == origin/master`. Therefore the future dispatch must use the final pushed HEAD, not the pre-push local SHA above. The final HEAD may be treated as a docs/evidence/governance-only successor to `b1604ae1e73017521d28e5a83f328bb1347406b6` only if final diff review proves that no later source, script, test, workflow, package metadata, or version file changed.

Required final bridge review:

```powershell
git diff --name-status b1604ae1e73017521d28e5a83f328bb1347406b6..HEAD
git diff --check b1604ae1e73017521d28e5a83f328bb1347406b6..HEAD
```

## Status

```text
LOCAL_SOURCE_BASE_SELECTED
NO_VERSION_SELECTED
NO_PUBLICATION_AUTHORIZED
OPEN_PENDING_FINAL_CANDIDATE_ACCEPTANCE
OPEN_PENDING_HOSTED_RC_EVIDENCE
```

The first remaining remote authorization boundary after the safe/local chain is manual `release-candidate-evidence.yml` dispatch for the final pushed HEAD.
