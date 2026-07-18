# No-Network Default Policy

Status: authoritative documentation for current default AgentContextKit behavior.

## Default Guarantee Boundary
After the tool is installed, normal AgentContextKit commands operate on local repository files and do not upload repository content, call an AI/model API, invoke an external tool, send telemetry, create a hosted report, upload SARIF, push Git, publish packages, or modify remote repository/security settings.

Default commands include local scan, doctor, config diagnostics, baseline, SARIF/report/Web UI generation, prompt-pack dry run, approved local context-export manifest, agent file generation, task/handoff generation, and current-source `ackit optimize` instruction auditing/proposal generation.

## Local Outputs
Generated `.ackit/` reports, Web UI, prompt packs, context exports, SARIF, Optimize reports/proposals, baselines, and external-tool experiments are local artifacts. Ignore rules and repository-relative output checks reduce accidental commits, but users must still review `git status` and content before sharing. Optimize does not call GPT-5.6 or another model at runtime; its audit/proposal path is deterministic local code.

## What Offline Does Not Mean
- Package/tool installation itself may require a package source.
- Git fetch, remote repository input, vulnerability database/rule updates, external URL checks, hosted dashboards, model APIs, and release operations are networked actions outside the default command boundary.
- Related tools have different defaults; a local path mode does not prove every mode is offline.
- Local execution does not make an external binary or output trustworthy.

## External Tools
AgentContextKit does not install or invoke external tools by default. Users install them manually and select any workflow explicitly. Future executable integration requires evidence, threat, output, timeout, platform, and no-network tests. See `docs/INTEROPERABILITY_DESIGN.md`.

## Future Networked Modes
Any future networked feature must be a separate explicit opt-in with:
- clear destination/provider and purpose;
- exact data categories and minimization;
- preview and user approval;
- credential handling outside repository files and command history;
- timeout/cancellation and failure isolation;
- telemetry/retention disclosure;
- tests proving default commands remain network-free; and
- rollback plus documentation updates.

No current roadmap item authorizes such a mode.

## Remote Writes
Push, tag, GitHub Release, Code Scanning upload, repository/security setting changes, issue/label creation, NuGet publish, signing, SBOM/provenance publication, and package recovery remain explicit maintainer actions.

## Verification
Local validation checks source/build/test/scan behavior and documentation boundaries. It cannot prove that an independently installed external binary never uses network. Use a disposable network-off lab for that evidence.
