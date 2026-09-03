import { promises as fsp } from "node:fs";
import path from "node:path";
import type { RepositoryRoot } from "../filesystem/root.js";
import { checksumContent } from "../instructions/references.js";
import {
  discoverBuiltinSkills,
  type InstallOutcome,
  installSkills,
  readSkillsLock,
} from "../skills/install.js";
import { type InstructionSurfacePlan, planInstructionSurfaces } from "./init.js";

/**
 * Managed-asset sync engine (TASK-0072).
 *
 * Unified, version-aware, preview-first reconciliation of ALL ACKit-owned
 * managed assets in one pass:
 *   - the managed instruction block in `AGENTS.md`
 *   - provider shims `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`
 *   - builtin skills under `.agents/skills/`
 *
 * Reuses — never duplicates — the existing ownership engines:
 *   - instruction surfaces via `planInstructionSurfaces` (managed-block
 *     markers; user bytes outside blocks preserved; user files without an
 *     ACKit block refused),
 *   - skills via `installSkills` (skills.lock.json ownership; checksum-driven
 *     decisions; conflict on user-modified owned skills unless force; third-
 *     party names always refused).
 *
 * Content-driven by construction (rule H): both engines decide by content /
 * checksum, never by the ACKit version string. A package upgrade with
 * unchanged canonical content produces only `up-to-date` rows and ZERO file
 * writes. Sync NEVER runs from package installation or CLI startup; it is an
 * explicit, state-changing command (dry-run/check modes are read-only).
 */

export const MANAGED_SYNC_SCHEMA_VERSION = 1;

/** Machine-readable schema identifier for sync JSON output (ackit.*.v1 convention, e.g. ackit.doctor.v1). */
export const MANAGED_SYNC_SCHEMA_ID = "ackit.managed-sync.v1";

/** Stable status vocabulary (TASK-0072 contract). */
export type ManagedSyncStatus =
  | "up-to-date"
  | "would-create"
  | "would-update-managed"
  | "updated-managed"
  | "installed"
  | "updated"
  | "conflict-user-modified"
  | "refused-non-managed"
  | "refused-third-party";

export interface ManagedSyncRow {
  /** Asset kind: instruction surface (managed block) or builtin skill. */
  kind: "instruction" | "skill";
  /** Repository-relative destination path (POSIX; never absolute). */
  path: string;
  /** Instruction provider for kind=instruction; null for skills. */
  provider: string | null;
  status: ManagedSyncStatus;
  detail: string;
}

export interface ManagedSyncResult {
  rows: ManagedSyncRow[];
  /** True when no writes were performed (dry-run/check — or nothing to do). */
  readOnly: boolean;
  /** Mode this result was produced under. */
  mode: "dry-run" | "check" | "apply";
  /** True when every ACKit-owned managed asset already matches canonical content. */
  inSync: boolean;
  /** True when at least one row is a refusal/conflict (ownership safety tripped). */
  blocked: boolean;
}

export interface ManagedSyncOptions {
  /** Preview only: zero writes, would-* statuses, exit-neutral. */
  dryRun?: boolean | undefined;
  /** Read-only CI gate: zero writes; inSync=false when any pending, conflict, or refusal. */
  check?: boolean | undefined;
  /** Discard user modifications on OWNED skills (third-party still refused). */
  force?: boolean | undefined;
  /** Test seam: override builtin template discovery. */
  builtinsDir?: string | undefined;
  /** Test seam: override the recorded ACKit version (rule-H simulation). */
  version?: string | undefined;
}

const BLOCKING_STATUSES: ReadonlySet<ManagedSyncStatus> = new Set([
  "conflict-user-modified",
  "refused-non-managed",
  "refused-third-party",
]);

const PENDING_STATUSES: ReadonlySet<ManagedSyncStatus> = new Set([
  "would-create",
  "would-update-managed",
]);

function instructionRow(surface: InstructionSurfacePlan, preview: boolean): ManagedSyncRow {
  // Map the init-engine vocabulary onto the sync vocabulary. `preview` marks
  // read-only modes (dry-run/check) where writes become would-* statuses.
  let status: ManagedSyncStatus;
  switch (surface.action) {
    case "refused-non-managed":
      status = "refused-non-managed";
      break;
    case "created":
      status = preview ? "would-create" : "installed";
      break;
    case "unchanged":
      status = "up-to-date";
      break;
    default:
      // updated-managed / repaired → managed-block content work.
      status = preview ? "would-update-managed" : "updated-managed";
      break;
  }
  return {
    kind: "instruction",
    path: surface.relativeFile,
    provider: surface.provider,
    status,
    detail: surface.detail,
  };
}

function skillRow(outcome: InstallOutcome): ManagedSyncRow {
  // `installSkills` statuses map 1:1 onto the sync vocabulary; "reinstalled"
  // (not emitted by the current engine) is defensively folded into "updated".
  let status: ManagedSyncStatus;
  switch (outcome.status) {
    case "installed":
      status = "installed";
      break;
    case "up-to-date":
      status = "up-to-date";
      break;
    case "conflict-user-modified":
      status = "conflict-user-modified";
      break;
    case "refused-third-party":
      status = "refused-third-party";
      break;
    default:
      // updated / reinstalled → content refreshed from builtin.
      status = "updated";
      break;
  }
  return {
    kind: "skill",
    path: `.agents/skills/${outcome.skill}`,
    provider: null,
    status,
    detail: outcome.message,
  };
}

/**
 * Plan (dry-run/check) or apply the reconciliation across all managed
 * surfaces. Modes:
 * - "dry-run": pure preview — zero writes, would-* statuses, informational.
 * - "check": read-only CI gate — zero writes; inSync=false when any pending
 *   work, conflict, or refusal exists.
 * - "apply" (default): writes through the existing engines.
 */
export async function planOrApplyManagedSync(
  root: RepositoryRoot,
  options: ManagedSyncOptions = {},
): Promise<ManagedSyncResult> {
  const dryRun = options.dryRun === true;
  const check = options.check === true;
  const apply = !dryRun && !check;
  const mode: ManagedSyncResult["mode"] = dryRun ? "dry-run" : check ? "check" : "apply";

  const rows: ManagedSyncRow[] = [];

  // --- Instruction surfaces (planning is always read-only) ---
  const surfaces = await planInstructionSurfaces(root, { agents: undefined });
  for (const surface of surfaces) {
    rows.push(instructionRow(surface, !apply));
    if (
      apply &&
      surface.result.action !== "unchanged" &&
      surface.action !== "refused-non-managed"
    ) {
      await fsp.mkdir(path.dirname(surface.absolute), { recursive: true });
      await fsp.writeFile(surface.absolute, surface.result.output, "utf8");
    }
  }

  // --- Skills ---
  if (apply) {
    const outcomes = await installSkills(root, {
      force: options.force,
      builtinsDir: options.builtinsDir,
      version: options.version,
    });
    for (const outcome of outcomes) rows.push(skillRow(outcome));
  } else {
    // Read-only skills assessment: derive pending/up-to-date/conflict/refusal
    // from the same checksum/lock comparison the write path uses, WITHOUT any
    // lock write (installSkills persists the lock; read-only modes must not).
    rows.push(...(await planSkillsReadOnly(root, options)));
  }

  const blocked = rows.some((row) => BLOCKING_STATUSES.has(row.status));
  const pending = rows.some((row) => PENDING_STATUSES.has(row.status));
  const inSync = !pending && !blocked;

  return { rows, readOnly: !apply, mode, inSync, blocked };
}

/**
 * Read-only skills decision table mirroring `installSkills` semantics exactly
 * (checksum vs builtin, lock ownership, user-modified detection) without any
 * lock write. The write path remains the single source of truth for writes.
 */
async function planSkillsReadOnly(
  root: RepositoryRoot,
  options: ManagedSyncOptions,
): Promise<ManagedSyncRow[]> {
  const lock = await readSkillsLock(root);
  const { skills } = await discoverBuiltinSkills(options.builtinsDir);
  const rows: ManagedSyncRow[] = [];

  for (const skill of skills) {
    const skillMd = path.join(root.canonicalPath, ".agents", "skills", skill.name, "SKILL.md");
    let existing: string | null = null;
    try {
      existing = await fsp.readFile(skillMd, "utf8");
    } catch {
      existing = null;
    }

    if (existing === null) {
      rows.push({
        kind: "skill",
        path: `.agents/skills/${skill.name}`,
        provider: null,
        status: "would-create",
        detail: "builtin skill missing; would install on apply",
      });
      continue;
    }

    const sourceChecksum = checksumContent(
      await fsp.readFile(path.join(skill.sourceDir, "SKILL.md")),
    );
    const targetChecksum = checksumContent(existing);

    if (targetChecksum === sourceChecksum) {
      rows.push({
        kind: "skill",
        path: `.agents/skills/${skill.name}`,
        provider: null,
        status: "up-to-date",
        detail: "already matches builtin",
      });
      continue;
    }

    const lockedEntry = lock.skills.find((entry) => entry.name === skill.name);
    if (lockedEntry === undefined) {
      rows.push({
        kind: "skill",
        path: `.agents/skills/${skill.name}`,
        provider: null,
        status: "refused-third-party",
        detail:
          "a non-owned skill with this name exists; ACKit never overwrites third-party skills (rename it or remove it first)",
      });
      continue;
    }

    const userModified = targetChecksum !== lockedEntry.checksum;
    rows.push({
      kind: "skill",
      path: `.agents/skills/${skill.name}`,
      provider: null,
      status: userModified ? "conflict-user-modified" : "would-update-managed",
      detail: userModified
        ? "owned skill was modified locally; re-run with --force to discard local edits or keep them"
        : "owned skill unchanged locally; would update from builtin",
    });
  }
  return rows;
}
