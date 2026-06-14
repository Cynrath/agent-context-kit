# SARIF Output

## External SARIF
Current `ackit sarif` emits AgentContextKit results only. External SARIF import is not implemented. The design in `docs/EXTERNAL_OUTPUT_IMPORT_BOUNDARY.md` keeps upstream tool/rule identities namespaced and does not merge them into ACKIT findings automatically.

AgentContextKit published `0.2.0-alpha.2` package and current source can write scanner findings as SARIF 2.1.0 for CI review and future GitHub Code Scanning workflows.

Availability note: the published NuGet package `AgentContextKit` `0.2.0-alpha.2` includes `ackit sarif`.

TASK-0092 conditionally freezes SARIF `2.1.0`, repository-relative locations, visible findings, and the no-raw-match privacy boundary for release-candidate preparation.

The local machine-readable profile is `docs/schemas/ackit-sarif-profile-v1.schema.json`, with a sanitized golden fixture at `tests/fixtures/contracts/sarif-profile-v1-golden.json`. The profile adds AgentContextKit tool/privacy requirements and does not replace the official complete SARIF schema.

## What SARIF Is
SARIF is a standard JSON format for static analysis results. Security platforms and CI systems can read it to show findings with rules, severity levels, messages, and file locations.

## What AgentContextKit Produces
`ackit sarif` runs the normal repository scan and risk scanner, then writes a SARIF file.

```powershell
dotnet run --project src/AgentContextKit.Cli -- sarif --output .ackit/reports/ackit.sarif
```

The SARIF file includes:
- `version`: `2.1.0`
- `$schema`: SARIF 2.1.0 schema URI
- Tool name: `AgentContextKit`
- Tool information URI: `https://github.com/Cynrath/agent-context-kit`
- Tool version
- Stable AgentContextKit rules from the central scanner rule catalog
- Scanner findings as SARIF results

Current source can also apply an explicit baseline:

```powershell
dotnet run --project src/AgentContextKit.Cli -- sarif --output .ackit/reports/baseline.sarif --baseline .ackit-baseline.json
```

Each result then includes sanitize-only properties:
- `baselineStatus`: `existing` or `new`;
- `baselineFingerprint`: lowercase SHA-256 identity;
- `baselineOccurrence`: positive deterministic occurrence.

These properties do not contain raw matches, messages, absolute paths, or secret values. Baseline status does not suppress the SARIF result.

`--output` is required in the first SARIF MVP so users explicitly choose where the generated report is written. Recommended local path: `.ackit/reports/ackit.sarif`.

## Privacy-First Path Behavior
SARIF artifact locations are repository-relative and use `/` separators.

AgentContextKit does not write absolute local paths into SARIF locations. Paths with Windows separators are normalized before output. Local `.ackit/` outputs are ignored and should not be committed.

## Secret Masking Behavior
SARIF result messages use safe finding messages. Raw scanner match values are not written to SARIF.

For example, if a secret-like value is detected, SARIF records the rule, severity, message, and file path, but not the raw matched token.

## Severity Mapping
| AgentContextKit severity | SARIF level |
| --- | --- |
| Critical | `error` |
| High | `error` |
| Medium | `warning` |
| Low | `note` |
| Info | `note` |

## Rule ID Mapping
| Rule ID | Name | Used For |
| --- | --- | --- |
| `ACKIT001` | `SecretLike` | Secret-like values, credentials, keys, and production secret risks. |
| `ACKIT002` | `PiiOrBrandLike` | PII-like, brand-like, email-like, and domain-like review findings. |
| `ACKIT003` | `GeneratedOrBuildArtifact` | Generated, build, package, backup, or artifact files requiring review. |
| `ACKIT004` | `LocalPathOrPrivateLocation` | Local path or private machine location findings. |
| `ACKIT005` | `RepositoryHygiene` | Repository hygiene, configuration, and release readiness findings. |
| `ACKIT006` | `ProductionConfigLike` | Production configuration, environment-specific appsettings, and live-service connection strings. |
| `ACKIT007` | `DocumentationGap` | Documentation gaps, stale guidance, and missing or unclear public documents. |
| `ACKIT999` | `GeneralFinding` | General fallback finding. |

The SARIF rule IDs above are derived from the Core `RiskRuleCatalog`; the catalog is the single source of truth.

The rule catalog also provides default severity context and recommendation/help text. See [SCANNER_RULES.md](SCANNER_RULES.md) for the full catalog and config allowlist behavior.

## JSON Command Result
`ackit sarif --json` prints a command summary, not the SARIF payload.

```powershell
dotnet run --project src/AgentContextKit.Cli -- sarif --output .ackit/reports/ackit.sarif --json
```

Use the output file path to read or upload the SARIF artifact.

## CI Usage Example
The example workflow is stored at `docs/examples/github-actions-sarif-upload.yml`.

It shows two documentation-only approaches:
- use the published `0.2.0-alpha.2` package; or
- build and install the current source package locally in CI.

The example is not active. It is not copied into `.github/workflows`, and this task does not upload SARIF to GitHub Code Scanning.

The current project decision is documented in [CODE_SCANNING_DECISION.md](CODE_SCANNING_DECISION.md): SARIF generation is local-only by default, and Code Scanning upload is opt-in after maintainer review.

The first opt-in workflow shape is documented in [SARIF_UPLOAD_WORKFLOW_DESIGN.md](SARIF_UPLOAD_WORKFLOW_DESIGN.md). It uses a manual trigger, the pinned published package, job-level upload permission, and a parse check before upload.

For a hands-on local source demo, see [DEMO_SCENARIOS.md](DEMO_SCENARIOS.md).

## GitHub Code Scanning Upload Note
Uploading SARIF to GitHub Code Scanning requires a workflow permission such as:

```yaml
permissions:
  contents: read
  security-events: write
```

Keep upload workflows maintainer-reviewed because Code Scanning is a public repository integration surface.

## Limitations
- The first SARIF MVP uses file-level locations.
- Full line and column mapping is reserved for a later version.
- SARIF upload is documentation-only in this task.
- Pattern-based scanner results still require maintainer review before public release decisions.
