# Sample Gallery

External-tool experiments may use these samples only through `docs/DISPOSABLE_EXTERNAL_WORKFLOW_LAB.md`. Copy a sample into ignored `.ackit/external/lab/`; do not write external output into the tracked sample directories.

AgentContextKit sample gallery is a set of small, safe repositories under `samples/` for scanner demos, onboarding, and documentation checks.

Samples are intentionally minimal. They are not production templates and should not contain generated outputs, real secrets, package artifacts, `bin/`, `obj/`, `node_modules`, archives, or local reports.

For scanner configuration examples that are safe to copy into demo repositories, see `docs/examples/config/`.

## Which Sample Shows What?
| Sample | Problem Shown |
| --- | --- |
| `samples/dotnet-console` | Basic .NET stack detection and minimal repository health gaps. |
| `samples/dotnet-minimal-api` | ASP.NET Core Minimal API sample stack detection without affecting the main repository stack. |
| `samples/node-tooling` | Node, TypeScript, and Tailwind CSS sample stack detection without `node_modules`. |
| `samples/generic-empty-repo` | Missing repository health signals in a nearly empty repository. |
| `samples/security-fixture-repo` | Safe security fixture wording without real secrets or exact sensitive token prefixes. |
| `samples/ackit-optimize-demo` | Post-RC1 Build Week instruction audit with nested scope, duplicates, a real conflict, a valid override, stale/vague rules, and non-destructive proposal metrics. |

## `samples/dotnet-console`
- Path: `samples/dotnet-console`
- Stack: .NET console app.
- Expected detected stack:
  - `.NET`
- Expected health gaps:
  - No license.
  - No security policy.
  - No tests.
  - No CI workflow.
  - No agent instruction files unless generated locally.
- Suggested commands:

```powershell
Push-Location samples/dotnet-console
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci
Pop-Location
```

- Expected generated files if `generate --target all` is run locally:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `.cursor/rules/project.mdc`
  - `.github/copilot-instructions.md`
  - `docs/PROJECT_MAP.md`
  - `docs/AI_WORKFLOW.md`
  - `docs/SECURITY_NOTES.md`
  - `docs/DEVELOPMENT_STANDARD.md`
- Expected risk behavior:
  - No high or critical findings in the committed sample.

## `samples/dotnet-minimal-api`
- Path: `samples/dotnet-minimal-api`
- Stack: ASP.NET Core Minimal API.
- Expected detected stack:
  - `.NET`
  - `ASP.NET Core`
  - `ASP.NET Core Minimal API`
- Expected health gaps:
  - No license.
  - No security policy.
  - No tests.
  - No CI workflow.
- Suggested commands:

```powershell
Push-Location samples/dotnet-minimal-api
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
Pop-Location
```

- Expected generated files:
  - Same generated agent/context files as other samples if `generate --target all` is run locally.
- Expected risk behavior:
  - No high or critical findings in the committed sample.
- Main repository note:
  - This sample should not make the main repository self-scan report ASP.NET Core or Minimal API as the product stack.

## `samples/node-tooling`
- Path: `samples/node-tooling`
- Stack: Node, TypeScript, Tailwind CSS.
- Expected detected stack:
  - `Node`
  - `TypeScript`
  - `Tailwind CSS`
- Expected health gaps:
  - No license.
  - No security policy.
  - No tests.
  - No CI workflow.
- Suggested commands:

```powershell
Push-Location samples/node-tooling
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
Pop-Location
```

- Expected generated files:
  - Same generated agent/context files as other samples if `generate --target all` is run locally.
- Expected risk behavior:
  - No high or critical findings in the committed sample.
- Main repository note:
  - This sample should not make the main repository self-scan report Node, TypeScript, or Tailwind CSS as the product stack.

## `samples/generic-empty-repo`
- Path: `samples/generic-empty-repo`
- Stack: none or unknown.
- Expected detected stack:
  - Unknown or no strong stack signal.
- Expected health gaps:
  - No license.
  - No security policy.
  - No tests.
  - No CI workflow.
  - No `.gitignore`.
  - No agent instruction files unless generated locally.
- Suggested commands:

```powershell
Push-Location samples/generic-empty-repo
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- doctor
Pop-Location
```

- Expected generated files:
  - Same generated agent/context files as other samples if `generate --target all` is run locally.
- Expected risk behavior:
  - `scan --ci` should not fail on high or critical findings.
  - `doctor` can fail because the sample intentionally lacks repository-health files.

## `samples/security-fixture-repo`
- Path: `samples/security-fixture-repo`
- Stack: none or unknown.
- Expected detected stack:
  - Unknown or no strong stack signal.
- Expected health gaps:
  - No license.
  - No security policy.
  - No tests.
  - No CI workflow.
- Suggested commands:

```powershell
Push-Location samples/security-fixture-repo
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- scan --ci
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- redact-check --profile public-release
Pop-Location
```

- Expected generated files:
  - Same generated agent/context files as other samples if `generate --target all` is run locally.
- Expected risk behavior:
  - No critical findings in committed files.
  - Fake-secret behavior is documented with split notation rather than exact token-like prefixes.
  - `ACKIT` rule IDs and config allowlist behavior can be demonstrated with placeholder-only values.
  - Critical secret-like findings should remain reportable in temporary local tests and should not be committed.

## Local Report And Web UI Demos
Reports and Web UI files are local-only outputs:

```powershell
Push-Location samples/dotnet-console
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- report --output .ackit/reports/sample.html
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- webui --output .ackit/webui/sample.html
Pop-Location
```

Do not commit generated `.ackit/` outputs. They can contain local paths and are not public release artifacts.

Public screenshots from samples must follow [VISUAL_ASSETS.md](VISUAL_ASSETS.md) and [WEB_UI_PREVIEW.md](WEB_UI_PREVIEW.md). Prefer sanitized screenshots from safe sample repositories when README visuals are added.

## `samples/ackit-optimize-demo`

- Path: `samples/ackit-optimize-demo`
- Purpose: safe synthetic judging fixture for current-source ACKit Optimize; it is not part of the immutable `1.0.0-rc.1` package.
- Instruction surfaces: root `AGENTS.md`, nested `src/web/AGENTS.md`, root `CLAUDE.md`, and `docs/AI_WORKFLOW.md`.
- Expected scope behavior: four sources, four resolved scopes, and one valid npm-to-pnpm subtree override.
- Expected audit: 16 parsed rules and 10 findings: two `ACKITOPT001`, one `ACKITOPT002`, two `ACKITOPT007`, one each of `ACKITOPT008`, `ACKITOPT009`, `ACKITOPT012`, `ACKITOPT013`, and `ACKITOPT014`.
- Expected whole-surface estimate: 1,080 characters, 142 words, 39 lines, and 270 estimated tokens; duplicated estimate 24 tokens and avoidable estimate 35 tokens.
- Expected proposal rule-body metrics: 765 characters / 115 words / 16 lines / 192 estimated tokens before; 624 / 92 / 13 / 156 after; 141 / 23 / 3 / 36 avoided.
- Expected proposal: 13 retained rules, two consolidation groups, two unresolved safety decisions, and preserved Deployment, Documentation, Release, Security, and Verification categories.

```powershell
Push-Location samples/ackit-optimize-demo
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- optimize
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- optimize --json
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- optimize --format sarif --output .ackit/reports/instructions.sarif
dotnet run --project ../../src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -- optimize --format html --output .ackit/reports/instructions.html --proposal .ackit/reports/optimized-instructions.md
Get-Content .ackit/reports/instructions.sarif | ConvertFrom-Json | Out-Null
Pop-Location
```

All generated outputs remain ignored local artifacts. The committed fixture contains no credential value, private path, customer data, or generated report.
