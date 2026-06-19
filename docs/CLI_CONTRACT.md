# CLI Contract

## Non-Shipped External Tools Design
`ackit external-tools ...` and `ackit doctor --external-tools` appear only in `docs/EXTERNAL_TOOLS_COMMAND_DESIGN.md`. They are not implemented, not in published help, and not part of the current CLI compatibility contract. Default `ackit doctor` behavior remains unchanged.

`ackit workflow list|show` is also a non-shipped guidance-only design in `docs/WORKFLOW_COMMAND_DESIGN.md`. It would print reviewed instructions but never execute a tool.

This page records the intended stable v1.0 command contract for `ackit`. It is a local contract review aid, not public release approval.

TASK-0092 conditionally freezes this command/option surface for release-candidate preparation. Any breaking change requires reopening `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md`; the freeze is not publication approval.

Machine-readable JSON contract assets are indexed in `docs/schemas/README.md` and validated by `scripts/check-json-contract-assets.ps1`.

## Command Name
The packaged tool command name is:

```text
ackit
```

During development, run the CLI through:

```powershell
dotnet run --project src/AgentContextKit.Cli -- <command>
```

Current package note: `ackit sarif` is part of the current source command surface and the published `0.2.0-alpha.2` NuGet global tool.

## Stable Command Surface
The v1.0 target command surface is:

```text
ackit init [--lang en|tr] [--json]
ackit config-check [--lang en|tr] [--json]
ackit scan [--baseline <repo-relative.json>] [--include <glob>] [--exclude <glob>] [--lang en|tr] [--json] [--ci]
ackit baseline [--output <repo-relative.json>] [--update] [--lang en|tr] [--json]
ackit sarif --output <repo-relative.sarif> [--baseline <repo-relative.json>] [--lang en|tr] [--json]
ackit report [--output <repo-relative.html>] [--baseline <repo-relative.json>] [--lang en|tr] [--json]
ackit webui [--output <repo-relative.html>] [--baseline <repo-relative.json>] [--lang en|tr] [--json]
ackit prompt-pack [--output <repo-relative.md>] [--lang en|tr] [--json]
ackit context-export --prompt-pack <repo-relative.md> --approve [--output <repo-relative.json>] [--lang en|tr] [--json]
ackit generate [--target codex|claude|anthropic|cursor|copilot|continue|all] [--lang en|tr] [--json]
ackit task "<title>" [--lang en|tr] [--json]
ackit redact-check [--profile public-release] [--lang en|tr] [--json]
ackit doctor [--lang en|tr] [--json]
ackit hooks [--target codex|claude|anthropic|continue] [--shell pwsh|sh] [--install|--dry-run] [--output <repo-relative-dir>] [--lang en|tr] [--json]
ackit mcp --stdio <json-request> [--output <repo-relative.jsonl>] [--lang en|tr]
ackit diff --from <from.json> --to <to.json> [--lang en|tr] [--json]
ackit trim --input <repo-relative.md|json> --output <repo-relative.md|json> --max-chars <N> [--lang en|tr] [--json]
ackit version
ackit help
```

## Stability Rules
- Keep command names stable before v1.0 release.
- Keep JSON schema version 2 envelope fields stable: `schemaVersion`, `toolVersion`, `generatedAtUtc`, and `command`.
- Treat new JSON properties as additive; breaking removals, renames, type changes, or semantic changes require a schema version increment.
- Keep documented options stable unless a task explicitly documents a breaking pre-v1.0 change.
- Keep repository-relative output path behavior for generated files.
- Keep skip-existing-file behavior as the default.
- Keep offline-first behavior as the default.
- Keep public release actions outside the CLI command contract.

## Global Options
- `--lang en|tr`: selects English or Turkish output/templates where supported. Unknown language values fall back to English.
- Human-readable headings, labels, summaries, and known argument errors are localized; command names, option names, rule/diagnostic IDs, paths, and exit decisions remain stable.
- `scripts/check-localization-parity.ps1` release-gates all language-aware commands, invalid-invocation parity, and JSON invariance.
- `--json`: emits machine-readable JSON where supported.
- `--ci`: applies only to `scan`; default mode evaluates every finding, while explicit baseline mode evaluates only new High/Critical findings.
- `--baseline <repo-relative.json>`: opts `scan` into baseline classification/new-finding CI policy and adds the same classification metadata to `sarif`, `report`, or `webui` output.
- `--include <glob>` (repeatable, `scan` only): restrict `scan` to relative paths matching at least one glob. Globs support `*` (single segment), `**` (any depth), and `?` (single character). If no `--include` is set, every file is considered. Empty or whitespace-only globs are rejected and return exit `1` with an "Invalid argument" error.
- `--exclude <glob>` (repeatable, `scan` only): drop relative paths matching any glob. Same glob syntax as `--include`. Applied after `--include`. Empty or whitespace-only globs are rejected and return exit `1`.
- `--update`: permits explicit replacement only for `ackit baseline`.
- `--target`: selects the generator or hooks target where supported. Current hooks targets are `codex`, `claude`, `anthropic`, and `continue`.
- `--shell pwsh|sh`: selects hook script syntax where hooks need a script. Continue hooks are shell-agnostic, but only these two shell values are accepted.
- `--dry-run`: for `ackit hooks`, lists planned hook files and content lengths without writing to disk, even if `--install` is also present.
- `--stdio <json-request>`: for the current `ackit mcp` prototype only, supplies one JSON-RPC request string as an argument. It is not a real stdin read loop.

## Output Paths
Generated local artifacts must stay repository-relative:
- `.ackit/reports/scan-report.html`
- `.ackit/reports/ackit.sarif`
- `.ackit/webui/index.html`
- `.ackit/prompt-packs/prompt-pack.md`
- `.ackit/context-exports/context-export-manifest.json`
- `.ackit-baseline.json`
- `docs/tasks/TASK-####.md`

Generated artifact directories under `.ackit/` are ignored by default.

## Exit Behavior
Exit codes are documented in `docs/EXIT_CODES.md`.

Stable expectations:
- `0`: command completed without a blocking condition.
- `1`: invalid invocation, command error, warning-level blocking condition, failed high/critical doctor check, or high-risk CI condition.
- `2`: critical risk condition.

`scan` remains report-only by default. Use `scan --ci` for automation that should fail on high or critical findings.

`scan --baseline <path> --ci` is an explicit alternate policy: every finding remains visible, but only new High/Critical findings fail the process. Missing, malformed, incompatible, or tampered baseline files return `1`.

`config-check` is read-only. Missing/valid/warning-only config returns `0`; Error diagnostics return `1`. It does not change the existing config reader fallback used by other commands and never auto-migrates the file.

Exit decisions are language- and output-format-independent. When a JSON payload includes `exitCode`, it must equal the process exit code returned for the equivalent human-readable invocation.

## JSON Contract
JSON output is documented in `docs/JSON_OUTPUT.md`.

Stable expectations:
- JSON output includes `schemaVersion`, `toolVersion`, `generatedAtUtc`, and `command` where supported.
- Repository-scoped JSON output includes repository metadata.
- Human output and JSON output use the same process exit code.
- JSON schema can still be revised before v1.0; v1.0 should freeze or explicitly version any breaking changes.

`ackit mcp` is intentionally outside the command-output schema v2 envelope. It returns JSON-RPC 2.0 responses for the local MCP prototype instead of `--json` command output.

## Safety Boundary
The stable CLI contract does not include:
- GitHub push.
- Remote creation.
- Release tag creation.
- NuGet publish.
- Live LLM provider calls.
- Provider SDK setup.
- API key read, storage, generation, or validation.
- Repository upload.
- GitHub Code Scanning upload.
- Automatic redaction or deletion.

These remain maintainer-only or future explicitly documented tasks.

## Local Contract Check
Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1
```

Run as a failing gate:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1 -FailOnIssues
```

The script checks local help output and release-critical documentation. It does not push, publish, tag, upload, redact, delete, call providers, handle API keys, or create remotes.
