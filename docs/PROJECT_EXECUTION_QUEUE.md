# Project Execution Queue

## V100 `1.0.0-rc.1` Existing-Tag Recovery Closure — TASK-0252–0254 Planned

| Order | Status | Task | Purpose | Dependencies | Expected files | Validation | Remote/destructive boundary |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | Completed | TASK-0239 candidate version selection and release preparation | Exact candidate `548b6affd0da25cb379ec1b153b1064fd5ff6f0b` prepared and pushed | TASK-0238 | Version/package/workflow/script/test/fixture/release-plan/evidence/handoff files | 431/431 local; standard CI `29118331264`, `29118331259`, `29118331258` green | One normal push completed; no publication |
| 2 | Completed | TASK-0240 hosted RC evidence execution and recording | Single authorized run `29118452246` passed on all three operating systems | TASK-0239 green | Hosted/validation/V100/queue/handoff docs | Exact input plus one dispatch/watch/view/log sequence passed | Commit `fd2ce8d`; one RC dispatch; read-only/no upload |
| 3 | Completed | TASK-0241 final acceptance, gap closure, and publish boundary | Open P0 0; conditional GO; final suite and standard CI green; V100-09 remains publish-provenance boundary | TASK-0240 PASS | V100/decision/release/queue/handoff docs | Commit `b1fae4d`; runs `29119747553`, `29119747558`, `29119747534` | Publication remained separate |
| 4 | Stopped / partial immutable publication | TASK-0242 OIDC publication and post-publish verification | Single run published NuGet then failed propagation verification; tag/release/provenance absent | TASK-0241 plus consumed authorization | Task/release/decision/incident docs | Run `29131335084`; one-time immutable audit; final docs CI | New explicit recovery decision required; no second dispatch |
| 5 | Completed / pushed / CI pass | TASK-0243 exact-existing-package recovery operation | Fail-closed recovery operation uses exact prior artifacts without NuGet publication | TASK-0242 immutable evidence plus explicit recovery authorization | Workflow/script/static tests/recovery and automation docs | 431/431; pre-recovery runs `29151153458`, `29151153453`, `29151153454` PASS | No dispatch in TASK-0243 |
| 6 | Stopped / dispatch consumed / no mutation | TASK-0244 recovery execution and hosted verification | Single run failed in Ubuntu safety gate before mutation | TASK-0243 green | Hosted/supply-chain/V100/queue/handoff evidence | Run `29151228607`; log once; immutable audit once | No fix/rerun/second dispatch; new decision required |
| 7 | Not executed | TASK-0245 post-recovery smoke pin and evidence closure | Pin/current-release sync withheld because recovery did not complete | TASK-0244 success not met | Failure-state docs only | Smoke pin remains alpha4; no release mutation |
| 8 | Completed / pushed / CI pass | TASK-0246 cross-platform recovery safety gate host fix | Use `pwsh`, preserve pre-mutation gates, and polish all README sources | New explicit authorization | Script/workflow tests, README/docs/task/handoff files | 431/431; runs `29182095416`, `29182095415`, `29182095423` PASS | No release mutation |
| 9 | Stopped / dispatch consumed / no mutation | TASK-0247 authorized exact-package recovery execution | One exact-existing-package recovery dispatch | TASK-0246 CI green | Hosted/supply-chain/V100/task/handoff evidence | Run `29182188201`; log once; immutable audit once | No fix/rerun/second dispatch/manual upload |
| 10 | Not executed | TASK-0248 smoke pin, README, and evidence closure | Pin/current-release/V100-09 sync withheld because recovery failed | TASK-0247 success not met | Failure-state docs only | Smoke pin alpha4; V100-09 open |
| 11 | Completed / pushed / CI pass | TASK-0249 expected-404 recovery exit-state correction | Correct the accepted-404 native exit leak with one shared fail-closed helper | New explicit authorization | Workflow/helper/tests/task/queue/handoff files | 431/431; runs `29340782994`, `29340783184`, `29340782999` PASS | No release mutation |
| 12 | Stopped / dispatch consumed / remote unchanged | TASK-0250 authorized exact-existing-package recovery | Single run passed pre-mutation gates, then tag push was rejected for missing GitHub App `workflows` permission | TASK-0249 CI green | Hosted/supply-chain/release/V100/task/handoff evidence | Run `29341087462`; log once; immutable audit once | No rerun/second dispatch/manual completion/settings change |
| 13 | Not executed | TASK-0251 post-recovery smoke/provenance/public sync | Success-only pin/public/V100 closure withheld | TASK-0250 success not met | Failure-state docs only | Smoke pin alpha4; V100-09 open |
| 14 | Completed locally / pending push and CI | TASK-0252 existing exact tag recovery workflow adaptation | Exact existing-tag verification replaces tag absence/creation; every tag mutation is prohibited | Owner-created exact tag plus explicit authorization | Workflow/helpers/tests/recovery/supply-chain/task/queue/handoff docs | Focused scripts and full local suite PASS (431/431); hosted CI pending | First normal push pending; no recovery dispatch or release mutation |
| 15 | Planned / blocked on TASK-0252 CI | TASK-0253 authorized prerelease asset and attestation recovery | One exact recovery dispatch from the immutable existing tag | TASK-0252 exact-HEAD standard CI green | Remote release plus task/hosted/supply-chain/V100 evidence | One preflight/dispatch/watch/view/evidence sequence | Exactly one dispatch; strict failure boundary; zero NuGet publish |
| 16 | Planned / success-only | TASK-0254 three-platform smoke/public/provenance closure | RC1 smoke pin, public status, README parity, and conditional V100-09 closure | TASK-0253 complete success | Published-smoke workflow, README/changelog/release/V100/task/queue/handoff docs | Final full local suite and three standard workflows | Second final normal push; no immutable release mutation |

Execution rule: TASK-0242 publish and TASK-0244/TASK-0247/TASK-0250 recovery budgets are consumed and their records remain immutable. The owner-created `v1.0.0-rc.1` tag is exact and immutable. TASK-0252 may adapt the workflow without dispatch; TASK-0253 has exactly one new recovery dispatch after green CI; TASK-0254 is success-only. No NuGet publication, normal publish, second dispatch/rerun, manual upload/completion, tag mutation, settings mutation, history rewrite, force push, or GA claim is authorized.

## Historical PROJECT-CONTROL-0109 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 84 | In progress | PROJECT-CONTROL-0109 scan/export/hooks hardening + MCP prototype step 1 | Low | None | `docs/tasks/PROJECT-CONTROL-0109-...md` plus TASK-0177 through TASK-0186 task files; queue and handoff docs | full local validation suite, hosted 3/3 | Push after validation | Hook expansion, MCP transport prototype step 1, WebUI no-build polish, hosted check status reporter, SARIF roundtrip regression, prompt pack edge cases, catalog rule id stability, scan include/exclude glob filters, nightly local check workflow, and final validation all complete |

## Historical PROJECT-CONTROL-0108 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 83 | Completed | PROJECT-CONTROL-0108 vibe-feature local product continuation | Low | None | `docs/tasks/PROJECT-CONTROL-0108-...md` plus TASK-0168 through TASK-0176 task files; queue and handoff docs | full local validation suite, hosted 3/3 | Push after validation | Post-0107 audit, Anthropic/Continue generate targets, safe `ackit hooks`, baseline diff, deterministic trim, watch mode, entropy guard, MCP stdio design, and final validation all complete |

## Historical PROJECT-CONTROL-0107 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 82 | Completed | PROJECT-CONTROL-0107 docs-first local product continuation | Low | None | `docs/tasks/PROJECT-CONTROL-0107-...md` plus TASK-0159 through TASK-0167 task files; queue and handoff docs | full local validation suite, hosted 3/3 | Push after validation | Audit, severity guidance, config-check examples, baseline diff, SARIF completeness, accessibility polish, redaction hardening, sample gallery expansion, and final validation all complete |

## Historical PROJECT-CONTROL-0106 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 75 | Completed | PROJECT-CONTROL-0106 repo rules and continuation sync | Low | None | `docs/tasks/PROJECT-CONTROL-0106-...md` plus TASK-0140 through TASK-0145 task files; agent instruction surfaces; queue and handoff docs | full local validation suite, hosted 3/3 | Push after validation | Agent rule sync, queue/handoff consistency, scanner rule doc consistency, instruction surface alignment, next work selection, and final validation all complete |
| 76 | Completed | TASK-0140 repo rules commit and push policy sync | Low | None | AGENTS, CLAUDE, copilot, cursor, DEVELOPMENT_STANDARD | local gates | Push after validation | Hard prohibitions plus new authorized-clause wording consistent across surfaces |
| 77 | Completed | TASK-0141 project queue and handoff consistency audit | Low | None | NEXT_TASKS, PROJECT_EXECUTION_QUEUE, .codex/* | local gates | Push after validation | Queue and handoff reflect PROJECT-CONTROL-0106 active and 197/197 test count |
| 78 | Completed | TASK-0142 scanner rule doc contract consistency | Low | None | JSON_OUTPUT, SECURITY_MODEL, SCANNER_RULES, SARIF_OUTPUT, new consistency test | `dotnet test` green | Push after validation | ACKIT006/007 referenced consistently in docs and Core catalog |
| 79 | Completed | TASK-0143 agent instruction surface consistency | Low | None | AGENTS, CLAUDE, copilot, cursor, DEVELOPMENT_STANDARD plus new surface test | `dotnet test` green | Push after validation | Canonical phrases present across all five primary surfaces |
| 80 | Completed | TASK-0144 next local product work selection | Low | None | NEXT_TASKS, PROJECT_EXECUTION_QUEUE, ROADMAP, .codex/*, seven TASK-0146 through TASK-0152 files | local gates | Push after validation | Seven candidate task files created and queued |
| 81 | Completed | TASK-0145 final validation and hosted check sync | Low | None | handoff docs | full local validation suite, hosted 3/3 | Push after validation | Standard 3/3 green for final PROJECT-CONTROL-0106 HEAD |

## Independent Local Product/Code-Quality Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | Completed | TASK-0146 scanner severity explanation polish | Low | None | Core catalog text, guard test | `dotnet test` green | Push after validation | Each catalog rule has a clear, non-empty description and recommendation |
| C2 | Completed | TASK-0147 config-check actionable diagnostics examples | Low | None | `docs/CONFIGURATION.md`, guard test | `dotnet test` green | Push after validation | Cookbook maps at least four `ACKITCFG` codes to one-line fixes |
| C3 | Completed | TASK-0148 baseline diff documentation and tests | Low | None | `docs/BASELINE_MODEL.md`, guard test | `dotnet test` green | Push after validation | Existing-vs-new classification preserved in JSON output |
| C4 | Completed | TASK-0149 SARIF rule metadata completeness | Low | None | `Sarif.cs` if needed, guard test | `dotnet test` green | Push after validation | Each SARIF rule carries `id`, `name`, `shortDescription`, `fullDescription`, `help` |
| C5 | Completed | TASK-0150 report and Web UI accessibility and offline UX polish | Low | None | `docs/HTML_REPORTS.md`, guard test | `dotnet test` green | Push after validation | Generated HTML contains no external network references |
| C6 | Completed | TASK-0151 prompt pack and context export redaction hardening | Low | None | guard test | `dotnet test` green | Push after validation | Synthetic raw value does not leak into prompt pack or context export |
| C7 | Completed | TASK-0152 sample gallery test coverage expansion | Low | None | guard test | `dotnet test` green | Push after validation | Each safe sample is asserted against the Core scanner |
| C8 | Completed | TASK-0156 brand/PII keyword starter config | Low | None | `docs/examples/config/brand-pii-starters.yml`, `docs/CONFIGURATION.md`, guard test | `dotnet test` green | Push after validation | Starter `brandKeywords` and `piiKeywords` set documented and tested |
| C9 | Completed | TASK-0157 safe domain and ignored paths starter config | Low | None | `docs/examples/config/safe-domains-and-ignored-paths.yml`, `docs/CONFIGURATION.md`, guard test | `dotnet test` green | Push after validation | Starter `safeDomains` and `ignoredPaths` set documented and tested |
| C10 | Completed | TASK-0158 Turkish CLI locale fallback guard | Low | None | guard test | `dotnet test` green | Push after validation | Turkish CLI text is non-empty and distinct from English |

## Historical PROJECT-CONTROL-0105 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 74 | Completed | PROJECT-CONTROL-0105 post-0104 audit and continuation | Low | None | PROJECT-CONTROL-0105 task file, queue and SARIF_OUTPUT.md updates, next TASK | full local validation suite, hosted 3/3 | Push after validation | 10-item 0104 audit closed and next safe task queued; 197/197 green |

## Historical PROJECT-CONTROL-0104 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 70 | Completed | TASK-0135 issue template version placeholder sync | Low | None | four `.github/ISSUE_TEMPLATE/*.yml` | `git diff --check` and local gates | Push after validation | Templates show current `0.2.0-alpha.2` placeholder |
| 71 | Completed | TASK-0136 active docs project control and test count refresh | Low | None | active queue, NEXT_TASKS, NEXT_STEPS | local Markdown link gate and `git diff --check` | Push after validation | Active control row points to PROJECT-CONTROL-0104 |
| 72 | Completed | TASK-0137 scanner rule catalog extension | Low | None | Core catalog, focused tests, SCANNER_RULES.md | `dotnet test` 187/187 green, `ackit scan --ci` and `doctor` clean | Push after validation | `ACKIT006` and `ACKIT007` added with ruleId and Suppression coverage |
| 73 | Completed | TASK-0138 issue template guard test and final audit sync | Low | None | new test, queue, NEXT_TASKS | `dotnet test` 192/192 green | Push after validation | CI guard against placeholder drift and final docs refresh |

## Historical PROJECT-CONTROL-0103 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 61 | Completed | TASK-0126 release recovery verification | P0 | Complete | release workflow/scripts/tests/docs | local gates, 8/8, verify-existing run | Dispatch only; verifier read-only | Run `27478046088` green |
| 62 | Completed | TASK-0127 alpha.2 supply-chain evidence | P1 | Complete | evidence/status/gates | exact artifact audit | Read-only queries | Alpha.2 evidence is reproducible |
| 63 | Completed | TASK-0128 hosted RC evidence hardening | P0 future release | Complete for reviewed alpha.2 state | RC workflow/gates/evidence | exact hosted matrix | Dispatch only | Run `27478635057` green on three OS |
| 64 | Completed | TASK-0129 private vulnerability reporting | P0 future release | Complete | security status/evidence/script | enabled boolean re-read and public entry check | Completed | Enabled and independently verified |
| 65 | Completed to verifiable boundary | TASK-0130 notification/recovery ownership | P0/P1 | Backup and NuGet authority remain | security/recovery/decision docs | evidence structure/tabletop | No remote incident action | Truthful primary ownership/procedure and explicit blockers |
| 66 | Completed | TASK-0131 NuGet identity disposition | P1 | Bounded accepted risk | NuGet/evidence/decision docs | public identity/OIDC review | No owner mutation | Dated exception through 2026-09-30 |
| 67 | Completed locally | TASK-0132 signing/SBOM/provenance | P1 | Provenance hosted-pending | workflow/scripts/evidence | permission/action tests plus future publish verification | Publish job only | Deferrals recorded; provenance implemented |
| 68 | Completed | TASK-0133 next prerelease selection | P0 | `0.2.0-alpha.3` selected; publication deferred | scope/roadmap/changelog docs | contract/version gates | No | Smallest valid version selected without metadata bump |
| 69 | Completed to safe boundary / NO-GO | TASK-0134 next prerelease release | P0 | Independent backup security owner and recovery authority remain unresolved | release decision/status files | local gates plus planning-commit 8/8 | No release write performed | Evidence-backed NO-GO; resume conditions recorded |

## Historical Authorized Alpha.2 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 51 | Done locally | TASK-0116 documentation consistency/link audit | High | Complete | local Markdown gate/tests and active docs | focused test plus docs gates | Push after validation | Active wording and local links pass |
| 52 | Done locally | TASK-0117 scanner precision audit | High | Complete | focused Core/tests/docs | positive/negative scanner tests | Push after validation | Precision improves without weaker Critical detection |
| 53 | Done locally | TASK-0118 suppression audit polish | High | Complete | suppression code/tests/docs | sanitized audit tests | Push after validation | Audit is deterministic and raw-value-free |
| 54 | Done locally | TASK-0119 baseline-aware CI polish | High | Complete | baseline/CLI tests/docs | baseline and exit contract tests | Push after validation | New severe findings still block |
| 55 | Done locally | TASK-0120 config diagnostics polish | High | Complete | validator/CLI tests/docs | valid/warning/error tests | Push after validation | Stable sanitized diagnostics |
| 56 | Done locally | TASK-0121 full validation | P0 | Complete | evidence docs | complete local gate set | No | All contracts/performance pass |
| 57 | Done locally | TASK-0122 release automation | P0 | Complete | release workflow/scripts/docs | static/local release automation gates | Push after validation | Manual exact-SHA OIDC workflow is safe/idempotent |
| 58 | Completed | TASK-0123 alpha.2 preparation | P0 | Complete | version/release/package metadata | full package/install smoke | Yes, completed | Exact candidate commit pushed |
| 59 | Completed | TASK-0124 hosted publish | P0 | Complete | hosted release evidence | release workflow plus package/tag/release verification | Yes, completed | NuGet/tag/pre-release complete |
| 60 | Completed | TASK-0125 post-publish verification | P0 | Complete | README/workflow/status docs | installed-tool smoke and final 8/8 | Yes, completed | Clean aligned final state |

## Completed Local Execution
| Status | Task range | Scope | Validation | Remote state |
| --- | --- | --- | --- | --- |
| Done locally | TASK-0066 through TASK-0099 | Post-release docs, scanner/config/output hardening, tutorials, baseline/config product work, RC evidence, security/supply-chain state audits | Full local build/test/scan/doctor/sample/readiness/release gates per task | Remote actions remain separately controlled |

## Maintainer-Gated Release/Security Track
| Order | Status | Action | Priority | Blocking status | Expected evidence | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M1 | Verified for alpha.2 state | Manual hosted RC evidence workflow | P0 | Rerun for a different final candidate | Run `27478635057`, exact `4c4fa64`, three-OS results | Hosted predecessor/config/baseline/SARIF/performance workflow | Yes | Green run recorded; future candidate must rerun |
| M2 | Complete for current repository state | Private vulnerability reporting and notification ownership | P0 | V100-06 closed by TASK-0232 | Setting `enabled: true`; primary `Cynrath`; backup `ShadowFlameC`; fresh 2026-07-10 verification | Recheck after owner/channel/support-policy change | No | Verified channel plus primary and backup coverage |
| M3 | Accepted risk | NuGet owner identity alignment | P1 | Disposed through next prerelease decision or 2026-09-30 | `Cyranth`/`Cynrath` dated intentional exception | NuGet package/profile/OIDC review | No owner mutation | Recheck before expiry |
| M4 | Accepted risk | Author signing | P1 | Deferred through next prerelease decision or 2026-09-30 | Repository signature plus dated controls/review | Exact package verification | No signing | Recheck before expiry |
| M5 | Accepted risk | SBOM publication | P1 | Deferred through next prerelease decision or 2026-09-30 | Dependency/package controls plus dated review | Exact candidate/package review | No publication | Recheck before expiry |
| M6 | Implemented locally | Provenance/attestation | P1 | Hosted evidence requires next publish | Exact release nupkg, signer workflow, CLI verification | Workflow static tests plus future hosted attestation | Publish job only | Verified attestation on next release |
| M7 | Complete for current ownership record | Package recovery ownership | P1 | Hosted provenance remains separate | `Cynrath` decision owner, `Cyranth` primary NuGet identity, `ShadowFlameC` backup, thresholds, communication, immutable successor | Tabletop/document review; no destructive test | Only during an actual incident/action | Keep recovery coverage current |
| M8 | Published | Candidate version and release approval | P0/P1 | `0.2.0-alpha.3` published and verified | TASK-0206 publish evidence: NuGet package, tag, GitHub prerelease, global tool install, immutable verification | Full local and hosted release gates | Yes, completed | Published through OIDC release workflow; successor release for corrections |

## Local-Only Ecosystem/Product Intelligence Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 35 | Done locally | TASK-0100 offline OSS ecosystem catalog and roadmap reset | Medium | None | ecosystem/positioning/workflow docs, queue reset, README links | Official-source research plus full local gates | No | Initial catalog and split roadmap exist without dependencies |
| 36 | Done locally | TASK-0101 related tools comparison matrix | Medium | None | normalized comparison/evidence docs | Source/license/offline review plus docs gates | No | Higher-confidence matrix with review dates and evidence links |
| 37 | Done locally | TASK-0102 offline workflow examples with external tools | Medium | Tools installed manually for optional validation | disposable example docs/scripts only if approved | No-upload disposable smoke and hygiene | No | Safe copy-ready workflows with no auto-install/network default |
| 38 | Done locally | TASK-0103 optional interoperability design, no dependency | Medium | Requires TASK-0101/0102 evidence | architecture/ADR/schema proposal | Threat model, license/privacy/output contract review | No | Opt-in adapter boundary designed without implementation |
| 39 | Done locally | TASK-0104 agent context pipeline taxonomy | Low | None | taxonomy/product/docs updates | Docs review and scanner hygiene | No | Product categories and handoff stages are consistently named |
| 40 | Done locally | TASK-0105 README ecosystem positioning section | Low | Waits for comparison/taxonomy review | concise README/docs updates | Docs/hygiene/release gates | No | Public positioning is concise, accurate, and stable |
| 41 | Done locally | TASK-0106 ecosystem evidence schema and review policy | Medium | TASK-0101 evidence format | evidence schema/review policy | Evidence-field and staleness review plus docs gates | No | Catalog claims have source, confidence, review, and stale-after metadata |
| 42 | Done locally | TASK-0107 external tool privacy threat model | High | TASK-0103 trust boundaries | privacy threat model and linked security docs | Threat coverage, hygiene, security/docs gates | No | External output and executable risks have mitigations and residual-risk owners |
| 43 | Done locally | TASK-0108 disposable offline workflow lab plan | Medium | TASK-0102 examples and TASK-0107 threats | lab/evidence-capture plan | Static privacy/offline/cleanup review | No | Future smoke uses synthetic disposable samples without secrets or committed outputs |
| 44 | Done locally | TASK-0109 `ackit external-tools` command design | Medium | TASK-0103/0107 | design-only CLI docs | CLI docs consistency and trust-boundary review | No | Discovery/probe design exists without implementation or default doctor changes |
| 45 | Done locally | TASK-0110 `ackit workflow` command design | Medium | TASK-0102/0103 | design-only CLI/workflow docs | CLI docs consistency and example review | No | Guidance-only workflow family is specified without execution |
| 46 | Done locally | TASK-0111 external output import boundary | High | TASK-0103/0107 | SARIF/JSON/SBOM/graph import design | Contract/privacy/security review | No | Namespaced, size-limited, sanitized summary boundary is specified without parser code |
| 47 | Done locally | TASK-0112 docs quality toolchain decision | Low | None | docs quality/site decision | Docs inventory and local-only validation | No | Markdown stays canonical and optional tools have activation gates |
| 48 | Done locally | TASK-0113 no-network/default-offline policy hardening | High | TASK-0107 | authoritative offline policy and aligned public docs | Terminology, scan, privacy/security/release gates | No | Default commands and outputs have an unambiguous no-upload/no-call boundary |
| 49 | Done locally | TASK-0114 release blocker board and maintainer decision register | High | Existing RC/security evidence | blocker board/register and linked evidence docs | Cross-document and security/supply-chain gates | No | Open P0/P1 items are visible without being closed |
| 50 | Done locally | TASK-0115 `v0.2.0-alpha.2` candidate planning refresh | Medium | TASK-0114 blocker truth | planning-only scope docs | Version/reference and full local gates | No | Scope is current, no version changes occur, and release remains maintainer-gated |
| 51 | Superseded by active track | TASK-0116 ecosystem documentation consistency and local link audit | Low | TASK-0101 through TASK-0115 | See active authorized track | See active authorized track | See active authorized track | Tracked above |

## Guardrail
Maintainer-gated work does not block local-only product/docs progress, but no local task may claim release-ready, 1.0-ready, active security controls, signing, SBOM, provenance, or hosted RC completion without exact evidence.

## Local Validation
Last verified locally on 2026-06-14 at commit `a5686aa`:
- `dotnet build AgentContextKit.sln -c Release` clean, 0 warnings, 0 errors.
- `dotnet test AgentContextKit.sln -c Release --no-build` 238/238 green.
- `ackit scan --ci` and `ackit doctor` clean.
- `powershell -ExecutionPolicy Bypass -File scripts/check-local-markdown-links.ps1 -FailOnIssues` clean across 227 local targets.
- `powershell -ExecutionPolicy Bypass -File scripts/check-tracked-vs-untracked-md.ps1 -FailOnIssues` clean.

## Alpha.3 Status
- `0.2.0-alpha.3` is published and verified. `RB-003` and `RB-008` are closed for the alpha.3 release path by TASK-0202 evidence.
- NuGet README rendering infrastructure is completed by PR #1 (TASK-0215): `README.nuget.md`, `PackageReadmeFile` wiring, agent docs, and package metadata validation. Visible nuget.org README changes require a later authorized package publish.
- Do not mutate the published package, tag, GitHub Release, NuGet owner state, or release workflow history. TASK-0208 already hardened the `release.yml` provenance probe; any future release work still requires a dedicated task, hosted evidence, and explicit workflow dispatch authorization.

## Historical Docs/Queue Simplification Checkpoint
- TASK-0216 docs/queue simplification and stale-heading cleanup is complete. The current queue is the V100 safe/local completion track at the top of this file.
