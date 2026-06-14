# Configuration

AgentContextKit reads optional configuration from `.ackit/config.yml`.

Config allowlist fields are part of the current source and `0.2.0-alpha.2` package. The published NuGet `0.2.0-alpha.2` package includes the scanner rule catalog and allowlist feature set.

The MVP parser intentionally supports a small YAML-like subset:
- `key: value`
- inline lists such as `brandKeywords: ["example"]`
- multiline lists such as:

```yaml
ignorePaths:
  - vendor/
  - generated/
```

Unknown fields are ignored. Invalid or unknown language values fall back to English.

Current source includes `ackit config-check` backed by stable `ACKITCFG` diagnostics for unknown, obsolete, duplicate, malformed, and unsafe settings. It is read-only: warnings remain non-blocking, errors return exit `1`, and missing config reports valid defaults. See [CONFIGURATION_DIAGNOSTICS.md](CONFIGURATION_DIAGNOSTICS.md).

TASK-0092 conditionally freezes config schema `1`, read-only diagnostics, and the no-auto-migration rule for release-candidate preparation. A breaking config or migration behavior change must reopen `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md`.

Baseline policy is intentionally not enabled through `.ackit/config.yml`. Use the explicit `ackit baseline` and `ackit scan --baseline <repo-relative.json>` command options so CI policy changes remain visible in command lines and reviewable diffs.

## Default Config
```yaml
schemaVersion: 1
defaultLanguage: en
brandKeywords: []
piiKeywords: []
ignorePaths:
  - .ackit/cache/
  - .ackit/reports/
  - .ackit/webui/
  - .ackit/prompt-packs/
  - .ackit/context-exports/
riskExtensions:
  - .bak
  - .tmp
  - .log
  - .sql
safeDomains: []
ignoredPaths: []
ignoredFindingIds: []
```

## Fields
### `schemaVersion`
Config schema version. Current value: `1`.

### `defaultLanguage`
Default CLI/generated-doc language.

Supported values:
- `en`
- `tr`

### `brandKeywords`
Custom brand, product, customer, or domain words to report before public release.

Matching uses token boundaries. For example, `Acme` matches `Acme Corp` but not `AcmeCorp`.

### `piiKeywords`
Custom person, phone, address, customer identifier, or private organization words to report before public release.

Matching uses token boundaries to reduce substring false positives.

### `ignorePaths`
Repository-relative paths to exclude from scanning and risk reports.

Matching is prefix-based and case-insensitive. Examples:
- `vendor/`
- `generated/`
- `docs/private-notes.md`

Do not configure broad values such as `src/` unless you intentionally want to hide those files from reports.

### `riskExtensions`
Additional file extensions to flag as public-release review risks.

Examples:
- `.dump`
- `.backup`
- `.private`

### `safeDomains`
Additional exact domains to treat as safe technical references for domain-like Low findings.

Examples:
- `docs.example.invalid`
- `*.trusted.example`

Rules:
- Exact domains match only the exact domain.
- A leading `*.` matches subdomains only.
- This field does not suppress Critical secret-like findings.

### `ignoredPaths`
Repository-relative paths where non-Critical findings are suppressed but files remain visible in scan file lists.

Examples:
- `generated-reports/`
- `fixtures/public-placeholders/`
- `docs/known-safe-notes.md`

This differs from `ignorePaths`, which excludes matching files from scanning and file enumeration. Prefer `ignoredPaths` for known non-Critical noise because it keeps repository visibility.

### `ignoredFindingIds`
Stable scanner rule IDs to suppress for non-Critical findings.

Examples:
- `ACKIT002`
- `ACKIT003`

Critical findings cannot be silently ignored by this field. If a Critical secret-like finding appears, remove the value, rotate credentials if needed, or move secrets out of source.

The published `0.2.0-alpha.2` package records configured non-Critical suppressions in local `ackit scan` human/JSON output. Audit records identify the rule, severity, category, repository-relative path, and config reason without including raw matches. See [SUPPRESSION_AUDIT.md](SUPPRESSION_AUDIT.md).

## Scanner Precision Fields
The scanner uses a conservative built-in safe technical allowlist for common public platform/package domains and fixture-only placeholder data. Configurable allowlists are local, explicit, and narrow. They do not delete, redact, upload, publish, or mutate files.

See [SCANNER_RULES.md](SCANNER_RULES.md) for rule IDs, SARIF mapping, and suppression behavior.

## Example Configs
Copy-ready examples are available under `docs/examples/config/`:

- `minimal-config.yml`: default-safe baseline with explicit local generated output ignores.
- `strict-config.yml`: public-release review mode with extra risky extensions and placeholder brand/PII keywords.
- `ci-config.yml`: CI-oriented non-Critical noise controls for safe documentation/fixture paths.
- `brand-pii-starters.yml`: starter `brandKeywords` and `piiKeywords` placeholder set for a public repository.
- `safe-domains-and-ignored-paths.yml`: starter `safeDomains` and `ignoredPaths` placeholder set for fixture/sample content.
- `safe-domains-and-ignored-paths.yml`: starter `safeDomains` and `ignoredPaths` placeholder set for fixture/sample content.

These examples do not contain real secrets and do not demonstrate Critical suppression. `safeDomains`, `ignoredPaths`, and `ignoredFindingIds` suppress only non-Critical findings; Critical findings remain reportable by design.

## Safety
Configuration never causes AgentContextKit to delete, overwrite, redact, upload, or publish files. It only changes local analysis and generated reports.

The validator reports attempts to suppress Critical rule `ACKIT001` as an error even though the runtime scanner already refuses to suppress Critical findings.

## Diagnostic Cookbook
`ackit config-check` emits sanitized diagnostics with stable `ACKITCFG###` codes. The most common codes and their one-line fixes are:

| Code | Trigger | One-line fix |
| --- | --- | --- |
| `ACKITCFG001` | Unknown top-level key in `.ackit/config.yml` | Remove the key or rename it to a supported field. |
| `ACKITCFG002` | Obsolete or legacy key (e.g. `allowedFindingIds`) | Migrate to the current key (`ignoredFindingIds`). |
| `ACKITCFG003` | Duplicate top-level key | Delete the duplicate so the canonical key is read once. |
| `ACKITCFG006` | Unmatched quote or malformed value | Re-type the value as a quoted string or list. |
| `ACKITCFG008` | Invalid `ignoredPaths` entry (absolute or escaping the repo) | Use a repository-relative path like `samples/placeholders/`. |
| `ACKITCFG010` | Invalid `ignoredFindingIds` entry (not a stable `ACKIT###` ID) | Use a stable ID from `docs/SCANNER_RULES.md` such as `ACKIT003`. |
| `ACKITCFG011` | Attempt to suppress Critical `ACKIT001` | Remove the suppression; Critical findings cannot be silenced. |
| `ACKITCFG013` | `ignoredPaths` entry is too broad (matches the whole repo) | Narrow the path so it covers only generated or fixture content. |

Full code list and severity definitions live in `src/AgentContextKit.Core/ConfigurationValidation.cs` (`ConfigDiagnosticCodes`).

Validate without changing the file:

```powershell
ackit config-check
ackit config-check --json
```

The command does not auto-migrate obsolete keys. Review `ACKITCFG002`, replace `allowedFindingIds` with `ignoredFindingIds`, and rerun the check.

## Generated File Conventions
See [CONFIG_GENERATED_CONVENTIONS.md](CONFIG_GENERATED_CONVENTIONS.md) for the v1.0 target conventions around default config, ignored generated artifact paths, repository-relative output paths, and skip-existing behavior.
