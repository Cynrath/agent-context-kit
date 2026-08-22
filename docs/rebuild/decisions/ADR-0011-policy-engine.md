# ADR-0011: Policy engine & plugin security boundary

Status: Proposed · Date: 2026-08-22

## Decision
Policy-as-code only: versioned YAML documents with `extends` chains (local files + already-installed npm packages), deterministic merge, scoping (org/repo/path), severity overrides, lockable rules, thresholds, suppressions with reason+expiry, and a policy digest embedded in outputs/cache keys. Resolution is offline by construction — no remote URL fetch, ever. No arbitrary JavaScript plugin execution in vNext; rule packs are declarative. Any future plugin model requires a new ADR with a concrete sandbox design.

## Rationale
Enterprise capability = auditable determinism, not extensibility-at-any-cost. The `require(pkg).run(repo)` pattern is rejected as an unbounded code-execution vector against hostile repositories.

## Consequences
Extensibility requests route to declarative rule types; lock enforcement gives central teams real authority.
