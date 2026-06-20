# Release-Candidate Contract Freeze

## Status
Conditional local freeze prepared on 2026-06-12. This document records the contract surface that passed local review; it does not select a release-candidate version, approve publication, or close hosted and maintainer-only blockers.

Current source/package metadata is being prepared as `0.2.0-alpha.3` by TASK-0203. This does not approve publication or change the frozen compatibility surface by itself.

## Frozen Contract Inventory
| Contract | Frozen Value | Normative Detail |
| --- | --- | --- |
| Package/tool identity | `AgentContextKit` / `ackit` | `docs/PACKAGING.md`, `docs/CLI_CONTRACT.md` |
| CLI command and option surface | Current command list, including `config-check`, `baseline`, and baseline-aware output options | `docs/CLI_CONTRACT.md`, `docs/CLI_REFERENCE.md` |
| Exit codes | General codes `0`, `1`, and `2` plus command-specific meanings | `docs/EXIT_CODES.md` |
| Config format | Config schema `1`; read-only diagnostics; no automatic migration | `docs/CONFIGURATION.md`, `docs/CONFIGURATION_DIAGNOSTICS.md` |
| JSON output | JSON schema `2`; common envelope, command requirements, additive-field policy, machine-readable schema/golden catalog | `docs/JSON_OUTPUT.md`, `docs/schemas/ackit-command-output-v2.schema.json` |
| Baseline | Baseline schema `1`; `sha256-rule-path-location-occurrence-v1`; machine-readable schema/golden fixture | `docs/BASELINE_MODEL.md`, `docs/schemas/ackit-baseline-v1.schema.json` |
| SARIF | SARIF `2.1.0`; repository-relative paths; no raw scanner match values; local machine-readable profile | `docs/SARIF_OUTPUT.md`, `docs/schemas/ackit-sarif-profile-v1.schema.json` |
| Scanner rules | Stable `ACKIT` rule IDs and Critical suppression boundary | `docs/SCANNER_RULES.md`, `docs/SECURITY_MODEL.md` |
| Generated files | Repository-relative paths; skip existing files by default; local `.ackit/` artifacts ignored | `docs/CONFIG_GENERATED_CONVENTIONS.md` |
| Upgrade predecessor | Published `AgentContextKit` `0.2.0-alpha.1` | `docs/UPGRADE_COMPATIBILITY.md` |
| Safety boundary | Offline-first; no repository upload, telemetry, automatic redaction, remote LLM call, publish, tag, or push | `docs/CLI_CONTRACT.md`, `docs/SECURITY_MODEL.md` |

## Compatibility Rules
- Removing or renaming commands/options, changing option meaning, or changing an existing exit decision is breaking.
- Removing/renaming JSON fields, changing field types/semantics, or changing the common envelope requires a JSON schema increment and migration notes.
- New optional JSON fields are additive when existing consumers can safely ignore them.
- Config schema `1` remains readable. Obsolete keys are diagnosed and require manual migration; commands do not rewrite config automatically.
- Baseline schema or fingerprint algorithm changes require a new identifier, compatibility fixtures, and migration guidance. Existing fingerprints must not be silently reinterpreted.
- SARIF stays at `2.1.0`; additive sanitized properties are allowed, while raw matches and absolute local paths remain prohibited.
- Critical findings remain visible and cannot be silently suppressed by config.
- Existing generated files remain protected by skip-by-default behavior unless an explicit command option documents replacement.
- English/Turkish human-readable labels may differ, but command/option names, JSON fields and status tokens, rule/diagnostic IDs, paths, and exit decisions remain language-independent.

Any breaking change after this freeze requires a new task that reopens the contract, records versioning and migration impact, updates tests/docs, and reruns all release-candidate evidence.

## Local Evidence
- Release build completed with zero warnings and zero errors.
- 178/178 tests passed after the xUnit v3 migration and localization parity expansion.
- CLI/config/localization contract gates passed.
- JSON and SARIF outputs parsed successfully.
- Config/baseline upgrade fixtures passed.
- Self-scan, doctor, sample smoke, dependency vulnerability/deprecation review, hygiene, package verification, and RC evidence gates passed.
- The local 2,000-file synthetic benchmark stayed below the documented 30-second tripwire.

## Evidence Not Yet Complete
- Green hosted `release-candidate-evidence` runs on Windows, Ubuntu, and macOS for the reviewed commit.
- Final invalid-invocation and English/Turkish parity review for the selected candidate.
- Enabled and verified private GitHub vulnerability reporting.
- Maintainer decisions for signing, SBOM, provenance, and package recovery publication.
- Candidate version selection, package diff review, tag, GitHub pre-release, NuGet publication, and post-publish smoke.

## Freeze Decision
The local contract surface is conditionally frozen for release-candidate preparation. The project remains **NO-GO for RC publication** until the conditions in `docs/MAINTAINER_RC_DECISION.md` are satisfied and recorded by the maintainer.
