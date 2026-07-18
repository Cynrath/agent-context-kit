# TASK-0262: ACKit Optimize Build Week documentation and final validation

## Purpose

Publish truthful Build Week documentation and reproducible judging/demo instructions, then complete all local and hosted validation with exact commit evidence and a clean synchronized repository.

## Current verified state and root cause

The pre-Build-Week foundation and immutable RC1 release are documented, but no `docs/BUILD_WEEK_2026.md`, Build Week commit ledger, Codex/GPT-5.6 usage statement, Optimize installation/demo guide, limitation list, or final feature evidence exists. These claims must follow verified implementation rather than precede it.

## Scope

- Add `docs/BUILD_WEEK_2026.md` covering pre-existing foundation, newly built features, exact baseline/final commit range, commit ledger, Codex and GPT-5.6 usage, human-controlled decisions/review boundaries, source installation/testing, demo, limitations, and evidence links.
- Update `README.md` prominently and truthfully; update `README.tr.md` for parity; update `README.nuget.md` only as the future package-source surface requires while explicitly saying published RC1 predates Optimize and cannot be retroactively changed.
- Update changelog, product spec, architecture, project map, CLI/reference/contract/output docs, documentation index, sample gallery, demo scenarios, no-network/security documentation, and task/control/handoff sources affected by the implemented behavior.
- Do not change package version, publish a package, or claim a future release/version unless separately human-selected and authorized.
- Provide exact source build/judging commands and an optional local temporary tool-pack/install workflow that cannot be confused with published RC1.
- Run focused and full local validation, public hygiene/secret/local-path/PII/generated-artifact checks, package metadata checks if package sources changed, and source demo output parsing.
- Create focused commits, push normally, monitor all push-triggered `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` workflows, fix valid failures, and finish with exact local/origin equality and a clean tree.

## Out of scope

- Tag/release/asset/attestation mutation, NuGet publication, workflow dispatch/rerun, deployment, 1.0 GA claim, release version selection, or fabricated video/CI evidence.
- Rewriting historical task/release records.

## Affected files

- `docs/BUILD_WEEK_2026.md`
- `README.md`, `README.tr.md`, and conditionally `README.nuget.md`
- `CHANGELOG.md`
- Product/architecture/project-map/CLI/output/security/localization/sample/demo/index docs and validation scripts
- `.codex/*`, `docs/NEXT_TASKS.md`, `docs/PROJECT_EXECUTION_QUEUE.md`
- TASK-0258 through TASK-0262 completion evidence

## Data/database impact

None.

## Security impact

Public docs/fixtures/evidence undergo secret, PII, brand, absolute local-path, generated-artifact, and no-network review. CI URLs and commit IDs are public metadata only. No credential or private repository content is recorded.

## Permission/auth impact

Normal commit/push and read-only hosted run monitoring are authorized. Workflow dispatch/rerun, settings/secrets, release/tag/package/deployment operations remain prohibited.

## Compatibility impact

Documentation distinguishes immutable published RC1 from post-RC1 current-source Build Week functionality. Existing commands and package installation guidance remain accurate.

## Localization impact

Build Week canonical evidence is English. README EN/TR capability and safety boundary remain equivalent. Machine contracts are language-independent.

## UX impact

Judges receive reproducible source setup, a three-minute synthetic demo, exact expected behavior, and honest limitations without needing private data or services.

## Logging/audit impact

Record every Build Week commit SHA/subject/task, final commit range, command results/test totals, hosted run/job URLs and conclusions, clean-tree/origin equality, and confirmation that RC1 immutable state was untouched.

## Acceptance criteria

- A fresh authorized checkout can run the documented source workflow against `samples/ackit-optimize-demo` and reproduce the expected audit/proposal behavior offline.
- README clearly separates RC1 foundation from Build Week additions and explicitly documents Codex/GPT-5.6 use plus human decision boundaries.
- `docs/BUILD_WEEK_2026.md` contains exact commit range/ledger and only verified claims.
- CLI docs, schemas, examples, EN/TR surfaces, changelog, architecture/project map, and sample/demo docs match actual help/output.
- Restore/build passes with 0 warnings/errors; all tests pass with exact totals; focused Optimize tests pass.
- JSON/SARIF parse, Markdown/link, localization, CLI, package metadata, security/privacy, source hygiene, tracked/untracked, ACKit doctor/scan, and diff gates pass.
- No `.ackit`, ordinary SARIF/HTML/report/proposal, package, `bin`, or `obj` artifact is tracked.
- Final push-triggered hosted workflows are green for final Build Week HEAD.
- Working tree is clean and local HEAD equals `origin/master`.
- Exact RC1 tag/release/assets/attestations remain unchanged and no publication/release/tag/deployment action occurred.

## Test steps

- User-required full Phase 6 command set plus repository scripts
- Focused `InstructionAudit`, Optimize CLI/output/proposal/demo tests
- Full `dotnet restore/build/test`
- Source `--help`, optimize console/JSON/Markdown/SARIF/HTML/proposal smokes
- JSON/SARIF parsing and schema/golden tests
- EN/TR localization parity and docs/link checks
- package metadata/pure-Markdown checks if `README.nuget.md` changes
- secret/PII/local-path/generated-artifact/no-tracked-`.ackit` scans
- `ackit doctor`, `ackit scan --ci`, `git diff --check`, tracked/untracked gate
- Read-only `git ls-remote`/GitHub release/tag/asset/attestation verification as needed
- Read-only hosted run monitoring after final push

## Failure handling

Fix repository-owned failures with normal successor commits and rerun affected plus full gates. Do not weaken tests/safety, dispatch workflows, alter immutable release state, or claim completion while a required gate is pending.

## Risks

- Documentation may overstate model attribution or feature availability; every claim must link to a Build Week commit and verified command.
- Published RC1 installation cannot demonstrate Optimize; judging guidance must use current source and clearly explain this boundary.
- Hosted CI latency/failure may require successor commits; only push-triggered runs are monitored under current authority.

## Rollback plan

Use normal successor commits to correct public docs or implementation. Never rewrite history or modify immutable RC1 evidence.

## Completion notes

Status: `FINAL EVIDENCE CLOSURE`; completion condition is this evidence-only commit's three standard workflows passing plus clean local/origin equality. Its self-referential SHA/run evidence is recorded in the final report.

Started from clean synchronized commit `7bf37cb83de64c7950e0bd27336fbc26758eb56a` after TASK-0261 CI, published-package smoke, and three-platform current-source smoke all completed successfully. Public documentation now distinguishes immutable RC1 from current-source Optimize, discloses Codex/GPT-5.6 assistance and human decision boundaries, and provides reproducible source/demo instructions. Exact TASK-0262 commits, final validation totals, hosted runs, and clean local/origin equality will be recorded only after they exist.

Public feature/documentation commit and hosted evidence:

- Exact commit: `00c9fea3893776f0bc9026f688a15d7a92d2ffb3`.
- CI run `29653893305`: PASS — https://github.com/Cynrath/agent-context-kit/actions/runs/29653893305
- Published-package cross-platform smoke run `29653893245`: PASS on Windows, Ubuntu, and macOS — https://github.com/Cynrath/agent-context-kit/actions/runs/29653893245
- Current-source cross-platform smoke run `29653893249`: PASS on Windows, Ubuntu, and macOS, including Optimize JSON/proposal/SARIF — https://github.com/Cynrath/agent-context-kit/actions/runs/29653893249
- The following evidence-only commit records these results. Its own exact SHA and push-triggered results cannot be self-embedded and are supplied by the final completion report after verification.

Local pre-commit validation on 2026-07-18:

- Installed ACKit `1.0.0-rc.1`: version commands PASS; config-check default valid with 0 diagnostics; doctor 13/13 PASS; `scan --ci` exit 0 over 663 files with only reviewed Medium/Low historical findings.
- Current source: config-check PASS; doctor 13/13 PASS; `scan --ci` exit 0 over 663 files with the same reviewed findings.
- Restore PASS; Release build PASS with 0 warnings and 0 errors; full suite 463 passed, 0 failed, 0 skipped; focused Optimize Core/report/proposal/demo/CLI filter 31 passed, 0 failed, 0 skipped.
- CLI contract, EN/TR localization parity, JSON schemas/goldens/live contract tests, config/generated conventions, package metadata, sample smoke, and local Markdown links (464 files, 222 targets) PASS.
- Demo smoke PASS for console, JSON stdout/file, Markdown, SARIF 2.1.0, self-contained offline HTML, and proposal: 4 sources, 16 rules, 4 scopes, 1 valid override, 10 findings, 270 whole-surface estimated tokens, and proposal 192 -> 156. `--ci` returned expected exit 2; source files matched HEAD and before/after hashes; all generated outputs were removed.
- Installed/current-source public-release redact check returned expected exit 1 for the same five pre-existing Low local-path findings. Changed-file hygiene found 0 absolute local-path files, 0 secret-token files, and 0 email/PII files. No tracked `.ackit`, `bin`, `obj`, Node dependency, SARIF, or package artifact matched the hygiene gate.
- `git diff --check` PASS. Optional repository-wide formatter returned exit 2 only for five pre-existing `FINALNEWLINE` diagnostics in untouched tests; all five matched the previously recorded list and there was no unexpected finding.
- Read-only immutable-release check: local and remote `v1.0.0-rc.1` resolve to `258918b33c3d1359aac967604ee524e8b66ddf02`; prerelease ID `353913024` remains non-draft with target `258918b...`; exact asset IDs `476881883`/`476881892`, sizes `218322`/`50053`, and SHA-256 digests match the historical record; each digest still has exactly one repository attestation. No release/tag/asset/attestation mutation command was issued.
