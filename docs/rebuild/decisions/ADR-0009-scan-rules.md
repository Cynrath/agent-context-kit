# ADR-0009: Scan engine & rule ID namespace

Status: Proposed · Date: 2026-08-22

## Decision
Pipeline architecture per REQ-SCAN-001. Rule IDs use category-prefixed format `ACKIT<NNN>` allocated from a registry table (`src/core/scanner/rules/registry.ts`) with per-rule metadata; semantic changes to an existing ID follow finding-schema versioning (documented in docs/reference/rules.md). Deterministic output ordering: relativePath → ruleId → line → column. Secret evidence is redacted at the finding-construction layer, before any reporter sees it.

## Rationale
Central registry prevents ID collisions and drift between code and docs; redaction-at-construction makes leaks structurally impossible downstream (v1 lesson #2/#3 family).

## Alternatives rejected
Pure category strings as IDs (unstable for baselines/SARIF).
