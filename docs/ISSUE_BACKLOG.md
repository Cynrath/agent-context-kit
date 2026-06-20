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

## Maintainer Action Required
GitHub issue creation is remote-write. Create issues manually when ready; do not create them from an agent session without explicit approval.
