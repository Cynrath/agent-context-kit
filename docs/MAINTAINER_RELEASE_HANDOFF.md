# Maintainer Release Handoff

The completed alpha.2 scope is in `docs/V020_ALPHA2_SCOPE.md`. PROJECT-CONTROL-0102 authorized the validated normal pushes and exact-SHA OIDC release sequence for `v0.2.0-alpha.2`.

This handoff records the completed `v0.2.0-alpha.2` GitHub and NuGet pre-release state.

Future release sequences must not use API keys. Publication is allowed only through the manual OIDC workflow after the exact release commit passes all required hosted jobs.

## Future Release-Candidate Decision
TASK-0092 prepares a conditional local contract freeze in `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md` and the authoritative GO/NO-GO checklist in `docs/MAINTAINER_RC_DECISION.md`. The current decision is NO-GO for RC publication until hosted evidence, remaining P0 gaps, private vulnerability reporting, schema assets, and supply-chain decisions are complete.

TASK-0133 selected `0.2.0-alpha.3` as the smallest compatible planning scope. TASK-0202 records the missing backup security and package recovery evidence. TASK-0203 prepared source/package metadata and local package evidence. TASK-0204 identified dispatch-time current `origin/master` as the exact hosted RC evidence candidate and predecessor `0.2.0-alpha.2`. TASK-0205 verified hosted RC run `27868539971` as green for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801`, candidate `0.2.0-alpha.3`, predecessor `0.2.0-alpha.2`, and source candidate package `0.2.0-alpha.3.ci.27868539971`; Windows, Ubuntu, and macOS jobs all succeeded. Exact-candidate GO is recorded for a later publish task only.

TASK-0134 evaluated the earlier GO packet on 2026-06-14 and recorded NO-GO in `docs/V020_ALPHA3_RELEASE_DECISION.md`. TASK-0203 supersedes only the local preparation boundary. TASK-0204 supersedes only the hosted-RC planning boundary. TASK-0205 supersedes the hosted-evidence pending boundary with exact-candidate GO, but it still does not authorize release workflow dispatch, release-candidate workflow dispatch, tag creation, GitHub Release creation, or NuGet publication.

Later publish task boundary:
- decide whether to publish the hosted RC evidence commit `beaa14deed3dbc55ac98d216679f9a9799261801` or a later docs-only HEAD according to the release workflow exact-commit policy;
- if using a later docs-only HEAD, prove package/source metadata remains unchanged from the hosted RC evidence commit or obtain a new hosted RC run;
- publish only through the manual OIDC release workflow after explicit authorization in that task.

TASK-0206 pre-dispatch update: the release workflow's `operation=publish` path requires `automation_commit_sha == release_commit_sha` and `scripts/prepare-release.ps1 -RequireOriginMaster`, so publication must use the current final `origin/master` SHA at dispatch time for both inputs. The bridge from hosted RC evidence commit `beaa14deed3dbc55ac98d216679f9a9799261801` to initial TASK-0206 publish candidate `85383a9321566f9e0989a0db5429fb7d72d6109a` was classified as docs/handoff/governance-only with 0 package/source-impacting files. TASK-0206 may dispatch `release.yml` after the pre-dispatch evidence commit is pushed, `origin/master` is recomputed, and the bridge remains package/source clean.

For a future different candidate, maintainer-only RC evidence command:

```powershell
$commitSha = (git rev-parse origin/master).Trim()
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-inputs.ps1 `
  -CommitSha $commitSha `
  -CandidateVersion 0.2.0-alpha.3 `
  -PredecessorVersion 0.2.0-alpha.2 `
  -RequireOriginMaster

gh workflow run release-candidate-evidence.yml `
  --repo Cynrath/agent-context-kit `
  --ref master `
  -f commit_sha=$commitSha `
  -f candidate_version=0.2.0-alpha.3 `
  -f predecessor_version=0.2.0-alpha.2
```

## Current Published State
- GitHub repository public: yes, `https://github.com/Cynrath/agent-context-kit`.
- `master` pushed: yes.
- `v0.2.0-alpha.2` tag pushed: yes.
- GitHub Actions latest `master` run is green per maintainer-provided release status.
- Read-only GitHub CLI validation on 2026-06-05 confirmed `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` succeeded for commit `8dac9237c27ba912d056344155f1c9f901557bf5`.
- Repository description is set.
- Repository topics are set.
- GitHub Release page for `v0.2.0-alpha.2`: completed as a pre-release.
- NuGet publish for `AgentContextKit` `0.2.0-alpha.2`: completed.
- NuGet global tool install verification for `0.2.0-alpha.2`: completed.
- NuGet global tool smoke test for `0.2.0-alpha.2`: completed.
- Cross-platform CI smoke validation: completed on commit `868dff3` for Windows, Ubuntu, and macOS.
- Current published-package smoke validation: completed on commit `8dac9237c27ba912d056344155f1c9f901557bf5` for Windows, Ubuntu, and macOS.
- Current source-package smoke validation: completed on commit `8dac9237c27ba912d056344155f1c9f901557bf5` for Windows, Ubuntu, and macOS.
- `RepositoryUrl` is `https://github.com/Cynrath/agent-context-kit`.
- `PackageProjectUrl` is `https://github.com/Cynrath/agent-context-kit`.
- `PackageId` is `AgentContextKit`.
- `ToolCommandName` is `ackit`.
- `Authors` and `Company` are `Cynrath`.
- Codex for OSS application pack is ready in `docs/CODEX_FOR_OSS_APPLICATION.md`.

## Verified Install
Maintainer verification evidence:

```powershell
dotnet tool install --global AgentContextKit --version 0.2.0-alpha.2
ackit version
ackit --help
```

Expected version output:

```text
AgentContextKit 0.2.0-alpha.2
```

If the tool is already installed, use:

```powershell
dotnet tool update --global AgentContextKit --version 0.2.0-alpha.2
```

## Verified NuGet Smoke Test
Completed smoke test evidence:

- Clean test app: external `ackit-smoke-test/DemoApp` directory outside this repository.
- `ackit init --lang tr` created `.ackit/config.yml`.
- `ackit scan --ci` reported no risk findings.
- `ackit generate --target all --lang tr` created `AGENTS.md`, `CLAUDE.md`, `.cursor/rules/project.mdc`, `.github/copilot-instructions.md`, docs, and `.codex` files.
- `ackit task "Demo smoke test görevi" --lang tr` worked.
- `ackit report --output .ackit/reports/smoke.html` worked.
- `ackit webui` worked and created `.ackit/webui/index.html`.
- Fake `OPENAI_API_KEY` in `.env.test` was detected by `redact-check` as Critical with exit code `2`.
- After `.env.test` was deleted, `ackit scan --ci` reported no risk findings.
- `ackit scan --json`, `ackit doctor --json`, `ackit prompt-pack`, and `ackit context-export` worked.
- `context-export` did not call a remote LLM provider.

`ackit doctor` reported expected health failures on the minimal demo app because README, LICENSE, SECURITY, tests, CI, `.gitignore`, and package metadata were absent. This is correct repository-health behavior, not a tool issue.

## Cross-Platform CI Smoke Test
`.github/workflows/cross-platform-smoke.yml` verifies the published NuGet global tool:

- `windows-2025`
- `ubuntu-latest`
- `macos-latest`

The workflow installs .NET 10, installs `AgentContextKit` version `0.2.0-alpha.2` globally, adds the platform-specific `.dotnet/tools` path, creates a clean demo app, runs the installed-tool smoke flow, verifies fake secret detection returns exit code `2`, deletes the fake secret, runs `ackit sarif`, and finishes with `ackit scan --ci`.

This workflow remains the published-package smoke baseline for the current release. It does not create tags, publish NuGet packages, or mutate release metadata.

Latest read-only GitHub CLI evidence:
- Workflow run `27471224861`, commit `ead65120928835419fb91bf695e845721620c394`, branch `master`, conclusion `success`.
- Jobs `smoke (windows-2025)`, `smoke (ubuntu-latest)`, and `smoke (macos-latest)` completed successfully with the published alpha.2 package.

## Cross-Platform Source Smoke Test
`.github/workflows/cross-platform-source-smoke.yml` is used for current-branch source package validation before future publication.

The workflow:
- Runs on `windows-2025`, `ubuntu-latest`, and `macos-latest`.
- Uses `actions/checkout@v6` and `actions/setup-dotnet@v5`.
- Runs restore, Release build, and Release tests.
- Packs the current source into a temporary package directory.
- Installs `AgentContextKit` version `0.2.0-alpha.3` from the temporary package source into a temporary tool path for the current candidate.
- Runs `ackit version`, `ackit --help`, clean DemoApp smoke commands, fake-secret `redact-check` expected failure, fake secret cleanup, and final `ackit scan --ci`.

Latest read-only GitHub CLI evidence:
- Workflow run `27471224867`, commit `ead65120928835419fb91bf695e845721620c394`, branch `master`, conclusion `success`.
- Jobs `source smoke (windows-2025)`, `source smoke (ubuntu-latest)`, and `source smoke (macos-latest)` completed successfully.

## v0.2.0-alpha.2 Published Handoff
Current source is published as the `0.2.0-alpha.2` package. It includes `ackit sarif`, SARIF 2.1.0 output, scanner rule catalog hardening, configurable allowlists, additive JSON `ruleId`, expanded scanner patterns, sample gallery docs, demo scenarios, Web UI preview docs, and visual asset guidance.

Maintainer-only next release actions:
- Decide the next version after TASK-0125 final hosted validation.
- Use `docs/RELEASE_BODY_V020_ALPHA2.md` as the immutable alpha.2 release-note reference.
- Confirm hosted `ci`, published-package smoke, and source-package smoke are green after the next push.
- Create any future tags and GitHub Releases only after reviewed release commits.
- Publish future NuGet packages only from reviewed exact release commits through OIDC Trusted Publishing.
- Decide whether CodeQL or GitHub Code Scanning/SARIF upload should be enabled.

## v0.2.0-alpha.2 Release Handoff
`docs/V020_ALPHA2_SCOPE.md` records alpha.2 as a small hardening package: culture-invariant scanner matching, expanded scanner fixtures, sanitized human/JSON suppression audit output, baseline-aware CI polish, config diagnostics, and release automation. CLI command compatibility, exit codes, JSON schema `2`, config schema `1`, and visible-findings-only SARIF were preserved.

TASK-0123 prepared and validated the exact package commit. TASK-0124 published through OIDC, then completed the exact tag and GitHub pre-release without republishing after an idempotent recovery. TASK-0125 owns the public install/workflow sync and final post-publish 8/8 validation.

## GitHub Contributor Workflow
The repository now includes GitHub issue templates, a pull request template, `docs/MAINTAINER_GUIDE.md`, `docs/SUPPORT_MATRIX.md`, `docs/CONTRIBUTOR_ONBOARDING.md`, `docs/GITHUB_REPO_HYGIENE.md`, and `docs/ISSUE_TRIAGE.md`.

## Completed Alpha.2 Work
Alpha.2 publication is completed after the first alpha release.

Implemented locally:
- Scanner safe technical allowlist and fixture-noise reduction.
- GitHub Actions Node 24 readiness and explicit Windows runner labels.
- Turkish human CLI output polish.
- Alpha.2 release preparation docs.
- Source/package metadata and CLI runtime version bump to `0.1.0-alpha.2`.
- Cross-platform source smoke workflow for the current branch.
- GitHub Release, NuGet publish, global tool install verification, and Web UI smoke.

Not performed:
- Push.
- Future tag, GitHub Release, or NuGet publish actions beyond `v0.2.0-alpha.2`.

## GitHub Actions Node 24 Readiness
The local workflow files have been prepared for Node 24-compatible official actions:

- `ci.yml`: `actions/checkout@v6`, `actions/setup-dotnet@v5`, `windows-2025`, read-only `contents: read`.
- `cross-platform-smoke.yml`: `actions/setup-dotnet@v5`, `windows-2025`, read-only `contents: read`.
- `cross-platform-source-smoke.yml`: `actions/checkout@v6`, `actions/setup-dotnet@v5`, `windows-2025`, read-only `contents: read`.
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` is not required for the current local workflow because the selected official action majors are Node 24-ready.

Manual validation required after the next maintainer push:
- Confirm `ci` succeeds on Ubuntu and Windows.
- Confirm `cross-platform-smoke` succeeds on Windows, Ubuntu, and macOS.
- Confirm `cross-platform-source-smoke` succeeds on Windows, Ubuntu, and macOS for future source changes.
- Confirm no Node.js 20 runtime warning remains.
- Confirm no `windows-latest` redirect notice remains.

## GitHub Repository Metadata
Repository description:

```text
Offline-first CLI for generating safe AI coding agent context, task-first workflows, repo hygiene reports, and multi-agent instruction files.
```

GitHub topics:

```text
ai-tools, coding-agents, codex, developer-tools, dotnet, cli, repository-scanner, agents-md, open-source, security
```

## Codex For OSS Form
The Codex for OSS form has been submitted per maintainer-provided status. Keep `docs/CODEX_FOR_OSS_APPLICATION.md` as the submitted application pack/reference.

Form-ready sections are included for:
- Why this repository is a good fit.
- How API credits would be used.
- Additional notes.

## Future Release Checklist
- Review the next version and release notes intentionally.
- Run restore/build/test/scan/doctor.
- Run local pack and temporary tool-path smoke.
- Confirm hosted `cross-platform-source-smoke` succeeds after push.
- Run release gates.
- Push release commits and tag only after review.
- Create GitHub Release.
- Publish NuGet through the authorized exact-SHA OIDC workflow.
- Verify install from NuGet.
- After NuGet publication, update published-package smoke and public install docs to the new version.
