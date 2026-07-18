# TASK-0258: Build Week ACKit Optimize baseline and control

## Purpose

Establish the exact pre-Build-Week baseline, verified product gap, implementation sequence, evidence boundary, and authorization limits for ACKit Optimize before any production code changes.

## Current verified state and gap

- Baseline date: 2026-07-18 (Europe/Istanbul).
- Clean synchronized entry commit: `6998e269af4962bbe70a9cb4044727d25dc1a06d` on `master`, equal to `origin/master`.
- Published immutable foundation: `AgentContextKit 1.0.0-rc.1`; its package/tag commit remains `258918b33c3d1359aac967604ee524e8b66ddf02`.
- Installed `ackit version` and `ackit --version`: `AgentContextKit 1.0.0-rc.1`.
- Installed help has no `ackit optimize` entry. Core contains repository/risk scanning, report, SARIF, Web UI, localization, and safe file-generation primitives, but no instruction discovery, scope/inheritance model, instruction rule catalog, context-cost estimator, or optimization proposal service.
- `ackit scan` and `ackit scan --ci` both exited `0` over 626 files. Existing Medium/Low findings are historical/local-artifact review findings; no Critical or High finding exists.
- `ackit doctor` exited `0` with all 13 checks passing.
- `.ackit/config.yml` is absent, so default ignore/config behavior applies and `config-check` is not applicable.
- `dotnet restore AgentContextKit.sln` passed.
- Release build passed with 0 warnings and 0 errors.
- Full test baseline passed: 431 passed, 0 failed, 0 skipped.

The verified gap is a missing first-class, deterministic, local instruction-audit workflow. Existing RC1 functionality must remain backward compatible and must not be described as containing Build Week work.

## Scope

- Control TASK-0259 through TASK-0262 as one Build Week implementation chain.
- Record the Build Week commit boundary as baseline commit `6998e269af4962bbe70a9cb4044727d25dc1a06d` exclusive through final Build Week HEAD inclusive.
- Preserve an explicit change log mapping each Build Week commit to its task and verified capability.
- Authorize normal focused commits and `master` pushes after applicable local validation, as explicitly requested by the user.
- Monitor push-triggered hosted CI and correct repository-owned regressions with normal successor commits.
- Keep release publication, tag/release/asset mutation, workflow dispatch, package publication, force push, history rewrite, settings/secrets/permission mutation, and deployment outside this control.

## Out of scope

- Any mutation of NuGet `1.0.0-rc.1`, tag `v1.0.0-rc.1`, GitHub release `353913024`, its assets, attestations, or historical evidence.
- A `1.0.0` GA claim, new published version selection, NuGet publication, release creation, or deployment.
- Remote AI calls, telemetry, repository upload, automatic source-instruction rewrite, or implicit apply behavior.
- Rewriting or squashing pre-Build-Week history.

## Affected files

- `docs/tasks/TASK-0258-...md` through `TASK-0262-...md`
- `docs/PROJECT_EXECUTION_QUEUE.md`, `docs/NEXT_TASKS.md`
- `.codex/NEXT_STEPS.md`, `.codex/SESSION_HANDOFF.md`
- Production, test, fixture, schema, workflow-smoke, and public documentation files owned by TASK-0259 through TASK-0262

## Data/database impact

None. No application database, migration, persistent business data, or production data mutation.

## Security impact

The deterministic path remains local and offline. Findings and generated artifacts must avoid raw secret values and absolute machine paths. Output writes must be repository-relative, explicit, non-overwriting, and review-only. Critical/High ACKit scan findings block progress.

## Permission/auth impact

No runtime permission or authentication change. User authorization covers normal focused commits, normal `master` pushes, and read-only monitoring of push-triggered CI. It does not cover workflow dispatch, deployment, publication, releases, tags, secrets, settings, or destructive operations.

## Compatibility impact

The new command is additive. Existing command names, options, JSON v2 fields, exit semantics, RC1 release evidence, and default scanner behavior remain unchanged. Current-source documentation must explicitly state that the published RC1 package predates and does not contain ACKit Optimize.

## Localization impact

Public technical identifiers and machine-readable fields remain English and language-independent. Human console/help/error text receives EN/TR parity under existing localization gates.

## UX impact

Users gain an obvious `ackit optimize` review entry point, deterministic findings and metrics, multiple local formats, and an explicit non-destructive proposal boundary.

## Logging/audit impact

Record baseline commands/results, task/commit mapping, local test totals, generated demo evidence, hosted CI URLs/conclusions, final SHA/range, local/origin equality, and prohibited-action confirmations. Do not commit ordinary `.ackit/`, package, SARIF, HTML, or temporary outputs.

## Implementation plan

1. TASK-0259: Core domain, discovery, scope resolution, normalization, metrics, deterministic rule catalog, stable ordering/IDs, fixtures, and unit tests.
2. TASK-0260: CLI contract, console/JSON/Markdown/SARIF/offline HTML, exit semantics, localization, schemas/golden coverage, and source smoke integration.
3. TASK-0261: Explicit-path non-overwriting optimization proposal, source mapping, unresolved decisions, before/after metrics, synthetic demo repository, and regression tests.
4. TASK-0262: English public Build Week documentation, README EN/TR/NuGet boundary updates where applicable, changelog/project map/gallery/demo updates, final local gates, commits/pushes, and hosted CI evidence.

## Acceptance criteria

- Every implementation change is owned by TASK-0259 through TASK-0262 before code is edited.
- Baseline commit, commands, exact results, RC1 immutability boundary, and permissions are recorded.
- Planning is committed and pushed separately before feature implementation.
- Final evidence can compute an honest commit range beginning after `6998e269af4962bbe70a9cb4044727d25dc1a06d` without history rewriting.

## Test steps

- Re-run `git status --short --branch`, `git diff --check`, ACKit doctor/scan, and tracked-versus-untracked checks before the planning commit.
- Push normally and verify local HEAD equals `origin/master`.
- Verify push-triggered hosted workflows for the planning commit before implementation continues.

## Failure handling

Fix task/control documentation through normal successor commits. Stop if a new Critical/High scan finding, user-work conflict, missing authority, or immutable-release conflict is discovered.

## Risks

- Broad scope can blur evidence; mitigation is phase ownership and focused commits.
- Source documentation could accidentally imply RC1 contains Optimize; all public wording must keep the published/current-source boundary explicit.
- Generated demo/output files could pollute source; only reviewed synthetic fixtures/goldens are tracked, while ordinary outputs remain ignored.

## Rollback plan

Use normal successor commits to remove or correct Build Week planning records. Never reset, rebase, force-push, move tags, or alter immutable release evidence.

## Completion notes

Status: `IN PROGRESS / PLANNING BASELINE VERIFIED`.

Planning commit and hosted CI evidence will be recorded after the separate planning push.
