# Upgrade Compatibility

## Supported Predecessor
The prepared V100 hosted release-candidate predecessor is the published immutable NuGet package `AgentContextKit` `0.2.0-alpha.3`. Older pre-releases remain historical references, not direct hosted compatibility targets.

## Compatibility Expectations
- Package ID remains `AgentContextKit`; tool command remains `ackit`.
- Config schema remains `1` for the current source line.
- JSON output schema remains `2`; additive fields are allowed and consumers must ignore unknown fields.
- SARIF remains `2.1.0`; additive result properties are allowed.
- Existing generated files are skipped by default and are not overwritten during upgrade.
- Default `scan` and `scan --ci` exit behavior is unchanged unless `--baseline` is explicit.

These expectations are part of the TASK-0092 conditional local contract freeze. Hosted predecessor/current-candidate evidence and maintainer approval are still required before release-candidate publication.

## Config Evidence
`tests/fixtures/upgrade/v0.2.0-alpha.1-config.yml` remains the oldest schema-1 compatibility fixture. `ReleaseCandidateEvidenceTests` verifies that the current reader preserves its language, keywords, ignore paths, extensions, safe domains, ignored paths, and ignored finding IDs without validation errors. The manual hosted workflow separately installs the selected published predecessor `0.2.0-alpha.3` before installing the run-unique current-source package.

The synthetic fixture suppresses non-Critical keyword matches from its own `.ackit/config.yml` path so hosted `scan --ci` measures upgrade behavior instead of fixture self-noise. Critical findings remain unsuppressible.

Current source exposes unknown, obsolete, duplicate, malformed, and unsafe config diagnostics through read-only `ackit config-check`. Warnings remain non-blocking, errors return `1`, and obsolete keys require a reviewed manual edit; no auto-migration rewrites the file.

## Baseline Evidence
Baseline files were introduced after `0.2.0-alpha.1`; that historical fixture has no predecessor baseline to migrate. `tests/fixtures/upgrade/baseline-schema-v1.json` is the first golden baseline fixture and verifies schema/algorithm/fingerprint integrity for future upgrades.

Changing baseline schema or fingerprint algorithm requires a new version identifier and migration guidance. Existing fingerprints must not be silently reinterpreted.

## Upgrade Procedure
1. Record the installed version with `ackit version`.
2. Keep `.ackit/config.yml` and any committed `.ackit-baseline.json` under version control or backup.
3. Install the candidate into a temporary tool path before changing the global install.
4. Run `ackit scan`, `ackit scan --json`, `ackit doctor`, and baseline-aware commands when applicable.
5. Review generated-file skip behavior and JSON/SARIF additive fields.
6. Only then update the global tool.

## Rollback
Uninstall the candidate and reinstall the supported predecessor:

```powershell
dotnet tool uninstall --global AgentContextKit
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.3
```

Restore reviewed config/baseline files if a future migration task changed them. Current commands do not rewrite config or baseline implicitly.

## Remaining Evidence
- Successful manual `.github/workflows/release-candidate-evidence.yml` Windows/Ubuntu/macOS upgrade smoke from `0.2.0-alpha.3` to the selected final source candidate.
- Hosted predecessor-config `config-check`, baseline, and SARIF evidence from that workflow.
- Final-candidate English/Turkish upgrade and error-output parity confirmation.
