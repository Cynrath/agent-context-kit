# Release-Candidate Contract Freeze

## Status
Conditional local freeze refreshed on 2026-07-10 by TASK-0235. This document records the V100 target contract surface that passed local preparation; it does not select a release-candidate version, record final-candidate acceptance, approve publication, or close hosted blockers.

The selected source-impacting local evidence base is `b1604ae1e73017521d28e5a83f328bb1347406b6`. Current source/package metadata and the immutable published release are `0.2.0-alpha.4`; `0.2.0-alpha.3` is the hosted predecessor input. No new version is selected.

TASK-0232 records the current shipped/documented surface as the V100 target contract. Status: `MAINTAINER_DECISION_RECORDED` and `OPEN_PENDING_FINAL_CANDIDATE_ACCEPTANCE`.

## Frozen Contract Inventory
| Contract | Frozen Value | Normative Detail |
| --- | --- | --- |
| Package/tool identity | `AgentContextKit` / `ackit` | `docs/PACKAGING.md`, `docs/CLI_CONTRACT.md` |
| CLI command and option surface | Current command/option list, including config/baseline/SARIF/report/Web UI/context/hooks/MCP/diff/trim/watch and scan glob options | `docs/CLI_CONTRACT.md`, `docs/CLI_REFERENCE.md` |
| Exit codes | General codes `0`, `1`, and `2` plus command-specific meanings | `docs/EXIT_CODES.md` |
| Config format | Config schema `1`; read-only diagnostics; no automatic migration | `docs/CONFIGURATION.md`, `docs/CONFIGURATION_DIAGNOSTICS.md` |
| JSON output | JSON schema `2`; common envelope, command requirements, additive-field policy, machine-readable schema/golden catalog | `docs/JSON_OUTPUT.md`, `docs/schemas/ackit-command-output-v2.schema.json` |
| Baseline | Baseline schema `1`; `sha256-rule-path-location-occurrence-v1`; machine-readable schema/golden fixture | `docs/BASELINE_MODEL.md`, `docs/schemas/ackit-baseline-v1.schema.json` |
| SARIF | SARIF `2.1.0`; repository-relative paths; no raw scanner match values; local machine-readable profile | `docs/SARIF_OUTPUT.md`, `docs/schemas/ackit-sarif-profile-v1.schema.json` |
| Scanner rules | Stable `ACKIT` rule IDs and Critical suppression boundary | `docs/SCANNER_RULES.md`, `docs/SECURITY_MODEL.md` |
| Generated files | Repository-relative paths; skip existing files by default; local `.ackit/` artifacts ignored | `docs/CONFIG_GENERATED_CONVENTIONS.md` |
| Upgrade predecessor | Published immutable `AgentContextKit` `0.2.0-alpha.3` for the next hosted input | `docs/V100_FINAL_CANDIDATE_LOCAL_SELECTION.md`, `docs/RC_HOSTED_EVIDENCE.md` |
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
- Machine-readable stability includes commands/options, JSON envelope/schema fields, command identifiers, scanner rule IDs, config diagnostic IDs, exit-code semantics, and the AgentContextKit SARIF profile.
- Localized human-readable prose is not byte-for-byte stable and may improve without a contract version change when technical tokens and machine-readable semantics remain invariant.

Any breaking change after this freeze requires a new task that reopens the contract, records versioning and migration impact, updates tests/docs, and reruns all release-candidate evidence.

## Local Evidence
- TASK-0230 confirmed the CLI/config/JSON/SARIF/localization/readiness gates against alpha4 source with the 428/428 baseline.
- TASK-0232 recorded the target-contract decision and corrected current alpha4 contract references.
- TASK-0233 expanded the 2,000-file local tripwire to a mixed corpus: 5.185 seconds, 44.6 MiB peak working set, interruption PASS, unreadable-file focused tests 2/2.
- TASK-0234 selected exact source-impacting evidence base `b1604ae1e73017521d28e5a83f328bb1347406b6` and validated alpha4/alpha3 candidate inputs locally.
- TASK-0235 reran CLI, config/generated conventions, JSON assets, localization parity, and V100 documentation gates.

## Evidence Not Yet Complete
- Green hosted `release-candidate-evidence` runs on Windows, Ubuntu, and macOS for the final pushed docs-only successor to the selected source base.
- Final maintainer acceptance of the candidate-specific CLI/config/JSON/baseline/SARIF/localization review.
- Hosted provenance/attestation evidence on the next separately authorized publish path.
- Candidate version selection, package diff review, tag, GitHub pre-release, NuGet publication, and post-publish smoke in later authorized tasks.

Private vulnerability reporting and primary/backup security ownership are complete for the current repository state. Signing and SBOM have dated accepted-risk dispositions; recovery ownership is reconciled. Those decisions do not replace the remaining hosted/final-candidate evidence.

## Freeze Decision
The V100 target contract is prepared under a conditional local freeze. V100-02 remains `OPEN_PENDING_FINAL_CANDIDATE_ACCEPTANCE`. The project remains **NO-GO for RC publication** until the conditions in `docs/MAINTAINER_RC_DECISION.md` are satisfied and recorded by the maintainer.
