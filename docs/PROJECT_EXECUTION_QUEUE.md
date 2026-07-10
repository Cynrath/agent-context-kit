# Project Execution Queue

## Active V100 Safe/Local Completion Track

| Order | Status | Task | Purpose | Dependencies | Expected files | Validation | Remote/destructive boundary |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | Completed | TASK-0232 maintainer decision packet and source-of-truth reconciliation | Record authorized V100 decisions and reconcile current security/recovery/CLI truth | TASK-0231 | Decision packet, V100/security/contract/queue/handoff docs | ACKit, CLI, security/supply-chain, V100, Markdown gates | No remote setting/owner/release mutation |
| 2 | Completed | TASK-0233 performance and resource evidence expansion | Mixed corpus, peak memory, interruption, unreadable-file evidence | TASK-0232 | Performance script/test/policy/evidence docs | Focused test, Release build, benchmark, RC gate | Hosted confirmation pending |
| 3 | Completed | TASK-0234 final-candidate local source selection | Select exact last source-impacting local evidence base | TASK-0233 | Candidate selection/V100/roadmap docs | SHA/path/input review | No version or publish |
| 4 | Current | TASK-0235 final-candidate local contract freeze preparation | Refresh conditional freeze and target-contract review | TASK-0234 | Freeze/CLI/JSON/schema/V100 docs | Contract/config/JSON/localization/V100 gates | Final acceptance pending |
| 5 | Planned | TASK-0236 hosted RC evidence input preparation | Prepare dispatch-time post-push alpha4/alpha3 inputs | TASK-0235 | Hosted/RC/release/V100 evidence docs | Workflow/input static gates | Manual dispatch not executed |
| 6 | Planned | TASK-0237 documentation and handoff synchronization | Align all active sources and indexes | TASK-0232–0236 | Roadmap/queue/index/map/readiness/handoff docs | Markdown/tracked/V100/ACKit gates | Docs only |
| 7 | Planned | TASK-0238 final local readiness audit and closeout | Complete local suite, one final push, one blocking CI wait | TASK-0237 | Final evidence/task/queue/handoff docs | Full local suite plus push-triggered CI | Next action is manual RC dispatch |

Execution rule: one local commit per completed task, no intermediate push, no manual workflow dispatch/rerun, and no release/version/settings mutation.

## Active PROJECT-CONTROL-0109 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 84 | In progress | PROJECT-CONTROL-0109 scan/export/hooks hardening + MCP prototype step 1 | Low | None | `docs/tasks/PROJECT-CONTROL-0109-...md` plus TASK-0177 through TASK-0186 task files; queue and handoff docs | full local validation suite, hosted 3/3 | Push after validation | Hook expansion, MCP transport prototype step 1, WebUI no-build polish, hosted check status reporter, SARIF roundtrip regression, prompt pack edge cases, catalog rule id stability, scan include/exclude glob filters, nightly local check workflow, and final validation all complete |

## Active PROJECT-CONTROL-0108 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 83 | Completed | PROJECT-CONTROL-0108 vibe-feature local product continuation | Low | None | `docs/tasks/PROJECT-CONTROL-0108-...md` plus TASK-0168 through TASK-0176 task files; queue and handoff docs | full local validation suite, hosted 3/3 | Push after validation | Post-0107 audit, Anthropic/Continue generate targets, safe `ackit hooks`, baseline diff, deterministic trim, watch mode, entropy guard, MCP stdio design, and final validation all complete |

## Active PROJECT-CONTROL-0107 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 82 | Completed | PROJECT-CONTROL-0107 docs-first local product continuation | Low | None | `docs/tasks/PROJECT-CONTROL-0107-...md` plus TASK-0159 through TASK-0167 task files; queue and handoff docs | full local validation suite, hosted 3/3 | Push after validation | Audit, severity guidance, config-check examples, baseline diff, SARIF completeness, accessibility polish, redaction hardening, sample gallery expansion, and final validation all complete |

## Active PROJECT-CONTROL-0106 Track
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

## Active PROJECT-CONTROL-0105 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 74 | Completed | PROJECT-CONTROL-0105 post-0104 audit and continuation | Low | None | PROJECT-CONTROL-0105 task file, queue and SARIF_OUTPUT.md updates, next TASK | full local validation suite, hosted 3/3 | Push after validation | 10-item 0104 audit closed and next safe task queued; 197/197 green |

## Active PROJECT-CONTROL-0104 Track
| Order | Status | Task | Priority | Blocking status | Expected files | Validation required | Remote write required? | Done criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 70 | Completed | TASK-0135 issue template version placeholder sync | Low | None | four `.github/ISSUE_TEMPLATE/*.yml` | `git diff --check` and local gates | Push after validation | Templates show current `0.2.0-alpha.2` placeholder |
| 71 | Completed | TASK-0136 active docs project control and test count refresh | Low | None | active queue, NEXT_TASKS, NEXT_STEPS | local Markdown link gate and `git diff --check` | Push after validation | Active control row points to PROJECT-CONTROL-0104 |
| 72 | Completed | TASK-0137 scanner rule catalog extension | Low | None | Core catalog, focused tests, SCANNER_RULES.md | `dotnet test` 187/187 green, `ackit scan --ci` and `doctor` clean | Push after validation | `ACKIT006` and `ACKIT007` added with ruleId and Suppression coverage |
| 73 | Completed | TASK-0138 issue template guard test and final audit sync | Low | None | new test, queue, NEXT_TASKS | `dotnet test` 192/192 green | Push after validation | CI guard against placeholder drift and final docs refresh |

## Active PROJECT-CONTROL-0103 Track
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

## Active Authorized Alpha.2 Track
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
