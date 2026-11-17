---
id: "TASK-0098"
title: "Action threshold and self-contained source distribution"
status: pending
schemaVersion: 2
dependencies:
  []
createdAt: "2026-11-17"
completedAt: null
---


## Purpose

Restore reliable Action threshold enforcement and make a clean tag consumable
without pre-existing ignored build output. User authorized this repository audit,
local changes, tests, commits, branch pushes and PRs on 2026-11-17.

## Scope

- Confirmed: the tracked handwritten `dist/action/index.js` overwrites a threshold
  failure with CLI status 0. No Action TypeScript source exists, and the referenced
  CLI/runtime dependencies are absent from Git tags.
- Move the owning runtime to strict TypeScript; preserve the existing inputs,
  outputs, read-only status/drift projection, annotations and optional SARIF.
- Use a source-built composite bootstrap under ADR-0034: pinned Node/pnpm actions,
  frozen dependency install and build in the action checkout, then offline CLI
  execution against the consumer. Do not commit generated `dist`.
- Preserve nonzero CLI errors, ignore policy-suppressed findings when applying the
  Action threshold, reject invalid threshold/input syntax, and bound child execution.

## Out of scope

- Changing CLI/SDK contracts, release ordering, telemetry, automatic SARIF upload,
  unrelated architecture, legacy .NET artifacts or credentials.

## Affected files

- `action.yml`, `src/action/**`, tracked legacy Action entry, Action contracts,
  projection tests, offline gates, `.github/workflows/ackit-action-dogfood.yml`,
  `docs/guides/ci.md`, ADR-0034 and decision index.

## Dependencies

None. Successor TASK-0099 starts after local acceptance is verified and committed.

## Required tests

- Focused Action behavior/security/consumer tests; projection and composition
  parity; `pnpm lint`, `format:check`, `typecheck`, `build`, `test`;
  offline-egress, ACKit doctor/task doctor/scan and `git diff --check`.

## Acceptance criteria

- [ ] Threshold breach fails; below-threshold and suppressed findings pass;
  CLI nonzero/invalid input/timeout errors remain failures.
- [ ] Optional SARIF is canonical 2.1.0 with actual package identity and valid
  relative locations; outputs exist only when their files exist.
- [ ] Clean exported Action source installs/builds separately from an unrelated
  consumer fixture and scans it without consumer dependencies or build output.
- [ ] Dogfood exercises the bootstrap without a preparatory build; focused and
  affected full tests plus quality/offline/ACKit checks pass.

## Test steps

1. Reproduce old exit-code overwrite and missing clean-tag runtime from inspected
   source; record the exact change and regression results.
2. Exercise real CLI scan on clean/breaching/suppressed fixtures and a CLI usage
   failure. Validate SARIF shape and injection-safe argv handling.
3. Export tracked/planned source into an isolated action checkout, frozen-install
   and build it, execute from a separate Git fixture, then run affected full gates.

## Security considerations

Bootstrap dependency download is a workflow setup operation, not product egress.
Only trusted Action source and frozen lockfile may build; never execute consumer
scripts. Inputs cross through environment variables and argv, never shell code.
No secrets, permission changes, data migrations or production operations.

## Risks

- Bootstrap needs registry connectivity and adds setup cost. Document it; runtime
  remains offline. Preserve existing public Action behavior and canonical outputs.

## Rollback plan

Forward corrective PR for the focused commits; immutable tags remain untouched.
No reset, rebase, force push or release mutation is authorized.

## Completion notes

Plan allocated by repository CLI on 2026-11-17. Implementation and evidence pending.
