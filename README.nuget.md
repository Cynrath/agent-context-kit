# AgentContextKit

Offline-first repository context and safety tooling for AI-assisted development.

AgentContextKit is a .NET global tool (`ackit`) that inspects repository readiness, generates clean agent context files, creates task-first workflow records, and reports secret, PII, brand, artifact, and local-path risks before a project is shared with AI coding agents or released publicly.

This package README intentionally uses plain Markdown only so it renders consistently on nuget.org. The GitHub repository has a richer visual README and a complete Turkish edition.

## Release status

- Latest complete release: `0.2.0-alpha.4`.
- NuGet `1.0.0-rc.1` exists in a partial immutable publication state. Its owner-created exact tag exists, but the single TASK-0253 recovery received HTTP 403 while creating the GitHub prerelease, so prerelease, assets, attestations, and recovered-package matrix evidence remain absent.
- The commands below remain pinned to the latest complete release until that recovery is fully successful.
- AgentContextKit does not claim 1.0 GA readiness.

## Requirements

- .NET 10 SDK/runtime support for the current package.
- Windows, Ubuntu, or macOS.
- A repository you are authorized to inspect.

## Install

Install the latest complete release:

```powershell
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.4
```

Update an existing global install:

```powershell
dotnet tool update --global AgentContextKit --version 0.2.0-alpha.4
```

Verify the executable and discover the current command surface:

```powershell
ackit version
ackit --help
```

## First five minutes

Run these commands from the root of the repository you want to inspect:

```powershell
ackit doctor
ackit scan
ackit scan --ci
```

`ackit scan` reports findings. `ackit scan --ci` returns a non-zero exit code when High or Critical findings should block automation.

Create the local configuration, agent instructions, and a structured task record:

```powershell
ackit init --lang en
ackit generate --target all --lang en
ackit task "Describe the next focused change" --lang en
```

AgentContextKit skips existing generated files by default. Review proposed and generated content before committing it.

## Common workflows

### Repository readiness

```powershell
ackit doctor
ackit scan --ci
ackit redact-check --profile public-release
```

### Local reports

```powershell
ackit sarif --output .ackit/reports/ackit.sarif
ackit report --output .ackit/reports/scan-report.html
ackit webui --output .ackit/webui/index.html
```

### Reviewed baseline

```powershell
ackit baseline
ackit scan --baseline .ackit-baseline.json --ci
```

Baseline mode keeps existing findings visible while the CI policy focuses on new High or Critical findings. Replacing an existing baseline requires the explicit `ackit baseline --update` operation.

### Local context preparation

```powershell
ackit prompt-pack --output .ackit/prompt-packs/review.md
ackit context-export --prompt-pack .ackit/prompt-packs/review.md --approve --output .ackit/context-exports/review.json
```

Prompt packs and context export manifests remain local. The approval flag records an explicit local decision; it does not upload repository content.

## Command map

| Command | Purpose |
| --- | --- |
| `ackit init` | Creates `.ackit/config.yml` without overwriting an existing config. |
| `ackit config-check` | Provides read-only sanitized configuration diagnostics. |
| `ackit doctor` | Checks repository health and OSS readiness signals. |
| `ackit scan` | Detects stacks, project structure, hygiene gaps, and risk findings. |
| `ackit scan --ci` | Applies the High/Critical automation gate. |
| `ackit baseline` | Records a reviewed, sanitized local finding baseline. |
| `ackit redact-check` | Reviews secret, PII, brand, and local-path leakage risk. |
| `ackit generate --target all` | Generates supported agent instruction and workflow files. |
| `ackit task "title"` | Creates a structured task-first Markdown record. |
| `ackit sarif` | Writes privacy-first SARIF 2.1.0 output. |
| `ackit report` | Writes a self-contained local HTML report. |
| `ackit webui` | Writes a self-contained local review dashboard. |
| `ackit prompt-pack` | Builds a local Markdown prompt pack for human review. |
| `ackit context-export --approve` | Creates a local approved-context manifest. |
| `ackit diff` | Compares sanitized baseline snapshots. |
| `ackit trim` | Applies a size limit to Markdown or JSON context artifacts. |
| `ackit watch` | Runs a debounced local scan watcher. |
| `ackit mcp --stdio-server` | Runs the local JSON-RPC stdio transport. |

Use `ackit --help` as the authoritative command and option reference for the installed version.

## Generated files

Depending on the selected command and target, AgentContextKit can create:

- `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/project.mdc`, `.github/copilot-instructions.md`
- `docs/PROJECT_MAP.md`, `docs/AI_WORKFLOW.md`, `docs/SECURITY_NOTES.md`
- `docs/tasks/TASK-0001.md`
- `.ackit/reports/*.html` and `.ackit/reports/*.sarif`
- `.ackit/webui/*.html`
- `.ackit/prompt-packs/*.md`
- `.ackit/context-exports/*.json`

Generated `.ackit/` artifacts are intended for local review and should not be committed or shared without inspection.

## Safety and privacy

Default commands:

- do not upload repository contents;
- do not call a remote AI API;
- do not send telemetry;
- do not install or invoke external tools;
- do not publish to GitHub or NuGet;
- do not overwrite existing generated files by default;
- do not write raw secret matches into SARIF.

AgentContextKit reports risk; it does not automatically redact secrets in the MVP. Static reports, Web UI files, prompt packs, and context manifests can contain repository metadata or local paths, so review them before sharing.

## Language support

English is the default. Use `--lang tr` for supported Turkish human-readable output and templates:

```powershell
ackit scan --lang tr
ackit generate --target all --lang tr
ackit task "Yetki kontrollerini ekle" --lang tr
```

Machine-readable JSON field names and schemas remain stable in English.

## Documentation and support

- GitHub repository: https://github.com/Cynrath/agent-context-kit
- Turkish README: https://github.com/Cynrath/agent-context-kit/blob/master/README.tr.md
- First five minutes: https://github.com/Cynrath/agent-context-kit/blob/master/docs/FIRST_FIVE_MINUTES.md
- CLI reference: https://github.com/Cynrath/agent-context-kit/blob/master/docs/CLI_REFERENCE.md
- Configuration: https://github.com/Cynrath/agent-context-kit/blob/master/docs/CONFIGURATION.md
- No-network policy: https://github.com/Cynrath/agent-context-kit/blob/master/docs/NO_NETWORK_DEFAULT_POLICY.md
- Troubleshooting: https://github.com/Cynrath/agent-context-kit/blob/master/docs/TROUBLESHOOTING.md
- Security policy: https://github.com/Cynrath/agent-context-kit/security
- Issues: https://github.com/Cynrath/agent-context-kit/issues
- License: MIT

## NuGet rendering boundary

The package uses `README.nuget.md` as `PackageReadmeFile`. This file deliberately avoids raw HTML, CSS, relative local images, GitHub-only alignment/layout markup, and generated artifacts.

NuGet packages are immutable. Updating this source file does not retroactively change the README embedded in an already-published package; improvements appear only in a future separately authorized package version.
