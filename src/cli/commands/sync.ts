import process from "node:process";
import {
  MANAGED_SYNC_SCHEMA_VERSION,
  type ManagedSyncRow,
  planOrApplyManagedSync,
} from "../../core/onboarding/sync.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { InstructionsCommandOptions } from "../context.js";
import { resolveCliRoot } from "../root.js";

export type SyncCommandOptions = Omit<InstructionsCommandOptions, "provider" | "forPath"> & {
  dryRun: boolean;
  check: boolean;
  force: boolean;
};

/**
 * `ackit sync` (TASK-0072): unified, version-aware reconciliation of all
 * ACKit-owned managed assets (AGENTS.md block, CLAUDE/GEMINI/Copilot shims,
 * builtin skills). Preview-first, content-driven: never rewrites files merely
 * because the package version changed.
 *
 * Modes: default applies; `--dry-run` previews (would-* statuses, exit 0);
 * `--check` is a read-only CI gate (exit 1 when anything is out of sync or
 * blocked); `--force` discards user modifications on OWNED skills only.
 * Refusals/conflicts in apply mode exit 4 (security boundary) consistent
 * with `ackit init` and `ackit skills install` conventions.
 */
export async function runSyncCommand(options: SyncCommandOptions): Promise<ExitCodeValue> {
  if (options.dryRun && options.check) {
    emitDiagnostic(
      { code: "usage-error", message: "--dry-run and --check are mutually exclusive" },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.usage;
  }

  const rootResolution = await resolveCliRoot(options.root);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.environment;
  }

  const result = await planOrApplyManagedSync(rootResolution.root, {
    dryRun: options.dryRun,
    check: options.check,
    force: options.force,
  });

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: MANAGED_SYNC_SCHEMA_VERSION,
          tool: "ackit",
          command: "sync",
          mode: result.mode,
          inSync: result.inSync,
          blocked: result.blocked,
          rows: result.rows,
        },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    const label =
      result.mode === "dry-run"
        ? "Managed-asset sync plan (dry-run):"
        : result.mode === "check"
          ? "Managed-asset sync check:"
          : "Managed-asset sync results:";
    process.stdout.write(`${label}\n`);
    for (const row of result.rows) {
      process.stdout.write(`  [${row.status}] ${row.path} — ${row.detail}\n`);
    }
    if (result.mode === "check") {
      process.stdout.write(
        result.inSync
          ? "all ACKit-owned managed assets up-to-date\n"
          : "managed assets out-of-sync or blocked (run 'ackit sync --dry-run' for the plan)\n",
      );
    }
  }

  // Emit ownership-safety diagnostics for refusals/conflicts in every mode
  // so CI logs carry the reason even in --json/--quiet runs.
  for (const row of blockedRows(result.rows)) {
    emitDiagnostic(
      { code: "ownership-conflict", message: `${row.path}: ${row.detail}` },
      { quiet: options.quiet, debug: options.debug },
    );
  }

  if (result.mode === "check") {
    return result.inSync ? EXIT_CODES.ok : EXIT_CODES.thresholdExceeded;
  }
  if (result.mode === "dry-run") {
    return EXIT_CODES.ok;
  }
  // apply: refusals/conflicts are security-boundary exits (like init/skills).
  return result.blocked ? EXIT_CODES.securityBoundary : EXIT_CODES.ok;
}

function blockedRows(rows: ManagedSyncRow[]): ManagedSyncRow[] {
  return rows.filter(
    (row) =>
      row.status === "refused-non-managed" ||
      row.status === "refused-third-party" ||
      row.status === "conflict-user-modified",
  );
}
