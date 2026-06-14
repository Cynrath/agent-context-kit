# TASK-0135 Issue Template Version Placeholder Sync

## Purpose
Reflect the current published `v0.2.0-alpha.2` in the four GitHub issue template placeholders so that reporters see a consistent current version.

## Current State
- `v0.2.0-alpha.2` is the current published release from `f540479a92cbe66097f6796553828ee49ddd5512`.
- `.github/ISSUE_TEMPLATE/bug_report.yml`, `docs_improvement.yml`, `feature_request.yml`, and `security_hardening.yml` still show placeholder text `AgentContextKit 0.2.0-alpha.1`.

## Scope
- Update the four tracked GitHub issue template YAML files to use `0.2.0-alpha.2` in their `ackit version` field placeholders.

## Out Of Scope
- Editing any other YAML field, schema, body, or labels.
- Editing the published `0.2.0-alpha.2` package or workflow.

## Affected Files
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/docs_improvement.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`
- `.github/ISSUE_TEMPLATE/security_hardening.yml`

## Implementation
- Replace the exact placeholder string `AgentContextKit 0.2.0-alpha.1` with `AgentContextKit 0.2.0-alpha.2` in each file.
- Confirm that no other fields reference the version.

## Security/Privacy Boundary
None. Documentation-only.

## Compatibility
No runtime or API change.

## Database Impact
None.

## Admin Impact
None.

## Permission Impact
None.

## SEO/I18n Impact
None.

## Audit/Security Impact
Keeps public-facing issue intake consistent with the current published version.

## Acceptance Criteria
- All four issue templates show `0.2.0-alpha.2` as the placeholder version.
- `git diff` is limited to the four YAML files.
- `git diff --check` is clean.

## Tests
None. Pure text fix.

## Validation
- `git diff` review of the four files.
- `git diff --check` exit 0.
- Markdown link gate and scanner/doctor remain clean.

## Risks
None.

## Rollback
- Revert the single commit.

## Completion Evidence
Pending. Will be filled after the commit and hosted checks.

## Commit
- `docs: sync issue template version placeholders`

## Push
- Normal `master` push after validation.

## Hosted Checks
- Standard 8/8 expected.
