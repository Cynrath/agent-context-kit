# V100 Final-Candidate Selection

## Selection

Selection date: 2026-07-10. Selected by TASK-0239.

| Field | Value |
| --- | --- |
| Candidate version | `1.0.0-rc.1` |
| Published predecessor | Immutable `0.2.0-alpha.4` |
| Exact candidate commit | The TASK-0239 commit; captured after commit creation and used unchanged by TASK-0240 |
| Prior local evidence base | `b1604ae1e73017521d28e5a83f328bb1347406b6` |
| Publication authorized | No |
| Final-candidate acceptance | Pending TASK-0240 hosted evidence and TASK-0241 decision |

This record selects a real successor version rather than reusing the published alpha4 metadata. It does not publish NuGet, create/move a tag, create/edit a GitHub Release, dispatch `release.yml`, or establish provenance.

## Candidate Scope

TASK-0239 is the source/workflow/test/package-metadata candidate boundary. It changes:

- source/package/runtime version reporting to `1.0.0-rc.1`;
- source-package smoke and manual RC defaults;
- exact alpha4 predecessor config fixture and compatibility coverage;
- read-only hosted CLI/config/JSON/localization gates and evidence markers;
- package/release plan, draft release body, changelog, and current candidate documentation.

No CLI command, option, exit, config schema, baseline fingerprint, JSON schema, SARIF profile, generated-file behavior, offline-first behavior, or localization technical token is intentionally changed.

## Exact Predecessor Config Evidence

Installed `AgentContextKit 0.2.0-alpha.4` generated `.ackit/config.yml` twice in a disposable Git repository with `ackit init --lang tr`. The second invocation skipped the existing file and the SHA-256 remained `4BB20E4CC303D6E288AA4BF6DB2D4847CC76D505E8A1E2DE7FC4716D6D1799BC` on the local Windows evidence host.

The sanitized generated content is frozen at `tests/fixtures/upgrade/v0.2.0-alpha.4-config.yml`. The alpha1 fixture remains historical regression coverage. The hosted workflow regenerates the alpha4 config with the installed predecessor, compares normalized content with the exact fixture, and then verifies candidate config hash immutability and `config-check` behavior.

## Candidate Input Contract

```text
CandidateVersion: 1.0.0-rc.1
PredecessorVersion: 0.2.0-alpha.4
CommitSha: exact TASK-0239 full SHA after commit/push
Required relation: CommitSha == HEAD == origin/master
```

The hosted workflow creates a local run-unique package `1.0.0-rc.1.ci.<run-id>`. It cannot upload or publish that package.

## Post-Candidate Bridge Policy

TASK-0240 and TASK-0241 must remain documentation/evidence/governance-only. Before final acceptance:

```powershell
git diff --name-status <TASK-0239-candidate-sha>..HEAD
git diff --check <TASK-0239-candidate-sha>..HEAD
```

Any post-candidate production source, test, script, workflow, package/version metadata, schema, or behavioral fixture change invalidates TASK-0240 evidence and requires a new candidate SHA and hosted run.

## Status

```text
CANDIDATE_VERSION_SELECTED
EXACT_PREDECESSOR_SELECTED
LOCAL_PREPARATION_IN_PROGRESS
OPEN_PENDING_HOSTED_RC_EVIDENCE
OPEN_PENDING_FINAL_CANDIDATE_ACCEPTANCE
PUBLICATION_NOT_AUTHORIZED
```

Publication is prohibited through TASK-0241. A later TASK-0242 requires separate explicit authorization.
