import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { getPackageIdentity } from "../../shared/version.js";
import type { GlobalOptions } from "../context.js";
import { SUMMARY_SCHEMA_VERSION } from "../context.js";
import { toRepoRelative } from "../root.js";

/**
 * Bare `ackit` repository health summary (REQ-DX-002).
 * Deterministic output; JSON mode keeps stdout pure machine-readable.
 */
export function runSummary(options: GlobalOptions): void {
  const identity = getPackageIdentity();
  const rootPath = path.resolve(options.root ?? process.cwd());

  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
  const hasGitRepo = existsSync(path.join(rootPath, ".git"));
  checks.push({
    name: "git",
    ok: hasGitRepo,
    detail: hasGitRepo ? "repository detected" : "no .git directory",
  });

  let configOk = false;
  let configDetail = "defaults";
  try {
    const configPath = path.join(rootPath, options.config ?? "ackit.yml");
    if (existsSync(configPath)) {
      configOk = true;
      configDetail = "ackit.yml present";
    } else if (options.config !== undefined) {
      configOk = false;
      configDetail = `explicit config not found: ${options.config}`;
    } else {
      configOk = true;
      configDetail = "defaults (no ackit.yml)";
    }
    checks.push({ name: "config", ok: configOk, detail: configDetail });
  } catch {
    checks.push({ name: "config", ok: false, detail: "error" });
  }

  const tasksDir = path.join(rootPath, "docs", "tasks");
  const hasTasks = existsSync(tasksDir);
  checks.push({
    name: "tasks",
    ok: hasTasks,
    detail: hasTasks ? "docs/tasks present" : "docs/tasks missing",
  });

  const skillsDir = path.join(rootPath, ".agents", "skills");
  const hasSkills = existsSync(skillsDir);
  checks.push({
    name: "skills",
    ok: true,
    detail: hasSkills ? ".agents/skills present" : "no skills directory",
  });

  const allOk = checks.every((check) => check.ok);

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: SUMMARY_SCHEMA_VERSION,
          tool: "ackit",
          version: identity.version,
          status: allOk ? "ok" : "issues",
          root: toRepoRelative(rootPath, rootPath),
          checks,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }
  const lines = [`ackit ${identity.version} — repository health`, ""];
  for (const check of checks) {
    lines.push(`  ${check.ok ? "✓" : "✗"} ${check.name}: ${check.detail}`);
  }
  lines.push(
    "",
    allOk ? "All checks passed." : `${checks.filter((c) => !c.ok).length} check(s) failed.`,
  );
  process.stdout.write(`${lines.join("\n")}\n`);
}
