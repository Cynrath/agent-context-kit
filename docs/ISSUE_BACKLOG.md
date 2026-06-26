# Issue Backlog

This file is a copy-ready bootstrap backlog for GitHub issues. It does not create issues.

Apply labels from `docs/GITHUB_LABELS.md` manually after issue creation.

## Proposed Issues

### 1. Improve scanner config examples
- Labels: `type: docs`, `area: scanner`, `priority: medium`, `good first issue`
- Goal: Add safe `minimal`, `strict`, and `ci` config examples.
- Done when: Examples avoid real secrets, explain non-Critical allowlists, and are linked from configuration docs.

### 2. Add Code Scanning opt-in workflow
- Labels: `type: feature`, `area: ci`, `area: sarif`, `priority: medium`
- Goal: Design an opt-in workflow for SARIF upload after maintainer approval.
- Done when: Workflow is documented or added only after explicit approval with `security-events: write`.

### 3. Add JSON schema contract tests
- Labels: `type: maintenance`, `area: cli`, `priority: medium`
- Goal: Lock additive JSON output expectations with focused contract tests.
- Done when: Tests cover schema version, command metadata, finding `ruleId`, and summary fields.

### 4. Add CLI exit code reference tests
- Labels: `type: maintenance`, `area: cli`, `priority: medium`
- Goal: Harden documented exit code behavior.
- Done when: Tests cover scan, scan CI, redact-check, SARIF missing output, and invalid commands.

### 5. Add screenshot assets after sanitization
- Labels: `type: docs`, `area: docs`, `priority: low`
- Goal: Add public-safe README/Web UI preview images.
- Plan: Follow `docs/SCREENSHOT_CAPTURE_PLAN.md`; the capture plan is complete, but manual image capture and review remain open.
- Done when: Assets contain no local paths, usernames, machine names, secrets, private data, browser chrome, or retained metadata and are linked from both README files.

### 6. Add quickstart tutorial
- Labels: `type: docs`, `area: docs`, `priority: low`, `good first issue`
- Goal: Create a first-five-minutes tutorial for `ackit`.
- Status: Completed locally in `docs/FIRST_FIVE_MINUTES.md`.
- Done when: Tutorial uses the published `0.2.0-alpha.3` install command, a timestamped synthetic demo repository, and verified core commands.

### 7. Add docs site plan
- Labels: `type: docs`, `area: docs`, `priority: low`
- Goal: Decide whether GitHub Pages or another docs site is useful.
- Status: Planning completed in `docs/DOCS_SITE_PLAN.md`; Pages activation remains deferred and maintainer-only.
- Done when: A future activation task validates scope, hosting, navigation, accessibility, maintenance, base paths, and remote settings before enabling Pages.

### 8. Expand security fixture coverage
- Labels: `type: security`, `area: scanner`, `priority: medium`
- Goal: Add safe scanner fixtures for more risk patterns without using real secrets.
- Done when: Fixtures cover allowlisted noise, real-looking fake secrets, local paths, package artifacts, and expected severity.

### 9. Resolve post-alpha3 xUnit analyzer warnings
- Labels: `type: maintenance`, `area: tests`, `priority: medium`
- Status: Completed by TASK-0210.
- Goal: Remove hosted/local analyzer annotations `xUnit1051` and `xUnit2013`.
- Done when: `McpStdioTransportTests` uses `TestContext.Current.CancellationToken` for cancellable async calls, `WatchCommandTests` uses the xUnit-preferred collection-size assertion, and Release build/test pass without these analyzer warnings.

### 10. Classify current scan Medium/Low findings
- Labels: `type: maintenance`, `area: scanner`, `priority: medium`
- Status: Completed by TASK-0211.
- Goal: Classify `.remember` logs, retained alpha3 package-validation artifacts, and Low local-path findings as real cleanup work, accepted local artifact review findings, or false positives.
- Done when: A human-readable classification is recorded without auto-redaction, destructive artifact cleanup, or baseline acceptance.

### 11. Sync published-package workflow pin/status
- Labels: `type: maintenance`, `area: ci`, `priority: low`
- Status: Completed by TASK-0213.
- Goal: Decide whether `cross-platform-smoke.yml` should install published `AgentContextKit` `0.2.0-alpha.3` instead of the historical alpha2 pin.
- Done when: The workflow/status docs are intentionally aligned and focused workflow/static validation is recorded. Completed by updating the active workflow pin to `0.2.0-alpha.3`, preserving historical alpha2 evidence, recording local validation in TASK-0213, and recording hosted push-run evidence in TASK-0214.

### 12. Decide memory-log retention policy
- Labels: `type: maintenance`, `area: scanner`, `priority: medium`
- Status: Completed by TASK-0212.
- Goal: Decide whether ignored `.remember` memory/autonomous logs should remain local-only, be cleaned from workspaces, or receive explicit documentation/ignore treatment after TASK-0211 classified them as `MEMORY_LOG_REVIEW`.
- Done when: The retention decision is recorded, any cleanup is non-destructive and scoped, package-validation artifacts remain protected as release evidence unless policy changes, and `ackit scan --ci` evidence is refreshed.

### 13. Review scan-scope policy for retained local artifacts
- Labels: `type: maintenance`, `area: scanner`, `priority: low`
- Goal: Decide whether retained ignored local release evidence should remain visible in repository self-scans or be handled through a narrow, auditable scan-scope policy.
- Done when: Any exclusion/suppression approach proves it cannot hide real secrets or release blockers, or the current visible-finding policy is explicitly retained.

### 14. Simplify queue docs and stale headings
- Labels: `type: docs`, `area: docs`, `priority: low`
- Status: Completed by TASK-0216.
- Goal: Reduce stale active-task headings and repeated historical queue text now that TASK-0214 verified the alpha3 published-package hosted smoke result.
- Done when: Queue/handoff docs point clearly at the next active task without removing required historical release evidence.

### 15. Investigate/fix Windows test-created Unicode temp directories (completed by TASK-0217)
- Labels: `type: maintenance`, `area: tests`, `priority: low`
- Status: Completed by TASK-0217. Root cause identified: `ProcessStartInfo.Environment["TMP"] = ""` on Windows creates garbled directory in repo root. Fix applied: removed TMP/TEMP/TMPDIR overrides from test. Pushed at `840c08f` with CI green.
- Done when: Root cause is identified and addressed. TASK-0217 fixed the single known occurrence.

### 16. Prepare 0.2.0-alpha.4 NuGet README rendering release (completed TASK-0218/0219)
- Labels: `type: release`, `area: packaging`, `priority: low`
- Status: Completed. TASK-0218 prepared source as `0.2.0-alpha.4` local candidate. TASK-0219 verified hosted RC evidence (run 28208545684) and recorded GO decision.
- Goal: Prepare but do not publish `AgentContextKit 0.2.0-alpha.4` to ship the dedicated `README.nuget.md` package README rendering fix.
- Done when: TASK-0215 infrastructure is used in an authorized package publish after hosted RC evidence passes.

### 17. Authorized 0.2.0-alpha.4 publish (completed)
- Labels: `type: release`, `area: packaging`, `priority: low`
- Status: Completed by TASK-0220. `AgentContextKit 0.2.0-alpha.4` published through OIDC release workflow on 2026-06-26. NuGet package, tag, and GitHub prerelease verified. Global tool install verified.
- Goal: Publish `AgentContextKit 0.2.0-alpha.4` through the OIDC release workflow after maintainer approval.
- Done when: NuGet publish succeeds, tag and GitHub Release created, global tool install verified.

### 18. Post-publish public README/docs sync to 0.2.0-alpha.4 (active)
- Labels: `type: release`, `area: docs`, `priority: low`
- Status: TASK-0222 active. TASK-0221 completed release recovery.
- Goal: Update public-facing README.md, README.tr.md, and public docs to reference `0.2.0-alpha.4` as the current published release.
- Done when: README.md and README.tr.md install commands and version references use `0.2.0-alpha.4`.

## Maintainer Action Required
GitHub issue creation is remote-write. Create issues manually when ready; do not create them from an agent session without explicit approval.
