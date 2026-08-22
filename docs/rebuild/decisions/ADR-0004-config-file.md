# ADR-0004: Configuration identity — `ackit.yml`

Status: Proposed (confirm in TASK-0266) · Date: 2026-08-22

## Decision
Canonical user config file is `ackit.yml` at repository root (YAML). Internal/cache state lives under `.ackit/` (cache dir, skills lock). Schema carries mandatory `schemaVersion`; unknown major → clear upgrade error. Precedence: defaults < config < policy extends < CLI flags (deterministic merge).

## Rationale
A visible root file documents agent-tooling posture to the whole team; `.ackit/` stays disposable generated state. Distinct names prevent the v1 ambiguity where config and cache mixed under one directory.

## Alternatives rejected
`.ackit/config.yml` (hides posture from contributors browsing root); JSON (no comments for team guidance).
