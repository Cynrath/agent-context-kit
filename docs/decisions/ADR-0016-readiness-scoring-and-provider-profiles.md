# ADR-0016: Readiness Scoring Model + Provider Profile Model

Status: Accepted · Date: 2026-08-27

## Context

Epics A (readiness scoring) and C (provider-aware profiles) both need declarative, deterministic, offline models that explain every result.

- Readiness must score 0–100 with per-category drill-down, no opaque/LM scoring, CI-gateable, comparison/baseline-aware, and regression-gated against drift.
- Provider profiles must support at least Codex, Claude Code, GitHub Copilot, Gemini CLI, and generic, with correct `applyTo`/file-convention behavior without any provider API calls.

## Decision

### Readiness scoring

- **Location**: `src/core/readiness/` (new pure module). Export `scoreRepository(input): ScoreReport` where `input` bundles `InstructionGraph`, `PackResult`/`PackManifest`, `ScanResult`, `SkillCatalog`, `EffectivePolicy`, `TaskHealth`. No I/O inside scorer; caller gathers inputs via SDK.
- **Categories** (6 normative): Instructions (25%), Security (25%), Context Efficiency (20%), Task Hygiene (10%), Skills (10%), Policy (10%) → overall weighted mean, integer 0–100, rounded half-up. Emphasis favors security + instructions but any category N/A (e.g., repo has no `docs/tasks`) is excluded and weights renormalized.
- **Deductions**: `Deduction { category, points, severity: info|low|medium|high|critical, reason, evidence { relativePath, line? }, remediation?, stableId }`. Severity → points: critical 15, high 8–12, medium 4–5, low 1–2, info 0. Every non-zero deduction is explainable and machine-readable.
- **Stability contract**: Fixture repo `fixtures/readiness-golden/` has a committed golden JSON snapshot; a regression test asserts identical overall + per-category + deduction ID/order for the same inputs. Intentional scoring changes require a version bump of `ackit.readiness.v1` and a recorded re-baseline.
- **Outputs**: Terminal tree with bars, `ackit scan --json` / `ackit readiness --json` `ackit.readiness.v1` schema (`{ overall, categories[], deductions[], version, inputsHash }`), CI threshold flag `--fail-below <n>` (maps to exit 1). See REQ-V020-A-001..006.

### Provider profiles

- **Schema**: `schemas/profile.schema.json` v1 `{ name, provider: codex|claude|copilot|gemini|generic, instructionApplicability, fileConventions, contextBudget: { maxTokens, includePriority }, precedenceOverrides? }`. Strict `zod` validation, no JS inside profiles.
- **Built-ins**: `templates/profiles/{codex,claude,copilot,gemini,generic}.yml` (YAML) validated at build time. Each profile documents its vendor-specific facts with a source link in comments (maintenance strategy: per-provider fixture `fixtures/profile-<provider>/` expected to catch drift; update profile only when fixture fails with evidence).
- **Selection precedence**: CLI `--profile` > `ackit.yml` key `profile: <name>` > auto-detect (by present instruction files: `AGENTS.md` → codex, `CLAUDE.md` → claude, `.github/copilot-instructions.md` → copilot, `GEMINI.md` → gemini, else `generic`) with deterministic tie-break (`generic` wins if ambiguous). Unknown provider → `generic` fallback + diagnostic `PROFILE-UNKNOWN`.
- **Integration**: `pack` consumes `profile.contextBudget`/`includePriority`; `instructions --provider` filters through profile `fileConventions`; `optimize` uses profile to flag redundant provider guidance. `ackit diagnostics --json` reports `{ requested, resolved, source }`. No network.

## Rationale

Pure-function scorer + declarative profile keeps determinism (REQ-V020-GOV-005), enables reuse by CLI/MCP/Action/dashboard/VS Code (single engine via SDK), and makes weighting/vendor facts reviewable (ADR-0015 consolidated model). Explicit N/A handling avoids penalizing repos that intentionally omit a surface.

## Alternatives considered

- LLM-scored readiness: rejected — non-deterministic, non-offline.
- Embedded provider profiles in code (switch-case): rejected — not declarative/versioned; YAML+schema is portable/machine-readable.
- Per-provider npm packages: rejected — would violate single-package core (ADR-0002).

## Consequences

- `src/core/readiness/` and `src/core/profiles/` (or `src/core/instructions/profiles.ts`) become new public SDK exports `scoreRepository` and profile types (stability via ADR-0021).
- Weight changes and profile edits are versioned and snapshot-gated.
- Dashboard (ADR-0019) and VS Code (ADR-0021) reuse the same scoring/profiles via SDK.

## Related requirements

REQ-V020-A-001..006, REQ-V020-C-001..005.

## References

- `src/index.ts` (SDK surface, extended)
- `docs/v0.2.0/REQUIREMENTS.md` §2–4
