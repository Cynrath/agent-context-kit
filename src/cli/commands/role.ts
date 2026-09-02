import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { listRoles, loadRole } from "../../core/roles/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CliInvocation, GlobalOptions } from "../context.js";

interface RoleCommandBase {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug?: boolean | undefined;
}

function emitJson(command: string, payload: Record<string, unknown>): void {
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: "ackit.role-report.v1",
        tool: "ackit",
        command: `role ${command}`,
        ...payload,
      },
      null,
      2,
    )}\n`,
  );
}

export async function runRoleCommand(
  base: RoleCommandBase,
  subcommand: "list" | "show" | "validate",
  args: { roleId?: string | undefined },
): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(base.root ?? process.cwd());
  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.diagnostic.message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.environment;
  }
  const rootPath = rootResolution.root.canonicalPath;
  try {
    switch (subcommand) {
      case "list": {
        const { roles, problems } = await listRoles(rootPath);
        for (const problem of problems) {
          emitDiagnostic(
            { code: problem.code.toLowerCase(), message: problem.message },
            { quiet: false, debug: false },
          );
        }
        if (base.json) {
          emitJson("list", {
            count: roles.length,
            roles: roles.map((role) => ({
              role: role.role,
              title: role.title,
              source: "builtin",
            })),
          });
        } else if (!base.quiet) {
          for (const role of roles) process.stdout.write(`${role.role} — ${role.title}\n`);
        }
        return problems.length > 0 ? EXIT_CODES.thresholdExceeded : EXIT_CODES.ok;
      }
      case "show": {
        const roleId = args.roleId ?? "";
        const { role, problems } = await loadRole(rootPath, roleId);
        for (const problem of problems) {
          emitDiagnostic(
            { code: problem.code.toLowerCase(), message: problem.message },
            { quiet: false, debug: false },
          );
        }
        if (role === null) return EXIT_CODES.usage;
        if (base.json) {
          emitJson("show", { role });
        } else if (!base.quiet) {
          const lines = [
            `${role.role}: ${role.title}`,
            role.description,
            `required inputs: ${role.requiredInputs.join(", ") || "(none)"}`,
            `allowed: ${role.allowedActions.join("; ") || "(none)"}`,
            `forbidden: ${role.forbiddenActions.join("; ") || "(none)"}`,
            `required outputs: ${role.requiredOutputs.join("; ") || "(none)"}`,
            role.outputSchema !== undefined ? `output schema: ${role.outputSchema}` : "",
          ].filter((line) => line.length > 0);
          process.stdout.write(`${lines.join("\n")}\n`);
        }
        return EXIT_CODES.ok;
      }
      case "validate": {
        const { roles, problems } = await listRoles(rootPath);
        if (base.json) {
          emitJson("validate", { ok: problems.length === 0, count: roles.length, problems });
        } else if (!base.quiet) {
          if (problems.length === 0) {
            process.stdout.write(`all roles OK (${roles.length} role contract(s))\n`);
          } else {
            for (const problem of problems) {
              emitDiagnostic(
                { code: problem.code.toLowerCase(), message: problem.message },
                { quiet: false, debug: false },
              );
            }
          }
        }
        return problems.length === 0 ? EXIT_CODES.ok : EXIT_CODES.thresholdExceeded;
      }
      default:
        return EXIT_CODES.internal;
    }
  } catch (error) {
    emitDiagnostic(
      { code: "role-error", message: (error as Error).message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
}

export function registerRoleCommands(program: Command, invocation: CliInvocation): void {
  const roleCommand = program
    .command("role")
    .description("portable role contracts (ackit.role.v1) for provider-spawned agents");
  roleCommand
    .command("list")
    .description("list built-in and repository role contracts")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runRoleCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "list",
        {},
      );
    });
  roleCommand
    .command("show")
    .description("show one role contract")
    .argument("<roleId>")
    .action(async (roleId: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runRoleCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "show",
        { roleId },
      );
    });
  roleCommand
    .command("validate")
    .description("validate all role contracts (built-in + repository)")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runRoleCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "validate",
        {},
      );
    });
}
