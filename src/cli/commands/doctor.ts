import path from "node:path";
import process from "node:process";
import { loadAckitConfig } from "../../core/config/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { validateSkills } from "../../core/skills/index.js";
import { TaskStore } from "../../core/tasks/index.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { InstructionsCommandOptions } from "../context.js";
import { writeJson } from "../output.js";

/** `ackit doctor` (REQ-DX-002): comprehensive health check across subsystems. */
export async function runDoctorCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath"> & { ci: boolean },
): Promise<ExitCodeValue> {
  const rootPath = path.resolve(options.root ?? process.cwd());
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  const configResult = await loadAckitConfig(rootPath, { configPath: options.config });
  checks.push({
    name: "config",
    ok: configResult.ok,
    detail: configResult.ok ? "valid" : configResult.errors.map((e) => e.code).join(", "),
  });

  try {
    const store = new TaskStore(rootPath);
    const report = await store.doctor();
    checks.push({
      name: "tasks",
      ok: report.ok,
      detail: report.ok ? "integrity OK" : `${report.problems.length} problem(s)`,
    });
    // Plan-first machine check (ADR-0025 §6): advisory diagnostics only —
    // surfaced by doctor, never a hard failure (git-unavailable tolerant).
    const planFirst = await store.planFirstDiagnostics();
    for (const diagnostic of planFirst) {
      process.stderr.write(`[ackit] ${diagnostic.code}: ${diagnostic.message}\n`);
    }
  } catch (error) {
    checks.push({ name: "tasks", ok: false, detail: (error as Error).message });
  }

  const rootResolution = await resolveRepositoryRoot(rootPath);
  if (rootResolution.ok) {
    const skills = await validateSkills(rootResolution.root);
    const strictIssues = skills.issues.filter((issue) => issue.tier === "strict");
    checks.push({
      name: "skills",
      ok: strictIssues.length === 0,
      detail:
        strictIssues.length === 0
          ? `${skills.skills.length} skill(s) OK`
          : `${strictIssues.length} strict issue(s)`,
    });

    // Managed assets (TASK-0072): READ-ONLY staleness report over the
    // instruction blocks + builtin skills. Doctor NEVER writes; this row is
    // advisory (never a hard failure) — explicit gating lives in
    // `ackit sync --check`.
    try {
      const { planOrApplyManagedSync } = await import("../../core/onboarding/sync.js");
      const sync = await planOrApplyManagedSync(rootResolution.root, { check: true });
      const conflicts = sync.rows.filter(
        (row) =>
          row.status === "conflict-user-modified" ||
          row.status === "refused-non-managed" ||
          row.status === "refused-third-party",
      );
      const detail = sync.inSync
        ? "up-to-date"
        : conflicts.length > 0
          ? `conflict-user-modified (${conflicts.length} asset(s))`
          : "updates available";
      checks.push({ name: "managed assets", ok: true, detail });
    } catch (error) {
      checks.push({
        name: "managed assets",
        ok: true,
        detail: `unavailable: ${(error as Error).message}`,
      });
    }
  } else {
    checks.push({ name: "skills", ok: false, detail: rootResolution.diagnostic.message });
  }

  const allOk = checks.every((check) => check.ok);

  if (options.json) {
    writeJson({
      schemaVersion: "ackit.doctor.v1",
      tool: "ackit",
      command: "doctor",
      ok: allOk,
      checks,
    });
  } else if (!options.quiet) {
    for (const check of checks) {
      process.stdout.write(`  ${check.ok ? "✓" : "✗"} ${check.name}: ${check.detail}\n`);
    }
    process.stdout.write(
      allOk
        ? "\nAll doctor checks passed.\n"
        : `\n${checks.filter((c) => !c.ok).length} check(s) failed.\n`,
    );
  }
  return allOk || !options.ci ? EXIT_CODES.ok : EXIT_CODES.thresholdExceeded;
}
