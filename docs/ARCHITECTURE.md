# Architecture

## External Interoperability Boundary
AgentContextKit currently has no external tool runtime integration. Future interoperability must follow `docs/INTEROPERABILITY_DESIGN.md`: Core stays dependency-free from external SDKs, executable discovery/execution is explicit opt-in, outputs stay under ignored repository-relative paths, external rule/tool namespaces remain separate, and failures cannot change default scan/doctor behavior.

## Solution Layout
```text
AgentContextKit.sln
src/
  AgentContextKit.Cli/
  AgentContextKit.Core/
tests/
  AgentContextKit.Tests/
```

## Boundaries
- `AgentContextKit.Cli`: argument parsing, console output, exit codes.
- `AgentContextKit.Core`: repository scanning, stack detection, risk scanning, template rendering, task generation, config, and reporting models.
- `AgentContextKit.Tests`: unit tests for Core behavior and selected CLI-safe flows.

## Core Services
- `IRepositoryScanner`
- `IInstructionAuditor`
- `IInstructionOptimizationProposalGenerator`
- `IInstructionAuditReportWriter`
- `IStackDetector`
- `IProjectMapBuilder`
- `IRiskScanner`
- `ISecretScanner`
- `IBrandPiiScanner`
- `RiskRuleCatalog`
- `BaselineFingerprint`
- `BaselineStore`
- `BaselineClassifier`
- `IRiskReporter`
- `ITemplateRenderer`
- `ITextProvider`
- `ITaskFileGenerator`
- `IAgentInstructionGenerator`
- `IHtmlReportGenerator`
- `IWebUiGenerator`
- `ISarifReportWriter`
- `ILLMProvider`
- `IMcpServer`
- `IFileSystem`
- `IClock`
- `IAckitConfigReader`
- `IAckitConfigValidator`
- `IAckitConfigWriter`

## Design Notes
The CLI must not contain business logic. Core services are designed to be testable with file-system and clock abstractions. MVP templates are embedded in code for reliability, with a future path to external template packs.

`HtmlReportGenerator` creates self-contained local HTML reports from scan results. It encodes repository content, rejects output paths outside the repository, and skips existing files by default.

`WebUiGenerator` creates self-contained local Web UI prototype files from scan results and selected local task/context previews. It uses the same local-only trust boundary as HTML reports: encoded repository text, repository-relative output, no external assets, and no overwrite by default.

`SarifReportWriter` creates SARIF 2.1.0 scanner output from existing scan results. It keeps output local, requires a repository-relative `.sarif` path, maps findings to stable `ACKIT` rule IDs, emits repository-relative artifact URIs, and omits raw scanner match values.

`RiskRuleCatalog` is the central source of stable scanner rule IDs, default severity context, descriptions, and recommendations. SARIF rule metadata and JSON finding `ruleId` values use this catalog. Configurable `safeDomains`, `ignoredPaths`, and `ignoredFindingIds` can suppress only non-Critical scanner noise; Critical findings remain reportable.

`RiskScanResult` carries visible findings plus sanitized config suppression records. `ScanResult.Suppressions` is additive and defaults to an empty list so existing positional construction remains compatible. Audit-capable interface methods have default implementations that return existing findings with an empty audit, allowing custom implementations to opt in without an immediate source break. The CLI exposes this audit only through local human/JSON scan output; SARIF continues to contain visible findings only.

`BaselineSchema`, `BaselineEntry`, `BaselineManifest`, and `BaselineFingerprint` define the baseline identity boundary. `BaselineStore` validates repository-relative JSON paths, schema/algorithm compatibility, and fingerprint integrity; it refuses replacement unless the caller explicitly requests update. `BaselineClassifier` assigns deterministic same-rule/file occurrence numbers and classifies every visible finding as existing or new. The CLI exposes this through `ackit baseline` and opt-in `scan --baseline`; default scan behavior is unchanged.

The same `BaselineEvaluation` instance can be passed to SARIF, HTML report, and Web UI generators. Generators validate finding-count alignment and render additive metadata only when baseline mode is explicit. SARIF uses sanitize-only result properties; local HTML outputs add counts/status labels while retaining every finding.

`AckitConfigValidator` is a read-only Core service with stable `ACKITCFG` diagnostic codes. It validates the existing small YAML-like grammar and safety boundaries without changing `AckitConfigReader` fallback behavior. The CLI exposes it through `ackit config-check`: warnings remain non-blocking, errors return `1`, missing config reports the valid default state, and diagnostic messages omit raw config values.

`ITextProvider` owns shared English/Turkish human-readable CLI chrome such as headings, labels, summaries, generated-file statuses, and known argument errors. The CLI may compose these labels with stable technical values from Core. Command/option names, severity names, rule IDs, diagnostic codes, paths, JSON fields/status tokens, and exit decisions remain language-independent. `scripts/check-localization-parity.ps1` and `LocalizationParityTests` enforce that boundary across every language-aware command.

The post-`1.0.0-rc.1` instruction-audit path is split across three Core boundaries. `InstructionAuditor` discovers supported local instruction surfaces, parses source-located rules, resolves nested `AGENTS.md` scope and valid overrides, computes deterministic context estimates, and emits stable `ACKITOPT` findings. `InstructionAuditReportWriter` maps that domain to JSON, Markdown, SARIF 2.1.0, and self-contained HTML. `InstructionOptimizationProposalGenerator` performs only review-safe consolidation, preserves source mappings and mandatory constraints, leaves conflicts unresolved, sanitizes rendered rule text, and writes solely to an explicit non-instruction Markdown path without overwrite. The CLI owns option validation, localization, output selection, and exit decisions; no required network or provider path is introduced.

These SARIF, rule catalog, and config allowlist capabilities are part of current source and the published `1.0.0-rc.1` package. For RC upgrade evidence, published immutable `0.2.0-alpha.4` is the exact predecessor; `0.2.0-alpha.3` remains older historical release evidence.

`StackDetector` uses repository file paths plus limited local reads of project/source files through `IFileSystem`. This keeps stack detection offline and testable while allowing project SDK signals such as `Microsoft.NET.Sdk.Web`, `Microsoft.NET.Sdk.Razor`, `Microsoft.NET.Sdk.BlazorWebAssembly`, and `Microsoft.NET.Sdk.Worker`.

For main repository stack detection, `StackDetector` ignores sample, docs, generated output, template, and fixture-style paths such as `samples/`, `docs/`, `.ackit/`, `.codex/`, `.cursor/`, `templates/`, `fixtures/`, and test data folders. Those files can still be scanned by `RiskScanner`; the exclusion only prevents sample projects from being reported as the main repository stack. .NET global tool projects are reported as `.NET CLI / .NET Tool` when tool packaging metadata such as `PackAsTool` or `ToolCommandName` is present.

Optional future LLM integration is documented in `docs/LLM_INTEGRATION_ARCHITECTURE.md`. `ILLMProvider` defines the provider-neutral Core boundary, but no provider adapter or live provider call exists today. Future provider implementations should stay behind Core interfaces, use dependency injection, require explicit user consent before export, and keep the CLI limited to argument parsing and output mapping.

`IMcpServer` and `McpRouter` implement the first Core-only MCP JSON-RPC prototype. The router handles provided JSON strings for `initialize`, `tools/list`, and `tools/call`, exposes `ackit.scan`, `ackit.findings`, `ackit.context`, and `ackit.health`, and keeps real stdio process handling, HTTP transports, remote calls, and child-process spawning out of scope.

Release readiness tooling lives in repository scripts and documentation rather than Core runtime services. Package metadata gates, public release audits, source archive hygiene, and maintainer handoff steps are local-only release checks and do not push, tag-push, publish, upload content, or call remote providers.

## Output Schema
Human-readable CLI output is optimized for short terminal feedback. JSON output is produced by the CLI/Core report adapter from Core models and includes `schemaVersion` and `toolVersion` metadata for automation. Optimize proposal metadata is optional and additive under schema v2; it contains output status and aggregate metrics/counts, not raw instruction bodies.