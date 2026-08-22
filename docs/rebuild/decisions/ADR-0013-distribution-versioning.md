# ADR-0013: Package distribution strategy & versioning

Status: Accepted · Date: 2026-08-22 (registry check executed in TASK-0266)

## Decision

Package name: **`@cynrath/agent-context-kit`** (scoped fallback selected). CLI command is `ackit` in all cases. Version strategy restarts fresh for vNext (no RC-compat with C# line); development version `0.1.0` until first authorized publish decision. CHANGELOG opens with the rebuild entry; v1 noted as legacy. Publishing/tag/release remain user-authorized actions outside agent authority (REQ-GOV-010).

Registry verification evidence (2026-08-22, read-only lookup of `registry.npmjs.org` by the agent, not product code):

- Unscoped `agent-context-kit` is **taken**: unrelated third-party package ("Agent Context Kit (ACK)" by Ravneet Grewal), latest `0.1.4`, last modified 2025-11-08.
- Scoped `@cynrath/agent-context-kit` returns HTTP 404 → available. Selected per pre-decided preference order.

## Rationale
Separates the new product's version timeline from immutable published artifacts of the .NET line, eliminating any ambiguity about provenance.

## Consequences
README ships an honest unpublished-status note until a publish task is explicitly authorized and executed.
