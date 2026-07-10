# CodeQL And Code Scanning Decision

## Decision
GitHub Code Scanning and SARIF upload remain documentation-only by default.

AgentContextKit can generate SARIF locally with:

```powershell
ackit sarif --output .ackit/reports/ackit.sarif
```

The published `0.2.0-alpha.4` NuGet package includes this command.

## Rationale
- AgentContextKit is offline-first and local-only by default.
- SARIF is a public repository integration surface when uploaded to GitHub Code Scanning.
- Upload workflows require explicit `security-events: write` permission.
- Maintainers should review generated SARIF before enabling upload.
- The current SARIF writer omits raw scanner match values and uses repository-relative paths, but uploaded findings can still affect public security workflow expectations.

## Current State
- Active workflows do not upload SARIF.
- `docs/examples/github-actions-sarif-upload.yml` is documentation-only.
- CodeQL is not enabled as a required hosted workflow.
- `ackit sarif` output is local-only by default and ignored when written under `.ackit/`.
- The recommended first opt-in workflow design is documented in `docs/SARIF_UPLOAD_WORKFLOW_DESIGN.md`.

## Future Opt-In Criteria
Enable Code Scanning only after a maintainer decides:
- Code Scanning alerts should be part of the project workflow.
- `security-events: write` permission is acceptable.
- The generated SARIF artifact has been reviewed.
- Alert ownership and triage expectations are clear.
- False-positive handling is documented.

## Non-Goals
- No automatic SARIF upload.
- No GitHub Code Scanning activation in local docs tasks.
- No branch protection or required check changes.
- No remote repository setting changes.

## Safe Manual Path
1. Generate SARIF locally.
2. Review that paths are repository-relative.
3. Confirm no raw secrets, local paths, private usernames, or customer data appear.
4. Review `docs/SARIF_UPLOAD_WORKFLOW_DESIGN.md` and copy the example workflow into `.github/workflows/` only after maintainer approval.
5. Add `security-events: write` intentionally.
6. Watch the first run and triage alerts.

## Maintainer Action Required
Code Scanning upload activation is a remote-write and repository-permission decision. It must remain maintainer-only.
