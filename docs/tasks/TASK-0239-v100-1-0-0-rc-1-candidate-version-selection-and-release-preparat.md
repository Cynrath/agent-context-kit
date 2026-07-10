# TASK-0239: V100 1.0.0-rc.1 candidate version selection and release preparation

## Status

Candidate prepared locally; exact commit, push, and standard CI pending.

## Purpose

Select `AgentContextKit 1.0.0-rc.1` as the exact V100 release candidate, prepare source/package/workflow/documentation state for read-only hosted validation, and prove the candidate locally without publishing it.

## Verified entry state

- Verified on 2026-07-10: clean `master`; local HEAD and `origin/master` are `5c1a7782579f1bdc54a0d3706c886108382914cb` (`docs: close TASK-0238 V100 local chain`).
- `origin` is `https://github.com/Cynrath/agent-context-kit.git`; the default branch is `master`; no open pull requests or issues were returned.
- Published release `v0.2.0-alpha.4` is immutable and targets publish SHA `98cdf9723a509a347bd0403f6373dafe81ba03fb`.
- Historical standard runs `29107940364`, `29107940251`, and `29107940236` succeeded for the entry SHA.
- Proposed version `1.0.0-rc.1` has no remote tag, GitHub Release, or NuGet version.
- Installed ACKit is `0.2.0-alpha.4`; doctor is 13/13 PASS; `scan --ci` exits 0 with no Critical/High blocker. The installed parser does not support `ackit task --help`; it returned the expected missing-title exit 1 and will not be repeated.

## Dependencies

- TASK-0232 through TASK-0238 are complete and pushed.
- V100-06 is closed; V100-01 through V100-05 and V100-07 through V100-10 retain their recorded pre-candidate status.
- Hosted evidence execution is TASK-0240 and final acceptance is TASK-0241.

## Scope

- Change authoritative current source/package version fields from `0.2.0-alpha.4` to `1.0.0-rc.1` while preserving historical and public-published-state references.
- Keep public installation commands pinned to published `0.2.0-alpha.4` until a separately authorized publication task completes.
- Set hosted RC inputs to candidate `1.0.0-rc.1` and exact published predecessor `0.2.0-alpha.4`.
- Make the hosted workflow validate configuration produced by or exactly representative of predecessor `0.2.0-alpha.4`; retain older fixtures as historical regression evidence.
- Add read-only hosted CLI/config/JSON/localization gates required by V100-01, V100-02, V100-03, V100-04, and V100-10, with static tests.
- Add prepared RC plan, draft release body, changelog entry, package/dependency evidence, and current handoff state.
- Pack and validate the candidate only in disposable local paths; never upload it.
- Commit, push once, and wait once for the three standard workflows on the exact candidate SHA.

## Out of scope

- NuGet publication, `release.yml` dispatch, tag creation/movement, GitHub Release creation/editing, provenance publication, version reuse, or immutable alpha4 mutation.
- Repository, security, collaborator, secret, variable, environment, branch-protection, or ruleset changes.
- SARIF/Code Scanning upload, workflow artifact upload, force push, history rewrite, or GA-readiness claims.
- Hosted RC dispatch; that single authorized action belongs to TASK-0240.

## Planned files

- `src/AgentContextKit.Cli/AgentContextKit.Cli.csproj`
- `CHANGELOG.md`
- `.github/workflows/cross-platform-source-smoke.yml`
- `.github/workflows/release-candidate-evidence.yml`
- workflow/static input scripts, tests, and exact predecessor fixture selected after inspection
- `docs/V100_RC1_RELEASE_PLAN.md`
- `docs/RELEASE_BODY_V100_RC1.md`
- release, RC, V100, package, dependency, documentation-index, queue, and handoff sources affected by current-candidate semantics
- this task file plus the fully planned TASK-0240 and TASK-0241 records

## Implementation sequence

1. Read the release, contract, workflow, script, package, V100, and handoff sources of truth and classify every current/historical version reference.
2. Update authoritative candidate metadata and current-source expectations without changing published install claims.
3. Add exact alpha4 predecessor configuration evidence and enforce it through the hosted workflow/static tests.
4. Add missing read-only hosted contract gates and enforce the no-upload/no-publish permission boundary.
5. Add the candidate plan, draft release body, changelog, dependency review, and sanitized local package evidence.
6. Run the complete local validation suite, Unicode temp guard, dependency checks, package/install smoke, and hygiene checks once.
7. Complete this task record, run mandatory pre-commit ACKit/scan checks, stage explicit files, and create `release: prepare AgentContextKit 1.0.0-rc.1 candidate`.
8. Protect against remote advance, push once, and wait for standard CI through the prescribed single blocking sequence.

## Data/database impact

None. The project has no application database or migration change in scope.

## Admin impact

None. No admin application surface exists or changes.

## Security impact

Positive validation hardening: exact predecessor compatibility and local/hosted contract gates are expanded. The workflow remains read-only, receives no secrets, performs no uploads, and cannot publish.

## Permission/auth impact

The workflow must retain `contents: read` only. A normal protected `master` push is authorized after local validation; no permission or authentication configuration changes are authorized.

## SEO/i18n impact

English/Turkish localization parity and language-independent JSON tokens are validated. Public README install/status wording must continue to identify `0.2.0-alpha.4` as published and `1.0.0-rc.1` only as a prepared source candidate.

## UX impact

CLI behavior is frozen; only the reported source/package version changes. No command, option, exit, generated-file, config, JSON, or SARIF behavior change is intended.

## Logging/audit impact

Record only sanitized command results, public workflow IDs/URLs, hashes, counts, timings, and memory values. Do not retain candidate packages, temp paths, secrets, or generated `.ackit/` output in Git.

## Release impact

Selects and prepares `1.0.0-rc.1` with predecessor `0.2.0-alpha.4`. Publication remains prohibited throughout TASK-0239 through TASK-0241 and requires separate TASK-0242 authorization.

## Acceptance criteria

1. Every authoritative current source/package field reports `1.0.0-rc.1`; historical and published-alpha4 statements remain accurate.
2. Candidate/predecessor inputs are `1.0.0-rc.1` / `0.2.0-alpha.4`, and exact predecessor config compatibility is tested.
3. Hosted workflow directly executes the required read-only CLI/config/JSON/localization gates and static tests enforce them.
4. Changelog, RC plan, draft release body, dependency review, and package evidence are complete and truthful.
5. Candidate nupkg/snupkg metadata, contents, isolated install, version/help, scan/config/SARIF, and upgrade flow pass locally with no upload.
6. ACKit, restore/build/test, contract/readiness/localization/performance/Markdown/Unicode/hygiene checks pass; no `.ackit/` file is tracked.
7. One candidate commit is pushed once, and `ci`, `cross-platform-smoke`, and `cross-platform-source-smoke` succeed for its exact SHA.
8. No publication, release, tag, upload, settings, or provenance action occurs.

## Validation commands

Use the exact TASK-0239 command set in the controlling objective, adapting only to real script parameters discovered from source. Long-running commands run once; dependency review output and all actual results are recorded.

## Risks

- Historical alpha4 references could be incorrectly rewritten. Mitigation: classify matches by current/published/historical semantics before editing.
- Hosted evidence could use an inexact predecessor fixture. Mitigation: produce or add a sanitized exact-alpha4 fixture and assert the workflow path.
- Post-validation candidate changes could stale evidence. Mitigation: candidate SHA is captured after the complete commit and becomes immutable for TASK-0240.
- Network dependency review may fail. Mitigation: record the exact source failure and treat unresolved vulnerability evidence as a release blocker.

## Rollback plan

Before push, correct or normally revert the local candidate commit. After push, use a new corrective commit and new candidate SHA/evidence; never rewrite history, reuse the stale SHA, move tags, or republish a version.

## Completion-state requirements

- Exact candidate SHA, local validation counts, dependency/package evidence, push count, and three standard CI run IDs are recorded.
- TASK-0240 becomes current only after exact candidate standard CI is green.
- Publication remains explicitly unauthorized.

## Completion notes

Local preparation completed on 2026-07-10:

- authoritative source/package/runtime and source-package smoke fields report `1.0.0-rc.1`; public install guidance remains `0.2.0-alpha.4`
- exact predecessor `0.2.0-alpha.4` generated-config fixture/regeneration and read-only hosted contract gates are implemented and statically tested
- dependency vulnerability and deprecation reviews completed with available sources and no vulnerable or deprecated package reported
- Release restore/build/test passed with 0 warnings, 0 errors, and 431/431 tests; the Windows Unicode temp guard remained 0 before and after
- disposable nupkg/snupkg metadata, contents, symbols, hygiene, isolated install/help/version, and alpha4-to-RC config/hash/baseline/SARIF/final-scan checks passed; disposable artifacts were removed
- all V100, documentation/release, CLI, config, JSON, localization, security/supply-chain, RC-local-readiness, workflow, and input gates passed
- the RC readiness benchmark passed at 5.691 seconds and 45.1 MiB; the independent 2,000-file mixed benchmark passed at 4.193 seconds and 44.6 MiB against 30-second/512-MiB thresholds
- the local Markdown audit checked 428 files and 231 local targets with zero broken targets

The exact candidate SHA, one push, and its three standard CI run IDs are recorded by TASK-0240 after the immutable TASK-0239 commit passes hosted standard CI. Publication remains unauthorized.
