# Release Validation

## V100 `1.0.0-rc.1` Candidate Preparation (TASK-0239)

Candidate `1.0.0-rc.1` was prepared against published predecessor `0.2.0-alpha.4`; its publication body is retained in `RELEASE_BODY_V100_RC1.md`. TASK-0242 published the NuGet package but stopped before tag/GitHub prerelease/provenance. Public complete-release guidance remains pinned to alpha4; RC1 is documented as a partial immutable state.

## TASK-0242 Publication Authorization

Explicit authorization was received on 2026-07-11 for exactly one existing `release.yml` OIDC publish dispatch covering NuGet `1.0.0-rc.1`, exact `v1.0.0-rc.1` tag, GitHub prerelease/assets/body, and exact nupkg attestation creation/verification. Any failure ends the dispatch budget: no second dispatch, rerun, automatic recovery, manual package upload, version reuse, tag movement, release replacement, or force push is authorized. If NuGet succeeds before a later failure, inspect immutable state once and stop.

### TASK-0242 Partial Publication Result

Run `29131335084` published NuGet `1.0.0-rc.1` through OIDC, then failed in `verify-published-package.ps1` after the runner's bounded NuGet availability window. Subsequent tag, GitHub prerelease, release verification, provenance, and attestation steps were skipped. A one-time audit later verified the NuGet repository signature, repository commit `258918b33c3d1359aac967604ee524e8b66ddf02`, nupkg SHA-256 `346570f28a738c0f08d0eaa2a3ddb3f4dbcd4121d801530173bb2c40c03d23d5`, and global install/version. Remote tag, GitHub Release, and attestation are absent. No recovery or second dispatch occurred.

TASK-0239 adds exact alpha4 generated-config fixture/regeneration coverage, direct hosted CLI/config/JSON/localization gates, run-unique candidate packaging, source/package version alignment, and future release-body routing. Dependency, local package/install, full-suite, Unicode, resource, and hygiene checks completed locally; exact candidate standard CI is recorded after the candidate push.

Local evidence completed so far on 2026-07-10:

| Check | Result |
| --- | --- |
| Dependency review | No vulnerable direct/transitive package; no deprecated package; sources available |
| Restore/build/test | PASS; 0 warnings, 0 errors, 431/431 tests |
| Unicode temp guard | PASS; 0 before and 0 after tests |
| Package | ID/version/repository/license/README/symbols/12-entry nupkg/6-entry snupkg verified; hygiene PASS |
| Isolated candidate | `AgentContextKit 1.0.0-rc.1`; help/version PASS |
| Alpha4-to-RC behavior | Published predecessor install, generated config hash `4BB20E4C...D1799BC`, candidate config valid/no migration, hash unchanged, baseline/SARIF/final scan PASS |
| Contract/readiness gates | V100, documentation/release, CLI, config, JSON, localization, security/supply-chain, RC workflow/input, and RC local-readiness PASS |
| RC-gate benchmark | 2,000 mixed files; 5.691s; 45.1 MiB; PASS against 30-second/512-MiB thresholds |
| Standalone benchmark | 2,000 mixed files; 4.193s; 44.6 MiB; PASS against 30-second/512-MiB thresholds |
| Markdown links | 428 Markdown files; 231 local targets; 0 broken |

Disposable local package artifacts were removed. Their exact local validation sizes/hashes are recorded in `docs/V100_RC1_RELEASE_PLAN.md`; future publish artifacts require fresh exact digests.

Publication authorized: No. No tag, GitHub Release, NuGet publish, `release.yml` dispatch, artifact/SARIF upload, or provenance action is part of TASK-0239 through TASK-0241.

## V100 `1.0.0-rc.1` Hosted RC Evidence (TASK-0240)

The single authorized manual dispatch produced successful [`release-candidate-evidence` run `29118452246`](https://github.com/Cynrath/agent-context-kit/actions/runs/29118452246) for exact TASK-0239 candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b`, candidate `1.0.0-rc.1`, predecessor `0.2.0-alpha.4`, branch `master`, and event `workflow_dispatch`.

| Runner | Job | Build/tests | Package/config/machine contracts | Resource tripwire | Result |
| --- | ---: | --- | --- | --- | --- |
| Windows 2025 | `86447580477` | 0 warnings/errors; 431/431 | PASS | 1.019s / 45.1 MiB | SUCCESS |
| Ubuntu latest | `86447580502` | 0 warnings/errors; 431/431 | PASS | 0.910s / 59.9 MiB | SUCCESS |
| macOS latest | `86447580508` | 0 warnings/errors; 431/431 | PASS | 0.696s / 53.8 MiB | SUCCESS |

All jobs installed `0.2.0-alpha.4` and run-unique package `1.0.0-rc.1.ci.29118452246`; matched the exact predecessor fixture; reported config `valid`, migration `False`, unchanged config SHA-256 `0868078DFFF7DF6FA095D741F3EFA3AC52EEEAA6565CB9E3BACDE63C12579D2A`; passed baseline count 0, frozen CLI/config/JSON/localization gates, SARIF parse, and final scan; and stayed below 30 seconds/512 MiB.

Artifact/SARIF upload was disabled. No NuGet publication, tag, GitHub Release, `release.yml`, or provenance action occurred. Status: `HOSTED_RC_EVIDENCE_PASS / EXACT_CANDIDATE_SHA_VERIFIED / PUBLICATION_NOT_AUTHORIZED`.

## V100 Final-Candidate Acceptance (TASK-0241)

The exact candidate-to-evidence bridge is documentation/evidence/governance-only. TASK-0241 accepts the final candidate contract and closes V100-01 through V100-05 plus V100-07, V100-08, and V100-10; V100-06 remains closed. Open P0 gaps are 0.

V100-09 remains `OPEN_PENDING_PUBLISH_PATH_PROVENANCE`; signing and SBOM bounded accepted risks remain active. V100-11 is deferred post-V100 and V100-12 retains its committed sanitized screenshot while docs-site/GitHub Pages activation remains deferred.

Decision: `CONDITIONAL GO FOR A SEPARATELY AUTHORIZED PUBLISH TASK`. Candidate `1.0.0-rc.1` remains unpublished and published release remains `0.2.0-alpha.4`. Publication authorized: No.

Final local acceptance validation passed on 2026-07-10:

| Check | Result |
| --- | --- |
| ACKit | Installed `0.2.0-alpha.4`; doctor 13/13 PASS; scan exit 0 with classified Medium/Low findings only |
| Source/build/test | Source `1.0.0-rc.1`; Release build 0 warnings/0 errors; 431/431 tests |
| Unicode temp guard | 0 before and 0 after tests |
| Final gates | V100 readiness/docs, CLI, config, JSON, localization, and RC local-readiness PASS |
| Successful final RC-gate benchmark | 2,000 mixed files; 5.342s; 44.5 MiB; PASS against 30-second/512-MiB thresholds |
| Documentation/hygiene | 428 Markdown files; 231 local targets; 0 broken; candidate bridge/diff clean; no tracked `.ackit/` |

## V100 Safe/Local Final Audit (TASK-0238)

The single complete local closeout suite passed on 2026-07-10:

| Check | Result |
| --- | --- |
| ACKit | `0.2.0-alpha.4`; doctor 13/13 PASS; scan exit 0 with only classified Medium/Low local findings |
| Restore/build/test | restore current; Release build 0 warnings/0 errors; 430/430 tests PASS |
| Windows Unicode temp guard | 0 matching root directories before and after the full test run |
| V100/contract gates | readiness, documentation/release, CLI, config/generated, JSON assets, localization, and RC local-readiness PASS |
| RC-gate benchmark | 2,000 mixed files; 5.432s; 44.8 MiB; PASS |
| Standalone benchmark | 2,000 mixed files; 4.620s; 44.5 MiB; PASS |
| Documentation/hygiene | 423 Markdown files, 231 local targets, 0 broken; completeness clean; no tracked `.ackit/`; `git diff --check` clean |

The exact goal suite invoked the RC gate without `-RunDependencyReview`, so its existing warning that dependency review was not freshly rerun is preserved. No release, version, package, tag, workflow, setting, or hosted evidence claim is made by this local audit.

## V100 Performance And Resource Evidence Expansion (TASK-0233)

TASK-0233 replaced the uniform timing-only local fixture with a default 2,000-file mixed corpus while preserving the existing command. Local evidence on 2026-07-10:

| Check | Result |
| --- | --- |
| Release build | PASS; 0 warnings, 0 errors |
| Focused performance/resource tests | 2/2 PASS |
| Mixed corpus | 746 small text, 1,000 medium text, 4 oversized text, 250 binary |
| Elapsed time | 5.185 seconds / 30-second tripwire — PASS |
| Peak working set | 44.6 MiB / 512-MiB tripwire — PASS |
| Process interruption | PASS; no `.ackit/` output and source sentinel unchanged |
| Unreadable text file | PASS through deterministic fake filesystem |

This is local machine-specific regression evidence, not a production SLA. V100-07 remains open pending the selected final-candidate three-OS hosted rerun.

## V100 Hosted RC Input Preparation (TASK-0239)

No workflow was dispatched. Local static/input validation uses:

```powershell
$head = (git rev-parse HEAD).Trim()

powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-workflow.ps1 -FailOnIssues
powershell -ExecutionPolicy Bypass -File scripts/test-release-candidate-inputs.ps1
powershell -ExecutionPolicy Bypass -File scripts/check-release-candidate-inputs.ps1 `
  -CommitSha $head `
  -CandidateVersion 1.0.0-rc.1 `
  -PredecessorVersion 0.2.0-alpha.4
```

The authoritative post-push `-RequireOriginMaster` and one authorized manual `gh workflow run` command are in `docs/RC_HOSTED_EVIDENCE.md`. Publication remains a later separate authorization boundary.

## v0.2.0-alpha.4 Local Gate Refresh (TASK-0230)

TASK-0230 ran all local V100 contract/readiness gates against the current source at HEAD `583b62e` on 2026-06-27.

All gates passed:

| Gate | Result |
| --- | --- |
| `check-v100-readiness.ps1 -FailOnIssues` | PASS (all historical assets present) |
| `check-v100-documentation-release-gates.ps1 -FailOnIssues` | PASS (all release-critical docs and scripts present) |
| `check-cli-contract.ps1 -FailOnIssues` | PASS (all 13 JSON-capable commands, exit codes, help signatures) |
| `check-config-generated-conventions.ps1 -FailOnIssues` | PASS (all config/generated paths and conventions) |
| `check-json-contract-assets.ps1 -FailOnIssues` | PASS (all 3 schemas, 2 golden fixtures, 13-command coverage) |
| `check-localization-parity.ps1 -FailOnIssues` | PASS (en/tr parity, Turkish help smoke, JSON invariance) |
| `check-rc-local-readiness.ps1 -FailOnIssues` | PASS (local ready / remote NO-GO) |
| 2,000-file performance tripwire (standalone) | 5.446s PASS (30s threshold) |
| 2,000-file performance tripwire (via RC gate) | 7.635s PASS (30s threshold) |

Local command evidence at HEAD `583b62e`:

| Command | Status | Evidence |
| --- | --- | --- |
| `ackit --help` | exit 0 | All 17 commands listed |
| `ackit version` | exit 0 | `AgentContextKit 0.2.0-alpha.4` |
| `ackit scan --ci` | exit 0 | Expected Medium/Low findings only |
| `ackit config-check --json` | exit 0 | schemaVersion 1, 0 diagnostics |
| `ackit sarif --output .ackit/reports/v100-alpha4.sarif --json` | exit 0 | SARIF 2.1.0 generated |
| `ackit webui --output .ackit/webui/v100-alpha4.html --json` | exit 0 | Web UI created |
| `ackit prompt-pack --output .ackit/prompt-packs/v100-alpha4.md --json` | exit 0 | Dry-run prompt pack created |
| `ackit context-export --prompt-pack .ackit/prompt-packs/v100-alpha4.md --approve --output .ackit/context-exports/v100-alpha4.json --json` | exit 0 | Context export manifest created |

Generated `.ackit/` artifacts are local-only and not committed. This evidence refresh does not close any P0/P1 gap that requires hosted RC evidence, maintainer approval, or remote settings.

## v0.2.0-alpha.4 Hosted RC Evidence

TASK-0219 verified the exact alpha4 candidate commit `b8e8fce68f803c50f708d1566f1a38aab4b34bde` through hosted release-candidate evidence.

Hosted RC run `28208545684`:
- Event: `workflow_dispatch`
- Commit: `b8e8fce68f803c50f708d1566f1a38aab4b34bde`
- Candidate: `0.2.0-alpha.4`
- Predecessor: `0.2.0-alpha.3`
- Source candidate package: `0.2.0-alpha.4.ci.28208545684`
- Jobs: `evidence (windows-2025)`, `evidence (ubuntu-latest)`, `evidence (macos-latest)` all succeeded
- Tests: 428/428 passed, 0 warnings, 0 errors
- Performance tripwire: PASS
- Config compatibility: PASS
- Baseline/SARIF checks: PASS
- Annotation: non-blocking macOS label migration notice only
- Decision: GO

Push-triggered CI supporting evidence (same commit):
- `ci` run 28208179383: success
- `cross-platform-smoke` run 28208179366: success
- `cross-platform-source-smoke` run 28208179392: success (confirms `AgentContextKit 0.2.0-alpha.4` package build, install, and smoke)

Local TASK-0218 confirmed `README.nuget.md` is packaged at root (2929 bytes) and nuspec readme is `README.nuget.md`.

## v0.2.0-alpha.4 Publication Evidence

TASK-0220 published `AgentContextKit 0.2.0-alpha.4` through the OIDC release workflow on 2026-06-26.

Publish commit: `98cdf9723a509a347bd0403f6373dafe81ba03fb`

Release workflow preflight fixes (pre-existing RC issues):
1. `scripts/verify-release.ps1`: default version updated from `0.2.0-alpha.3` to `0.2.0-alpha.4`
2. `docs/RELEASE_BLOCKERS.md`, `docs/PUBLIC_RELEASE_AUDIT.md`, `docs/PUBLIC_RELEASE_GATES.md`: updated to alpha4 state and v100 documentation gate patterns
3. `scripts/test-release-candidate-inputs.ps1`: wrong-version case updated to `9.9.9-alpha.999`
4. `.github/workflows/release.yml`: pack inspection updated from `README.md` to `README.nuget.md`

Publish run: `28210969527` (initial publish; tag/release completed in recovery run `28211300136`)
- NuGet package `AgentContextKit` `0.2.0-alpha.4` published
- Tag `v0.2.0-alpha.4` created at publish commit
- GitHub prerelease `v0.2.0-alpha.4` created at 2026-06-26T01:32:17Z
- Global tool install verified: `ackit --version` returns `AgentContextKit 0.2.0-alpha.4`
- `ackit doctor`: 13/13 PASS
- `ackit scan --ci`: exit 0
- `README.nuget.md` package README fix shipped with this release

Post-publish attestation probe: known issue (same as alpha3). Release asset, tag, and GitHub Release are verified.

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

Private vulnerability reporting status is recorded in [PRIVATE_VULNERABILITY_REPORTING_STATUS.md](PRIVATE_VULNERABILITY_REPORTING_STATUS.md). Enablement and the public entry point were independently verified on 2026-06-14 and freshly rechecked on 2026-07-10; TASK-0202/TASK-0232 record current primary/backup ownership and close V100-06.

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

The `sarif` command is available in current source and in the published NuGet `0.2.0-alpha.4` global tool.

## Historical Local v0.2.0-alpha.3 Candidate Package Validation
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
The current `AgentContextKit` version `0.2.0-alpha.4` published global tool was smoke-tested from NuGet during TASK-0220:

- `ackit version` returned `AgentContextKit 0.2.0-alpha.4`.
- `ackit --help` worked.
- `ackit doctor` passed in the repository after global reinstall.
- `scripts/verify-published-package.ps1 -Version 0.2.0-alpha.4` passed its disposable package verification and smoke flow.

Historical `0.2.0-alpha.2` smoke evidence remains valid for that release and included `ackit webui`, `ackit init --lang tr`, `ackit scan --ci`, `ackit generate --target all --lang tr`, `ackit task`, `ackit report`, `ackit sarif`, fake-secret detection, JSON commands, prompt pack, and context export.

`ackit doctor` can fail on a clean minimal console app because README, LICENSE, SECURITY, tests, CI, `.gitignore`, and package metadata are intentionally absent. That is expected health reporting, not a smoke-test failure.

## Cross-Platform Published-Package Smoke Workflow
`.github/workflows/cross-platform-smoke.yml` verifies the published global tool on Windows, Ubuntu, and macOS.

Current public examples and package verification docs reference `AgentContextKit` version `0.2.0-alpha.4`. TASK-0223 updates `.github/workflows/cross-platform-smoke.yml` to pin the installed version to `0.2.0-alpha.4`.

Historical alpha.3 hosted result:
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

The current public package guidance installs `0.2.0-alpha.4` and exercises `ackit sarif`.

## Cross-Platform Source Smoke Workflow
`.github/workflows/cross-platform-source-smoke.yml` verifies the current branch and local package before future publication.

The workflow:
- Uses `actions/checkout@v6` and `actions/setup-dotnet@v5`.
- Runs restore, Release build, and Release tests.
- Packs `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj` into a temporary package directory.
- Installs `AgentContextKit` version `0.2.0-alpha.4` from that temporary package source into a temporary tool path.
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
- Confirm NuGet package availability and global tool install for `AgentContextKit` version `0.2.0-alpha.4`.
- Confirm the published NuGet global tool smoke test remains documented and reproducible.
- Confirm Codex for OSS form submission remains recorded; keep `docs/CODEX_FOR_OSS_APPLICATION.md` as the submitted application pack/reference.

See [MAINTAINER_RELEASE_HANDOFF.md](MAINTAINER_RELEASE_HANDOFF.md) for published release status and follow-up guidance.

## Baseline Validation
The published NuGet `0.2.0-alpha.4` package includes the explicit baseline workflow added by TASK-0086.

```powershell
dotnet run --project src/AgentContextKit.Cli -- baseline --output .ackit-baseline.json
dotnet run --project src/AgentContextKit.Cli -- scan --baseline .ackit-baseline.json --ci
dotnet run --project src/AgentContextKit.Cli -- baseline --output .ackit-baseline.json --update --json
dotnet run --project src/AgentContextKit.Cli -- sarif --output .ackit/reports/baseline.sarif --baseline .ackit-baseline.json --json
dotnet run --project src/AgentContextKit.Cli -- report --output .ackit/reports/baseline.html --baseline .ackit-baseline.json --json
dotnet run --project src/AgentContextKit.Cli -- webui --output .ackit/webui/baseline.html --baseline .ackit-baseline.json --json
```

Validate that the first command refuses an existing file without `--update`, baseline JSON contains no raw matches/messages/absolute paths, existing Critical findings remain visible, and only new High/Critical findings affect baseline-aware CI exits. Parse SARIF, confirm result properties contain no raw match, and confirm report/Web UI include existing/new status. Use a disposable repository for secret-pattern smoke tests and remove generated artifacts after validation.
