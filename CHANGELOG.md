# Changelog

All notable changes to AgentContextKit will be documented in this file.

This project follows Semantic Versioning where practical before `1.0.0`.

## [Unreleased]

### Added
- Added a dedicated pure-Markdown `README.nuget.md` package README and package metadata wiring so nuget.org does not render GitHub README HTML as raw text.
- Added agent-facing documentation for the split between GitHub `README.md` and NuGet `README.nuget.md` ownership.
- Added two new stable scanner rule IDs: `ACKIT006` `ProductionConfigLike` (High) for production configuration, environment-specific appsettings, and live-service connection strings, and `ACKIT007` `DocumentationGap` (Medium) for documentation gaps surfaced by the scanner. Existing `ACKIT001` and `ACKIT005` descriptions were narrowed to reflect the new dedicated rules.
- Added an `Ackit006Ackit007EndToEndTests` coverage class that exercises the Core `RepositoryScanner` on a synthetic `appsettings.Production.json` fixture, asserts the new `ACKIT006` ruleId flows into JSON and the redact-check filter, asserts the catalog mapping for `ACKIT007`, and asserts the SARIF rule catalog advertises the new ID.

### Vibe-Feature Local Product Continuation Batch
PROJECT-CONTROL-0108 planning commit `08442c0` opens the new control after PROJECT-CONTROL-0107 closed TASK-0159 through TASK-0167 with 257/257 local tests green. The new batch targets additive `generate` targets for Anthropic CLI and Continue (Tier 1), a safe local `ackit hooks` command (Tier 1), read-only `ackit diff` for baselines (Tier 2), deterministic `ackit trim --max-chars` (Tier 2), a design-driven `ackit watch` mode (Tier 2), a conservative high-entropy scanner rule research (Tier 2), and design-only `ackit mcp --stdio` (Tier 2+). No release, tag, NuGet publication, secret, or model-name disclosure is part of this batch.

### Local-Only Extension Batch
PROJECT-CONTROL-0106 and the independent local product/code-quality track delivered a small, additive batch: agent rule sync (`AGENTS.md`, `CLAUDE.md`, copilot, cursor, `DEVELOPMENT_STANDARD`); queue and handoff consistency; scanner rule doc and SARIF/JSON/SECURITY_MODEL contract alignment with two new consistency guard tests; agent instruction surface guard test; seven candidate task records (`TASK-0146` through `TASK-0152`) and a forward-looking roadmap note; catalog text guard; config-check diagnostics cookbook; baseline diff cookbook; SARIF rule metadata completeness guard; offline-only and accessibility guard for the HTML report; prompt pack and context export redaction guard; sample gallery coverage tests. All of these changes are local-only; the published `0.2.0-alpha.2` package, JSON schema, SARIF profile, and default CLI surface remain unchanged.

### Starter Config and Locale Guard Batch
PROJECT-CONTROL-0107 planning commit `c249a13` opens with the post-0158 state sync and a new local-only batch: starter `brandKeywords` and `piiKeywords` config (`TASK-0156`); starter `safeDomains` and `ignoredPaths` config (`TASK-0157`); Turkish CLI locale fallback guard (`TASK-0158`); commit-completeness hard rule plus a new `scripts/check-tracked-vs-untracked-md.ps1` guard. Total tests are 238/238. No release, tag, or NuGet state change.

### Security
- Added least-privilege GitHub artifact provenance for exact future release nupkg assets, with idempotent digest detection and CLI verification.
- Recorded bounded author-signing and SBOM deferrals without claiming controls that are not published.

### Planning
- Selected `0.2.0-alpha.3` as the smallest compatible next prerelease scope without changing package metadata or approving publication.
- Recorded an evidence-backed alpha.3 NO-GO until independent backup security ownership and recovery authority/backup evidence are complete.

## [0.2.0-alpha.3] - 2026-06-20

### Added
- Added the published package for MCP stdio transport, `ackit.rules`, `ackit watch`, `ackit diff`, `ackit trim`, scan include/exclude filters, release-hardening scripts, and release blocker evidence cleanup accumulated after `0.2.0-alpha.2`.

### Release
- Published `AgentContextKit` `0.2.0-alpha.3` to NuGet through the OIDC release workflow sequence.
- Created exact tag `v0.2.0-alpha.3` and GitHub prerelease targeting `92984c6448332aa24b7cff94647f627bf944e535`.
- Verified global tool install from NuGet; `ackit version` reports `AgentContextKit 0.2.0-alpha.3`.
- Recorded refreshed hosted RC evidence run `27870246504` and immutable release verification run `27870813763`.
- Known follow-up: harden the release workflow provenance probe before the next publish so missing attestation state does not fail before attestation can run.

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
