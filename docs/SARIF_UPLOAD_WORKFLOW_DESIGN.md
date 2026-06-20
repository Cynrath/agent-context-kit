# SARIF Upload Workflow Design

## Status
Documentation-only design. No active Code Scanning workflow is installed.

## Recommended First Opt-In
Use one manual `workflow_dispatch` job that installs the current published package, generates SARIF, validates the JSON document, and uploads it with job-level permissions.

This is preferred over an automatic push or pull-request trigger for the first opt-in because it limits unexpected uploads while maintainers learn the alert and triage behavior.

## Workflow Shape
1. Trigger manually with `workflow_dispatch`.
2. Use `ubuntu-latest` for the first integration.
3. Grant only:
   - `contents: read`
   - `security-events: write`
4. Install the pinned published package `AgentContextKit` `0.2.0-alpha.3`.
5. Run `ackit sarif --output .ackit/reports/ackit.sarif`.
6. Parse the file with PowerShell `ConvertFrom-Json`.
7. Upload only the SARIF file with `github/codeql-action/upload-sarif`.
8. Do not upload `.ackit/` as a general artifact.

The copy-ready documentation example is `docs/examples/github-actions-sarif-upload.yml`.

## Why Published Package First?
- It matches what users install from NuGet.
- It avoids packing and installing unreviewed source in the first upload integration.
- It keeps the workflow small and easier to audit.
- Source-package SARIF validation remains covered by local/source smoke flows without uploading results.

## Privacy Review
Before activation, verify:
- SARIF artifact URIs are repository-relative.
- Result messages contain no raw matched secret values.
- No local usernames, machine names, drive paths, home paths, private emails, or customer data appear.
- Only `.ackit/reports/ackit.sarif` is uploaded.
- Workflow logs do not print sensitive repository content.

## Permission Review
`security-events: write` should be scoped to the upload job, not set repository-wide or on unrelated workflows.

Do not add write permissions for contents, issues, pull requests, packages, or actions.

## Trigger Expansion
After successful manual runs and clear alert ownership, a maintainer may consider:
- scheduled scans;
- pushes to `master`;
- pull-request scans where GitHub permission behavior is understood.

Automatic triggers are intentionally outside the first opt-in design.

## Failure Handling
- Generation failure: fix the scanner invocation or package installation before upload.
- Parse failure: do not upload; inspect the local SARIF shape.
- Permission failure: review repository Code Scanning availability and job permissions.
- Unexpected public alert: disable/remove the active workflow and review the uploaded result data.

## Rollback
If an activated workflow causes noise or exposes unexpected metadata:
1. Disable or remove the active workflow with a maintainer-controlled commit.
2. Revoke unnecessary workflow permissions.
3. Review and dismiss alerts with accurate reasons.
4. Keep local `ackit sarif` generation available; disabling upload does not require a package rollback.

## Maintainer Action Required
Copying the example into `.github/workflows/`, granting `security-events: write`, running the upload, and managing alerts are remote-write actions and require explicit maintainer approval.
