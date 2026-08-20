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

Current package note: published prerelease `1.0.0-rc.1` preserves the frozen command surface that includes `ackit sarif`. It predates the post-RC1 `ackit optimize` source addition. Alpha4 is the immutable upgrade predecessor; older alpha references elsewhere are historical evidence.

## Stable Command Surface
The v1.0 target command surface is:

```text
ackit init [--lang en|tr] [--json]
ackit config-check [--lang en|tr] [--json]
ackit scan [--baseline <repo-relative.json>] [--include <glob>] [--exclude <glob>] [--lang en|tr] [--json] [--ci]
ackit optimize [--format console|json|markdown|sarif|html] [--output <repo-relative-file>] [--proposal <repo-relative.md>] [--include <glob>] [--exclude <glob>] [--lang en|tr] [--json] [--ci]
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
ackit mcp --stdio-server [--repo <path>] [--lang en|tr]
ackit mcp --stdio <json-request> [--output <repo-relative.jsonl>] [--lang en|tr]
ackit diff --from <from.json> --to <to.json> [--lang en|tr] [--json]
ackit watch [--debounce-ms <N>] [--once] [--max-runtime-ms <N>] [--json] [--lang en|tr]
ackit trim --input <repo-relative.md|json> --output <repo-relative.md|json> --max-chars <N> [--lang en|tr] [--json]
ackit version
ackit help
```

## Stability Rules
- TASK-0232 records the shipped/documented surface as the V100 target contract. TASK-0239 selects `1.0.0-rc.1` for candidate-specific local and hosted reruns; final acceptance remains pending until TASK-0241.
- Keep command names stable before v1.0 release.
- Keep JSON schema version 2 envelope fields stable: `schemaVersion`, `toolVersion`, `generatedAtUtc`, and `command`.
- Treat new JSON properties as additive; breaking removals, renames, type changes, or semantic changes require a schema version increment.
- Keep documented options stable unless a task explicitly documents a breaking pre-v1.0 change.
- Keep repository-relative output path behavior for generated files.
- Keep skip-existing-file behavior as the default.
- Keep offline-first behavior as the default.
- Keep public release actions outside the CLI command contract.
- Keep command identifiers, scanner rule IDs, config diagnostic IDs, exit semantics, and the documented SARIF profile stable within the same target contract.
- Treat `ackit optimize` as a current-source, post-RC1 additive contract. Do not imply that it exists in the immutable `1.0.0-rc.1` package.
- Localized human-readable prose is not byte-for-byte stable; localization must not change technical tokens or machine-readable contracts.

The selected exact source-impacting candidate is the TASK-0239 commit containing version/workflow/fixture/test preparation. TASK-0240 and TASK-0241 must remain docs/evidence/governance-only; any later behavior change invalidates hosted evidence and reopens the selection and freeze.

## Global Options
- `--lang en|tr`: selects English or Turkish output/templates where supported. Unknown language values fall back to English.
- Human-readable headings, labels, summaries, and known argument errors are localized; command names, option names, rule/diagnostic IDs, paths, and exit decisions remain stable.
- `scripts/check-localization-parity.ps1` release-gates all language-aware commands, invalid-invocation parity, and JSON invariance.
- `--json`: emits machine-readable JSON where supported.
- `--ci`: applies to `scan` and `optimize`. Scan default mode evaluates every finding, while explicit baseline mode evaluates only new High/Critical findings. Optimize has no baseline mode and evaluates its instruction findings.
- `--baseline <repo-relative.json>`: opts `scan` into baseline classification/new-finding CI policy and adds the same classification metadata to `sarif`, `report`, or `webui` output.
- `--include <glob>` (repeatable, `scan` and `optimize`): restrict discovery to relative paths matching at least one glob. Globs support `*` (single segment), `**` (any depth), and `?` (single character). If no `--include` is set, every otherwise eligible path is considered. Empty or whitespace-only globs are rejected and return exit `1` with an "Invalid argument" error.
- `--exclude <glob>` (repeatable, `scan` and `optimize`): drop relative paths matching any glob. Same glob syntax as `--include`. Applied after `--include`. Empty or whitespace-only globs are rejected and return exit `1`.
- `--format console|json|markdown|sarif|html`: selects `ackit optimize` output. `--json` is an alias for JSON and conflicts with a non-JSON format.
- `--output <repo-relative-file>`: optional for Optimize JSON, required for Optimize Markdown/SARIF/HTML, and unsupported for Optimize console output.
- `--proposal <repo-relative.md>`: optional explicit review-artifact path for Optimize. It must be non-empty, repository-relative, contained by the repository, end in `.md` or `.markdown`, differ from the report output, not target a supported instruction surface, and not traverse an existing symbolic-link/junction directory. Existing proposal files are skipped and no apply mode exists.
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
- Explicit Optimize artifacts such as `.ackit/reports/instructions.json`, `.ackit/reports/instructions.md`, `.ackit/reports/instructions.sarif`, or `.ackit/reports/instructions.html`
- Explicit review-only Optimize proposals such as `.ackit/reports/optimized-instructions.md`
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

`optimize` is report-only by default and returns `0` even when findings exist. `optimize --ci` returns `2` for Critical findings, `1` for High findings when no Critical finding exists, and `0` otherwise. Invalid format, report, or proposal paths return `1`. Creating or skipping a proposal does not change the finding-driven exit decision.

`config-check` is read-only. Missing/valid/warning-only config returns `0`; Error diagnostics return `1`. It does not change the existing config reader fallback used by other commands and never auto-migrates the file.

Exit decisions are language- and output-format-independent. When a JSON payload includes `exitCode`, it must equal the process exit code returned for the equivalent human-readable invocation.

## JSON Contract
JSON output is documented in `docs/JSON_OUTPUT.md`.

Stable expectations:
- JSON output includes `schemaVersion`, `toolVersion`, `generatedAtUtc`, and `command` where supported.
- Repository-scoped JSON output includes repository metadata.
- Optimize JSON includes sanitized instruction summaries, deterministic metrics, sources, scopes, valid scoped overrides, findings, and output status. When `--proposal` is explicit it additively includes proposal output status, parsed-rule before/after/saved metrics, retained/consolidation/unresolved counts, and mandatory-category names. It never includes an absolute repository root or raw instruction bodies.
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
- Automatic instruction rewriting or conflict resolution.

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