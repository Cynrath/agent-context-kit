# CLI Reference

## Design-Only Commands
External tool discovery concepts are documented in `docs/EXTERNAL_TOOLS_COMMAND_DESIGN.md`. Do not attempt `ackit external-tools` or `ackit doctor --external-tools`; the current CLI does not implement them.

Reviewed workflow guidance concepts are documented in `docs/WORKFLOW_COMMAND_DESIGN.md`. `ackit workflow` is not implemented.

AgentContextKit CLI command name: `ackit`.

During development, run commands through:
```powershell
dotnet run --project src/AgentContextKit.Cli -- <command>
```

Availability note: the published NuGet package `AgentContextKit` `0.2.0-alpha.2` includes `ackit sarif`.

See [EXIT_CODES.md](EXIT_CODES.md) for the full exit code matrix.

## Global Options
### `--lang en|tr`
Select output/template language. Unknown values fall back to `en`.

### `--json`
Emit machine-readable JSON where supported. Current JSON output schema version: `2`.

### `--ci`
CI mode for `ackit scan`. Without a baseline, High findings return exit code `1` and Critical findings return exit code `2`. With an explicit baseline, only new High/Critical findings affect the exit code.

## Commands
### `ackit init`
Creates `.ackit/config.yml` if it does not exist.

```powershell
ackit init --lang en
ackit init --lang tr --json
```

Safe behavior:
- Does not overwrite existing config.
- Reports detected agent instruction files.

### `ackit config-check`
Validates `.ackit/config.yml` without changing it. This command is included in the published `0.2.0-alpha.2` package.

```powershell
ackit config-check
ackit config-check --json
```

Behavior:
- Missing config uses the valid default state and returns `0`.
- Warning-only diagnostics return `0` and remain visible.
- Error diagnostics return `1`.
- Obsolete keys require a reviewed manual migration; no auto-fix is performed.
- Diagnostic output omits raw config values and full source lines.

### `ackit scan`
Scans repository structure, stack signals, docs, CI, tests, agent files, and risk findings.

```powershell
ackit scan
ackit scan --ci
ackit scan --json
ackit scan --ci --json
ackit scan --baseline .ackit-baseline.json --ci
```

Stack signals include .NET, ASP.NET Core, Razor/Razor Pages, Blazor WebAssembly, .NET Worker Service, ASP.NET Core Minimal API, Node, npm, pnpm, Yarn, Bun, TypeScript, Vite, Next.js, Nuxt, Angular, Tailwind CSS, Python, PHP/Laravel, Docker, GitHub Actions, and database/migration files when matching local files are present.

Risk findings include stable `ACKIT` rule IDs in JSON output. See [SCANNER_RULES.md](SCANNER_RULES.md) for the rule catalog and [CONFIGURATION.md](CONFIGURATION.md) for `safeDomains`, `ignoredPaths`, and `ignoredFindingIds`.

The published `0.2.0-alpha.2` package reports sanitized config suppression counts and reasons in human and JSON scan output. This additive audit surface is documented in [SUPPRESSION_AUDIT.md](SUPPRESSION_AUDIT.md).

Exit codes are documented in [EXIT_CODES.md](EXIT_CODES.md).

### `ackit baseline`
Creates a deterministic, sanitized local finding baseline. This command is included in the published `0.2.0-alpha.2` package.

```powershell
ackit baseline
ackit baseline --output policy/ackit-baseline.json
ackit baseline --update --json
```

Default output path:
- `.ackit-baseline.json`

Safety behavior:
- The path must be repository-relative and end in `.json`.
- Existing files are rejected unless `--update` is explicit.
- Entries contain rule ID, repository-relative path, severity, occurrence, and fingerprint only.
- Raw matches, messages, absolute paths, repository roots, usernames, and timestamps are omitted.
- A baseline records prior review state; it does not suppress or hide findings.

### `ackit sarif`
Generates a privacy-first SARIF 2.1.0 report from scanner findings. Existing SARIF files are skipped.

```powershell
dotnet run --project src/AgentContextKit.Cli -- sarif --output .ackit/reports/ackit.sarif
dotnet run --project src/AgentContextKit.Cli -- sarif --output .ackit/reports/ackit.sarif --json
dotnet run --project src/AgentContextKit.Cli -- sarif --output .ackit/reports/baseline.sarif --baseline .ackit-baseline.json
```

Required output path:
- `--output <repo-relative.sarif>`

Published package note:
- `ackit sarif` is available in NuGet `0.2.0-alpha.2`.
- Use the published package or source/current-branch execution.

Safety behavior:
- Output paths must be repository-relative.
- Existing files are not overwritten.
- SARIF artifact locations are repository-relative and use `/` separators.
- Raw scanner match values are not written to SARIF.
- GitHub Code Scanning upload is not performed by this command.
- With `--baseline`, each SARIF result receives sanitized `baselineStatus`, `baselineFingerprint`, and `baselineOccurrence` properties.

### `ackit report`
Generates an offline static HTML scan report. Existing report files are skipped.

```powershell
ackit report
ackit report --output .ackit/reports/current.html
ackit report --output docs/local-scan-report.html --json
ackit report --output .ackit/reports/baseline.html --baseline .ackit-baseline.json
```

Default output path:
- `.ackit/reports/scan-report.html`

Safety behavior:
- Output paths must be repository-relative.
- Existing files are not overwritten.
- Reports are self-contained and use no remote assets.
- With `--baseline`, the report adds existing/new metrics and a per-finding Baseline column.

### `ackit webui`
Generates an offline static Web UI prototype for local scan review. Existing Web UI files are skipped.

```powershell
ackit webui
ackit webui --output .ackit/webui/current.html
ackit webui --output docs/local-webui.html --json
ackit webui --output .ackit/webui/baseline.html --baseline .ackit-baseline.json
```

Default output path:
- `.ackit/webui/index.html`

Safety behavior:
- Output paths must be repository-relative.
- Existing files are not overwritten.
- The prototype is self-contained and uses no remote assets.
- Repository-controlled text is HTML-encoded.
- With `--baseline`, the dashboard and review queue show existing/new classification without hiding findings.

### `ackit prompt-pack`
Generates a local dry-run Markdown prompt pack for future LLM context review. Existing prompt-pack files are skipped.

```powershell
ackit prompt-pack
ackit prompt-pack --output .ackit/prompt-packs/current.md
ackit prompt-pack --output docs/local-prompt-pack.md --json
```

Default output path:
- `.ackit/prompt-packs/prompt-pack.md`

Safety behavior:
- Output paths must be repository-relative.
- Existing files are not overwritten.
- The command does not call remote LLM providers.
- The command does not read, store, generate, or validate API keys.

### `ackit context-export`
Creates a local JSON approval manifest for a reviewed prompt pack. Existing manifest files are skipped.

```powershell
ackit context-export --prompt-pack .ackit/prompt-packs/current.md --approve
ackit context-export --prompt-pack .ackit/prompt-packs/current.md --approve --output .ackit/context-exports/current.json --json
```

Default output path:
- `.ackit/context-exports/context-export-manifest.json`

Safety behavior:
- `--approve` is required.
- `--prompt-pack <repo-relative.md>` is required.
- Prompt pack and output paths must be repository-relative.
- Existing files are not overwritten.
- The command does not upload content or call remote LLM providers.
- The command does not read, store, generate, or validate API keys.

### `ackit generate`
Generates agent context/workflow files. Existing files are skipped.

```powershell
ackit generate --target codex --lang en
ackit generate --target anthropic --lang en
ackit generate --target continue --lang en
ackit generate --target all --lang en --json
```

Targets:
- `codex`
- `claude`
- `anthropic`
- `cursor`
- `copilot`
- `continue`
- `all`

### `ackit hooks`
Previews or installs local hook reminder files. Existing files are skipped.

```powershell
ackit hooks --target codex --shell pwsh --dry-run
ackit hooks --target codex --shell pwsh --install
ackit hooks --target anthropic --shell pwsh --dry-run --json
ackit hooks --target continue --shell sh --install
ackit hooks --target codex --shell sh --install --output .ackit/hook-preview
```

Targets:
- `codex`: writes `.git/hooks/pre-commit` and `.git/hooks/pre-push`.
- `claude`: keeps the same Git hook behavior as `codex` for compatibility.
- `anthropic`: writes `.anthropic/hooks/installed.txt` and a local reminder script.
- `continue`: writes `.continue/hooks/installed.txt` and `.continue/hooks/hooks.json`.

Safety behavior:
- Dry-run mode lists planned paths and content lengths without writing files.
- `--dry-run` takes precedence over `--install`.
- `--shell` accepts only `pwsh` or `sh`; Continue output is shell-agnostic.
- Without `--output`, Git hook targets must run inside a Git repository.
- `--output` must be repository-relative. Existing `.git/hooks` output compatibility is preserved by writing `pre-commit` and `pre-push` directly under the output directory.
- The command does not register real-time listeners, perform HTTP calls, upload repository content, or store secrets.

### `ackit task`
Creates a structured task file under `docs/tasks`.

```powershell
ackit task "Add admin permission checks" --lang en
ackit task "Admin yetki kontrolleri ekle" --lang tr
```

### `ackit redact-check`
Reports secret, PII, brand, local path, and production config risks.

```powershell
ackit redact-check --profile public-release
ackit redact-check --profile public-release --json
```

Exit codes:
- `0`: no findings
- `1`: warning findings
- `2`: critical findings

Config allowlists can suppress non-Critical scanner noise, but Critical secret-like findings remain reportable.

### `ackit doctor`
Reports repository health.

```powershell
ackit doctor
ackit doctor --json
```

Exit codes are documented in [EXIT_CODES.md](EXIT_CODES.md).

### `ackit version`
Prints the CLI version.

### `ackit help`
Prints help.
