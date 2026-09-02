import path from "node:path";
import process from "node:process";
import type { Command } from "commander";
import { assertNoSecretShapes } from "../../core/context/pack.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { IntentStore, intentFingerprint } from "../../core/intent/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { CliInvocation, GlobalOptions } from "../context.js";

interface IntentCommandBase {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
  debug?: boolean | undefined;
}

function emitJson(command: string, payload: Record<string, unknown>): void {
  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: "ackit.intent-report.v1",
        tool: "ackit",
        command: `intent ${command}`,
        ...payload,
      },
      null,
      2,
    )}\n`,
  );
}

export async function runIntentCommand(
  base: IntentCommandBase,
  subcommand: "new" | "list" | "show" | "validate" | "fingerprint",
  args: { title?: string | undefined; id?: string | undefined },
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
  const store = new IntentStore(rootResolution.root.canonicalPath);
  try {
    switch (subcommand) {
      case "new": {
        const title = args.title ?? "";
        if (title.trim().length === 0) {
          emitDiagnostic(
            { code: "usage-error", message: "intent new requires a title" },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const doc = await store.create(title);
        if (base.json) {
          emitJson("new", { created: doc.meta.id, file: doc.relativePath });
        } else if (!base.quiet) {
          process.stdout.write(
            `created ${doc.meta.id} — ${doc.meta.title} (${doc.relativePath})\n`,
          );
        }
        return EXIT_CODES.ok;
      }
      case "list": {
        const docs = await store.list();
        if (base.json) {
          emitJson("list", {
            count: docs.length,
            intents: docs.map((doc) => ({
              id: doc.meta.id,
              status: doc.meta.status,
              title: doc.meta.title,
              file: doc.relativePath,
            })),
          });
        } else if (!base.quiet) {
          for (const doc of docs) {
            process.stdout.write(`${doc.meta.id} [${doc.meta.status}] ${doc.meta.title}\n`);
          }
          if (docs.length === 0) process.stdout.write("no intents found\n");
        }
        return EXIT_CODES.ok;
      }
      case "show": {
        const id = args.id ?? "";
        const found = await store.find(id);
        if (found === null) {
          emitDiagnostic(
            { code: "intent-error", message: `unknown intent '${id}'` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        if (base.json) {
          emitJson("show", { intent: found.doc.meta });
        } else if (!base.quiet) {
          process.stdout.write(
            `${found.doc.meta.id} [${found.doc.meta.status}] ${found.doc.meta.title}\nfile: ${found.doc.relativePath}\n\n${found.doc.body}\n`,
          );
        }
        return EXIT_CODES.ok;
      }
      case "validate": {
        const report = await store.validate(args.id);
        if (base.json) {
          emitJson("validate", { ok: report.ok, problems: report.problems });
        } else if (!base.quiet) {
          if (report.ok) {
            process.stdout.write(
              args.id !== undefined ? `intent ${args.id} OK\n` : "all intents OK\n",
            );
          } else {
            for (const problem of report.problems) {
              emitDiagnostic(
                { code: problem.code.toLowerCase(), message: problem.message },
                { quiet: false, debug: false },
              );
            }
          }
        }
        return report.ok ? EXIT_CODES.ok : EXIT_CODES.thresholdExceeded;
      }
      case "fingerprint": {
        const id = args.id ?? "";
        const found = await store.find(id);
        if (found === null) {
          emitDiagnostic(
            { code: "intent-error", message: `unknown intent '${id}'` },
            { quiet: base.quiet, debug: base.debug ?? false },
          );
          return EXIT_CODES.usage;
        }
        const fingerprint = intentFingerprint(found.doc.meta);
        if (base.json) {
          emitJson("fingerprint", { intent: id, fingerprint });
        } else if (!base.quiet) {
          process.stdout.write(`${id}: ${fingerprint}\n`);
        }
        return EXIT_CODES.ok;
      }
      default:
        return EXIT_CODES.internal;
    }
  } catch (error) {
    // Frontmatter with secret-shaped content must fail closed before any
    // surface can embed it (THREAT_MODEL T26); assertNoSecretShapes covers
    // emitted bodies defensively.
    const message = (error as Error).message;
    if (base.json === false && !base.quiet) {
      try {
        assertNoSecretShapes(message);
      } catch {
        emitDiagnostic(
          { code: "intent-error", message: "intent validation failed (unsafe content rejected)" },
          { quiet: false, debug: false },
        );
        return EXIT_CODES.securityBoundary;
      }
    }
    emitDiagnostic(
      { code: "intent-error", message },
      { quiet: base.quiet, debug: base.debug ?? false },
    );
    return EXIT_CODES.usage;
  }
}

export function registerIntentCommands(program: Command, invocation: CliInvocation): void {
  const intentCommand = program
    .command("intent")
    .description("intent artifacts: validate, normalize, reference (never inferred)");
  intentCommand
    .command("new")
    .description("create an intent scaffold document with a tool-allocated id")
    .argument("<title>")
    .action(async (title: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runIntentCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "new",
        { title },
      );
    });
  intentCommand
    .command("list")
    .description("list intent documents")
    .action(async () => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runIntentCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "list",
        {},
      );
    });
  intentCommand
    .command("show")
    .description("show one intent by id")
    .argument("<id>")
    .action(async (id: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runIntentCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "show",
        { id },
      );
    });
  intentCommand
    .command("validate")
    .description("validate intent documents (all when id omitted)")
    .argument("[id]")
    .action(async (id: string | undefined) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runIntentCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "validate",
        { id },
      );
    });
  intentCommand
    .command("fingerprint")
    .description("print the machine-path-independent fingerprint of an intent")
    .argument("<id>")
    .action(async (id: string) => {
      const parentOptions = (program.opts() ?? {}) as Partial<GlobalOptions>;
      invocation.exitCode = await runIntentCommand(
        {
          root: parentOptions.root,
          json: parentOptions.json ?? false,
          quiet: parentOptions.quiet ?? false,
        },
        "fingerprint",
        { id },
      );
    });
}
