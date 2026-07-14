# Maintainer Release Handoff

The completed alpha.2 scope is in `docs/V020_ALPHA2_SCOPE.md`. PROJECT-CONTROL-0102 authorized the validated normal pushes and exact-SHA OIDC release sequence for `v0.2.0-alpha.2`.

This handoff records the completed `v0.2.0-alpha.2`, `v0.2.0-alpha.3`, `v0.2.0-alpha.4`, and `v1.0.0-rc.1` published states.

Future release sequences must not use API keys. Publication is allowed only through the manual OIDC workflow after the exact release commit passes all required hosted jobs.

## RC1 Publication And Provenance Evidence

NuGet `AgentContextKit 1.0.0-rc.1` is immutable at repository commit `258918b33c3d1359aac967604ee524e8b66ddf02`. Exact tag `v1.0.0-rc.1` targets that commit. TASK-0255 completed GitHub prerelease `353913024` with prepared body and only validated assets `476881883`/`476881892`. TASK-0256 run `29350091782` created and verified attestations `35295200`/`35295205` and passed installed-package smoke on Windows, Ubuntu, and macOS. NuGet was not republished; tag, body, and assets were not mutated. This is a complete prerelease, not `1.0.0` GA.

## Alpha.4 Publication Evidence

TASK-0220 published `AgentContextKit 0.2.0-alpha.4` through the OIDC release workflow on 2026-06-26.

Publish details:
- Publish commit: `98cdf9723a509a347bd0403f6373dafe81ba03fb`
- NuGet package `AgentContextKit` `0.2.0-alpha.4` published
- Tag `v0.2.0-alpha.4` created at publish commit
- GitHub prerelease `v0.2.0-alpha.4` created at 2026-06-26T01:32:17Z
- Global tool install verified: `ackit --version` returns `AgentContextKit 0.2.0-alpha.4`
- `README.nuget.md` package README fix shipped
- Predecessor: `0.2.0-alpha.3` remains published and verified

Release workflow runs:
- Publish initial run: `28210969527` (package published, verify step failed due to NuGet indexing lag)
- Tag/release recovery run: `28211300136` (tag created, GitHub Release created, verify succeeded)

TASK-0221 completed release recovery: alpha4 release body corrected (was showing stale alpha2 content), release workflow notes-file fixed to use version-specific body files, and ACKit-first dogfood rules added to AGENTS.md/CLAUDE.md. TASK-0222 is active for public README/docs sync.

## Future Release-Candidate Decision
TASK-0092 prepares a conditional local contract freeze in `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md` and the authoritative GO/NO-GO checklist in `docs/MAINTAINER_RC_DECISION.md`. The current decision is NO-GO for RC publication until hosted evidence, remaining P0 gaps, private vulnerability reporting, schema assets, and supply-chain decisions are complete.

TASK-0133 selected `0.2.0-alpha.3` as the smallest compatible planning scope. TASK-0202 records the missing backup security and package recovery evidence. TASK-0203 prepared source/package metadata and local package evidence. TASK-0204 identified dispatch-time current `origin/master` as the exact hosted RC evidence candidate and predecessor `0.2.0-alpha.2`. TASK-0205 verified hosted RC run `27868539971` as green for exact commit `beaa14deed3dbc55ac98d216679f9a9799261801`, candidate `0.2.0-alpha.3`, predecessor `0.2.0-alpha.2`, and source candidate package `0.2.0-alpha.3.ci.27868539971`; Windows, Ubuntu, and macOS jobs all succeeded. TASK-0206 then refreshed hosted RC evidence after source-impacting release-gate hardening and published `0.2.0-alpha.3`. TASK-0208 hardened the release asset provenance probe for future release runs without mutating alpha.3 release state.

TASK-0134 evaluated the earlier GO packet on 2026-06-14 and recorded NO-GO in `docs/V020_ALPHA3_RELEASE_DECISION.md`. TASK-0203 superseded only the local preparation boundary. TASK-0204 superseded only the hosted-RC planning boundary. TASK-0205 superseded the hosted-evidence pending boundary with exact-candidate GO. TASK-0206 is the only task that authorized and completed publication.

TASK-0206 publish result:
- Final publish SHA: `92984c6448332aa24b7cff94647f627bf944e535`.
- Refreshed hosted RC evidence: run `27870246504` for commit `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`.
- Final bridge from refreshed RC evidence to publish SHA: docs/handoff/governance-only, 0 package/source-impacting files.
- NuGet package `AgentContextKit` `0.2.0-alpha.3`, tag `v0.2.0-alpha.3`, and GitHub prerelease `v0.2.0-alpha.3` are published and target the final publish SHA.
- `release.yml` `operation=verify-existing` run `27870813763` succeeded without package/tag/release mutation.
- Publish-path follow-up: TASK-0208 hardened the attestation-provenance probe before the next release; the published alpha.3 package/tag/release must not be mutated.
- Local retention follow-up: TASK-0212 treats ignored `artifacts/package-validation/0.2.0-alpha.3/*.{nupkg,snupkg}` files as retained local package-validation evidence. They should not be committed, published as new release assets, or deleted by generic cleanup unless the maintainer changes release-evidence retention policy.

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
- Exact `v1.0.0-rc.1` tag exists: yes, at `258918b33c3d1359aac967604ee524e8b66ddf02`.
- GitHub Actions latest `master` run is green per maintainer-provided release status.
- Repository description is set.
- Repository topics are set.
- GitHub Release page for `v1.0.0-rc.1`: completed as a prerelease with exact assets.
- NuGet publish for `AgentContextKit` `1.0.0-rc.1`: completed and immutable.
- NuGet global tool install verification for `1.0.0-rc.1`: completed on Windows, Ubuntu, and macOS.
- Exact nupkg and snupkg attestations: completed and verified.
- `README.nuget.md` source is synchronized; the already-published package embeds its immutable earlier copy.
- `RepositoryUrl` is `https://github.com/Cynrath/agent-context-kit`.
- `PackageProjectUrl` is `https://github.com/Cynrath/agent-context-kit`.
- `PackageId` is `AgentContextKit`.
- `ToolCommandName` is `ackit`.
- `Authors` and `Company` are `Cynrath`.
- Codex for OSS application pack is ready in `docs/CODEX_FOR_OSS_APPLICATION.md`.

Previous release states:
- `v0.2.0-alpha.3` tag pushed: yes, at `92984c6448332aa24b7cff94647f627bf944e535`.
- `v0.2.0-alpha.2` tag pushed: yes.
- All predecessor releases are published, verified, and immutable.

## Verified Install
Maintainer verification evidence:

```powershell
dotnet tool install --global AgentContextKit --version 1.0.0-rc.1
ackit version
ackit --help
```

Expected version output:

```text
AgentContextKit 1.0.0-rc.1
```

If the tool is already installed, use:

```powershell
dotnet tool update --global AgentContextKit --version 1.0.0-rc.1
```

## Verified NuGet Smoke Test (Current Prerelease)
Completed RC1 smoke evidence:

- Temporary tool-path install from NuGet: `dotnet tool install AgentContextKit --tool-path <temp> --version 1.0.0-rc.1`
- `ackit --version` returned `AgentContextKit 1.0.0-rc.1` on Windows, Ubuntu, and macOS
- `ackit doctor`: 13/13 PASS in the repository root
- `ackit scan --ci`: exit 0 (expected Medium/Low findings)

Historical alpha.3 smoke test evidence:
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

Current published-package smoke workflow installs `AgentContextKit` version `0.2.0-alpha.4` (TASK-0223 pin sync).

Historical alpha.3 published-package hosted evidence:
- TASK-0214 verified push-triggered hosted run `27940146487` for exact HEAD `fc002a08be83821a3b164c53256cdedab4621fc6`; Windows, Ubuntu, and macOS jobs succeeded.
- Historical alpha.2 read-only GitHub CLI evidence: Workflow run `27471224861`, commit `ead65120928835419fb91bf695e845721620c394`, branch `master`, conclusion `success`.

## Cross-Platform Source Smoke Test
`.github/workflows/cross-platform-source-smoke.yml` is used for current-branch source package validation before future publication.

The workflow:
- Runs on `windows-2025`, `ubuntu-latest`, and `macos-latest`.
- Uses `actions/checkout@v6` and `actions/setup-dotnet@v5`.
- Runs restore, Release build, and Release tests.
- Packs the current source into a temporary package directory.
- Installs `AgentContextKit` version `0.2.0-alpha.4` from the temporary package source into a temporary tool path for the current candidate.
- Runs `ackit version`, `ackit --help`, clean DemoApp smoke commands, fake-secret `redact-check` expected failure, fake secret cleanup, and final `ackit scan --ci`.

Latest read-only GitHub CLI evidence:
- Workflow run `27471224867`, commit `ead65120928835419fb91bf695e845721620c394`, branch `master`, conclusion `success`.
- Jobs `source smoke (windows-2025)`, `source smoke (ubuntu-latest)`, and `source smoke (macos-latest)` completed successfully.

## Historical v0.2.0-alpha.2 Published Handoff
The `0.2.0-alpha.2` package was the previous published package. It includes `ackit sarif`, SARIF 2.1.0 output, scanner rule catalog hardening, configurable allowlists, additive JSON `ruleId`, expanded scanner patterns, sample gallery docs, demo scenarios, Web UI preview docs, and visual asset guidance.

Maintainer-only next release actions:
- Decide the next version after TASK-0125 final hosted validation.
- Use `docs/RELEASE_BODY_V020_ALPHA2.md` as the immutable alpha.2 release-note reference. For new releases, create a version-specific `docs/RELEASE_BODY_V020_<VERSION_TAG>.md` and the release workflow `--notes-file` will resolve it automatically.
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
