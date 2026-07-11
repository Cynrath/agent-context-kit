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

## Non-goals For MVP
- Hosted/server Web UI.
- LLM API integration.
- Automatic redaction.
- Remote repository creation.
- Automatic publishing from push or pull-request events.

## Next Product Direction
The complete alpha.4 release includes baseline-aware CI policy, configuration diagnostics, MCP stdio, `ackit watch`, `diff`, `trim`, `README.nuget.md` rendering, and ACKit-first dogfood. NuGet `1.0.0-rc.1` freezes that reviewed surface and is installable, but TASK-0244's single recovery attempt stopped before mutation; tag/GitHub prerelease/provenance remain absent, so this is a partial immutable publication, not a completed release or GA claim.

## Future Optional LLM Scope
v0.5 may add optional LLM-assisted workflows, but the default product remains offline-first. Any future provider integration must require explicit user consent, dry-run context review, safe secret handling, and local auditability before remote calls or context export.

## Target Users
- AI-assisted developers.
- OSS maintainers.
- Small teams, agencies, and freelancers.
- Teams cleaning private projects before public release.

## Current Commands
This list describes source candidate `1.0.0-rc.1` and the compatible published `0.2.0-alpha.4` package surface.

- `init`
- `scan`
- `scan --ci`
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
- Risk reports are explicit and severity-based.
