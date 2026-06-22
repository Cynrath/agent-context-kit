# Release Validation

## v0.2.0-alpha.3 Publication Evidence
TASK-0134 recorded an evidence-backed NO-GO on 2026-06-14. TASK-0202 later closed the ownership/recovery blockers from maintainer-provided evidence. TASK-0203 prepared source/package metadata as `0.2.0-alpha.3` and local package evidence. TASK-0204 identified dispatch-time current `origin/master` as the exact hosted RC evidence candidate. TASK-0205 verified hosted RC run `27868539971` as successful for commit `beaa14deed3dbc55ac98d216679f9a9799261801`, candidate `0.2.0-alpha.3`, predecessor `0.2.0-alpha.2`, and source candidate package `0.2.0-alpha.3.ci.27868539971`.

TASK-0206 required source-impacting release-gate script hardening, then refreshed hosted RC evidence with run `27870246504` for commit `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`. The final publish SHA `92984c6448332aa24b7cff94647f627bf944e535` was classified as a docs/handoff/governance-only successor to that refreshed RC evidence commit.

Final alpha.3 validation:
- NuGet package `AgentContextKit` `0.2.0-alpha.3` exists and `scripts/verify-published-package.ps1 -Version 0.2.0-alpha.3` passed.
- Global tool reinstall passed and `ackit version` returned `AgentContextKit 0.2.0-alpha.3`.
- Tag `v0.2.0-alpha.3` points to `92984c6448332aa24b7cff94647f627bf944e535`.
- GitHub Release `v0.2.0-alpha.3` exists as a prerelease targeting `92984c6448332aa24b7cff94647f627bf944e535`.
- `release.yml` `operation=verify-existing` run `27870813763` succeeded without package/tag/release mutation.
- Release assets are present: nupkg SHA-256 `72649efbd3ab0b6751281e200de5671cb361c53ad954bbd5510a4d31232cb33f`; snupkg SHA-256 `716da07eb6bfa6c12b98b7e6ceaeb6e94999547a686b0af5bce5a0d75d2c9c2f`.

Publish-path caveat: `operation=publish` created or verified the package, tag, release, and assets but failed after publication in the provenance probe before attestation. TASK-0208 hardened the probe so missing attestation HTTP 404 becomes `exists=false` for future publish runs. This was not a new publish and does not grant permission to mutate the already-published alpha.3 package or tag.

Local package-validation retention: TASK-0212 confirms that ignored `artifacts/package-validation/0.2.0-alpha.3/*.{nupkg,snupkg}` files are retained local release/package-validation evidence. They are not tracked source files and should not be published or committed, but generic cleanup must not delete them unless a maintainer explicitly changes release-evidence retention policy. This local retention decision does not mutate the NuGet package, tag, GitHub Release, release assets, package metadata, or workflow state.

## PROJECT-CONTROL-0102 Pre-Version Evidence
On 2026-06-13, TASK-0116–0122 validation passed with a zero-warning Release build, 186/186 tests, clean source scan, doctor PASS, sample smoke, JSON/SARIF/locale/link contracts, local package install smoke, and all requested readiness/security/supply-chain gates. The unchanged 2,000-file/30-second performance tripwire completed in 3.961 seconds standalone and 2.785 seconds through the RC gate.

## v0.2.0-alpha.2 Publication Evidence
On 2026-06-13, TASK-0123 prepared source/package/CLI metadata and source-package smoke as `0.2.0-alpha.2` while keeping the published-package workflow and README on alpha.1 until publication. Release build completed with zero warnings and zero errors; 186/186 tests passed; source scan was clean; doctor passed; JSON and SARIF parsed; sample, contract, localization, documentation, readiness, security, supply-chain, and release gates passed. Candidate `.nupkg` and `.snupkg` archives were inspected after a full temporary installed-tool smoke. The 2,000-file performance tripwire completed in 3.704 seconds through the RC evidence gate and 3.685 seconds standalone, below the unchanged 30-second threshold.

The first manual release-workflow dispatch for commit `63ef69c` stopped before pack/publish because the Markdown link test exposed one remaining direct `System.IO.Path.GetRelativePath` call under Windows PowerShell 5.1. No NuGet package, tag, or GitHub Release was created. The helper was replaced with the existing URI-based compatibility path and a repository-escape regression case was added before creating a new exact release commit.

The replacement commit `6289acb` passed all eight standard hosted jobs. Its release dispatch also stopped before pack/publish because the nested legacy PowerShell child returned a nonzero fixture result only on the hosted image. The release workflow now runs both Markdown link gates in isolated `pwsh` child processes, while the fixture runner reuses its current host and preserves child output for diagnosis. No NuGet package, tag, or GitHub Release was created by either failed dispatch.

Commit `4f5f06c` also passed all eight standard hosted jobs. Its release dispatch exposed the underlying path issue: the hosted `%TEMP%` root used an 8.3 short path, while the candidate path comparison could expand to a long path and incorrectly report a valid link as escaping the repository. Link containment now normalizes repository-relative path segments, rejects only real `..`, drive-letter, or UNC escapes, and covers root-relative and absolute-local cases. The dispatch stopped before pack/publish and created no package, tag, or release.

Commit `ed9bf78` passed all eight standard hosted jobs and completed the release validation/package-upload job. The Ubuntu release job then stopped during remote-state inspection because two release-job script invocations used the Windows-only `powershell` executable name. Those calls now use cross-platform `pwsh`; OIDC login and NuGet publish had not started, and no package, tag, or release was created.

Commit `f540479` passed all eight standard hosted jobs. The release workflow validated and packed the exact commit, authenticated through NuGet OIDC Trusted Publishing, and successfully published `AgentContextKit` `0.2.0-alpha.2`. Published-package verification then stopped before tag/release creation because `$env:TEMP` was unset on Ubuntu. Recovery detected the existing immutable package without republishing, pushed exact tag `v0.2.0-alpha.2` at `f540479a92cbe66097f6796553828ee49ddd5512`, and created the GitHub pre-release with the validated package assets. The verifier now falls back across `TEMP`, `TMPDIR`, `RUNNER_TEMP`, and `Path.GetTempPath()`.

TASK-0187 re-audited the visible `nuget-release` failed deployment entries: release #4 deployment `5047180313` job `81200598792` failed on a Windows-only `powershell` command in Ubuntu, release #5 deployments `5047227343` and `5047239131` jobs `81201079722` and `81201198341` failed on published-package temp path resolution, and delayed release #4 attempt 2 deployment `5114441984` job `82217924071` failed at artifact download because the validated package artifact had expired after one day. Current source guards these classes: the release workflow static gate rejects `powershell` inside the Ubuntu publish job, the published/existing release verifiers use lazy writable temp resolution with local self-test coverage, and the validated package artifact retention is 14 days. Pushed HEAD `1df8c40` passed hosted `ci` run `27785141250`, `cross-platform-smoke` run `27785141441`, and `cross-platform-source-smoke` run `27785141497`. This did not mutate historical deployment records.

Post-publish commit `ead65120928835419fb91bf695e845721620c394` completed the README/workflow/release-document sync and passed all eight standard hosted jobs in runs `27471224858`, `27471224861`, and `27471224867`.

TASK-0126 adds a distinct read-only recovery operation to the manual release workflow. `verify-existing` uses current `origin/master` automation against an immutable historical release commit, receives only `contents: read`, performs no login/publish/tag/release mutation, and records NuGet plus GitHub Release asset SHA-256 evidence after a full installed-tool smoke. The network-free positive, negative, and idempotency fixtures are validated by `scripts/test-release-recovery.ps1`.

Hosted recovery run `27478046088` completed successfully on automation commit `2f68f14dc3065dd9a810644c75c46316f8c225f0` for immutable alpha.2 release commit `f540479a92cbe66097f6796553828ee49ddd5512`. The publish jobs were skipped. The read-only job verified NuGet repository signing, exact package metadata and commit, full disposable installed-tool smoke, exact tag/release state, required package assets, and independent NuGet/release SHA-256 values.

## Required Commands
```powershell
dotnet restore AgentContextKit.sln
dotnet build AgentContextKit.sln -c Release --no-restore
dotnet test AgentContextKit.sln -c Release --no-build
dotnet run --project src/AgentContextKit.Cli -- config-check --json
dotnet run --project src/AgentContextKit.Cli -- scan
dotnet run --project src/AgentContextKit.Cli -- scan --ci
dotnet run --project src/AgentContextKit.Cli -- sarif --output .ackit/reports/release-validation.sarif
dotnet run --project src/AgentContextKit.Cli -- report --json
dotnet run --project src/AgentContextKit.Cli -- webui --json
dotnet run --project src/AgentContextKit.Cli -- prompt-pack --output .ackit/prompt-packs/release-validation.md --json
dotnet run --project src/AgentContextKit.Cli -- context-export --prompt-pack .ackit/prompt-packs/release-validation.md --approve --output .ackit/context-exports/release-validation.json --json
dotnet run --project src/AgentContextKit.Cli -- doctor
powershell -ExecutionPolicy Bypass -File scripts/measure-scan-performance.ps1 -FileCount 2000 -MaxSeconds 30 -FailOnThreshold
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-evidence.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-workflow.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-inputs.ps1 -CommitSha <exact-head-sha> -CandidateVersion <source-version> -PredecessorVersion <published-predecessor> -RequireOriginMaster
powershell -ExecutionPolicy Bypass -File scripts/test-release-candidate-inputs.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-json-contract-assets.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-localization-parity.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/test-local-markdown-links.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-release-workflow.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/test-supply-chain-workflow.ps1
powershell -ExecutionPolicy Bypass -File scripts/test-release-recovery.ps1
powershell -ExecutionPolicy Bypass -File scripts/prepare-release.ps1 -Version <version> -CommitSha <sha> -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/verify-published-package.ps1 -Version <published-version>
powershell -ExecutionPolicy Bypass -File scripts/verify-existing-release.ps1 -Version <published-version> -AutomationCommitSha <current-master-sha> -ReleaseCommitSha <exact-release-sha> -Prerelease true -OutputPath <temporary-json-path>
powershell -ExecutionPolicy Bypass -File scripts/check-security-supply-chain-evidence.ps1 -RunDependencyReview -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/check-private-vulnerability-reporting.ps1 -RequireEnabled
powershell -ExecutionPolicy Bypass -File scripts/check-rc-local-readiness.ps1 -RunDependencyReview -FailOnIssues
```

Hosted RC evidence is manual-only. After a maintainer push, dispatch `.github/workflows/release-candidate-evidence.yml` and record the three OS results as described in `docs/RC_HOSTED_EVIDENCE.md`.

For the prepared alpha.3 candidate, TASK-0205 recorded completed hosted evidence:

- run: `27868539971`;
- URL: `https://github.com/Cynrath/agent-context-kit/actions/runs/27868539971`;
- commit: `beaa14deed3dbc55ac98d216679f9a9799261801`;
- candidate version: `0.2.0-alpha.3`;
- predecessor version: `0.2.0-alpha.2`;
- source candidate package: `0.2.0-alpha.3.ci.27868539971`;
- matrix: `windows-2025`, `ubuntu-latest`, and `macos-latest` all succeeded.

For a future different candidate, use:

```powershell
$commitSha = (git rev-parse origin/master).Trim()
pwsh -NoProfile -ExecutionPolicy Bypass -File scripts/check-release-candidate-inputs.ps1 `
  -CommitSha $commitSha `
  -CandidateVersion 0.2.0-alpha.3 `
  -PredecessorVersion 0.2.0-alpha.2 `
  -RequireOriginMaster
```

Then a maintainer can manually dispatch:

```powershell
gh workflow run release-candidate-evidence.yml `
  --repo Cynrath/agent-context-kit `
  --ref master `
  -f commit_sha=$commitSha `
  -f candidate_version=0.2.0-alpha.3 `
  -f predecessor_version=0.2.0-alpha.2
```

TASK-0204 recorded these instructions only. TASK-0205 records the maintainer-dispatched alpha.3 hosted run after read-only `gh` verification. TASK-0205 does not dispatch a workflow, publish a package, create a tag, or create a GitHub Release.

The normative local evidence matrix and dated results are maintained in `docs/RELEASE_CANDIDATE_EVIDENCE.md`.

The conditional local contract freeze and maintainer GO/NO-GO conditions are maintained in `docs/RELEASE_CANDIDATE_CONTRACT_FREEZE.md` and `docs/MAINTAINER_RC_DECISION.md`.

Machine-readable command JSON, baseline, and SARIF profile assets are indexed in `docs/schemas/README.md` and validated by `scripts/check-json-contract-assets.ps1`.

Repository-local Markdown targets are checked without network access by `scripts/check-local-markdown-links.ps1`; its positive/negative smoke cases are in `scripts/test-local-markdown-links.ps1`. External URLs and same-document anchors are intentionally not validated by this local gate.

English/Turkish human output, known argument errors, exit decisions, and JSON semantic invariance are defined in [LOCALIZATION.md](LOCALIZATION.md) and validated by `tests/AgentContextKit.Tests/LocalizationParityTests.cs` plus `scripts/check-localization-parity.ps1`.

Security reporting and supply-chain maintainer evidence fields are defined in [SECURITY_SUPPLY_CHAIN_EVIDENCE.md](SECURITY_SUPPLY_CHAIN_EVIDENCE.md) and [MAINTAINER_SECURITY_SUPPLY_CHAIN_HANDOFF.md](MAINTAINER_SECURITY_SUPPLY_CHAIN_HANDOFF.md), with local structure/dependency review through `scripts/check-security-supply-chain-evidence.ps1`. Remote private-reporting state can be rechecked separately through `scripts/check-private-vulnerability-reporting.ps1`; the local structure gate alone does not prove remote settings or artifact publication.

Signing, SBOM, and provenance dispositions are recorded in [SUPPLY_CHAIN_DECISIONS.md](SUPPLY_CHAIN_DECISIONS.md). `scripts/test-supply-chain-workflow.ps1` verifies positive and negative permission/action boundaries. Provenance remains hosted-pending until a future publish run attests and verifies the exact release nupkg.

The consolidated local RC decision is defined in [RC_LOCAL_READINESS.md](RC_LOCAL_READINESS.md). `scripts/check-rc-local-readiness.ps1` orchestrates the existing local evidence gates and intentionally reports `LOCAL READY / REMOTE NO-GO` while hosted and maintainer-only evidence remains open.

Hosted standard workflow evidence is recorded in [HOSTED_VALIDATION_STATUS.md](HOSTED_VALIDATION_STATUS.md). It proves current CI and source/published package smoke on commit `37d5220`; it does not substitute for the unrun manual RC evidence workflow.

Private vulnerability reporting status is recorded in [PRIVATE_VULNERABILITY_REPORTING_STATUS.md](PRIVATE_VULNERABILITY_REPORTING_STATUS.md). Enablement and the public entry point were independently verified on 2026-06-14; primary and backup notification ownership remain a P0 operational action.

Published package/release supply-chain status is recorded in [PUBLISHED_SUPPLY_CHAIN_STATUS.md](PUBLISHED_SUPPLY_CHAIN_STATUS.md). That dated audit covers the predecessor `0.2.0-alpha.1` package: valid NuGet.org repository signature, no observed author signature, no package/release SBOM, no accessible GitHub package attestation, and a NuGet owner profile that differs from the project persona. A matching alpha.2 supply-chain re-audit remains a follow-up rather than an inferred result.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-published-supply-chain-status.ps1 -FailOnIssues
```

Release-candidate dependency review:

```powershell
dotnet list AgentContextKit.sln package --vulnerable --include-transitive
dotnet list AgentContextKit.sln package --deprecated
```

The 2026-06-12 post-migration review found no vulnerable or deprecated direct/transitive packages. TASK-0091 replaced Legacy `xunit` `2.9.3` with `xunit.v3` `3.2.2`, updated the Visual Studio runner to `3.1.5`, and preserved 169/169 passing tests.

The `sarif` command is available in current source and in the published NuGet `0.2.0-alpha.3` global tool.

## Local v0.2.0-alpha.3 Candidate Package Validation
Use temporary directories outside the repository:

```powershell
$pkg = Join-Path $env:TEMP "ackit-v020-alpha3-nupkg"
$tools = Join-Path $env:TEMP "ackit-v020-alpha3-tools"
New-Item -ItemType Directory -Force -Path $pkg,$tools | Out-Null
dotnet pack src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release -o $pkg
dotnet tool install AgentContextKit --tool-path $tools --add-source $pkg --version 0.2.0-alpha.3 --ignore-failed-sources
& (Join-Path $tools "ackit.exe") version
& (Join-Path $tools "ackit.exe") --help
& (Join-Path $tools "ackit.exe") sarif --output .ackit/reports/task-0064-local.sarif
Get-Content .ackit/reports/task-0064-local.sarif | ConvertFrom-Json
```

Do not commit the package, temporary tool install, or generated SARIF output.

## Scripted Validation
```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-release.ps1
```

The script creates temporary package/tool folders under the user temp directory and leaves them in place for inspection. It also runs `scripts/check-release-blockers.ps1` in report-only mode, so local validation can keep public release follow-up status visible.

## SARIF Output Validation
Generate and parse a local SARIF report:

```powershell
dotnet run --project src/AgentContextKit.Cli -- sarif --output .ackit/reports/release-validation.sarif
Get-Content .ackit/reports/release-validation.sarif | ConvertFrom-Json
```

The output is local-only and ignored by git when written under `.ackit/reports/`. It should use SARIF `2.1.0`, repository-relative artifact URIs, stable `ACKIT` rule IDs, and no raw secret match values.

`docs/examples/github-actions-sarif-upload.yml` shows a non-active GitHub Code Scanning upload example. Do not copy it into `.github/workflows/` until a maintainer has intentionally approved Code Scanning upload and repository permissions.

See [GITHUB_ACTIONS_USAGE.md](GITHUB_ACTIONS_USAGE.md) for CI command ordering, published-tool versus source-package smoke guidance, and SARIF upload criteria.
See [CODE_SCANNING_DECISION.md](CODE_SCANNING_DECISION.md) for the documentation-only default and opt-in criteria.

## Sample Smoke Validation
Run sample smoke checks from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-samples.ps1 -NoBuild
```

The script scans committed sample repositories from their own directories because the CLI scans the current working directory. It does not generate or commit `.ackit/` output.

## Local Web UI And Report Smoke
Generate local-only preview artifacts under ignored `.ackit/` paths:

```powershell
dotnet run --project src/AgentContextKit.Cli -- report --output .ackit/reports/task-0063-report.html
dotnet run --project src/AgentContextKit.Cli -- webui --output .ackit/webui/task-0063-webui.html
Test-Path .ackit/reports/task-0063-report.html
Test-Path .ackit/webui/task-0063-webui.html
```

Do not commit generated HTML. If a README screenshot is needed, sanitize a screenshot first using `docs/VISUAL_ASSETS.md` and `docs/WEB_UI_PREVIEW.md`.

## Scanner Rule Catalog Validation
Scanner tests cover stable `ACKIT` rule ID mapping, additive JSON `ruleId` output, SARIF rule metadata, config-driven `safeDomains`, `ignoredPaths`, and `ignoredFindingIds`, and the rule that Critical findings remain reportable.

See [SCANNER_RULES.md](SCANNER_RULES.md) and [CONFIGURATION.md](CONFIGURATION.md).

## v0.2 Readiness Review
Run the v0.2 local readiness check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v020-readiness.ps1
```

Use it as a failing gate for missing v0.2 readiness assets:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v020-readiness.ps1 -FailOnIssues
```

See [V020_READINESS.md](V020_READINESS.md).

## v0.3 Readiness Review
Run the v0.3 local readiness check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v030-readiness.ps1
```

Use it as a failing gate for missing v0.3 readiness assets:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v030-readiness.ps1 -FailOnIssues
```

See [V030_READINESS.md](V030_READINESS.md).

## v0.4 Readiness Review
Run the v0.4 local readiness check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v040-readiness.ps1
```

Use it as a failing gate for missing v0.4 readiness assets:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v040-readiness.ps1 -FailOnIssues
```

See [V040_READINESS.md](V040_READINESS.md).

## v0.5 Readiness Review
Run the v0.5 local readiness check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v050-readiness.ps1
```

Use it as a failing gate for missing v0.5 readiness assets:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v050-readiness.ps1 -FailOnIssues
```

See [V050_READINESS.md](V050_READINESS.md).

## v1.0 Local Contract Gates
Run the stable CLI contract check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1
```

Use it as a failing local gate:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-cli-contract.ps1 -FailOnIssues
```

See [CLI_CONTRACT.md](CLI_CONTRACT.md).

Run the config/generated convention check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-config-generated-conventions.ps1
```

Use it as a failing local gate:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-config-generated-conventions.ps1 -FailOnIssues
```

See [CONFIG_GENERATED_CONVENTIONS.md](CONFIG_GENERATED_CONVENTIONS.md).

Run the documentation/release gate freeze check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v100-documentation-release-gates.ps1
```

Use it as a failing local gate:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v100-documentation-release-gates.ps1 -FailOnIssues
```

See [V100_DOCUMENTATION_RELEASE_GATE_FREEZE.md](V100_DOCUMENTATION_RELEASE_GATE_FREEZE.md).

## Historical v1.0 Asset Readiness Review
Run the historical v1.0 asset and current gap-analysis presence check:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v100-readiness.ps1
```

Use it as a failing local gate for missing historical assets or the maintained 1.0 gap analysis:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-v100-readiness.ps1 -FailOnIssues
```

See [V100_READINESS.md](V100_READINESS.md) and [V100_GAP_ANALYSIS.md](V100_GAP_ANALYSIS.md). Passing this script does not mean the product is ready for 1.0 GA.

## Release Blocker Review
Report current blockers:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-blockers.ps1
```

Use the blocker check as a failing gate before public release:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-release-blockers.ps1 -FailOnBlockers
```

If the working tree is clean, package metadata is final, and the release tag exists locally, the failing gate should return `0`. See [RELEASE_BLOCKERS.md](RELEASE_BLOCKERS.md).

## Package Metadata Review
Run package metadata review in report-only mode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1
```

Use it as a failing gate before public release:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-package-metadata.ps1 -FailOnIssues
```

With the final package URLs in metadata, the failing gate should return `0`. See [NUGET_METADATA.md](NUGET_METADATA.md).

## Public Release Audit
Run the final public release audit in report-only mode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/audit-public-release.ps1
```

Use it as a failing gate before public release:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/audit-public-release.ps1 -FailOnIssues
```

See [PUBLIC_RELEASE_AUDIT.md](PUBLIC_RELEASE_AUDIT.md).

## Public Release Gate Orchestration
Run all public release gates in report-only mode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-public-release-gates.ps1
```

Run all public release gates as failing checks before future public release announcements or follow-up release work:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-public-release-gates.ps1 -FailOnIssues
```

See [PUBLIC_RELEASE_GATES.md](PUBLIC_RELEASE_GATES.md).

## Package Validation
```powershell
$stamp = Get-Date -Format "yyyyMMddHHmmss"
$pkg = Join-Path $env:TEMP "ackit-nupkg-$stamp"
$tools = Join-Path $env:TEMP "ackit-tools-$stamp"
New-Item -ItemType Directory -Force -Path $pkg, $tools | Out-Null

dotnet pack src/AgentContextKit.Cli/AgentContextKit.Cli.csproj -c Release --no-build -o $pkg
dotnet tool install AgentContextKit --tool-path $tools --add-source $pkg --version 0.2.0-alpha.3 --ignore-failed-sources
& (Join-Path $tools "ackit.exe") version
& (Join-Path $tools "ackit.exe") --help
& (Join-Path $tools "ackit.exe") scan --json
```

## Published NuGet Smoke Test
The `AgentContextKit` version `0.2.0-alpha.3` published global tool has been smoke-tested from NuGet during TASK-0206:

- `ackit version` returned `AgentContextKit 0.2.0-alpha.3`.
- `ackit --help` worked.
- `ackit doctor` passed in the repository after global reinstall.
- `scripts/verify-published-package.ps1 -Version 0.2.0-alpha.3` passed its disposable package verification and smoke flow.

Historical `0.2.0-alpha.2` smoke evidence remains valid for that release and included `ackit webui`, `ackit init --lang tr`, `ackit scan --ci`, `ackit generate --target all --lang tr`, `ackit task`, `ackit report`, `ackit sarif`, fake-secret detection, JSON commands, prompt pack, and context export.

`ackit doctor` can fail on a clean minimal console app because README, LICENSE, SECURITY, tests, CI, `.gitignore`, and package metadata are intentionally absent. That is expected health reporting, not a smoke-test failure.

## Cross-Platform Published-Package Smoke Workflow
`.github/workflows/cross-platform-smoke.yml` verifies the published global tool on Windows, Ubuntu, and macOS.

Current public examples, package verification docs, and the active workflow YAML install `AgentContextKit` version `0.2.0-alpha.3`. TASK-0213 updated `.github/workflows/cross-platform-smoke.yml` because it verifies the current published package. TASK-0214 then verified the push-triggered hosted run for exact TASK-0213 HEAD.

Current alpha.3 hosted result:
- Workflow: `cross-platform-smoke`.
- Run: `27940146487`.
- URL: `https://github.com/Cynrath/agent-context-kit/actions/runs/27940146487`.
- Commit: `fc002a08be83821a3b164c53256cdedab4621fc6`.
- Branch: `master`.
- Event: `push`.
- Status: Success.
- Windows, Ubuntu, and macOS jobs succeeded.
- Logs on all three OS jobs include `dotnet tool install --global AgentContextKit --version 0.2.0-alpha.3` and `AgentContextKit 0.2.0-alpha.3`.
- No GitHub warning annotations or error annotations were found.
- No manual workflow dispatch, release workflow dispatch, release-candidate dispatch, NuGet publish, tag mutation, GitHub Release mutation, package metadata change, version bump, or alpha3 package/release mutation occurred.

Historical alpha.2 hosted result:
- Workflow: `cross-platform-smoke`.
- Commit: `6d38f11`.
- Branch: `master`.
- Status: Success.
- Windows, Ubuntu, and macOS jobs succeeded.
- NuGet global tool install, `ackit version`, `ackit --help`, DemoApp smoke flow, expected fake-secret `redact-check` failure, and final `scan --ci` all completed successfully.

The current public package guidance installs `0.2.0-alpha.3` and exercises `ackit sarif`.

## Cross-Platform Source Smoke Workflow
`.github/workflows/cross-platform-source-smoke.yml` verifies the current branch and local package before future publication.

The workflow:
- Uses `actions/checkout@v6` and `actions/setup-dotnet@v5`.
- Runs restore, Release build, and Release tests.
- Packs `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj` into a temporary package directory.
- Installs `AgentContextKit` version `0.2.0-alpha.3` from that temporary package source into a temporary tool path.
- Runs `ackit version`, `ackit --help`, a clean demo app smoke flow, expected fake-secret `redact-check` failure, fake secret cleanup, and final `ackit scan --ci`.
- Does not push, tag, create GitHub Releases, or publish NuGet packages.

Hosted validation status:
- Workflow: `cross-platform-source-smoke`.
- Commit: `6d38f11`.
- Branch: `master`.
- Status: Success.
- Windows, Ubuntu, and macOS jobs succeeded.
- Source restore/build/test, local pack/install, DemoApp smoke flow, expected fake-secret `redact-check` failure, and final `scan --ci` completed successfully.
- Source/package smoke is the correct workflow class for testing next-version commands before future publication.

## CI Workflow
Latest recorded hosted result:
- Workflow: `ci`.
- Commit: `6d38f11`.
- Branch: `master`.
- Status: Success.
- Ubuntu and Windows jobs succeeded.
- Restore, Release build, Release tests, and repository `scan --ci` completed successfully.

## GitHub Actions Node 24 Readiness
The local workflow files are prepared for the GitHub Actions Node 24 JavaScript action runtime:

- `ci.yml` uses `actions/checkout@v6` and `actions/setup-dotnet@v5`.
- `cross-platform-smoke.yml` uses `actions/setup-dotnet@v5`.
- `cross-platform-source-smoke.yml` uses `actions/checkout@v6` and `actions/setup-dotnet@v5`.
- Both workflows set read-only `contents: read` permissions.
- Windows jobs now target `windows-2025` explicitly instead of relying on the moving `windows-latest` label.
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` is not set because the selected official action majors already run on Node 24.

Hosted workflow validation is complete for the latest TASK-0056 push. Future workflow changes still require hosted validation after a maintainer push. This task does not push, tag, create GitHub Releases, or publish NuGet packages.

## Manual Release Gates
- Run `scripts/check-package-metadata.ps1 -FailOnIssues` and confirm it exits `0`.
- Run `scripts/audit-public-release.ps1 -FailOnIssues` and confirm it exits `0`.
- Run `scripts/check-release-blockers.ps1 -FailOnBlockers` and confirm it exits `0`.
- Run `scripts/check-public-release-gates.ps1 -FailOnIssues` and confirm it exits `0`.
- Confirm `RepositoryUrl` points to the real public repository.
- Confirm `PackageProjectUrl` points to the real public project/repository page.
- Confirm package README renders correctly.
- Confirm license and security policy are current.
- Confirm no secrets, dumps, backups, uploads, `bin/`, `obj/`, or generated package outputs are committed.
- Confirm no permanent global tool install is required for validation.
- Confirm GitHub Actions latest `master` run is green.
- Confirm GitHub Release page exists for the current release tag.
- Confirm NuGet package availability and global tool install for `AgentContextKit` version `0.2.0-alpha.3`.
- Confirm the published NuGet global tool smoke test remains documented and reproducible.
- Confirm Codex for OSS form submission remains recorded; keep `docs/CODEX_FOR_OSS_APPLICATION.md` as the submitted application pack/reference.

See [MAINTAINER_RELEASE_HANDOFF.md](MAINTAINER_RELEASE_HANDOFF.md) for published release status and follow-up guidance.

## Baseline Validation
The published NuGet `0.2.0-alpha.3` package includes the explicit baseline workflow added by TASK-0086.

```powershell
dotnet run --project src/AgentContextKit.Cli -- baseline --output .ackit-baseline.json
dotnet run --project src/AgentContextKit.Cli -- scan --baseline .ackit-baseline.json --ci
dotnet run --project src/AgentContextKit.Cli -- baseline --output .ackit-baseline.json --update --json
dotnet run --project src/AgentContextKit.Cli -- sarif --output .ackit/reports/baseline.sarif --baseline .ackit-baseline.json --json
dotnet run --project src/AgentContextKit.Cli -- report --output .ackit/reports/baseline.html --baseline .ackit-baseline.json --json
dotnet run --project src/AgentContextKit.Cli -- webui --output .ackit/webui/baseline.html --baseline .ackit-baseline.json --json
```

Validate that the first command refuses an existing file without `--update`, baseline JSON contains no raw matches/messages/absolute paths, existing Critical findings remain visible, and only new High/Critical findings affect baseline-aware CI exits. Parse SARIF, confirm result properties contain no raw match, and confirm report/Web UI include existing/new status. Use a disposable repository for secret-pattern smoke tests and remove generated artifacts after validation.
