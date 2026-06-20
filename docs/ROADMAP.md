# Roadmap

## v0.1.0-alpha
- Solution foundation.
- CLI skeleton.
- `init`, `scan`, `generate`, `task`, `redact-check`, `doctor`.
- English/Turkish localization foundation.
- Markdown template generation.
- Basic JSON output.
- Config schema docs.
- JSON output docs.
- Basic tests.
- README, OSS docs, AGENTS.
- GitHub Actions.
- Public repository metadata finalization for `https://github.com/Cynrath/agent-context-kit`.
- Source archive hygiene and local release gate preparation.
- Codex for OSS application pack.

## v0.2.0-alpha
- Stronger stack detector with .NET SDK, ASP.NET Core, Razor, Blazor WebAssembly, Worker Service, Minimal API, package manager, TypeScript, and Tailwind CSS signals.
- Better risk scanner with environment sample precision, key-file detection, broader private key block detection, IP filtering, and configured keyword token boundaries.
- `.ackit/config.yml` brand/PII keyword support improvements through token-boundary matching.
- JSON schema stabilization and expanded fields with schema version 2 metadata and summary fields.
- More generated docs with expanded agent/context templates that include health, risk, and recommended checks.
- NuGet package metadata hardening with a local metadata review gate.
- Sample repositories for safe .NET Minimal API and Node/TypeScript/Tailwind stack detection.
- Further Turkish generated-template and documentation localization polish beyond the current CLI output pass.
- Final local readiness consolidation.

## v0.2.0-alpha.2
- Published on GitHub and NuGet through TASK-0124 from exact package commit `f540479a92cbe66097f6796553828ee49ddd5512`.
- Includes the alpha.1 SARIF/scanner catalog/config allowlist surface plus scanner precision hardening, sanitized suppression audit output, baseline-aware CI policy, config diagnostics, contract coverage, local Markdown-link validation, and exact-commit OIDC release automation.
- Published install command is `dotnet tool install --global AgentContextKit --version 0.2.0-alpha.2`.

## v0.2.0-alpha.3 Planning
- Selected as the smallest compatible next prerelease for additive release recovery, hosted evidence, security ownership, and supply-chain automation work.
- No CLI, config, JSON, baseline, SARIF, package ID, or offline-first behavior change is planned.
- TASK-0203 prepared source/package metadata as the local `0.2.0-alpha.3` candidate.
- TASK-0205 records hosted RC run `27868539971` as green for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801` and records exact-candidate GO for a later publish task only.
- Tag creation, GitHub Release creation, NuGet publication, and release workflow dispatch remain pending until a separate authorized publish task resolves whether to publish the RC evidence commit or a later docs-only HEAD.
- TASK-0134 completed the earlier safe evaluation boundary with NO-GO; TASK-0205 supersedes it with the hosted-evidence GO boundary in `docs/V020_ALPHA3_RELEASE_DECISION.md`.

## v0.2.0-alpha.1
- Published on GitHub and NuGet in TASK-0065.
- Added `ackit sarif` as a published package command.
- Added SARIF 2.1.0 output, scanner rule catalog metadata, additive JSON `ruleId`, configurable non-Critical allowlists, expanded scanner patterns, sample gallery, demo scenarios, Web UI preview docs, and visual asset guidance.

## v0.1.0-alpha.2
- Published on GitHub and NuGet.
- Verified NuGet global tool install, `ackit version`, `ackit --help`, and local Web UI generation.
- Reduced scanner fixture/domain-like noise while preserving Critical secret detection.
- Prepared GitHub Actions for Node 24-compatible official action majors and explicit Windows runner labels.
- Polished Turkish human CLI output with UTF-8 text while preserving JSON schema behavior.
- Added cross-platform source smoke coverage that packs the current branch and installs the local package before publication.
- Updated published-package smoke coverage to install `AgentContextKit` `0.1.0-alpha.2`.
- Added GitHub issue templates, pull request template, maintainer guide, contributor onboarding, support matrix, repository hygiene, and issue triage docs.

## CI And Scanner Backlog
- TASK-0051 scanner allowlist and fixture-noise reduction:
  - Treat the internal placeholder email fixture (`private` + `[at]` + `example.internal`) as non-secret test data.
  - Reduce domain-like noise for framework/package strings such as `Microsoft[dot]NET`.
  - Reduce domain-like noise for package registry references such as `api[dot]nuget[dot]org`.
- TASK-0052 GitHub Actions Node 24 readiness:
  - Update official actions to Node 24-compatible majors where safe.
  - Use an explicit Windows runner label to avoid `windows-latest` redirect noise.
  - Hosted validation remains manual after a maintainer push.
- TASK-0053 Turkish localization polish:
  - Replace visible Turkish ASCII fallback CLI wording with natural UTF-8 Turkish text.
  - Keep JSON output schema stable and language-independent.
- TASK-0054 alpha.2 release preparation:
  - Document alpha.2 readiness and remaining manual release actions.
- TASK-0055 alpha.2 release decision:
  - Bump source/package metadata to `0.1.0-alpha.2`.
  - Add current-branch source smoke workflow coverage.
- TASK-0056 alpha.2 publish verification:
  - Record GitHub Release, NuGet publish, install verification, and Web UI smoke.
  - Refresh agent instruction files and active release docs.
  - Update published-package smoke to `0.1.0-alpha.2`.
- TASK-0057 GitHub repo hygiene and support docs:
  - Add issue templates, pull request template, maintainer guide, support matrix, contributor onboarding, repository hygiene, and issue triage docs.
  - Record read-only GitHub Actions validation for `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke`.
- TASK-0058 repository settings, badges, labels, and public presentation hardening:
  - Add compact README badges for Actions, NuGet, license, and .NET 10.
  - Add GitHub label guidance and repository settings checklist.
  - Keep label creation, branch protection, and repository settings as maintainer-only manual actions.
- TASK-0059 scanner SARIF output and GitHub Code Scanning readiness:
  - Add `ackit sarif --output <repo-relative.sarif>` for privacy-first SARIF 2.1.0 scanner output.
  - Keep SARIF locations repository-relative and omit raw scanner match values.
  - Add documentation and a non-active GitHub Actions upload example without enabling upload by default.
- TASK-0060 GitHub Actions usage examples:
  - Added documented guidance for SARIF usage before the `0.2.0-alpha.1` package was published.
  - Add documented workflow snippets for scan CI, SARIF upload, published-tool smoke, and source-package smoke.
  - Add GitHub Actions usage guidance for CI command order, privacy notes, failure interpretation, and SARIF upload decisions.
- TASK-0061 sample repository gallery:
  - Add sample repository gallery, demo scenarios, and safe onboarding examples.
  - Add `samples/dotnet-console`, `samples/generic-empty-repo`, and `samples/security-fixture-repo`.
  - Keep generated sample outputs local-only and uncommitted.
- TASK-0062 v0.2.0-alpha scanner expansion:
  - Add a central scanner rule catalog for stable `ACKIT` IDs.
  - Add config-driven `safeDomains`, `ignoredPaths`, and `ignoredFindingIds` for narrow non-Critical noise suppression.
  - Keep Critical secret-like findings reportable even when allowlists are configured.
  - Expand private key, environment config, database artifact, package/archive, local path, and provider-token-like detection.
- TASK-0063 README screenshots/Web UI preview assets:
  - Plan safe public preview images for README and Web UI documentation without exposing local paths or private data.
- TASK-0064 next alpha release decision for SARIF/scanner expansion package:
  - Prepared `0.2.0-alpha.1` locally as the next alpha package for SARIF and scanner expansion.
- TASK-0065 post-v020-alpha1 publish verification and docs sync:
  - Updated README published install commands, package smoke workflows, release docs, and agent instruction files after `0.2.0-alpha.1` publication.
- PROJECT-CONTROL-0001 unified next-steps roadmap:
  - Create `docs/NEXT_TASKS.md` and `docs/PROJECT_EXECUTION_QUEUE.md`.
  - Execute safe local-only tasks sequentially without per-task prompts.
- TASK-0066 GitHub Release body polish documentation:
  - Add a maintainer-ready replacement body for the published `v0.2.0-alpha.1` GitHub pre-release without editing GitHub.
- TASK-0067 GitHub labels and manual repo settings checklist:
  - Align label taxonomy, repo settings, branch protection, milestones, and release settings as maintainer-only checklist work.
- TASK-0068 CodeQL / Code Scanning decision document:
  - Keep Code Scanning upload documentation-only by default and define opt-in criteria.
- TASK-0069 GitHub issue tracker bootstrap plan:
  - Add a copy-ready first issue backlog without creating GitHub issues.
- TASK-0070 scanner config examples and sample configs:
  - Add safe `.ackit/config.yml` examples for minimal, strict, and CI use.
- TASK-0071 SARIF GitHub Code Scanning opt-in workflow design:
  - Document a manual, job-scoped, published-package SARIF upload workflow without enabling upload by default.
- TASK-0072 JSON schema stability and contract tests:
  - Require the common schema v2 envelope and scanner finding fields without rejecting additive properties.
- TASK-0073 CLI exit code contract hardening:
  - Completed locally with success-alias, invalid-invocation, and human/JSON exit parity coverage.
- TASK-0074 scanner fixture coverage expansion:
  - Completed locally with table-driven detection, stable rule mapping, and known-noise precision fixtures.
- TASK-0075 safe suppression audit log:
  - Completed locally with sanitized human/JSON config suppression records and Critical safety boundaries.
- TASK-0076 README command examples and copy-paste polish:
  - Completed locally with repository-root context, explicit source build commands, and grouped installed-tool workflows.
- TASK-0077 sanitized screenshot capture plan:
  - Completed locally with disposable-demo capture steps, candidate assets, metadata stripping, privacy review, and commit checks; manual screenshot capture remains future work.
- TASK-0078 docs site / GitHub Pages planning:
  - Completed locally with repository Markdown retained as canonical, Pages deferred, and future activation triggers and privacy/quality gates documented.
- TASK-0079 tutorial: first five minutes with ackit:
  - Completed locally with a published-package, disposable-repository walkthrough for init, scan, generation, task creation, CI check, and optional local previews.
- TASK-0080 tutorial: prepare a repo for AI coding agents:
  - Completed locally with a security-first existing-repository workflow for baseline review, config, agent instructions, tasks, CI gates, local artifacts, maintenance, and rollback.
- TASK-0081 v0.2.0-alpha.2 scope planning:
  - Completed locally with a compatibility-preserving scanner precision/suppression-audit scope, explicit exclusions, and separate release-preparation/publication gates.

## v0.3 Product Direction
- Decision: baseline-aware CI policy and configuration diagnostics.
- Add sanitized deterministic finding fingerprints and a versioned local baseline manifest.
- Distinguish reviewed existing findings from new findings without hiding Critical risk.
- TASK-0086 completed the explicit local baseline create/update/load workflow and opt-in new-finding CI policy; TASK-0087 completed additive JSON/SARIF/report/Web UI parity.
- Add deterministic config validation for unknown, invalid, unsafe, and obsolete settings.
- Extend JSON, SARIF, reports, and Web UI through additive compatible metadata.
- Preserve offline-first behavior and cross-platform determinism.
- Detailed decision: `docs/V030_ROADMAP_DECISION.md`.
- TASK-0088 completed local release-candidate evidence preparation: upgrade fixtures, a disposable performance benchmark, and security/support/supply-chain policy docs.
- Remaining RC work is hosted three-OS upgrade/performance/config evidence, private vulnerability reporting, supply-chain publication decisions, and final contract freeze.
- TASK-0089 completes local config diagnostics CLI integration and the no-auto-migration contract; hosted predecessor-config evidence remains part of RC validation.
- TASK-0090 adds a manual-only three-OS RC evidence workflow for isolated predecessor/current-source package checks, config immutability, baseline/SARIF behavior, and the synthetic performance tripwire. Hosted results remain maintainer-only evidence after push/dispatch.
- TASK-0091 completes the xUnit v3 migration with 169/169 tests and clean post-migration vulnerability/deprecation reviews.
- TASK-0092 conditionally freezes CLI, exit-code, config, JSON, baseline, SARIF, generated-file, privacy, and upgrade contracts while keeping RC publication at NO-GO until hosted/remote evidence and maintainer decisions are complete.
- TASK-0093 adds machine-readable JSON schema `2`, baseline schema `1`, SARIF profile assets, sanitized golden fixtures, live-output tests, and a local contract gate for V100-04.
- TASK-0094 adds localized human-readable CLI chrome plus English/Turkish help, command, error, exit-code, and JSON semantic parity release gates.
- TASK-0095 consolidates maintainer-only private reporting, dependency review, signing, SBOM, provenance, and recovery evidence fields without claiming remote completion.
- TASK-0096 completes final local RC evidence consolidation under a `LOCAL READY / REMOTE NO-GO` decision and read-only orchestration gate.
- TASK-0097 records green standard hosted workflows for `37d5220` and keeps the unrun manual RC evidence workflow as a maintainer blocker.
- TASK-0098 records the private vulnerability reporting setting as read-only verified disabled and keeps activation plus response ownership as a P0 maintainer blocker.
- TASK-0099 audits the exact published package/release supply-chain state and records NuGet ownership alignment, author signing, SBOM, provenance, and recovery as explicit maintainer decisions.

## Ecosystem And Interoperability Intelligence
- TASK-0100 resets the queue into completed local work, maintainer-gated release/security work, and a local-only ecosystem/product intelligence track.
- TASK-0101 completed the related-tools comparison matrix and evidence review.
- TASK-0102 completed docs-only offline workflow examples without dependencies or auto-install behavior.
- TASK-0103 completed optional interoperability boundaries without implementation.
- TASK-0104 completed the agent context pipeline taxonomy.
- TASK-0105 completed concise public ecosystem positioning.
- TASK-0106 completed the evidence schema, confidence scale, review ownership, and staleness policy.
- TASK-0107 completed the external executable/output privacy threat model.
- TASK-0108 completed the disposable, synthetic, no-secret external workflow lab plan.
- TASK-0109 completed design-only `ackit external-tools` discovery guidance.
- TASK-0110 completed design-only `ackit workflow` guidance.
- TASK-0111 completed namespaced, sanitized external SARIF/JSON/SBOM/graph import boundaries.
- TASK-0112 completed the optional docs quality toolchain decision while keeping Markdown canonical.
- TASK-0113 completed the authoritative no-network/default-offline policy hardening.
- TASK-0114 completed the maintainer-gated P0/P1 blocker board and decision register without closing blockers.
- TASK-0115 completed `v0.2.0-alpha.2` planning without version, tag, package, or release changes.
- PROJECT-CONTROL-0102 authorizes sequential TASK-0116 through TASK-0125 implementation, validated normal pushes, exact-commit hosted checks, OIDC NuGet publication, GitHub pre-release creation, and post-publish verification.
- TASK-0116 through TASK-0122 completed local link validation, scanner/config/baseline/suppression hardening, full regression/performance validation, and manual exact-SHA OIDC release automation.
- TASK-0123 completed source/package/CLI metadata, source-package smoke, package inspection, and exact-commit preparation for `0.2.0-alpha.2`.
- TASK-0124 completed NuGet OIDC publication, exact tag creation, and GitHub pre-release creation after exact-commit 8/8 hosted checks.
- TASK-0125 completed global installed-tool smoke, published-package version sync, final docs sync, and post-publish 8/8 hosted validation.
- TASK-0115 planning scope: scanner precision, suppression audit, baseline-aware CI, config diagnostics, and ecosystem/offline documentation. It excludes dependency expansion, default network behavior, and external tool execution.
- Maintainer-gated RC/security decisions do not block this local-only research, but the research does not close release blockers or imply 1.0 readiness.

Historical note: TASK-0018 through TASK-0023 used the v0.3 label for CI mode, exit codes, HTML reports, workflows, and readiness. Those capabilities are complete and already included in the published `v0.2.0-alpha.2` package.

## v0.4.0-beta
- Local Web UI prototype. Started with offline static `ackit webui`.
- Scan result dashboard. Refined with readiness score, review status, severity breakdown, and recommended checks.
- Generated file preview. Refined with expected file categories, present/missing status, size metadata, and capped previews.
- Risk finding browser. Refined with deterministic review queue, finding IDs, match display, and recommended actions.
- Task preview. Refined with task ID, title, inferred status, size metadata, paths, and capped previews.
- Final local readiness consolidation.

## v0.5.0-beta
- Optional LLM integration architecture. Documented with consent gates, provider boundaries, data minimization, and no live provider calls.
- `ILLMProvider` abstraction. Added provider-neutral request/response models and fake-provider tests.
- Dry-run prompt pack generation. Added local-only `ackit prompt-pack` Markdown output with JSON metadata.
- User-approved context export. Added local-only `ackit context-export` approval manifests with JSON metadata.
- Final local readiness consolidation.

## v1.0.0
- Stabilization plan. Added local v1.0 stabilization themes, acceptance gates, and follow-up task sequence.
- Stable CLI contract review. Added local command surface contract and contract check script.
- Config and generated file convention freeze. Added local conventions and convention check script.
- Documentation and release gate freeze. Added local release-critical docs/gates check.
- Final local readiness consolidation. Added local v1.0 readiness review docs and script.
- Public release final cleanup. Added source archive hygiene, package URL blocker clarification, and sample-aware self-scan stack accuracy.
- First public alpha release handoff. Added final repository URL docs, Codex for OSS application pack, release tag readiness, source archive hygiene, GitHub Release completion, NuGet publication, and global tool install verification.
- Stable CLI.
- NuGet global tool release.
- Stable config format.
- Stable generated file conventions.
- Complete documentation.
- Reliable test suite.
- Green CI.
- TASK-0083 1.0 readiness gap analysis:
  - Completed locally with explicit P0/P1/P2 gaps, owners, evidence requirements, blocking status, and remote-write boundaries.
  - Current verdict remains not ready for 1.0 GA; `docs/V100_GAP_ANALYSIS.md` is the source of truth.

## Post-v1.0
- Optional sample stack reporting that lists `samples/*` stacks separately from the main repository stack.

## Forward-Looking Candidate Backlog (Post-0106)
The following candidates are safe local-only work that does not change the published `0.2.0-alpha.2` package, the default CLI, JSON schema, SARIF profile, or the alpha.3 NO-GO posture. Each is tracked as a separate `docs/tasks/TASK-0146` through `TASK-0152` record.

- `TASK-0146` scanner severity explanation polish (Core catalog text and a guard test).
- `TASK-0147` config-check actionable diagnostics examples (cookbook and a guard test).
- `TASK-0148` baseline diff documentation and tests (existing-vs-new cookbook and a guard test).
- `TASK-0149` SARIF rule metadata completeness (GitHub Code Scanning fields and a guard test).
- `TASK-0150` report and Web UI accessibility and offline UX polish (offline-only guard test).
- `TASK-0151` prompt pack and context export redaction hardening (redaction guard test).
- `TASK-0152` sample gallery test coverage expansion (per-sample guard tests).

This backlog is selection only. Implementation begins only after a future PROJECT-CONTROL task explicitly authorizes the next set. None of these candidates claim release readiness or close the alpha.3 `RB-003`/`RB-008` blockers.

## PROJECT-CONTROL-0107 Docs-First Local Product Continuation
PROJECT-CONTROL-0107 builds on the post-0106 work with a docs-first plan-then-execute flow:

- `TASK-0159` post-0158 audit and state sync.
- `TASK-0160` scanner severity explanation polish.
- `TASK-0161` config-check actionable diagnostics examples.
- `TASK-0162` baseline diff documentation and tests.
- `TASK-0163` SARIF rule metadata completeness.
- `TASK-0164` report and WebUI accessibility and offline UX polish.
- `TASK-0165` prompt pack and context export redaction hardening.
- `TASK-0166` sample gallery coverage expansion.
- `TASK-0167` final validation and hosted check sync.

This track is also safe local-only work that does not change the published `0.2.0-alpha.2` package, the default CLI, JSON schema, SARIF profile, or the alpha.3 NO-GO posture. It does not close `RB-003` or `RB-008` and does not claim release readiness.
