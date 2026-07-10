# AgentContextKit 1.0.0-rc.1

AgentContextKit `1.0.0-rc.1` is the first contract-frozen V100 release candidate. It is a prerelease for validation and feedback, not a `1.0.0` GA declaration.

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

The accepted source/workflow/test/package-metadata candidate is TASK-0239 commit `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`. TASK-0240 hosted run `29118452246` passed Windows, Ubuntu, and macOS with 431/431 tests per runner, predecessor upgrade/config immutability, frozen contract gates, SARIF parsing, and resource thresholds. TASK-0241 recorded conditional publication GO with zero open P0 gaps.

The release is published only through the existing exact-SHA OIDC workflow. The tag, GitHub prerelease, NuGet repository metadata, release assets, digests, and GitHub artifact attestation remain authoritative for the exact publication commit. The workflow must verify the exact nupkg attestation before the release task is complete.
