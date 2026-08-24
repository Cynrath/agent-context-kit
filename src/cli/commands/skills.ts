import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadAckitConfig } from "../../core/config/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { validateSkills } from "../../core/skills/index.js";
import { installSkills } from "../../core/skills/install.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { InstructionsCommandOptions } from "../context.js";
import { SKILLS_REPORT_SCHEMA_VERSION } from "../context.js";
import { resolveCliRoot } from "../root.js";
import { reportConfigErrors } from "./config.js";

type SkillsCommandOptions = Omit<InstructionsCommandOptions, "provider" | "forPath">;

async function loadValidatedSkills(
  options: SkillsCommandOptions,
): Promise<
  | { ok: true; result: Awaited<ReturnType<typeof validateSkills>> }
  | { ok: false; exitCode: ExitCodeValue }
> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const configResult = await loadAckitConfig(rootRequested, { configPath: options.config });
  if (!configResult.ok) {
    reportConfigErrors(configResult.errors, { quiet: options.quiet, debug: options.debug });
    return { ok: false, exitCode: EXIT_CODES.usage };
  }
  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.diagnostic.message },
      { quiet: options.quiet, debug: options.debug },
    );
    return { ok: false, exitCode: EXIT_CODES.environment };
  }
  const result = await validateSkills(rootResolution.root);
  return { ok: true, result };
}

/** `ackit skills validate`: 0 clean, 1 findings (strict or warning), 2 usage. */
export async function runSkillsValidateCommand(
  options: SkillsCommandOptions,
): Promise<ExitCodeValue> {
  const loaded = await loadValidatedSkills(options);
  if (!loaded.ok) return loaded.exitCode;
  const { skills, issues } = loaded.result;
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: SKILLS_REPORT_SCHEMA_VERSION,
          tool: "ackit",
          command: "skills validate",
          skillCount: skills.length,
          issueCount: issues.length,
          skills,
          issues,
        },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    process.stdout.write(`${skills.length} skill(s), ${issues.length} issue(s)\n`);
    for (const issue of issues) {
      emitDiagnostic(
        {
          code: `skill-${issue.id.toLowerCase()}`,
          message: `${issue.relativePath}: ${issue.message} [${issue.tier}]`,
        },
        { quiet: false, debug: options.debug },
      );
    }
  }
  return issues.length > 0 ? EXIT_CODES.thresholdExceeded : EXIT_CODES.ok;
}

/** `ackit skills list`. */
export async function runSkillsListCommand(options: SkillsCommandOptions): Promise<ExitCodeValue> {
  const loaded = await loadValidatedSkills(options);
  if (!loaded.ok) return loaded.exitCode;
  const { skills } = loaded.result;
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: SKILLS_REPORT_SCHEMA_VERSION,
          tool: "ackit",
          command: "skills list",
          skills,
        },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    for (const skill of skills) {
      process.stdout.write(`${skill.name} — ${skill.description} (${skill.relativePath})\n`);
    }
    if (skills.length === 0) {
      process.stdout.write("No agent skills discovered.\n");
    }
  }
  return EXIT_CODES.ok;
}

/** `ackit skills install`: ownership-safe idempotent builtin installation. */
export async function runSkillsInstallCommand(
  options: SkillsCommandOptions & { force: boolean },
): Promise<ExitCodeValue> {
  const rootResolution = await resolveCliRoot(options.root);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.environment;
  }
  const outcomes = await installSkills(rootResolution.root, { force: options.force });
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: SKILLS_REPORT_SCHEMA_VERSION,
          tool: "ackit",
          command: "skills install",
          outcomes,
        },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    for (const outcome of outcomes) {
      process.stdout.write(`${outcome.skill}: ${outcome.status} — ${outcome.message}\n`);
    }
  }
  const refused = outcomes.filter(
    (outcome) =>
      outcome.status === "refused-third-party" || outcome.status === "conflict-user-modified",
  );
  if (refused.length > 0) {
    for (const outcome of refused) {
      emitDiagnostic(
        {
          code: "ownership-conflict",
          message: `${outcome.skill}: ${outcome.message}`,
        },
        { quiet: options.quiet, debug: options.debug },
      );
    }
    return EXIT_CODES.securityBoundary;
  }
  return EXIT_CODES.ok;
}

/** `ackit skills scaffold <name>`: canonical-root skeleton creation. */
export async function runSkillsScaffoldCommand(
  name: string,
  options: SkillsCommandOptions,
): Promise<ExitCodeValue> {
  const rootPath = path.resolve(options.root ?? process.cwd());
  const skillDir = path.join(rootPath, ".agents", "skills", name);
  if (existsSync(skillDir)) {
    emitDiagnostic(
      { code: "skill-exists", message: `skill directory already exists: ${skillDir}` },
      { quiet: options.quiet ?? false, debug: options.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    emitDiagnostic(
      { code: "skill-invalid-name", message: `invalid kebab-case name: '${name}'` },
      { quiet: options.quiet ?? false, debug: options.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    `---\nname: ${name}\ndescription: Describe what ${name} does.\n---\n\n# ${name}\n\nInstructions here.\n`,
    "utf8",
  );
  if (!options.quiet) process.stdout.write(`scaffolded skill: ${skillDir}\n`);
  return EXIT_CODES.ok;
}
