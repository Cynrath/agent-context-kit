# Support Matrix

This matrix documents the tested and intended support surface for AgentContextKit.

## Current Release
- Package: `AgentContextKit`
- Command: `ackit`
- Current complete prerelease: `v1.0.0-rc.1`
- Previous release: `v0.2.0-alpha.2`
- Target framework: .NET 10

## Supported Operating Systems
| Platform | Status | Notes |
| --- | --- | --- |
| Windows | Supported | Tested in GitHub Actions on `windows-2025`; PowerShell examples are primary. |
| Ubuntu Linux | Supported | Tested in GitHub Actions on `ubuntu-latest`. |
| macOS | Supported | Tested in GitHub Actions on `macos-latest`. |

## .NET Support
| Runtime or SDK | Status | Notes |
| --- | --- | --- |
| .NET 10 SDK | Supported | Required for source build, test, and local package creation. |
| .NET 10 runtime/tool host | Supported | Required to run the global tool. |
| .NET 9 and older | Unsupported | Not a release target for the current package. |

## Shell Notes
- PowerShell is the primary documented shell because workflows and local validation scripts use it.
- Bash-compatible shells can run the installed `ackit` command, but release scripts are PowerShell-first.
- Global tool paths differ by platform; see `docs/RELEASE_VALIDATION.md`.

## Tested Command Classes
- Version/help: `ackit version`, `ackit --help`.
- Repository setup: `ackit init`.
- Scanning: `ackit scan`, `ackit scan --ci`, `ackit scan --json`.
- Generation: `ackit generate`, `ackit task`.
- Local artifacts: `ackit report`, `ackit webui`, `ackit prompt-pack`, `ackit context-export`.
- Current-source instruction audit: `ackit optimize` console/JSON/Markdown/SARIF/offline HTML and explicit review proposal. Published `1.0.0-rc.1` predates this command.
- Safety checks: `ackit redact-check`, `ackit doctor`.
- Local automation helpers: `ackit mcp`, `ackit watch`, `ackit diff`, `ackit trim`.

## Not Supported
- Hosted Web UI.
- Automatic secret redaction.
- Remote LLM calls from the MVP commands.
- NuGet publish, GitHub push, tag creation, or GitHub Release creation by the tool.
- Running without a supported .NET tool host.

## Validation Source
The current support claim is based on local validation plus GitHub Actions `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` success for Windows, Ubuntu, and macOS. Build Week source-smoke run `29653163760` exercises Optimize JSON, proposal creation, proposal review markers, and SARIF from the exact implementation SHA `7bf37cb83de64c7950e0bd27336fbc26758eb56a` on all three operating systems.

TASK-0058 read-only GitHub CLI observation confirmed all three workflows are passing on latest `master`.

TASK-0064 read-only GitHub CLI observation confirmed `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` passed for commit `6d38f11`.

Support duration, predecessor policy, runner expectations, and end-of-life handling are defined in [SUPPORT_LIFECYCLE.md](SUPPORT_LIFECYCLE.md).
