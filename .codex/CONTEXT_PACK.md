# AgentContextKit Context Pack

## Project
AgentContextKit (`ackit`) is an offline-first .NET 10 CLI for AI-assisted repository context generation, task-first workflow docs, and secret/PII/brand leakage risk reporting.

## Active Control
PROJECT-CONTROL-0109 is now active for TASK-0177 through TASK-0186: hook expansion with Anthropic and Continue targets plus dry-run preview, MCP transport prototype step 1, WebUI no-build polish, hosted check status reporting, SARIF roundtrip coverage, prompt pack edge cases, catalog rule stability, scan include/exclude filters, nightly local checks, and final validation plus hosted check sync. No release, tag, NuGet publication, secret, or model-name disclosure is part of this control.

TASK-0126 is hosted-verified: automation commit `2f68f14` passed 8/8 and run `27478046088` verified immutable alpha.2 package/release evidence without write permissions or login. TASK-0127 records exact alpha.2 hashes, repository signature, missing author signature/SBOM/attestation, and owner identity difference. TASK-0128 is hosted-verified: commit `4c4fa64` passed standard 8/8 and run `27478635057` passed exact predecessor/config/baseline/SARIF/performance evidence on Windows, Ubuntu, and macOS.

TASK-0129 enabled and independently verified GitHub private vulnerability reporting on 2026-06-14. The repository GET returns `enabled: true` and the public Security page exposes the report entry; notification ownership remains separate.

TASK-0130 records `Cynrath` as primary security triage and recovery decision owner, accepts an immutable-successor recovery procedure, and explicitly leaves independent backup ownership plus destructive NuGet recovery authority unresolved.

TASK-0131 accepts the public `Cyranth` NuGet owner / `Cynrath` project persona difference for a bounded period. OIDC publication authority is verified; no owner mutation or shared-human-identity claim was made.

TASK-0132 defers author signing/SBOM with dated accepted risk and adds future-release GitHub artifact provenance to the isolated publish job. The read-only verifier has no attestation permission.

TASK-0133 selects `0.2.0-alpha.3` as a compatible planning scope only. Source/package metadata remains `0.2.0-alpha.2`; publication is NO-GO until independent backup security ownership and recovery authority/backup evidence are complete.

TASK-0134 records the evidence-backed NO-GO in `docs/V020_ALPHA3_RELEASE_DECISION.md`. Planning commit `eabbe6a` passed standard 8/8; there is no alpha.3 candidate commit, package, tag, release, or NuGet publication.

PROJECT-CONTROL-0107 begins at `a5686aa` with 238/238 tests green and TASK-0159 through TASK-0167 queued. The control is docs-first; the planning commit lands before any implementation.

PROJECT-CONTROL-0107 closed TASK-0159 through TASK-0167. Local validation is 257/257 green at the final commit.

PROJECT-CONTROL-0108 begins at `08442c0` with 257/257 tests green and TASK-0168 through TASK-0176 queued. The control is docs-first; the planning commit lands before any implementation.

PROJECT-CONTROL-0108 closed TASK-0168 through TASK-0176 with 270/270 tests green. PROJECT-CONTROL-0109 planning begins at `b224c20` with TASK-0177 through TASK-0186 queued, and current `master`/`origin/master` is aligned at `cf22fd1`.

TASK-0177 is implemented and hosted-verified: hook targets now cover Codex, Claude, Anthropic, and Continue; dry-run reports planned paths plus content lengths without writing; focused hook tests passed 6/6 and the full suite passed 276/276. Hosted runs for commit `5ef0b8e` passed on 2026-06-18: `ci` 27765668325, `cross-platform-smoke` 27765669068, and `cross-platform-source-smoke` 27765668177.

TASK-0178 is implemented and hosted-verified: implementation commit `336c3ee` adds Core MCP contracts/router, deterministic `ackit.scan`, `ackit.findings`, `ackit.context`, and `ackit.health` tools, and a thin `ackit mcp --stdio <json-request>` CLI stub with no real stdio loop or child process. Local validation passed on 2026-06-18 with 283/283 tests, source `scan --ci` exit 0 with existing `.remember` Medium findings only, doctor 13/13 PASS, CLI contract/localization gates, and `verify-release.ps1`. Pushed evidence commit `90928f1` passed hosted runs on 2026-06-18: `ci` 27767741917, `cross-platform-smoke` 27767741926, and `cross-platform-source-smoke` 27767741935.

TASK-0179 is implemented and hosted-verified: implementation commit `e4108ee` adds CSP, robots noindex/nofollow, `data-no-network="true"`, a data favicon, and no external script/link references to WebUI output; `.playwright-cli/` is ignored as a local verification artifact. Local validation passed on 2026-06-18 with 287/287 tests, source `scan --ci` exit 0 with existing `.remember` Medium findings only, doctor 13/13 PASS, IWR/static WebUI verification, and `verify-release.ps1`. Playwright browser verification was attempted, but Kaspersky browser integration injected external `me.kis...` requests and a CSP console warning outside the generated HTML. Pushed evidence commit `6ad0c8d` passed hosted runs on 2026-06-18: `ci` 27769326188, `cross-platform-smoke` 27769326618, and `cross-platform-source-smoke` 27769326168.

TASK-0180 is implemented and hosted-verified: planning commit `8a65723` expands the task/docs plan and adds `docs/HOSTED_CHECKS.md`; implementation commit `1bc0019` adds `scripts/hosted-checks-summary.ps1` plus `HostedChecksSummaryScriptTests`. The script is read-only, uses only `gh api` for remote GitHub reads, prints workflow name, run id, status, conclusion, URL, and duration, exits 2 only for invalid arguments, and exits 0 for missing/unauthenticated `gh` or API failures. Local validation passed on 2026-06-18 with clean Release build, focused tests 6/6, full suite 293/293, source `scan --ci` exit 0 with existing `.remember` Medium findings only, doctor 13/13 PASS, `git diff --check`, `verify-release.ps1`, real `--count 1` and `--workflow ci.yml --count 1` smoke checks, and post-commit tracked/untracked guard. Pushed HEAD `1bc0019` passed hosted runs: `ci` 27782907605, `cross-platform-smoke` 27782907712, and `cross-platform-source-smoke` 27782907825. Screenshot `nuget-release` red deployments are historical 2026-06-13 release-environment statuses; no release/deployment/tag/NuGet write was performed. TASK-0181 is next.

TASK-0187 was inserted as a user-prioritized hotfix before TASK-0181 to audit all visible `nuget-release` failed deployment entries. Planning commit `fa45c0b` created the task and queue update; implementation commit `7a0e1f8` hardens release verification without remote release/tag/NuGet/deployment mutation. Deployment `5047180313` maps to release #4 job `81200598792` and the Ubuntu `powershell` executable failure. Deployments `5047227343` and `5047239131` map to release #5 jobs `81201079722` and `81201198341`, both failing on published-package temp path resolution. A delayed release #4 failed-job rerun also failed because the validated package artifact expired after the original one-day retention window. Current source uses lazy writable temp resolution in `verify-published-package.ps1` and `verify-existing-release.ps1`, exposes a non-network temp self-test, rejects Windows-only `powershell` inside the Ubuntu publish job, and requires at least 14 days of validated package artifact retention. Local validation passed with focused tests 3/3, full suite 296/296, source scan/doctor, release workflow gate, release recovery fixture, tracked/untracked guard, `git diff --check`, and `verify-release.ps1`. Hosted verification for the retention follow-up is pending push.

## Architecture
- CLI project: `src/AgentContextKit.Cli`
- Core project: `src/AgentContextKit.Core`
- Tests: `tests/AgentContextKit.Tests`

## Current MVP
- Safe local scanning.
- Sample-aware main repository stack detection.
- Agent instruction generation.
- Task file generation.
- Pattern-based redact checks.
- Stable scanner rule catalog with `ACKIT` rule IDs.
- Configurable non-Critical scanner allowlists through `safeDomains`, `ignoredPaths`, and `ignoredFindingIds`.
- Offline static HTML report, Web UI, dry-run prompt pack, and local context export manifest generation.
- Privacy-first local SARIF 2.1.0 scanner output.
- English/Turkish localization foundation.

## Repository Health
- README: yes
- LICENSE: yes
- SECURITY: yes
- Tests: yes
- CI: yes
- Agent instructions: yes
- Codex for OSS application pack: yes, `docs/CODEX_FOR_OSS_APPLICATION.md`

## Risk Summary
- No risk findings in the latest local scan.
- Package URLs point to `https://github.com/Cynrath/agent-context-kit`.
- GitHub repository is public.
- Current release tag `v0.2.0-alpha.2` is pushed at exact package commit `f540479a92cbe66097f6796553828ee49ddd5512`.
- GitHub Actions latest `master` run is green.
- Read-only GitHub CLI validation on 2026-06-06 confirmed `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` succeeded after `docs: add sample gallery and demo scenarios`.
- Repository description and topics are set.
- GitHub Release page for `v0.2.0-alpha.2` is completed as a pre-release with validated package assets.
- NuGet package `AgentContextKit` version `0.2.0-alpha.2` is published through GitHub OIDC Trusted Publishing.
- NuGet global tool install and full disposable smoke verification are completed for `0.2.0-alpha.2`.
- NuGet global tool smoke test is completed, including `ackit --help` and Web UI generation.
- Cross-platform CI smoke workflow succeeded on commit `868dff3` for Windows, Ubuntu, and macOS.
- Codex for OSS form submission is completed per maintainer-provided status.
- Alpha.2 hardening and publication verification are complete through TASK-0056.
- TASK-0057 added GitHub issue templates, a pull request template, maintainer guide, contributor onboarding, support matrix, repository hygiene, and issue triage docs.
- TASK-0057 pre-commit validation passed: restore, Release build, 67/67 tests, `scan --ci`, `doctor`, `scan --json`, installed `ackit` version/help, hygiene scans, `git diff --check`, and v1.0 documentation release gate.
- TASK-0058 added README badges, GitHub label guidance, repository settings checklist, and public presentation hardening docs.
- TASK-0058 pre-commit validation passed: restore, Release build, 67/67 tests, `scan --ci`, `doctor`, `scan --json`, installed `ackit` version/help, hygiene scans, `git diff --check`, and v1.0 documentation release gate.
- TASK-0059 is completed locally for privacy-first `ackit sarif --output <repo-relative.sarif>` output, SARIF docs, and non-active Code Scanning upload examples.
- TASK-0060 is completed locally for GitHub Actions usage examples, SARIF availability wording, and CI docs polish.
- TASK-0061 is committed locally for sample repository gallery, demo scenarios, onboarding examples, safe sample repositories, and a local sample smoke helper.
- TASK-0062 is committed locally for scanner rule catalog hardening, config-driven non-Critical allowlists, expanded scanner risk patterns, additive JSON `ruleId`, SARIF catalog metadata, and scanner docs.
- TASK-0063 is committed for README preview guidance, Web UI preview docs, visual asset policy, and safe public diagram assets.
- TASK-0064 prepared source/package metadata as the `0.2.0-alpha.1` candidate.
- TASK-0065 is in progress to sync active docs after `0.2.0-alpha.1` GitHub Release, NuGet publish, and global install verification.
- Published NuGet `0.2.0-alpha.1` includes `ackit sarif`.
- Read-only GitHub CLI validation for TASK-0063 confirmed latest `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` succeeded on `master` before local edits.
- Latest self-scan main stacks: `.NET`, `.NET CLI / .NET Tool`, and `GitHub Actions`.

## Hard Rules
- No remote upload.
- No LLM API in MVP.
- No hosted Web UI in MVP.
- No overwrite by default.
- No automatic redaction.
- Normal GitHub pushes are authorized only for PROJECT-CONTROL-0103 after validation. NuGet publication remains OIDC-only through the explicitly authorized release workflow; no API key or local credential is allowed.

## Verification
Use:
```powershell
dotnet restore
dotnet build -c Release
dotnet test -c Release
dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci
dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- sarif --output .ackit/reports/ackit.sarif
dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- report --json
dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- webui --json
dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- prompt-pack --json
dotnet run --project src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- context-export --prompt-pack .ackit/prompt-packs/prompt-pack.md --approve --json
powershell -ExecutionPolicy Bypass -File scripts/check-release-blockers.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-v020-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-v030-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-v040-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-v050-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-config-generated-conventions.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-v100-documentation-release-gates.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-v100-readiness.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-public-release-gates.ps1
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
```

## Public Release State
- `RepositoryUrl` is `https://github.com/Cynrath/agent-context-kit`.
- `PackageProjectUrl` is `https://github.com/Cynrath/agent-context-kit`.
- Current local `origin` is `https://github.com/Cynrath/agent-context-kit.git`.
- GitHub repository public: yes.
- `master` pushed: yes.
- `v0.2.0-alpha.1` pushed: yes.
- GitHub Actions latest `master` run: success.
- Latest read-only Actions check: `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` succeeded on commit `8dac9237c27ba912d056344155f1c9f901557bf5`.
- Repository description: set.
- Repository topics: set.
- GitHub Release page: completed.
- NuGet publish: completed.
- NuGet global tool install verification: completed.
- NuGet smoke test: completed.
- Cross-platform smoke workflow: completed successfully on Windows, Ubuntu, and macOS.
- Codex for OSS form submission is completed per maintainer-provided status.
- Current release publication: TASK-0065 records `v0.2.0-alpha.1` tag push, GitHub pre-release, NuGet publish, global tool install verification, and `ackit sarif` evidence.
- `docs/MAINTAINER_RELEASE_HANDOFF.md` contains the current published release state and future release guidance.
- GitHub contributor workflow docs were added in TASK-0057: `docs/MAINTAINER_GUIDE.md`, `docs/SUPPORT_MATRIX.md`, `docs/CONTRIBUTOR_ONBOARDING.md`, `docs/GITHUB_REPO_HYGIENE.md`, and `docs/ISSUE_TRIAGE.md`.
- Public repository presentation docs were added in TASK-0058: `docs/GITHUB_LABELS.md` and `docs/GITHUB_SETTINGS_CHECKLIST.md`.
- SARIF output docs and example GitHub Code Scanning upload workflow are added in TASK-0059: `docs/SARIF_OUTPUT.md` and `docs/examples/github-actions-sarif-upload.yml`.
- GitHub Actions CI usage docs and additional documentation-only workflow examples are added in TASK-0060.
- Sample gallery and demo scenario docs are added in TASK-0061, along with safe sample repositories and a local sample smoke helper.
- Scanner rule catalog and configurable allowlist docs were added in TASK-0062.
- README preview, Web UI preview guidance, visual asset policy, and a safe generic flow diagram were added in TASK-0063.
- TASK-0065 post-publish sync updated README install commands, package smoke workflows, release docs, and agent instruction files for published `0.2.0-alpha.1`.
- PROJECT-CONTROL-0001 adds the central queue docs: `docs/NEXT_TASKS.md` and `docs/PROJECT_EXECUTION_QUEUE.md`.
- TASK-0066 through TASK-0069 are safe local-only docs tasks for release body polish, labels/settings checklist, Code Scanning decision, and issue backlog.
- TASK-0070 adds safe scanner config examples for minimal, strict, and CI-oriented usage.
- TASK-0071 documents a manual Code Scanning opt-in workflow with job-level permissions and SARIF validation; no active upload workflow is installed.
- TASK-0072 adds schema v2 JSON envelope and finding contract tests without changing runtime output.
- TASK-0073 hardens the documented `0`/`1`/`2` CLI exit contract and verifies human/JSON parity without changing runtime behavior.
- TASK-0074 expands scanner regression fixtures across detection, rule mapping, and known-noise boundaries without changing runtime behavior.
- TASK-0075 adds current-source sanitized config suppression audit records to local human/JSON scan output; SARIF remains visible-findings-only.
- TASK-0076 aligns English/Turkish README command examples with explicit repository-root, Release build, installed-tool, and local-artifact workflows.
- TASK-0077 defines a disposable-demo screenshot capture and sanitization plan without creating or committing an image.
- TASK-0078 keeps repository Markdown canonical, defers GitHub Pages, and documents future activation triggers and privacy/quality gates without adding site tooling.
- TASK-0079 adds a verified published-package first-five-minutes tutorial using a timestamped synthetic repository and local-only outputs.
- TASK-0080 adds a security-first existing-repository adoption tutorial for baseline review, config, agent instructions, tasks, CI checks, and rollback.
- TASK-0082 defines the future v0.3 line as baseline-aware CI policy and configuration diagnostics, with sanitized deterministic fingerprints, an independently versioned local baseline manifest, explicit review, and no broad Critical suppression.
- TASK-0082 local validation passed with 127/127 tests and all source, sample, hygiene, contract, readiness, and release checks; only the expected pre-commit dirty-tree public gate remained for post-commit rerun.
- TASK-0083 establishes `docs/V100_GAP_ANALYSIS.md` as the actual 1.0 readiness source of truth; current verdict is not ready for 1.0 GA, with baseline/config/schema/security/performance/support/release gaps tracked explicitly.
- TASK-0084 adds the local-only baseline model foundation. TASK-0086 adds sanitized occurrence metadata, explicit create/update/load, integrity validation, existing/new classification, additive JSON metadata, and opt-in new-finding CI policy while preserving default scan behavior.
- TASK-0087 passes the same validated classification to SARIF, HTML report, and Web UI. SARIF uses sanitize-only result properties; local HTML outputs add existing/new counts and finding status without suppression.
- TASK-0085 adds deterministic report-only config diagnostics for the existing small YAML-like grammar; current config reader fallback and CLI exit behavior remain unchanged.
- TASK-0088 adds local RC evidence: published-config and baseline-schema fixtures, a disposable 2,000-file benchmark, an evidence gate, and security response/support lifecycle/supply-chain/upgrade policies. Hosted RC evidence and maintainer-only security/release decisions remain open.
- TASK-0089 exposes Core config diagnostics through current-source `ackit config-check`. It is read-only, preserves the existing reader fallback, emits sanitized schema `2` JSON, keeps warnings non-blocking, returns `1` for errors, and requires manual obsolete-key migration.
- TASK-0090 adds a `workflow_dispatch`-only Windows/Ubuntu/macOS RC evidence workflow with read-only permissions, isolated predecessor/source tool installs, config immutability, config/baseline/SARIF checks, and the synthetic performance tripwire. Hosted execution remains maintainer-only.
- TASK-0091 migrates the executable test project to `xunit.v3` `3.2.2` and `xunit.runner.visualstudio` `3.1.5` per official guidance. Disposable and repository suites pass 169/169 tests; vulnerability and deprecation reviews are clean.
- TASK-0092 adds `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md` and `docs/MAINTAINER_RC_DECISION.md`. The local contract surface is conditionally frozen, but RC publication remains NO-GO pending hosted/remote evidence and remaining P0/P1 disposition.
- TASK-0093 adds the machine-readable schema catalog at `docs/schemas/README.md`, command JSON schema `2`, baseline schema `1`, an AgentContextKit SARIF `2.1.0` profile, sanitized golden fixtures, live-output tests, and a local contract asset gate.
- TASK-0094 centralizes English/Turkish human-readable CLI chrome, adds five command-matrix/error/JSON parity tests across all 13 language-aware JSON commands, and adds `scripts/check-localization-parity.ps1`. Stable technical tokens and machine-readable contracts remain English and language-independent.
- TASK-0094 full validation passes with 178/178 tests, clean Turkish CLI smoke, all local gates, and clean hygiene.
- TASK-0095 is complete locally with `docs/SECURITY_SUPPLY_CHAIN_EVIDENCE.md`, `docs/MAINTAINER_SECURITY_SUPPLY_CHAIN_HANDOFF.md`, and `scripts/check-security-supply-chain-evidence.ps1`. Dependency reviews, 178/178 tests, local package verification, all integrated gates, clean hygiene, and a 3.368-second benchmark pass. All remote security settings and signing/SBOM/provenance/recovery actions remain explicitly pending maintainer evidence.
- TASK-0096 is complete locally. `docs/RC_LOCAL_READINESS.md` and `scripts/check-rc-local-readiness.ps1` consolidate the final local evidence under `LOCAL READY / REMOTE NO-GO`; 178/178 tests, dependency review, package verification, hygiene, all local gates, and a 3.495-second benchmark pass. Hosted and maintainer-only gaps remain open.
- Remote `master` includes `37d5220`. TASK-0097 records that standard `ci`, published-package smoke, and source-package smoke passed for that exact commit while the dedicated manual RC evidence workflow has zero runs. Full local validation remains green at 178/178 tests with a 3.716-second benchmark.
- TASK-0098 is complete locally from read-only GitHub REST evidence that private vulnerability reporting is disabled on 2026-06-13. Activation and notification ownership remain P0 maintainer actions.
- TASK-0099 is complete locally. The published `0.2.0-alpha.1` package/release is NuGet.org repository-signed with no observed author signature, no package/release SBOM, no accessible GitHub package attestation, and public NuGet owner profile `Cyranth` versus project persona `Cynrath`; remediation remains maintainer-only.
- TASK-0100 completed a separate local-only ecosystem intelligence track reset. Related OSS tools are compared by verified license, offline behavior, API/network boundary, outputs, overlap, complementary value, privacy, maturity, and conservative integration mode; no dependency or adapter is added.
- TASK-0100 validation passed with 178/178 tests, clean source scan/doctor, parsed JSON/SARIF, sample smoke, clean hygiene, readiness/security/supply-chain gates, and local package verification.
- PROJECT-CONTROL-0101 completed the local ecosystem/product intelligence queue from TASK-0101 through TASK-0115 without dependencies, default network behavior, imports, or release actions.
- TASK-0101 through TASK-0115 are complete locally with full validation and logical commits. New controls cover evidence freshness, docs-only external workflows, executable/output/import privacy, disposable lab testing, design-only command families, default no-network behavior, docs quality, maintainer blockers, and planning-only alpha.2 scope.
- PROJECT-CONTROL-0102 explicitly authorizes TASK-0116 through TASK-0125, including validated normal pushes and the `v0.2.0-alpha.2` OIDC release sequence. Private vulnerability reporting, signing, SBOM, provenance, and owner-profile alignment remain separate decisions unless this control task explicitly changes them.
- Starting state is clean aligned `master`/`origin/master` at `8dadd16`; the exact commit has 8/8 successful standard hosted jobs.
- Secret values are never displayed, logged, persisted, or committed. Force push, history rewrite, tag movement, immutable-version overwrite, and user-change deletion remain prohibited.
- TASK-0116–0122 completed locally on 2026-06-13: local Markdown gate, scanner multi-candidate/boundary privacy hardening, suppression dedupe, baseline severity-escalation policy, unmatched-quote config diagnostics, 186-test regression/performance validation, and exact-commit OIDC release automation.
- TASK-0123 local validation passed with 186/186 tests, package inspection, full installed-tool smoke, clean source outputs, all local gates, and 3.704/3.685-second performance evidence. TASK-0124 run `27470659578` published NuGet `0.2.0-alpha.2` through OIDC, then stopped before tag/release on a missing Linux `$env:TEMP`. Portable temp fallback is prepared; recovery must skip republish, verify the existing package, and create the missing exact tag/pre-release after a new 8/8 SHA.
- TASK-0081 freezes `v0.2.0-alpha.2` as a compatible scanner precision and sanitized suppression-audit hardening release without changing version metadata.

## Source Hygiene
- Empty SDK scaffold file `src/AgentContextKit.Core/Class1.cs` has been removed.
- Tests live in `tests/AgentContextKit.Tests/AgentContextKitBehaviorTests.cs`.
- Source archive hygiene is documented in `docs/SOURCE_ARCHIVE.md`.
- `winrar_exclude.txt` contains the local ZIP/RAR exclude list.
- `.cursor/rules/project.mdc` is an intentional AI instruction file.

## v0.2 Progress
- TASK-0011 completed stack detection expansion with .NET SDK, ASP.NET Core, Razor, Blazor WebAssembly, Worker Service, Minimal API, package manager, TypeScript, and Tailwind CSS signals.
- TASK-0012 completed risk scanner precision improvements for environment samples, private key files, private key blocks, IP filtering, and configured keyword token boundaries.
- TASK-0013 completed JSON schema version 2 with generated timestamp, repository metadata, and summary fields.
- TASK-0014 completed expanded generated agent/context docs with repository health, risk summary, and recommended checks.
- TASK-0015 completed safe sample repositories for .NET Minimal API and Node/TypeScript/Tailwind stack detection.
- TASK-0016 completed NuGet package metadata review script and documentation.
- TASK-0017 completed v0.2 local readiness consolidation script and documentation.
- TASK-0018 completed `ackit scan --ci` with high/critical exit codes, scan JSON CI metadata, tests, docs, and GitHub Actions integration.
- TASK-0019 completed exit code standardization with CLI constants, focused tests, and `docs/EXIT_CODES.md`.
- TASK-0020 completed offline static HTML report generation with `ackit report`, tests, docs, safe output handling, and ignored `.ackit/reports/`.
- TASK-0021 completed example workflow documentation for local development, CI, HTML reports, public release preflight, and sample scans.
- TASK-0022 completed public release gate orchestration script and documentation.
- TASK-0023 completed v0.3 local readiness consolidation script and documentation.
- TASK-0024 completed offline static Web UI prototype generation with `ackit webui`, tests, docs, safe output handling, and ignored `.ackit/webui/`.
- TASK-0025 completed Web UI scan dashboard refinement with readiness score, review status, severity breakdown, recommended checks, tests, and docs.
- TASK-0026 completed generated file preview refinement with expected file category, present/missing status, size metadata, capped previews, continuous progress hard rule, tests, and docs.
- TASK-0027 completed risk finding browser refinement with deterministic review queue, finding IDs, match display, recommended actions, tests, and docs.
- TASK-0028 completed task preview refinement with task ID, title, inferred status, size metadata, paths, capped previews, tests, and docs.
- TASK-0029 completed v0.4 local readiness consolidation script and documentation.
- TASK-0030 completed optional LLM integration architecture with consent gates, provider boundaries, data minimization, and no live provider calls.
- TASK-0031 completed provider-neutral `ILLMProvider` request/response abstractions with fake-provider tests and no live provider calls.
- TASK-0032 completed local-only `ackit prompt-pack` dry-run Markdown generation with JSON metadata and no remote provider calls.
- TASK-0033 completed local-only `ackit context-export` approval manifest generation with JSON metadata and no remote provider calls.
- TASK-0034 completed v0.5 local readiness consolidation script and documentation.
- TASK-0035 completed v1.0 stabilization planning with local acceptance gates and follow-up task sequence.
- TASK-0036 completed stable CLI contract documentation and local contract check script.
- TASK-0037 completed config/generated-file convention documentation and local convention check script.
- TASK-0038 completed documentation/release gate freeze documentation and local gate check script.
- TASK-0039 completed v1.0 final local readiness review documentation and local readiness check script.
- TASK-0040 completed public release final cleanup with source archive hygiene, sample-aware stack detection, package URL blocker clarification, and local gate reports.
- TASK-0046 synced post-push repository status after `master` and `v0.1.0-alpha.1` were pushed.
- TASK-0047 syncs NuGet publish verification and Codex for OSS submission readiness after `AgentContextKit` version `0.1.0-alpha.1` was published and globally installed.
- TASK-0048 records NuGet global tool smoke test verification in a clean demo app and keeps Codex for OSS submission as the remaining follow-up.
- TASK-0049 prepares a Windows/Ubuntu/macOS GitHub Actions smoke workflow for the published NuGet global tool and documents alpha.2 preparation without tagging or publishing.
- TASK-0050 records the successful cross-platform smoke workflow result and adds non-blocking CI/scanner-noise backlog items for TASK-0051 and TASK-0052.
- TASK-0051 through TASK-0054 are implemented locally for alpha.2 hardening: scanner allowlist/fixture-noise reduction, Node 24 workflow readiness, Turkish output polish, and alpha.2 release preparation.
- TASK-0051 implemented conservative scanner noise reduction with safe technical domains, fixture-only placeholder email handling, and preserved Critical secret detection.
- TASK-0052 updated local workflow files for Node 24-ready official actions and explicit `windows-2025`; hosted workflow validation remains manual after push.
- TASK-0053 updated Turkish human CLI output to natural UTF-8 text while preserving JSON schema behavior.
- TASK-0054 completed alpha.2 release preparation docs without changing version, tagging, publishing, creating GitHub releases, or pushing.
- TASK-0055 implements alpha.2 release decision work: source metadata/version bump, source/current-branch smoke workflow, README command cleanup, local alpha.2 package smoke, and release doc sync.
- TASK-0055 validation passed locally: restore/build/test, scan, doctor, JSON scan, local alpha.2 package smoke, package metadata gate, documentation gate, maintainer identity scan, tracked artifact scan, exact token/local-path scan, and `git diff --check`.
- TASK-0056 completed alpha.2 publish verification and refreshed agent/public release docs for the published `v0.1.0-alpha.2` state.
- TASK-0057 is completed for GitHub repo hygiene, issue templates, PR template, maintainer guide, support matrix, contributor onboarding, and issue triage docs. The post-commit public release gate rerun passed with only the expected post-release `HEAD` warning.
- TASK-0058 is completed locally for repository settings, badges, labels, and public presentation hardening. GitHub CLI read-only status shows latest `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` passing after TASK-0057. The post-commit public release gate rerun passed with only the expected post-release `HEAD` warning.
- TASK-0059 adds scanner SARIF output and GitHub Code Scanning readiness docs. Upload stays example-only and maintainer-controlled. Pre-commit validation passed with restore, Release build, 72/72 tests, self-scan, doctor, JSON scan, SARIF generation/parse, installed `ackit` checks, hygiene scans, `git diff --check`, and v1.0 documentation gate. Post-commit public release gate rerun passed with no blocking items and only the expected post-release `HEAD` warning.
- TASK-0060 clarifies source/current-package SARIF availability and adds GitHub Actions usage examples without activating any new workflow or upload. Pre-commit validation passed with restore, Release build, 72/72 tests, self-scan, doctor, JSON scan, SARIF generation/parse, installed `ackit` checks, hygiene scans, `git diff --check`, and v1.0 documentation gate. Post-commit public release gate rerun passed with no blocking items and only the expected post-release `HEAD` warning.
- TASK-0061 adds sample gallery and demo docs without committing generated sample artifacts. Pre-commit validation passed with restore, Release build, 72/72 tests, self-scan, doctor, JSON scan, SARIF generation/parse, installed `ackit` version/help, sample smoke, hygiene scans, `git diff --check`, and v1.0 documentation release gate. The post-commit public release gate passed with no blocking items and only the expected post-release `HEAD` warning.
- TASK-0062 adds central scanner rule catalog metadata, additive JSON `ruleId`, SARIF rule help metadata, config-driven `safeDomains`, `ignoredPaths`, and `ignoredFindingIds`, expanded scanner risk patterns, and `docs/SCANNER_RULES.md`. Pre-commit validation passed with restore, Release build, 83/83 tests, self-scan, doctor, JSON scan, SARIF generation/parse, sample smoke, installed `ackit` version/help, hygiene scans, `git diff --check`, config/generated convention gate, v0.2 readiness gate, and v1.0 documentation release gate. The post-commit public release gate passed with no blocking items and only the expected post-release `HEAD` warning.
- TASK-0063 adds README preview guidance, `docs/VISUAL_ASSETS.md`, `docs/WEB_UI_PREVIEW.md`, and a safe generic flow diagram. Validation passed with restore, Release build, 83/83 tests, self-scan, doctor, JSON scan, SARIF generation/parse, sample smoke, installed `ackit` version/help, hygiene scans, `git diff --check`, v1.0 documentation release gate, and post-commit public release gate. The final public gate kept only the expected post-release `HEAD` warning and manual remote tag verification note.
- TASK-0064 prepares `0.2.0-alpha.1` locally. Local package smoke passed with `ackit sarif`, SARIF parse, DemoApp smoke, expected fake-secret exit code 2, and final clean scan. Source validation, hygiene, config/v0.2/v1.0 gates, `scripts/verify-release.ps1`, and post-commit public release gate passed. Push, tag, GitHub Release, NuGet publish, install verification, and README published install update remain future maintainer actions.
