# ADR-0003: Offline-first / no-telemetry contract

Status: Accepted (global invariant) · Date: 2026-08-22

## Decision
AgentContextKit performs zero network calls in product code paths. No telemetry, analytics, crash reporting, update checks, or third-party uploads. All functionality works air-gapped. Policy resolution never auto-fetches; npm-package policy requires pre-installation by the user.

## Enforcement
- REQ-GOV-001/002 (requirements contract) mapped to every network-capable surface.
- Network-spy tests in policy/config suites assert zero outbound attempts.
- Supply-chain review at TASK-0285/0286 re-verifies dependency trees for phone-home behavior.

## Rationale
The tool inspects potentially hostile/private repositories; any egress would be a trust violation and a data-leak channel. This is the product's core promise to enterprise users.
