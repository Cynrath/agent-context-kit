# ADR-0005: Filesystem root boundary model

Status: Accepted · Date: 2026-08-22

## Decision
All file access flows through one engine (`src/core/filesystem`): requested path → normalize → realpath → containment check against canonical repository root. Resolved targets outside root are denied (exit-class 4 diagnostics). Symlinks/junctions/reparse points are followed only when their canonical target stays inside root; cycles terminate via visited-canonical-set with diagnostic. Limits (size/count/bytes/depth/time/concurrency) and AbortSignal cancellation are engine-level, emitting diagnostics on breach — never silent truncation.

## Rationale
Closes v1 lessons #1/#8 at the only layer that can enforce them uniformly for scan, pack, skills, and MCP surfaces. Windows reparse behavior gets first-class fixtures (REQ-FS-002/006) because the dev machine is Windows.

## Consequences
Every feature consumes the engine; ad-hoc fs calls in feature code are lint-banned pattern (code-review rule).
