# Product Spec

The default runtime network policy is `docs/NO_NETWORK_DEFAULT_POLICY.md`: local repository processing, no repository upload, no AI API call, no telemetry, and no external-tool invocation.

The product workflow is standardized in `docs/AGENT_CONTEXT_PIPELINE.md`: Inspect, Harden, Generate, Review, Optional external enrichment, Validate, Handoff, and Release decision. External enrichment is optional, manually controlled, and outside the default AgentContextKit trust boundary.

## Summary
AgentContextKit is an offline-first .NET CLI that prepares repositories for safer AI-assisted development and public OSS readiness.

## Goals
- Generate reliable context files for AI coding agents.
- Detect repository stack and project structure.
- Establish task-first development workflow.
- Report secret/PII/brand/local path risks.
- Use stable scanner rule IDs and narrow config allowlists for maintainable risk reporting.
- Improve OSS readiness with docs and health checks.
- Provide JSON output for CI/script integrations.
- Provide local static review artifacts for reports and Web UI prototype review.
- Support incremental adoption through sanitized, baseline-aware CI policy and deterministic config diagnostics.
- Audit AI-agent instruction quality, nested applicability, conflicts, and estimated context cost without requiring a model or rewriting source instructions.

## Non-goals For MVP
- Hosted/server Web UI.
- LLM API integration.
- Automatic redaction.
- Remote repository creation.
- Automatic publishing from push or pull-request events.
- Automatic application of instruction optimization proposals.

## Next Product Direction
The complete RC1 prerelease includes baseline-aware CI policy, configuration diagnostics, MCP stdio, `ackit watch`, `diff`, `trim`, `README.nuget.md` rendering, and ACKit-first dogfood. NuGet `1.0.0-rc.1`, exact tag, GitHub prerelease/body/assets, both attestations, and Windows/Ubuntu/macOS installed-package smoke are verified. RC1 is complete as a prerelease, not a `1.0.0` GA claim; alpha4 remains immutable predecessor evidence.

## Current-Source Optimize

`ackit optimize` was added after RC1. It discovers supported instruction surfaces, resolves nested `AGENTS.md` scope, emits stable `ACKITOPT` findings and deterministic size estimates, supports console/JSON/Markdown/SARIF/offline HTML, and can create an explicit-path review proposal. The proposal is non-overwriting and has no apply mode. The feature is currently documented and validated from source; no successor package version or publication is claimed here.

## Future Optional LLM Scope
v0.5 may add optional LLM-assisted workflows, but the default product remains offline-first. Any future provider integration must require explicit user consent, dry-run context review, safe secret handling, and local auditability before remote calls or context export.

## Target Users
- AI-assisted developers.
- OSS maintainers.
- Small teams, agencies, and freelancers.
- Teams cleaning private projects before public release.

## Current Commands
This list describes current source and published prerelease `1.0.0-rc.1`; `0.2.0-alpha.4` remains compatible predecessor evidence.

- `init`
- `scan`
- `scan --ci`
- `optimize`
- `config-check`
- `baseline`
- `sarif`
- `report`
- `webui`
- `prompt-pack`
- `context-export`
- `generate`
- `task`
- `redact-check`
- `doctor`
- `hooks`
- `mcp`
- `watch`
- `diff`
- `trim`
- `version`
- `help`

## Safety Principles
- Offline-first.
- Local-first.
- Security-first.
- Existing files are skipped by default.
- Optimize source files are never rewritten; proposals require an explicit safe output path and human review.
- Risk reports are explicit and severity-based.