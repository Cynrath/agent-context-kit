# ADR-0013: Package distribution strategy & versioning

Status: Proposed (name freeze in TASK-0266 after registry check) · Date: 2026-08-22

## Decision
Package name preference order: `agent-context-kit` (unscoped) → `@cynrath/agent-context-kit` (fallback if unavailable). CLI command is `ackit` in all cases. Version strategy restarts fresh for vNext (no RC-compat with C# line); development version `0.1.0` until first authorized publish decision. CHANGELOG opens with the rebuild entry; v1 noted as legacy. Publishing/tag/release remain user-authorized actions outside agent authority (REQ-GOV-010).

## Rationale
Separates the new product's version timeline from immutable published artifacts of the .NET line, eliminating any ambiguity about provenance.

## Consequences
README ships an honest unpublished-status note until a publish task is explicitly authorized and executed.
