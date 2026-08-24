import path from "node:path";
import process from "node:process";
import { hookStatus, installHook, uninstallHook } from "../../core/watch/hooks.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import { writeJson } from "../output.js";

/** `ackit hooks install|uninstall|status`. */
export async function runHooksCommand(
  base: { root?: string | undefined; json: boolean; quiet: boolean },
  action: "install" | "uninstall" | "status",
): Promise<ExitCodeValue> {
  const repoRoot = path.resolve(base.root ?? process.cwd());
  let payload: Record<string, unknown>;
  switch (action) {
    case "install": {
      const result = await installHook(repoRoot);
      payload = { action, ...result };
      break;
    }
    case "uninstall": {
      const result = await uninstallHook(repoRoot);
      payload = { action, ...result };
      break;
    }
    default: {
      const result = await hookStatus(repoRoot);
      payload = { action: "status", ...result };
    }
  }
  if (base.json) {
    writeJson({
      schemaVersion: "ackit.hooks.v0",
      tool: "ackit",
      command: `hooks ${action}`,
      ...payload,
    });
  } else if (!base.quiet) {
    const status = (payload as { status?: string }).status ?? "";
    process.stdout.write(`hooks ${action}: ${status}\n`);
  }
  return EXIT_CODES.ok;
}
