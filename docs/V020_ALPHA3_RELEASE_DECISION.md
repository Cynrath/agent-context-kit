# v0.2.0-alpha.3 Release Decision

Decision date: 2026-06-14. Decision owner: `Cynrath`.

## Decision
**NO-GO for preparation and publication.**

`0.2.0-alpha.3` is the selected planning version, but no exact candidate commit has been prepared and source/package metadata remains `0.2.0-alpha.2`.

## Verified Inputs
- TASK-0126 immutable alpha.2 recovery verification is green in run `27478046088`.
- TASK-0128 hosted RC evidence is green on Windows, Ubuntu, and macOS in run `27478635057` for reviewed alpha.2 source state.
- TASK-0129 private vulnerability reporting is enabled and independently verified.
- TASK-0130 records `Cynrath` as primary security triage/recovery decision owner and documents immutable successor recovery.
- TASK-0131 records the bounded `Cyranth` NuGet owner / `Cynrath` project persona disposition.
- TASK-0132 records bounded author-signing/SBOM deferrals and implements future exact-release-asset provenance.
- TASK-0132 commit `46be43f` passed the standard 8/8 hosted jobs.
- TASK-0133 planning commit `eabbe6a` passed the standard 8/8 hosted jobs: `27496554495`, `27496554487`, and `27496554492`.
- Local validation passes 186/186 tests, clean scan, doctor, sample smoke, package verification, contract/readiness/security gates, and the 2,000-file performance tripwire.

## Blocking Conditions
1. `RB-003`: an independent backup security notification owner is unassigned. This P0 continuity requirement has no unowned accepted-risk alternative. Closure requires a second verified human owner or role, a non-secret coverage path, notification coverage evidence, and a review date in the blocker board and ownership docs.
2. `RB-008`: destructive NuGet unlist/deprecate/account-recovery authority and backup recovery coverage are not verified. Closure requires maintainer-verifiable NuGet recovery authority, backup recovery ownership, trigger/unlist/deprecate/successor steps, and either non-destructive verification evidence or an explicitly bounded accepted-risk decision.
3. No exact alpha.3 candidate commit, versioned package diff, or candidate-specific hosted RC evidence exists because preparation cannot start before the P0 blocker closes.
4. Future provenance is implemented locally but can only be verified during an authorized successful publish; it does not replace pre-publish approval.

## TASK-0198 Evidence Check

TASK-0198 rechecked repository-local evidence for `RB-003` and `RB-008` on 2026-06-20. The check found no new maintainer evidence that closes either blocker:

- `docs/SECURITY_NOTIFICATION_OWNERSHIP.md` still records `Cynrath` as primary, backup security triage owner as not assigned, and notification delivery as unverified.
- `docs/PACKAGE_RECOVERY.md` still records the recovery procedure/tabletop as accepted, but NuGet unlist/deprecate/account-recovery authority and backup recovery owner as unverified.
- This investigation does not authorize a version bump, release-candidate workflow dispatch, release workflow dispatch, tag, GitHub Release, NuGet publish, owner mutation, security-setting change, or destructive NuGet action.

## Actions Not Performed
- no source/package version bump;
- no README or published-package workflow version change;
- no release-candidate workflow dispatch for alpha.3;
- no release workflow dispatch;
- no NuGet login or publish;
- no tag or GitHub Release creation;
- no existing tag/package mutation.

## Resume Conditions
After an independent backup owner and recovery authority/backup evidence are recorded:
1. recheck all bounded decisions and dependencies;
2. change metadata to `0.2.0-alpha.3` in a dedicated preparation commit;
3. pack, inspect, and install-smoke the exact package;
4. obtain standard 8/8 and dedicated three-OS RC evidence for that exact commit;
5. record exact-version/exact-commit GO;
6. publish through the OIDC-only release workflow.

Immutable release rules remain in force: never reuse a NuGet version, move an existing tag, force push, or replace published artifacts.
