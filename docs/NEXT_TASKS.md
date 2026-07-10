# Next Tasks

## V100 `1.0.0-rc.1` Candidate Chain — Active

TASK-0239 through TASK-0241 are the complete authorized candidate-preparation, hosted-evidence, and final-acceptance chain. All three task files were created with `ackit task` and fully planned before candidate implementation. The chain stops at publication authorization.

| Order | Task | Status | Purpose | Dependency | Expected validation | Remote/destructive boundary |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | TASK-0239 `1.0.0-rc.1` candidate selection and release preparation | CURRENT | Select candidate metadata, exact alpha4 predecessor evidence, hosted contract gates, draft release records, and local package proof | TASK-0238 | Full local suite, candidate package/install smoke, dependency review, standard CI | One normal candidate push; no dispatch/publish/tag/release |
| 2 | TASK-0240 hosted RC evidence execution and recording | PLANNED | Dispatch the authorized workflow once for the exact TASK-0239 SHA and record three-OS evidence | TASK-0239 standard CI green | Exact input gate plus one blocking hosted run | Exactly one `release-candidate-evidence.yml` dispatch; no uploads/publication |
| 3 | TASK-0241 final-candidate acceptance and publish boundary | PLANNED | Reconcile every V100 gap, record conditional decision, push evidence/docs, and wait for final CI | TASK-0240 PASS | Bridge review, full local suite, final standard CI | Normal final docs push; stop before TASK-0242 |

Candidate `1.0.0-rc.1` is only proposed/prepared; published release remains `0.2.0-alpha.4`. TASK-0239 through TASK-0241 do not authorize NuGet publication, `release.yml`, tag/GitHub Release mutation, provenance publication, settings/security/collaborator changes, uploads, force push, or GA-readiness claims.

## Historical Execution Record

The remainder of this file is historical execution evidence. PROJECT-CONTROL-0103 through PROJECT-CONTROL-0110 are closed. TASK-0198 through TASK-0227 record the alpha3/alpha4 preparation, publication, verification, and post-release cleanup chain. Historical task-local words such as "current" apply only to their dated task context; the active source of truth is the V100 chain table above.

## Completed Independent Hosted RC Evidence GO

1. TASK-0205 record alpha3 hosted RC evidence / GO - completed locally after read-only `gh` verification; run `27868539971` passed on `windows-2025`, `ubuntu-latest`, and `macos-latest`; exact candidate commit `beaa14deed3dbc55ac98d216679f9a9799261801`; candidate `0.2.0-alpha.3`; predecessor `0.2.0-alpha.2`; source candidate package `0.2.0-alpha.3.ci.27868539971`; annotations are xUnit analyzer warnings only; no publish/tag/GitHub Release/release workflow/new RC workflow/secret/owner/security-setting mutation.

## Completed Independent Alpha.3 Publish

1. TASK-0206 publish `0.2.0-alpha.3` through the existing OIDC `release.yml` workflow - completed. Plan commit `85383a9` is pushed. First three release workflow attempts failed before pack/publish and created no package/tag/release. The third failure required release-gate `git status` stderr hardening under `scripts/**`; remediation commit `eef0adc` passed local restore/build/test (`428/428`), full release gate command set, and `verify-release.ps1`. Refreshed hosted RC run `27870246504` passed on `windows-2025`, `ubuntu-latest`, and `macos-latest` for exact commit `eef0adc4d5d11d7fb19adecc59dba9f9a142fd7f`. Final publish SHA `92984c6448332aa24b7cff94647f627bf944e535` was classified as docs/handoff/governance-only relative to refreshed RC evidence. NuGet package publication occurred in release run `27870383897`; exact tag and GitHub prerelease/assets were created by recovery run `27870603776`; read-only immutable release verification succeeded in `release.yml` run `27870813763`. TASK-0208 later hardened the publish-path provenance probe before the next release.

## Completed Independent Release Provenance Probe Hardening

1. TASK-0208 release provenance probe hardening - completed locally. Plan commit `bac4ef0`; implementation commit `35894b6`. The publish job now treats a missing release asset attestation HTTP 404 as `exists=false` so `actions/attest@v4` can run, treats an existing attestation as `exists=true`, preserves release asset download failure, preserves non-404 `gh api` failure, and keeps `gh attestation verify` as the final verification step. No NuGet publish, tag mutation, GitHub Release mutation, release workflow dispatch, release-candidate workflow dispatch, package metadata change, version bump, owner/account/secret/security-setting mutation, or alpha.3 artifact mutation occurred.

## Historical Post-Alpha3 Maintenance Plan

1. TASK-0209 post-alpha3 maintenance triage - completed. It selected TASK-0210 analyzer-warning cleanup as the highest-priority next work.
2. TASK-0210 analyzer-warning cleanup - completed locally. `McpStdioTransportTests` now passes `TestContext.Current.CancellationToken` through `RunAsync` calls, the intentional cancellation test uses a linked token source, and `WatchCommandTests` uses xUnit collection assertions instead of `Assert.Equal(...Count)`. Release build is clean with `0` warnings and the full suite is `428/428` green.
3. TASK-0211 scan-finding classification - completed locally. `ackit scan --ci` still exits `0`; remaining findings are classified as `.remember` memory-log review, accepted retained alpha3 package-validation artifacts, safe local-path references, and one low-risk defensive test fixture. No Critical/High/blocking findings were identified.
4. TASK-0212 `.remember` log retention and local artifact policy - completed locally. Decision: ignored `.remember` runtime/memory logs are local-only and may be cleaned from workspaces after count/size review; TASK-0212 removed the local ignored log files; alpha3 package-validation artifacts remain retained local release evidence; no release/package/tag state mutation.
5. TASK-0213 published-package workflow pin/status sync - completed locally. The active `cross-platform-smoke.yml` pin now installs `AgentContextKit` `0.2.0-alpha.3`; documentation examples already used alpha3; historical/predecessor alpha2 references remain intact; no release/tag/NuGet/package metadata/workflow-dispatch mutation occurred.
6. TASK-0214 cross-platform smoke alpha3 hosted evidence - completed locally after read-only `gh` verification. Push-triggered `cross-platform-smoke` run `27940146487` for exact TASK-0213 HEAD `fc002a08be83821a3b164c53256cdedab4621fc6` passed on `windows-2025`, `ubuntu-latest`, and `macos-latest`; logs prove `dotnet tool install --global AgentContextKit --version 0.2.0-alpha.3` and `AgentContextKit 0.2.0-alpha.3` on all three OS jobs. No manual dispatch or release/package/tag mutation occurred.
7. TASK-0215 completed NuGet README rendering infrastructure via PR #1: `README.nuget.md`, `PackageReadmeFile` wiring, agent docs, and package metadata validation. Visible nuget.org README changes require a later authorized package publish.
8. Historical checkpoint: TASK-0218 alpha4 NuGet README rendering release prep followed TASK-0217 and TASK-0216.
9. Lower-priority follow-ups: review scan-scope policy for retained local artifacts only if maintainers want a deliberate exclusion/suppression policy.

## Completed Independent Hosted RC Evidence Planning

1. TASK-0204 prepare alpha3 hosted RC evidence / GO decision - completed locally; plan commit `4517893`; documentation preparation commit `2fa9195`; dispatch-time `origin/master` is the exact candidate; candidate `0.2.0-alpha.3`; predecessor `0.2.0-alpha.2`; no hosted alpha.3 run exists yet; no workflow dispatch or publication action.

## Completed Independent Release Preparation

1. TASK-0203 prepare `0.2.0-alpha.3` local release candidate - completed locally; plan commit `da51d4d`; implementation commit `33e1897`; package validation and local install smoke passed; known Windows `git status --short` stderr caveat recorded for release gates; no tag, GitHub Release, NuGet publish, release workflow dispatch, release-candidate workflow dispatch, owner/security-setting/secret mutation, or destructive NuGet action.

## Completed Independent Maintainer Evidence Intake

1. TASK-0202 record `ShadowFlameC` backup/security/recovery evidence for `RB-003` and `RB-008` - completed; docs-only; no version/tag/NuGet/GitHub Release/workflow/security-setting/owner mutation; `0.2.0-alpha.3` was release-preparation eligible at that time and is now published.

## Completed Independent Blocker Closure Preflight

1. TASK-0201 perform `RB-003`/`RB-008` closure preflight - completed; docs-only; recorded found/missing maintainer evidence; did not close either blocker; no release/tag/NuGet/version/workflow/security-setting/owner/recovery mutation; TASK-0202 later records maintainer evidence.

## Completed Independent README Parity Task

1. TASK-0200 sync README CLI command surface with current-source `--help`, `docs/CLI_CONTRACT.md`, and `docs/CLI_REFERENCE.md` - completed; docs-only; no release/tag/NuGet/version/workflow/security-setting mutation; `0.2.0-alpha.3` remained NO-GO at that time.

## Completed Independent State Cleanup

1. TASK-0199 post-0198 state cleanup - completed and pushed at `0aad858`; docs-only; marked TASK-0198 completed consistently and recorded final clean-tree/push evidence.

## Completed Independent Blocker Investigation

1. TASK-0198 investigate `RB-003` and `RB-008` closure evidence - completed and pushed at `533b64a`; docs-only; no release/tag/NuGet/version/security-setting mutation; recorded exact missing maintainer evidence and kept `0.2.0-alpha.3` NO-GO at that time.

## Closed PROJECT-CONTROL-0110 (2026-06-19)

PROJECT-CONTROL-0110 closed at TASK-0196 on 2026-06-19. Cumulative suite: 428/428 green. No release, no tag, no NuGet publish, no version bump; `0.2.0-alpha.3` remained NO-GO at control closure.

1. TASK-0188 MCP transport step 2 (real stdio loop with redaction + safety bounds) - completed; pushed.
2. TASK-0189 `ackit watch` local implementation (FileSystemWatcher, debounce, ignore list, cancellation) - completed; pushed.
3. TASK-0190 `ackit watch` debounce + ignore-list + cancellation unit tests - completed; pushed.
4. TASK-0191 trim edge case tests (binary input, large files, UTF-8 boundary) - completed; pushed.
5. TASK-0192 MCP tool surface extension (`ackit.rules` read-only metadata tool) - completed; pushed.
6. TASK-0193 localization parity for new commands and MCP step 2 error surface - completed; pushed.
7. TASK-0194 docs update (MCP_STDIO_DESIGN Step 2, WATCH_MODE implementation notes, CLI_REFERENCE) - completed; pushed.
8. TASK-0195 docs-first local audit + state sync - completed; pushed.
9. TASK-0196 final validation and hosted check sync - completed; PROJECT-CONTROL-0110 closed.

## Historical PROJECT-CONTROL-0109
1. TASK-0177 hook expansion (Anthropic + Continue targets, dry-run preview) - hosted-verified.
2. TASK-0178 MCP transport prototype step 1 (Core interface + JSON-RPC plumbing, no process spawn) - hosted-verified; 283/283 tests green.
3. TASK-0179 webui no-build static polish - hosted-verified; 287/287 tests green.
4. TASK-0180 hosted check status reporter script - hosted-verified; 293/293 tests green.
5. TASK-0187 release deployment failure audit and script hardening - hosted-verified; 296/296 tests green; no release/tag/NuGet/deployment mutation.
6. TASK-0181 SARIF roundtrip regression test - hosted-verified; 299/299 tests green; pushed HEAD `52399d5`; no production code change.
7. TASK-0182 prompt pack edge cases (empty repo, single-file repo, docs-only repo, secret-bearing fixture) - hosted-verified; 303/303 tests green; pushed HEAD `8fc1361`.
8. TASK-0183 catalog rule id and severity stability test - hosted-verified; 305/305 tests green; pushed HEAD `4aaa157`.
9. TASK-0184 scan `--include` / `--exclude` glob filters - hosted-verified; 313/313 tests green; pushed HEAD `f5873eb`.
10. TASK-0185 nightly local check workflow (`.github/workflows`) - hosted-verified; 315/315 tests green; pushed HEAD `7311d4e`.
11. TASK-0186 final validation and hosted check sync - hosted-verified; 315/315 tests green; pushed HEAD `a1151c7`; PROJECT-CONTROL-0109 closed.

## Historical PROJECT-CONTROL-0108
1. TASK-0168 post-0107 audit and state sync - completed.
2. TASK-0169 add `generate` targets for Anthropic and Continue - completed.
3. TASK-0170 safe `ackit hooks` command design and implementation - completed.
4. TASK-0171 `ackit diff` for baselines - completed.
5. TASK-0172 `ackit trim` design and minimal safe implementation - completed.
6. TASK-0173 `ackit watch` design and local implementation plan - completed (design-only).
7. TASK-0174 entropy scanner rule research and guard tests - completed.
8. TASK-0175 MCP stdio design-only - completed.
9. TASK-0176 final validation and hosted check sync - completed; 270/270 tests green.

## Historical PROJECT-CONTROL-0107
1. TASK-0159 post-0158 audit and state sync - completed.
2. TASK-0160 scanner severity explanation polish - completed.
3. TASK-0161 config-check actionable diagnostics examples - completed.
4. TASK-0162 baseline diff documentation and tests - completed.
5. TASK-0163 SARIF rule metadata completeness - completed.
6. TASK-0164 report and WebUI accessibility and offline UX polish - completed.
7. TASK-0165 prompt pack and context export redaction hardening - completed.
8. TASK-0166 sample gallery coverage expansion - completed.
9. TASK-0167 final validation and hosted check sync - completed; 257/257 tests green.

## Historical PROJECT-CONTROL-0106
1. TASK-0140 repo rules commit and push policy sync - completed.
2. TASK-0141 project queue and handoff consistency audit - completed.
3. TASK-0142 scanner rule doc contract consistency - completed.
4. TASK-0143 agent instruction surface consistency - completed.
5. TASK-0144 next local product work selection - completed; seven TASK-0146 through TASK-0152 files created.
6. TASK-0145 final validation and hosted check sync - completed.

## Independent Local Product/Code-Quality Track
1. TASK-0146 scanner severity explanation polish - completed.
2. TASK-0147 config-check actionable diagnostics examples - completed.
3. TASK-0148 baseline diff documentation and tests - completed.
4. TASK-0149 SARIF rule metadata completeness - completed.
5. TASK-0150 report and Web UI accessibility and offline UX polish - completed.
6. TASK-0151 prompt pack and context export redaction hardening - completed.
7. TASK-0152 sample gallery test coverage expansion - completed.
8. TASK-0156 brand/PII keyword starter config - completed; 238/238 tests green.
9. TASK-0157 safe domain and ignored paths starter config - completed.
10. TASK-0158 Turkish CLI locale fallback guard - completed.

## Historical PROJECT-CONTROL-0104
1. TASK-0135 issue template version placeholder sync - completed.
2. TASK-0136 active docs project control and test count refresh - completed.
3. TASK-0137 scanner rule catalog extension - completed; `ACKIT006` and `ACKIT007` added.
4. TASK-0138 issue template guard test and final audit sync - completed; 192/192 tests green.
5. PROJECT-CONTROL-0105 post-0104 audit and continuation - completed; SARIF doc and queue refresh merged.

## Historical PROJECT-CONTROL-0105
1. TASK-0139 end-to-end coverage for new scanner rule IDs - completed; 197/197 tests green.

## Historical PROJECT-CONTROL-0103
1. TASK-0126 release recovery and idempotent verification - completed.
2. TASK-0127 alpha.2 supply-chain evidence refresh - completed.
3. TASK-0128 hosted release-candidate evidence hardening - completed; run `27478635057` green on three operating systems.
4. TASK-0129 private vulnerability reporting verification - completed; `enabled: true` verified 2026-06-14.
5. TASK-0130 security notification and recovery ownership - completed to verifiable boundary; backup/authority blockers recorded.
6. TASK-0131 NuGet owner identity disposition - completed with bounded accepted risk.
7. TASK-0132 signing, SBOM, and provenance implementation/decision - completed locally; provenance hosted-pending next publish.
8. TASK-0133 next prerelease scope and version selection - completed; `0.2.0-alpha.3` selected without metadata changes.
9. TASK-0134 conditional next prerelease preparation, publication, and verification - completed to safe boundary with evidence-backed NO-GO; no candidate or publication was attempted.

## Historical Alpha.2 Execution
1. TASK-0116 documentation consistency and local Markdown-link audit.
2. TASK-0117 scanner precision audit and hardening.
3. TASK-0118 suppression audit polish.
4. TASK-0119 baseline-aware CI policy polish.
5. TASK-0120 config diagnostics polish.
6. TASK-0121 contract, regression, and performance validation.
7. TASK-0122 OIDC release automation and credential boundary.
8. TASK-0123 `v0.2.0-alpha.2` release preparation and exact-commit push - completed.
9. TASK-0124 hosted validation and publication - completed.
10. TASK-0125 post-publish verification and final hosted validation - completed.

## Completed Local Execution
- TASK-0066 through TASK-0099 are completed locally.
- The current published release is `v0.2.0-alpha.4`; `v0.2.0-alpha.3` remains historical predecessor evidence.
- Standard `ci`, published-package smoke, and source-package smoke are green for current remote `master`.
- The release-candidate evidence boundary remains `LOCAL READY / REMOTE NO-GO` where applicable.
- Completed local documentation, tests, and gates do not claim 1.0 readiness or close remote P0/P1 decisions.

## Maintainer-Gated Release/Security Track
These actions require explicit maintainer control and do not block safe local-only product/documentation work:

1. Rerun the manual hosted RC evidence workflow only for a different selected final-candidate commit; alpha.2 evidence is green at `4c4fa64`.
2. Keep private vulnerability reporting enabled and maintain the independent backup security notification owner record; primary ownership is recorded.
3. Recheck the bounded `Cyranth`/`Cynrath` NuGet identity disposition before expiry or the next release.
4. Recheck the bounded author-signing deferral before expiry or the next release.
5. Recheck the bounded SBOM deferral before expiry or the next release.
6. Obtain hosted provenance evidence only during the next authorized publish; the control is implemented locally.
7. Maintain NuGet backup recovery ownership and recovery procedure/tabletop evidence.
8. Maintain the TASK-0206 `0.2.0-alpha.3` publish evidence. Do not mutate the published package, tag, or GitHub Release; use successor-release policy for any correction.

## Local-Only Ecosystem/Product Intelligence Track
1. TASK-0100 offline OSS ecosystem catalog and roadmap reset - completed locally.
2. TASK-0101 related tools comparison matrix - completed locally.
3. TASK-0102 offline workflow examples with external tools - completed locally.
4. TASK-0103 optional interoperability design, no dependency - completed locally.
5. TASK-0104 agent context pipeline taxonomy - completed locally.
6. TASK-0105 README ecosystem positioning section - completed locally.
7. TASK-0106 ecosystem evidence schema and review policy - completed locally.
8. TASK-0107 external tool privacy threat model - completed locally.
9. TASK-0108 disposable offline workflow lab plan - completed locally.
10. TASK-0109 optional command design: `ackit external-tools` - completed locally.
11. TASK-0110 optional command design: `ackit workflow` - completed locally.
12. TASK-0111 external SARIF/JSON/SBOM/graph import boundary - completed locally.
13. TASK-0112 docs quality toolchain decision - completed locally.
14. TASK-0113 no-network/default-offline policy hardening - completed locally.
15. TASK-0114 release blocker board and maintainer decision register - completed locally.
16. TASK-0115 `v0.2.0-alpha.2` candidate planning refresh - completed locally.
17. TASK-0116 ecosystem documentation consistency and local link audit - completed.

## Current Remote State
- Current published release: `v0.2.0-alpha.4` at exact publish commit `98cdf9723a509a347bd0403f6373dafe81ba03fb`.
- GitHub Release: `v0.2.0-alpha.4` published pre-release.
- NuGet package: `AgentContextKit` `0.2.0-alpha.4`, published through OIDC Trusted Publishing.
- Published global tool includes `ackit sarif`.
- Local and remote `master` were aligned at PROJECT-CONTROL-0102 start on `8dadd16`.
- All eight checked `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` jobs succeeded for `8dadd16`.
- TASK-0100 local validation passed with 178/178 tests, clean source scan/doctor, parsed JSON/SARIF, sample smoke, hygiene checks, and all local readiness/release evidence gates. The pre-commit public release gate reported only the expected dirty working tree blocker.
- PROJECT-CONTROL-0101 validation passed with a zero-warning Release build, 178/178 tests, source JSON with zero findings, doctor PASS, parsed global SARIF with no Critical/High findings, sample smoke, clean hygiene/local Markdown links, and all requested local gates. The pre-commit public gate reported only the expected dirty working tree blocker.
- Post-publish commit `ead65120928835419fb91bf695e845721620c394` passed all eight standard hosted jobs: 2 CI, 3 published-package smoke, and 3 source-package smoke.

## Completed Independent Alpha.4 Hosted RC Evidence

1. TASK-0219 alpha4 hosted RC evidence - completed locally with hosted dispatch. Run `28208545684` for exact commit `b8e8fce68f803c50f708d1566f1a38aab4b34bde` passed on `windows-2025`, `ubuntu-latest`, and `macos-latest`; candidate `0.2.0-alpha.4`; predecessor `0.2.0-alpha.3`; source candidate package `0.2.0-alpha.4.ci.28208545684`; 428/428 tests; performance tripwire PASS. Decision: GO. No publish, tag, GitHub Release, NuGet, or workflow dispatch mutation occurred.

## Completed Independent Alpha.4 Release Prep

1. TASK-0218 alpha4 NuGet README rendering release prep - completed locally. Source/package version updated to `0.2.0-alpha.4`; local package verification and install smoke passed; `README.nuget.md` confirmed packaged.

## Next Task
- TASK-0230 completed: V100 local contract and readiness gate rerun against alpha4. All gates PASS at HEAD `77748e7`. Fresh evidence recorded for V100-01/02/03/04/07/10.
- Historical checkpoint: TASK-0231 completed the post-alpha4 V100 cleanup and selected TASK-0232. The current chain is tracked at the top of this file.

## Execution Rule
After the closure of PROJECT-CONTROL-0110, the queue is in pause except for explicitly requested independent docs/release-preparation tasks. Tag, GitHub pre-release, NuGet publication, and workflow dispatch are allowed only through the explicitly authorized release task and OIDC workflow. Never expose credentials or use force/history-rewrite operations.
