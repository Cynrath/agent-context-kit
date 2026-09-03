# Plan: Managed-Asset Lifecycle Sync (TASK-0072, INTENT-0002)

Implementation plan for the unified, version-aware managed-asset sync
command. Plan-first per ADR-0025 §6 and AGENTS.md Rule 3. The full task
contract (purpose/scope/acceptance/tests/risks/rollback) lives in
`docs/tasks/active/TASK-0072-managed-asset-lifecycle-unified-version-aware-sy.md`;
this plan records the concrete build order.

## Inputs

- Audit conclusion (2026-09-02): all primitive ownership behaviors already
  exist and are tested (managed-block engine, skills lock/conflict/refusal,
  packaged template discovery, no postinstall). The only gap is the unified
  orchestration layer.
- User session mandate: branch cleanup first (done), then audit-then-smallest-
  coherent-design for a managed-asset lifecycle; no silent postinstall
  mutation; one temporary branch; one PR; verification bundle + fresh
  verifier before merge.

## Build order

1. **Refactor, don't duplicate** — extract `planInstructionSurfaces` from
   `planOrApplyInit` (`src/core/onboarding/init.ts`) so instruction planning
   is a shared read-only pass; init keeps identical public behavior.
2. **Engine improvement for rule H** — `installSkills` lock write becomes
   material-change-gated (`upsertLockEntry` returns change; bare version
   differences never rewrite `.ackit/skills.lock.json`).
3. **Sync engine** — new `src/core/onboarding/sync.ts`
   (`planOrApplyManagedSync`): modes dry-run/check/apply; statuses
   `up-to-date | would-create | would-update-managed | updated-managed |
   installed | updated | conflict-user-modified | refused-non-managed |
   refused-third-party`; instruction rows via the shared planner, skill rows
   via `installSkills` (apply) or a read-only mirror of its checksum/lock
   comparison (dry-run/check).
4. **CLI** — `ackit sync [--dry-run] [--check] [--force]` with global options;
   mutually exclusive dry-run/check (usage exit 2); check exit 0/1; apply
   exit 0/4 on ownership blocks; JSON `ackit.managed-sync.v1`.
5. **Doctor** — read-only `managed assets` advisory row (up-to-date /
   updates available / conflict-user-modified); never writes; never hard-fails.
6. **Tests** — 19-scenario matrix (`tests/integration/onboarding/sync.test.ts`)
   + doctor read-only proofs (`tests/integration/doctor/managed-assets.test.ts`);
   no-write claims via full-tree checksum snapshots + mtime.
7. **Docs** — CLI reference sync row/options; agent-integration lifecycle
   section with the two mandated statements; getting-started tour line.

## Verification plan (before merge)

- Full gate matrix: lint, format:check, typecheck, build, test, gen:schemas
  idempotence, smoke:cli, smoke:package, offline-egress, doctor, task doctor,
  scan --ci, git diff --check.
- Sandbox dogfood on a temp fixture (never the real repo's human-authored
  instruction files): dry-run → apply → idempotent re-run → green check.
- Real-repo check: `ackit sync --check` must REFUSE the human-authored
  AGENTS.md/CLAUDE.md/copilot files (ownership proof, exit 1, no writes).
- Independent verification: `ackit verification bundle TASK-0072`, fresh
  subagent verifier, verdict registered via the real flow; blocking verdict
  ⇒ no merge.
- One PR to master; 12/12 required checks green on exact head; squash merge;
  branch deleted locally + remotely after merge.
