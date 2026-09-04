import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import { loadAckitConfig } from "../../core/config/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { validateSkills } from "../../core/skills/index.js";
import { installSkills } from "../../core/skills/install.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CliInvocation, GlobalOptions, InstructionsCommandOptions } from "../context.js";
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

/**
 * `ackit skills export --provider <p> --out <dir>` (TASK-0057 / ADR-0028 §5):
 * deterministic projections of canonical skills to documented provider
 * layouts. Data-only outputs; overwrite refused without --force (REQ-GOV-008);
 * out path containment-checked.
 */
export async function runSkillsExportCommand(
  options: SkillsCommandOptions & {
    provider: string;
    out: string;
    force: boolean;
  },
): Promise<ExitCodeValue> {
  const { SKILL_PROJECTION_PROVIDERS, projectSkill } = await import("../../core/skills/project.js");
  const provider = options.provider as (typeof SKILL_PROJECTION_PROVIDERS)[number];
  if (!(SKILL_PROJECTION_PROVIDERS as readonly string[]).includes(options.provider)) {
    emitDiagnostic(
      {
        code: "skill-export-provider",
        message: `unknown provider '${options.provider}' (expected: ${SKILL_PROJECTION_PROVIDERS.join("|")})`,
      },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.usage;
  }
  const loaded = await loadValidatedSkills(options);
  if (!loaded.ok) return loaded.exitCode;
  const { skills } = loaded.result;
  if (skills.length === 0) {
    if (!options.quiet) process.stdout.write("no skills discovered; nothing exported\n");
    return EXIT_CODES.ok;
  }
  const rootResolution = await resolveCliRoot(options.root);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.environment;
  }
  const rootPath = rootResolution.root.canonicalPath;
  // Out path: repository-relative POSIX, containment-checked, reject traversal.
  const outArg = options.out.split("\\").join("/");
  const escapes =
    outArg.startsWith("/") ||
    /^[a-zA-Z]:/.test(outArg) ||
    outArg.split("/").some((segment) => segment === "..");
  const outDir = path.resolve(rootPath, outArg);
  if (escapes || !outDir.startsWith(rootPath)) {
    emitDiagnostic(
      { code: "skill-export-out", message: "export path escapes repository root" },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.securityBoundary;
  }
  await mkdir(outDir, { recursive: true });
  const { readFile } = await import("node:fs/promises");
  let exported = 0;
  for (const record of skills) {
    // Read the canonical body for projection input.
    let body = "";
    try {
      const raw = await readFile(path.join(rootPath, record.relativePath), "utf8");
      const { extractFrontmatter } = await import("../../core/instructions/frontmatter.js");
      body = extractFrontmatter(raw).body.trim();
    } catch {
      body = record.description;
    }
    const projection = projectSkill(provider, { ...record, body });
    // Per-skill subdirectory: claude-layout skills all use SKILL.md, so a
    // flat layout would collide; the skill-name directory matches the
    // canonical .agents/skills/<name>/ convention.
    const skillOutDir = path.join(outDir, record.name);
    await mkdir(skillOutDir, { recursive: true });
    const target = path.join(skillOutDir, projection.fileName);
    if (existsSync(target) && options.force !== true) {
      emitDiagnostic(
        {
          code: "skill-export-exists",
          message: `refusing to overwrite existing '${options.out}/${record.name}/${projection.fileName}' (use --force)`,
        },
        { quiet: options.quiet, debug: options.debug },
      );
      return EXIT_CODES.securityBoundary;
    }
    await writeFile(target, projection.content, "utf8");
    exported += 1;
  }
  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: SKILLS_REPORT_SCHEMA_VERSION,
          tool: "ackit",
          command: "skills export",
          provider,
          out: options.out,
          exported,
        },
        null,
        2,
      )}\n`,
    );
  } else if (!options.quiet) {
    process.stdout.write(`exported ${exported} skill(s) to ${options.out} (${provider})\n`);
  }
  return EXIT_CODES.ok;
}

/**
 * Registers the full `ackit skills` command family on the program.
 */
export function registerSkillsCommands(program: Command, invocation: CliInvocation): void {
  const skillsCommand = program.command("skills").description("agent skills utilities");
  skillsCommand
    .command("validate")
    .description("validate .agents/skills against the open standard (strict + warning tiers)")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runSkillsValidateCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
      });
    });
  skillsCommand
    .command("list")
    .description("list discovered agent skills")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runSkillsListCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
      });
    });

  skillsCommand
    .command("sync")
    .description("alias for install: sync builtin skills to the current version")
    .option("--force", "discard local edits on OWNED skills", false)
    .action(async (opts: { force?: boolean }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runSkillsInstallCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        force: opts.force ?? false,
      });
    });

  skillsCommand
    .command("doctor")
    .description("validate skills + verify lock integrity")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runSkillsValidateCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
      });
    });

  skillsCommand
    .command("discover")
    .description("list all skill directories found in .agents/skills (including nested)")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runSkillsListCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
      });
    });

  skillsCommand
    .command("scaffold")
    .description("create a new skill skeleton under .agents/skills/<name>")
    .argument("<name>", "kebab-case skill name")
    .action(async (name: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runSkillsScaffoldCommand(name, {
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
      });
    });

  skillsCommand
    .command("install")
    .description("install the four built-in ACKit skills idempotently")
    .option("--force", "discard local edits on OWNED skills (third-party names still refused)")
    .action(async (opts: { force?: boolean }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runSkillsInstallCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        force: opts.force ?? false,
      });
    });

  skillsCommand
    .command("export")
    .description("project canonical skills to a provider layout (claude|copilot|generic)")
    .requiredOption("--provider <id>", "claude | copilot | generic")
    .requiredOption("--out <dir>", "repository-relative output directory")
    .option("--force", "allow overwriting existing files (explicit user intent)", false)
    .action(async (opts: { provider: string; out: string; force?: boolean }) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runSkillsExportCommand({
        root: parentOptions.root,
        config: parentOptions.config,
        json: parentOptions.json ?? false,
        quiet: parentOptions.quiet ?? false,
        debug: parentOptions.debug ?? false,
        provider: opts.provider,
        out: opts.out,
        force: opts.force ?? false,
      });
    });
}
