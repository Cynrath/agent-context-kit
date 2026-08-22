# ADR-0002: Single-package architecture

Status: Accepted · Date: 2026-08-22

## Decision
Ship exactly one npm package (`@cynrath/agent-context-kit` — unscoped `agent-context-kit` confirmed taken by an unrelated third party; see ADR-0013). Internal modularity via folders under `src/core/*`, not separate packages. No `@ackit/core|cli|mcp` splits until a real external consumer need is documented.

## Rationale
Artificial package fragmentation inflates supply-chain surface, version-sync cost, and DX friction (MS§5.3). The Manus-audit source/package drift lesson is countered by single-truth identity checks (REQ-ARCH-009), which are trivial in a single package.

## Consequences
Public API surface controlled via entry-point exports (TASK-0285); refactors stay internal and cheap.
