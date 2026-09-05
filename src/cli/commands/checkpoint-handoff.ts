import { promises as fsp } from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  buildHandoff,
  HandoffError,
  parseHandoffFile,
  validateHandoff,
} from "../../core/checkpoint/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CheckpointCommandBase, CheckpointStores } from "./checkpoint.js";

/**
 * Handoff export/import handlers (TASK-0082): split from checkpoint.ts to
 * honor the CLI module size contract (REQ-ARCH-008, <500 lines/module).
 * Behavior lives here; checkpoint.ts only dispatches.
 */

/**
 * Resolve a repository-relative file argument with traversal/absolute
 * containment (THREAT_MODEL T19): returns null (never sanitizes) when the
 * argument escapes the repository root. Shared by handoff export/import.
 */
export function resolveContainedPath(rootPath: string, arg: string): string | null {
  const normalized = arg.split("\\").join("/");
  const escapes =
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").some((segment) => segment === "..");
  const resolved = path.resolve(rootPath, normalized);
  if (escapes || !resolved.startsWith(rootPath)) return null;
  return resolved;
}

function emitJson(command: string, payload: Record<string, unknown>): void {
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: "ackit.checkpoint-report.v1",
        tool: "ackit",
        command: `checkpoint ${command}`,
        ...payload,
      },
      null,
      2,
    )}\n`,
  );
}

/**
 * `checkpoint export --format json`: machine-readable bound handoff
 * (TASK-0082) — verification digests, staleness, the status next-action
 * contract, redaction manifest, and provider-neutral instructions around
 * the v1 pack.
 */
export async function runHandoffExport(
  base: CheckpointCommandBase,
  stores: CheckpointStores,
  args: { taskId: string; out?: string | undefined },
): Promise<ExitCodeValue> {
  const { rootPath } = stores;
  const built = await buildHandoff(rootPath, args.taskId);
  if (!built.ok) {
    emitDiagnostic(
      { code: "checkpoint-error", message: built.diagnostic.message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
  if (args.out !== undefined) {
    const outPath = resolveContainedPath(rootPath, args.out);
    if (outPath === null) {
      emitDiagnostic(
        { code: "checkpoint-error", message: "export path escapes repository root" },
        { quiet: base.quiet, debug: base.debug ?? false },
      );
      return EXIT_CODES.securityBoundary;
    }
    await fsp.mkdir(path.dirname(outPath), { recursive: true });
    await fsp.writeFile(outPath, built.handoff.json, "utf8");
    if (!base.quiet) process.stdout.write(`handoff written to ${args.out}\n`);
    return EXIT_CODES.ok;
  }
  process.stdout.write(built.handoff.json);
  return EXIT_CODES.ok;
}

/**
 * `checkpoint import <file>`: read-only by construction — validates the
 * handoff against CURRENT disk state and renders its resume context, or
 * refuses with a stable code. Never mutates
 * task/workflow/evidence/verdict/ledger state (no autonomy gate needed —
 * like show/validate).
 */
export async function runHandoffImport(
  base: CheckpointCommandBase,
  stores: CheckpointStores,
  args: { handoffFile: string },
): Promise<ExitCodeValue> {
  const { rootPath } = stores;
  const handoffArg = args.handoffFile;
  if (handoffArg.length === 0) {
    emitDiagnostic(
      { code: "usage-error", message: "checkpoint import requires <file>" },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
  const handoffPath = resolveContainedPath(rootPath, handoffArg);
  if (handoffPath === null) {
    emitDiagnostic(
      { code: "checkpoint-error", message: "handoff file path escapes repository root" },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.securityBoundary;
  }
  let content: string;
  try {
    content = await fsp.readFile(handoffPath, "utf8");
  } catch {
    emitDiagnostic(
      { code: "checkpoint-error", message: `handoff file '${handoffArg}' not found` },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
  let parsed: ReturnType<typeof parseHandoffFile>;
  try {
    parsed = parseHandoffFile(content);
  } catch (error) {
    const code = error instanceof HandoffError ? error.code.toLowerCase() : "handoff-invalid";
    emitDiagnostic(
      { code, message: (error as Error).message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
  try {
    const validated = await validateHandoff(rootPath, parsed);
    if (base.json) {
      emitJson("import", {
        task: validated.handoff.task.id,
        checkpoint: validated.handoff.checkpoint.id,
        fresh: true,
        stateDigest: validated.handoff.verification.stateDigest,
        bundleDigest: validated.handoff.verification.bundleDigest,
        resume: validated.resume,
      });
    } else if (!base.quiet) {
      process.stdout.write(
        `${validated.handoff.task.id}: handoff ${validated.handoff.checkpoint.id} fresh (bundle ${validated.handoff.verification.bundleDigest.slice(0, 12)})\n\n${validated.resume}`,
      );
    }
    return EXIT_CODES.ok;
  } catch (error) {
    const code = error instanceof HandoffError ? error.code.toLowerCase() : "handoff-invalid";
    emitDiagnostic(
      { code, message: (error as Error).message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    // Stale handoffs refuse like `checkpoint validate` (exit 1);
    // shape/version/task errors are usage errors (exit 2).
    return code === "verdict-state-stale" || code === "stale-checkpoint"
      ? EXIT_CODES.thresholdExceeded
      : EXIT_CODES.usage;
  }
}
