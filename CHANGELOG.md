# Changelog

All notable changes to AgentContextKit will be documented in this file.

This project follows Semantic Versioning where practical before `1.0.0`.

## [Unreleased]

### Security
- Added least-privilege GitHub artifact provenance for exact future release nupkg assets, with idempotent digest detection and CLI verification.
- Recorded bounded author-signing and SBOM deferrals without claiming controls that are not published.

### Planning
- Selected `0.2.0-alpha.3` as the smallest compatible next prerelease scope without changing package metadata or approving publication.

## [0.2.0-alpha.2] - 2026-06-13

### Added
- Added a dependency-free local Markdown-link gate with positive/negative smoke coverage and release-gate integration.
- Added manual exact-commit GitHub release automation with NuGet OIDC Trusted Publishing, scoped permissions, idempotent recovery, package inspection, and installed-tool smoke verification.
- Added table-driven scanner regression fixtures for secret, artifact, local-path, PII/brand noise, stable rule IDs, and Critical suppression boundaries.
- Added current-source sanitized suppression audit metadata for `safeDomains`, `ignoredPaths`, and `ignoredFindingIds` in human/JSON scan output.
- Added safe screenshot and docs-site planning plus first-five-minutes and existing-repository adoption tutorials.
- Added a versioned, sanitized baseline identity model with deterministic SHA-256 finding fingerprints and focused cross-platform normalization tests.
- Added report-only Core configuration validation with stable diagnostic codes for unknown, obsolete, duplicate, malformed, and unsafe settings.
- Added explicit sanitized baseline creation/update, integrity-checked loading, finding classification, and opt-in new-finding CI policy.
- Added additive baseline metadata to SARIF, HTML reports, Web UI, and their JSON command summaries.
- Added published-config and baseline-schema upgrade compatibility fixtures with focused tests.
- Added a disposable synthetic scan benchmark and release-candidate evidence gate.
- Added security response, support lifecycle, upgrade compatibility, performance, and supply-chain policy documents.
- Added read-only `ackit config-check` with sanitized human/JSON diagnostics, explicit warning/error exits, and manual obsolete-key migration guidance.
- Added a manual-only Windows/Ubuntu/macOS release-candidate evidence workflow design with isolated predecessor/source tools, config immutability, baseline/SARIF checks, and the synthetic performance tripwire.
- Added a normalized related-tools matrix, official-source evidence policy, privacy-first external workflow examples, no-dependency interoperability/command/import designs, external-tool threat model, and disposable lab plan.
- Added the authoritative no-network default policy, agent context pipeline taxonomy, docs toolchain decision, release blocker board, maintainer decision register, and planning-only alpha.2 refresh.

### Changed
- Scanner email, phone, and IP rules now evaluate all distinct candidates in each file; raw finding matches are omitted from human, JSON, and Web UI output while JSON keeps its compatible nullable field.
- Baseline-aware CI now treats severity escalation as a new finding without changing baseline schema or fingerprints.
- Config diagnostics reject unmatched quotes with sanitized `ACKITCFG006` output.
- Suppression audit records are deduplicated before human/JSON reporting.
- Polished README installed-tool and source command examples.
- Froze a compatibility-preserving `v0.2.0-alpha.2` hardening scope without changing version metadata.
- Reclassified historical v1.0 asset checks and added an explicit P0/P1/P2 1.0 readiness gap register.
- Migrated the test project from Legacy `xunit` `2.9.3` to xUnit v3 while preserving all 169 tests and clean dependency reviews.
- Added a conditional release-candidate contract freeze and explicit maintainer GO/NO-GO decision package without changing version or publishing.
- Added machine-readable command JSON, baseline, and SARIF profile schemas with sanitized golden fixtures and live-output contract tests.
- Added English/Turkish human-output, known-error, exit-code, and JSON semantic parity release gates across all language-aware commands.
- Added a metadata-only security/supply-chain evidence register, maintainer handoff, and local structure gate for private reporting, signing, SBOM, provenance, and package recovery decisions.
- Added a consolidated final RC local-readiness decision and read-only orchestration gate with an explicit remote NO-GO boundary.
- Added exact hosted CI/source/published smoke evidence for commit `37d5220` while preserving the unrun manual RC workflow blocker.
- Added read-only GitHub evidence that private vulnerability reporting is disabled, with explicit P0 enablement and notification-owner completion criteria.
- Added a read-only published package/release supply-chain audit covering NuGet repository signing, author-signature absence, owner-profile alignment, SBOM, provenance, and recovery evidence.
- Added an initial offline OSS ecosystem catalog, product positioning, external-tool workflow guidance, interoperability backlog, and split local-versus-maintainer execution queue without adding dependencies.

### Fixed
- Prevented `id-token: write`, escaped text ending in drive-like syntax, and plain numeric hosted run IDs from producing token/path/phone false positives.
- Made the local Markdown link gate compatible with Windows PowerShell 5.1, including repository-escape diagnostics.
- Run Markdown link release gates in isolated hosted `pwsh` child processes and preserve child output on fixture failures.
- Normalize Markdown targets as repository-relative path segments so Windows 8.3 temp paths cannot create false repository-escape failures.
- Use cross-platform `pwsh` for release-job preparation and published-package verification on Ubuntu.
- Make published-package verification choose a portable temporary directory and opt release actions into the Node.js 24 runtime.
- Made case-insensitive scanner regexes culture-invariant so ASCII token, email, domain, and local-path detection stays consistent under Turkish and other process cultures.
- Allowlisted Shields.io badge hosts and common `System.IO` namespace-shaped technical tokens to prevent culture-invariant self-scan noise.

### Release
- Published `AgentContextKit` `0.2.0-alpha.2` to NuGet through GitHub OIDC Trusted Publishing.
- Created exact tag `v0.2.0-alpha.2` at `f540479a92cbe66097f6796553828ee49ddd5512` and published the GitHub pre-release with validated package assets.

## [0.2.0-alpha.1] - 2026-06-11
### Added
- Added `ackit sarif` source command for SARIF 2.1.0 output.
- Added scanner rule catalog with stable `ACKIT` rule IDs.
- Added additive JSON `ruleId` field.
- Added config allowlist foundation: `safeDomains`, `ignoredPaths`, `ignoredFindingIds`.
- Added expanded scanner patterns.
- Added sample gallery and demo scenarios.
- Added Web UI preview and visual asset guidance.
- Added `ackit sarif --output <repo-relative.sarif>` documentation and GitHub Code Scanning readiness notes for the published `0.2.0-alpha.1` package.
- Added documentation-only GitHub Actions examples for scan CI, SARIF upload, published-tool smoke, and source-package smoke.
- Added GitHub Actions usage guidance for CI command order, privacy, failure interpretation, and SARIF upload decisions.
- Added sample repository gallery and demo scenario docs for onboarding.
- Added safe sample repositories for .NET console, generic empty repository health gaps, and security fixture wording.
- Added a local sample smoke helper script.
- Added a central scanner rule catalog with stable `ACKIT` rule IDs, default severity context, and SARIF help metadata.
- Added configurable `safeDomains`, `ignoredPaths`, and `ignoredFindingIds` scanner allowlist fields for narrow non-Critical noise suppression.
- Added scanner coverage for additional package artifacts, provider-token-like values, bearer token-like values, and Unix home path leakage.

### Changed
- Published NuGet `0.2.0-alpha.1` now includes `ackit sarif`.
- JSON finding objects now include additive `ruleId` metadata.
- SARIF rule metadata now uses the centralized scanner rule catalog.
- Scanner documentation and security model are updated for v0.2.0-alpha.

### Security
- Critical findings cannot be silently suppressed by config allowlist.
- SARIF output avoids raw secret matches and absolute local paths.

## [0.1.0-alpha.2] - 2026-06-05
### Added
- Added a cross-platform source smoke workflow that packs the current branch and installs `AgentContextKit` `0.1.0-alpha.2` from a temporary local package source on Windows, Ubuntu, and macOS.
- Added alpha.2 hardening tasks for scanner noise reduction, GitHub Actions Node 24 readiness, Turkish CLI output polish, and release preparation.
- Published `v0.1.0-alpha.2` on GitHub and NuGet and verified global tool installation.

### Changed
- Reduced scanner noise with a conservative safe technical domain allowlist and fixture-only placeholder email handling.
- Added safe technical allowlist coverage for common platform/package domains while preserving Critical secret detection.
- Reduced fixture placeholder noise without suppressing real source/docs email or secret findings.
- Prepared GitHub Actions workflows for Node 24-ready official action majors and explicit Windows runner labeling.
- Polished Turkish human CLI output while preserving JSON schema fields.
- Bumped source/package metadata and CLI runtime version to `0.1.0-alpha.2`.
- Updated the published-package smoke workflow to install `AgentContextKit` `0.1.0-alpha.2`.
- Recorded successful cross-platform GitHub Actions smoke validation for the published NuGet global tool.
- Synced post-push GitHub release status docs after `master` and `v0.1.0-alpha.1` were pushed.
- Verified NuGet publication and global tool install for `AgentContextKit` version `0.1.0-alpha.1`.
- Verified NuGet global tool smoke test in a clean demo app.

## [0.1.0-alpha.1] - 2026-06-04
### Added
- Initial offline-first .NET CLI tool package with command name `ackit`.
- CLI commands: `init`, `scan`, `scan --ci`, `report`, `webui`, `prompt-pack`, `context-export`, `generate`, `task`, `redact-check`, `doctor`, `version`, and `help`.
- Repository scanner for docs, tests, CI, Docker, generated agent files, package metadata, and stack signals.
- Sample-aware main stack detection for `.NET`, `.NET CLI / .NET Tool`, and `GitHub Actions` without treating `samples/` stacks as the main product stack.
- Pattern-based secret, PII, brand, risky path, and risky extension scanning.
- JSON output with schema/tool metadata, generated timestamps, repository metadata, summaries, and CI mode fields.
- Task-first development document generation under `docs/tasks`.
- Agent instruction generation for Codex, Claude, Cursor, and GitHub Copilot.
- Offline static HTML report generation with safe repository-relative output handling.
- Offline static Web UI prototype generation for local scan review.
- Local-only dry-run prompt pack generation and explicit-approval context export manifests.
- English and Turkish output/template foundation.
- Config schema documentation and generated-file conventions.
- Focused xUnit test coverage and GitHub Actions CI.
- Local release verification, package metadata, public release audit, release blocker, public gate, and v1.0 readiness scripts.
- v1.0 final local readiness review documentation and gate script.
- Source archive hygiene docs and WinRAR exclude guidance for local ZIP/RAR sharing.
- OSS readiness, governance, privacy, support, security, package, release, and maintainer handoff documentation.

### Changed
- Public package and docs metadata use the `Cynrath` persona.
- Package URLs point to `https://github.com/Cynrath/agent-context-kit`.
- Public release blockers track the completed GitHub Release and NuGet publication state, with Codex for OSS submission as the remaining follow-up.

### Fixed
- Added NuGet package README metadata for local pack readiness.
- Refined self-scan stack accuracy so sample ASP.NET Core, Minimal API, TypeScript, and Tailwind CSS signals are not reported as the main repository stack.
