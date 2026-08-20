# JSON Output

## External JSON
The current command JSON envelope does not accept external tool output. Future profile-specific import is design-only in `docs/EXTERNAL_OUTPUT_IMPORT_BOUNDARY.md`; generic JSON parsing and implicit ACKIT finding conversion are prohibited.

AgentContextKit supports machine-readable JSON output for automation and CI usage.

Supported commands:
- `ackit init --json`
- `ackit config-check --json`
- `ackit scan --json`
- `ackit optimize --json`
- `ackit baseline --json`
- `ackit sarif --json`
- `ackit report --json`
- `ackit webui --json`
- `ackit prompt-pack --json`
- `ackit context-export --json`
- `ackit generate --json`
- `ackit task "<title>" --json`
- `ackit redact-check --json`
- `ackit doctor --json`
- `ackit hooks --json`

`ackit mcp` is intentionally outside this command-output schema. It returns JSON-RPC 2.0 responses from the Core-only MCP prototype and does not use `--json`.

## Common Fields
JSON responses include:

```json
{
  "schemaVersion": 2,
  "toolVersion": "1.0.0-rc.1",
  "generatedAtUtc": "2026-06-03T00:00:00+00:00",
  "command": "scan"
}
```

`schemaVersion` describes the JSON output shape, not the repository config format. TASK-0092 conditionally freezes schema `2` for release-candidate preparation; a breaking change requires reopening the freeze, incrementing the schema, and adding migration notes.

The machine-readable Draft 2020-12 contract is `docs/schemas/ackit-command-output-v2.schema.json`. It defines the common envelope and command-specific required top-level fields for all JSON-capable commands while allowing additive properties. Sanitized golden examples live in `tests/fixtures/contracts/command-output-v2-golden.json`.

## Stability Rules
- TASK-0232/TASK-0235 include schema `2`, the common envelope, command identifiers, required command fields, status tokens, rule/diagnostic IDs, and exit semantics in the V100 target contract. Final-candidate acceptance remains pending.
- Every successful JSON command includes `schemaVersion`, `toolVersion`, `generatedAtUtc`, and `command`.
- Existing fields should not be removed or renamed within schema version `2`.
- New optional fields may be added without changing the schema version.
- Breaking field removal, rename, type change, or semantic change requires a schema version increment and migration notes.
- JSON field names remain English and language-independent even when `--lang tr` is used.
- JSON command names, status tokens, rule IDs, diagnostic codes, schema versions, and exit codes remain language-independent; localized aliases are not emitted.
- The English/Turkish semantic parity matrix is enforced by `tests/AgentContextKit.Tests/LocalizationParityTests.cs` and `scripts/check-localization-parity.ps1`.
- Consumers should ignore unknown additive fields.

Contract tests require stable fields but intentionally do not reject additional properties.

## Schema Version 2
Schema version `2` adds:
- `generatedAtUtc` on JSON command outputs.
- `repositoryName` on repository-scoped outputs.
- `riskSummary` on `scan` and `redact-check`.
- `checkSummary` on `doctor`.
- `fileSummary` on `generate`.
- `ciMode` and `exitCode` on `scan`.
- `sarif` generated file metadata on `sarif`.
- `report` generated file metadata on `report`.
- `webUi` generated file metadata on `webui`.
- `promptPack` generated file metadata on `prompt-pack`.
- `contextExport` generated file metadata on `context-export`.
- `ruleId` on scanner finding objects. This is additive and uses the stable rule IDs from [SCANNER_RULES.md](SCANNER_RULES.md). The catalog includes `ACKIT001`–`ACKIT007` plus the `ACKIT999` fallback; current source narrows `ACKIT001` to credential/secret detection, adds `ACKIT006` for production configuration, `ACKIT007` for documentation gaps, and uses `ACKIT005` for general repository hygiene, configuration, and release readiness.
- `suppressionSummary` and sanitized `suppressions` on `scan` output. These are additive and are present in the published `1.0.0-rc.1` package.
- `baseline` on current-source `baseline --json` and opt-in `scan --baseline <path> --json` output. The existing-versus-new classification is documented in [BASELINE_MODEL.md](BASELINE_MODEL.md).
- `config`, `diagnosticSummary`, and sanitized `diagnostics` on current-source `config-check --json` output.
- `target`, `install`, `dryRun`, `shell`, `mode`, and planned hook `files` with sanitized `contentLength` on current-source `hooks --json` output.
- `format`, `output`, `auditSummary`, `instructionMetrics`, `sources`, `scopes`, `scopedOverrides`, and `instructionFindings` on post-RC1 current-source `optimize --json` output.

## Exit Codes
Human output and JSON output use the same exit code strategy.

See [EXIT_CODES.md](EXIT_CODES.md) for the full exit code matrix.

`redact-check`:
- `0`: no findings
- `1`: warning findings
- `2`: critical findings

`scan --ci`:
- `0`: no high/critical findings
- `1`: high findings and no critical findings
- `2`: critical findings

`scan --baseline <path> --ci`:
- `0`: no new high/critical findings
- `1`: new high findings or baseline load/integrity error
- `2`: new critical findings

`optimize --ci`:

- `0`: no High/Critical instruction findings
- `1`: High instruction findings and no Critical finding
- `2`: any Critical instruction finding

`doctor`:
- `0`: no failed high/critical checks
- `1`: at least one failed high/critical check

`config-check`:
- `0`: missing/default, valid, or warning-only config
- `1`: one or more Error diagnostics

Config diagnostics include stable `code`, `severity`, one-based `line`, optional `key`, and sanitized `message`. Raw values and full config lines are not emitted. `config.migrationRequired` is true for obsolete keys or unsupported schema versions; the command does not rewrite the file.

## Optimize JSON

`ackit optimize --json` and `ackit optimize --format json` are equivalent and write one schema-v2 JSON object to stdout. An explicit `--output <repo-relative.json>` writes the same review contract to a non-existing file and prints localized generated-file status to stdout. If `--proposal <repo-relative.md>` is also explicit, the JSON adds a `proposal` object with non-overwriting output status, parsed-rule before/after/saved metrics, retained/consolidation/unresolved counts, and mandatory-category names. It does not embed raw instruction bodies.

The abbreviated example below represents `ackit optimize --json --proposal .ackit/reports/optimized-instructions.md`; without `--proposal`, the optional `proposal` property is omitted.

```json
{
  "schemaVersion": 2,
  "toolVersion": "1.0.0-rc.1",
  "generatedAtUtc": "2026-07-18T12:00:00+00:00",
  "command": "optimize",
  "repositoryName": "synthetic-demo",
  "ciMode": false,
  "exitCode": 0,
  "format": "json",
  "output": {
    "path": "stdout",
    "status": "StandardOutput",
    "created": false
  },
  "proposal": {
    "output": {
      "path": ".ackit/reports/optimized-instructions.md",
      "status": "Created",
      "created": true
    },
    "metrics": {
      "before": { "characters": 765, "words": 115, "lines": 16, "estimatedTokens": 192 },
      "after": { "characters": 624, "words": 92, "lines": 13, "estimatedTokens": 156 },
      "saved": { "characters": 141, "words": 23, "lines": 3, "estimatedTokens": 36 },
      "estimationMethod": "Parsed instruction-body estimated tokens are a deterministic local estimate, not billing."
    },
    "retainedRuleCount": 13,
    "consolidationCount": 2,
    "unresolvedDecisionCount": 2,
    "mandatoryConstraintCategories": ["Deployment", "Documentation", "Release", "Security", "Verification"]
  },
  "auditSummary": {
    "sourceCount": 0,
    "ruleCount": 0,
    "scopeCount": 0,
    "scopedOverrideCount": 0,
    "findingCount": 0,
    "deterministicCount": 0,
    "heuristicCount": 0,
    "severity": {
      "total": 0,
      "critical": 0,
      "high": 0,
      "medium": 0,
      "low": 0,
      "info": 0
    }
  },
  "instructionMetrics": {
    "total": { "characters": 0, "words": 0, "lines": 0, "estimatedTokens": 0 },
    "duplicated": { "characters": 0, "words": 0, "lines": 0, "estimatedTokens": 0 },
    "avoidable": { "characters": 0, "words": 0, "lines": 0, "estimatedTokens": 0 },
    "estimationMethod": "Estimated tokens = ceiling of normalized UTF-16 character count divided by 4. This is a deterministic local size estimate, not exact tokenizer output or model billing."
  },
  "sources": [],
  "scopes": [],
  "scopedOverrides": [],
  "instructionFindings": []
}
```

Successful findings contain stable `ACKITOPT` rule IDs, fingerprints, severity/category, repository-relative source file and one-based line range, directory scope, sanitized explanation/evidence/remediation, related locations, and both `deterministic` and `heuristic` booleans. Source rule bodies and absolute repository paths are omitted. Error payloads include `command`, `exitCode: 1`, and a stable `error.code` without echoing unsafe path values.

The Optimize branch and optional proposal metadata are additive to schema v2 and covered by `docs/schemas/ackit-command-output-v2.schema.json`, the sanitized golden fixture, and live-output tests. Published `1.0.0-rc.1` predates this branch even though current source retains the existing package version metadata; current-source availability is established by source commit evidence, not by rewriting that release.

## Example
```powershell
dotnet run --project src/AgentContextKit.Cli -- scan --json
```

Example shape:
```json
{
  "schemaVersion": 2,
  "toolVersion": "1.0.0-rc.1",
  "generatedAtUtc": "2026-06-03T00:00:00+00:00",
  "command": "scan",
  "ciMode": false,
  "exitCode": 0,
  "repositoryPath": "...",
  "repositoryName": "agent-context-kit",
  "fileCount": 12,
  "stacks": [],
  "health": {},
  "riskSummary": {
    "total": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "info": 0
  },
  "findings": [],
  "suppressionSummary": {
    "total": 0,
    "safeDomains": 0,
    "ignoredPaths": 0,
    "ignoredFindingIds": 0
  },
  "suppressions": []
}
```

Finding shape:
```json
{
  "ruleId": "ACKIT003",
  "severity": "Medium",
  "category": "BuildArtifact",
  "path": "artifacts/package.nupkg",
  "message": "File extension should be reviewed before public release.",
  "match": null
}
```

Finding objects keep these schema v2 fields: `ruleId`, `severity`, `category`, `path`, `message`, and `match`. Current source emits `match: null` so raw secret, PII, brand, domain, IP, phone, and local-path values do not enter machine-readable output.

Suppression shape:
```json
{
  "ruleId": "ACKIT003",
  "severity": "Medium",
  "category": "BuildArtifact",
  "path": "artifacts/package.nupkg",
  "reason": "ignoredFindingIds"
}
```

Suppression records intentionally omit `match` and `message`. See [SUPPRESSION_AUDIT.md](SUPPRESSION_AUDIT.md).

## Baseline Shapes
`ackit baseline --json` returns path, status, baseline schema version, fingerprint algorithm, and entry count. It never emits raw finding matches or messages.

Opt-in `ackit scan --baseline .ackit-baseline.json --json` keeps the existing `findings` array unchanged and adds:

```json
{
  "baseline": {
    "path": ".ackit-baseline.json",
    "schemaVersion": 1,
    "fingerprintAlgorithm": "sha256-rule-path-location-occurrence-v1",
    "entryCount": 4,
    "existing": 3,
    "new": 1,
    "classifiedFindings": [
      {
        "ruleId": "ACKIT003",
        "severity": "Medium",
        "path": "artifacts/package.nupkg",
        "fingerprint": "<lowercase-sha256>",
        "status": "existing",
        "occurrence": 1
      }
    ]
  }
}
```

Classified entries omit `match` and `message`. Baseline errors use exit code `1` and an `error` object with a stable `ACKITBASE` code and sanitized message.

The same additive `baseline` object is returned by `sarif`, `report`, and `webui` when `--baseline <path>` is supplied. Without that option, those command payloads retain their previous fields and omit `baseline`.

## Summary Shapes
`riskSummary`:
```json
{
  "total": 1,
  "critical": 1,
  "high": 0,
  "medium": 0,
  "low": 0,
  "info": 0
}
```

`checkSummary`:
```json
{
  "total": 13,
  "passed": 13,
  "failed": 0,
  "failedHighOrCritical": 0
}
```

`fileSummary`:
```json
{
  "total": 3,
  "created": 1,
  "skipped": 2
}
```

`webUi`:
```json
{
  "path": ".ackit/webui/index.html",
  "status": "Created",
  "created": true,
  "message": "Web UI prototype created."
}
```

`sarif`:
```json
{
  "path": ".ackit/reports/ackit.sarif",
  "status": "Created",
  "created": true,
  "message": "SARIF report created."
}
```

`promptPack`:
```json
{
  "path": ".ackit/prompt-packs/prompt-pack.md",
  "status": "Created",
  "created": true,
  "message": "Dry-run prompt pack created."
}
```

`contextExport`:
```json
{
  "path": ".ackit/context-exports/context-export-manifest.json",
  "status": "Created",
  "created": true,
  "message": "Context export manifest created."
}
```

`hooks` file item:
```json
{
  "path": ".anthropic/hooks/installed.txt",
  "status": "Dry run",
  "contentLength": 111
}
```

`hooks --dry-run --json` reports planned repository-relative paths and content lengths only; it does not write files even when `--install` is also present.