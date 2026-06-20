# First Five Minutes With Ackit

This tutorial covers the Inspect, Harden, Generate, Review, and Validate portions of [Agent Context Pipeline](AGENT_CONTEXT_PIPELINE.md). It does not require optional external enrichment.

For Turkish human-readable output, add `--lang tr` to supported commands. CLI command/option names and JSON fields remain unchanged so the same copy-paste workflow and automation contract work in both languages.

This tutorial uses the published `AgentContextKit` `0.2.0-alpha.3` global tool and a disposable synthetic repository. It does not upload repository content or call a remote AI provider.

## 1. Install And Verify

Prerequisites: Git and the .NET 10 SDK.

```powershell
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.3
ackit version
ackit --help
```

Expected version:

```text
AgentContextKit 0.2.0-alpha.3
```

If the tool is already installed at this version, skip the install command and run the two verification commands.

## 2. Create A Disposable Repository

Use a timestamped temporary directory so the tutorial can be rerun without mixing old files:

```powershell
$demoRoot = Join-Path $env:TEMP ("ackit-first-five-" + (Get-Date -Format "yyyyMMddHHmmss"))
New-Item -ItemType Directory -Path $demoRoot -Force | Out-Null
Push-Location $demoRoot
dotnet new console -n DemoApp
Set-Location DemoApp
git init
```

The demo contains no customer, employer, production, or personal data.

## 3. Initialize And Inspect

```powershell
ackit init --lang en
ackit scan
```

`init` creates `.ackit/config.yml`. `scan` is report-only: it shows stack signals, repository health, and findings without using CI failure behavior.

For Turkish generated output, replace `--lang en` with `--lang tr` in commands that accept a language option.

## 4. Generate Agent Context And A Task

```powershell
ackit generate --target all --lang en
ackit task "Add input validation" --lang en
```

Expected generated context includes:

- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/project.mdc`
- `.github/copilot-instructions.md`
- Project workflow/security docs.
- A structured task file under `docs/tasks/`.

Existing files are skipped by default. Review every generated file before committing it to a real repository.

## 5. Run The CI-Style Check

```powershell
ackit scan --ci
git status --short
```

`scan --ci` returns `0` when no High or Critical finding exists. It returns `2` for High/Critical scan findings. See [Exit Codes](EXIT_CODES.md) for the full command matrix.

Return to the previous directory when finished:

```powershell
Pop-Location
```

## Optional Local Preview

Create local review artifacts inside the demo repository:

```powershell
ackit report --output .ackit/reports/first-five.html
ackit webui --output .ackit/webui/first-five.html
ackit sarif --output .ackit/reports/first-five.sarif
```

These files are local-only. Do not commit or publish generated `.ackit/` HTML or SARIF without a separate privacy review.

## About Doctor In A Minimal Demo

Running `ackit doctor` in this intentionally small console repository can return a non-zero exit code because README, LICENSE, SECURITY, tests, CI, `.gitignore`, or package metadata are missing. Those are repository-health gaps, not a tool failure.

## Next Steps

- Use [CLI Reference](CLI_REFERENCE.md) for every command and option.
- Use [Configuration](CONFIGURATION.md) before changing scanner allowlists.
- Use [Sample Gallery](SAMPLE_GALLERY.md) for .NET, Minimal API, Node/TypeScript, and security fixture examples.
- Use [Example Workflows](EXAMPLE_WORKFLOWS.md) for CI, reports, Web UI, release preflight, and source-development flows.
- Use [Prepare A Repository For AI Coding Agents](PREPARE_REPOSITORY_FOR_AI_AGENTS.md) before adopting the tool in an existing project.
