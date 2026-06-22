# AgentContextKit

Offline-first repository context and safety tooling for AI-assisted development.

AgentContextKit analyzes a repository, generates clean agent context files, creates task-first workflow docs, and catches secret, PII, and brand leakage risks before a project is shared with AI agents or released publicly.

This NuGet README is intentionally plain Markdown so it renders consistently on nuget.org. The richer GitHub README remains in `README.md`.

## Install

Install the current package version shown on nuget.org:

```powershell
dotnet tool install --global AgentContextKit --version <package-version>
```

Update an existing global install:

```powershell
dotnet tool update --global AgentContextKit --version <package-version>
```

Verify the tool:

```powershell
ackit version
ackit --help
```

## Quick start

Run the local repository health check:

```powershell
ackit doctor
```

Scan the current repository for release-blocking context risks:

```powershell
ackit scan --ci
```

Create a task-first workflow note:

```powershell
ackit task "Describe the next focused change"
```

Generate local agent instructions and context files:

```powershell
ackit generate --target all
ackit prompt-pack --output .ackit/prompt-pack.md
```

## Core commands

| Command | Purpose |
| --- | --- |
| `ackit doctor` | Checks repository readiness signals. |
| `ackit scan --ci` | Scans for secret, PII, brand, artifact, and release-safety findings. |
| `ackit task "title"` | Creates a task-first workflow document. |
| `ackit generate --target all` | Generates supported local agent instruction surfaces. |
| `ackit prompt-pack` | Builds a local Markdown prompt pack for review. |
| `ackit context-export --approve` | Exports reviewed context after explicit approval. |
| `ackit sarif --output <file.sarif>` | Writes SARIF for security tooling. |
| `ackit report --output <file.html>` | Writes a local HTML report. |
| `ackit watch --once` | Runs the watch-mode scan path once. |

## Safety model

Default commands process repository content locally. They do not upload a repository, call an AI API, send telemetry, or invoke external tools by default.

The tool is designed for a human-reviewed workflow before a repository is handed to Codex, Claude Code, Cursor, GitHub Copilot, Gemini CLI, or a similar coding agent.

## Documentation

- Project website: https://github.com/Cynrath/agent-context-kit
- CLI reference: https://github.com/Cynrath/agent-context-kit/blob/master/docs/CLI_REFERENCE.md
- No-network default policy: https://github.com/Cynrath/agent-context-kit/blob/master/docs/NO_NETWORK_DEFAULT_POLICY.md
- Security policy: https://github.com/Cynrath/agent-context-kit/security
- License: MIT

## Package note

The NuGet package uses `README.nuget.md` as `PackageReadmeFile`. Keep this file pure Markdown and avoid raw HTML, local image paths, generated report artifacts, or GitHub-only layout markup.
