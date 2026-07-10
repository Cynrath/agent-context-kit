# AgentContextKit 1.0.0-rc.1 — Draft Release Body

> Draft only. `1.0.0-rc.1` is prepared for exact-candidate validation and is not published. Do not use this body until a separate publication task is explicitly authorized.

## Highlights

- Frozen CLI command, option, exit-code, config, baseline, JSON, SARIF, generated-file, and offline-safety contracts.
- Read-only config diagnostics with schema `1`, no automatic migration, and exact `0.2.0-alpha.4` predecessor compatibility evidence.
- Deterministic baseline-aware CI policy and machine-readable JSON schema `2` / SARIF `2.1.0` assets.
- English/Turkish parity for help, known errors, exit behavior, and language-independent JSON semantics.
- Expanded 2,000-file mixed-corpus time and peak-memory evidence plus interruption and unreadable-file regression coverage.
- Recorded primary/backup security notification and package recovery ownership.

## Compatibility

The package ID remains `AgentContextKit`, the global tool command remains `ackit`, and the reviewed alpha4 command surface is preserved. Candidate validation upgrades from published predecessor `0.2.0-alpha.4` without rewriting `.ackit/config.yml`.

## Known Limitations

- This is a release candidate, not a `1.0.0` GA claim.
- Author signing and SBOM publication remain documented bounded accepted risks.
- Publish-path provenance is not part of RC evidence; it must be created and verified for the exact release nupkg during the authorized OIDC publish workflow.
- External adoption evidence remains limited, and GitHub Pages/hosted documentation remains deferred.

## Safety

Default commands remain offline-first: no repository upload, remote AI call, telemetry, automatic redaction, or publishing action. Generated `.ackit/` reports remain local until reviewed.

## Validation Boundary

The final release record must include the exact TASK-0239 candidate SHA, successful TASK-0240 Windows/Ubuntu/macOS hosted run, TASK-0241 conditional acceptance, final standard CI, package digests, and future TASK-0242 provenance evidence. None of those publication claims are implied by this draft.
