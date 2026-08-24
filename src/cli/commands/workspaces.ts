import process from "node:process";
import { detectWorkspaces } from "../../core/workspace/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import { writeJson } from "../output.js";
import { resolveCliRoot } from "../root.js";

/** `ackit workspaces` (REQ-MONO-001). */
export async function runWorkspacesCommand(options: {
  root?: string | undefined;
  json: boolean;
  quiet: boolean;
}): Promise<ExitCodeValue> {
  const rootResolution = await resolveCliRoot(options.root);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.message },
      { quiet: options.quiet, debug: false },
    );
    return EXIT_CODES.environment;
  }
  const detection = await detectWorkspaces(rootResolution.root);
  if (options.json) {
    writeJson({
      schemaVersion: "ackit.workspaces.v0",
      tool: "ackit",
      command: "workspaces",
      count: detection.workspaces.length,
      workspaces: detection.workspaces,
      diagnostics: detection.diagnostics,
    });
  } else if (!options.quiet) {
    for (const workspace of detection.workspaces) {
      process.stdout.write(
        `${workspace.name} [${workspace.type}] ${workspace.relativePath} (${workspace.markers.join(", ")})\n`,
      );
    }
    if (detection.workspaces.length === 0)
      process.stdout.write("single-package repository (no workspaces detected)\n");
  }
  return EXIT_CODES.ok;
}
