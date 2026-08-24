import path from "node:path";
import process from "node:process";
import { loadAckitConfig } from "../../core/config/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import {
  buildInstructionGraph,
  type ProviderId,
  resolveEffectiveStack,
} from "../../core/instructions/index.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { InstructionsCommandOptions } from "../context.js";
import { INSTRUCTIONS_REPORT_SCHEMA_VERSION } from "../context.js";
import { reportConfigErrors } from "./config.js";

/**
 * `ackit instructions` (REQ-INSTR-001..003): prints the discovered graph as
 * a stable tree, or pure JSON; --provider/--for resolve an effective stack.
 */
export async function runInstructionsCommand(
  options: InstructionsCommandOptions,
): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const configResult = await loadAckitConfig(rootRequested, { configPath: options.config });
  if (!configResult.ok) {
    reportConfigErrors(configResult.errors, { quiet: options.quiet, debug: options.debug });
    return EXIT_CODES.usage;
  }
  const rootResolution = await resolveRepositoryRoot(rootRequested);
  if (!rootResolution.ok) {
    emitDiagnostic(
      { code: "environment-error", message: rootResolution.diagnostic.message },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.environment;
  }

  const graph = await buildInstructionGraph(rootResolution.root, {
    maxTokenEstimatePerFile: configResult.config.instructions.maxTokenEstimatePerFile,
  });

  if (options.json) {
    let chain: string[] | null = null;
    if (options.provider !== undefined) {
      const provider = options.provider as ProviderId;
      chain = resolveEffectiveStack(graph, provider, options.forPath ?? "");
    }
    process.stdout.write(
      `${JSON.stringify(
        {
          schemaVersion: INSTRUCTIONS_REPORT_SCHEMA_VERSION,
          tool: "ackit",
          command: "instructions",
          nodeCount: graph.nodes.length,
          effectiveChain: chain,
          nodes: graph.nodes,
          diagnostics: graph.diagnostics,
        },
        null,
        2,
      )}\n`,
    );
    return EXIT_CODES.ok;
  }

  if (!options.quiet) {
    for (const node of graph.nodes) {
      const indent = "  ".repeat(Math.min(node.depth, 6));
      const applyLabel = node.applyTo !== null ? ` [applyTo: ${node.applyTo.join(", ")}]` : "";
      process.stdout.write(
        `${indent}${node.provider}/${node.kind} ${node.relativePath}${applyLabel} (${node.tokenEstimate} tokens)\n`,
      );
    }
    if (graph.diagnostics.length > 0) {
      process.stdout.write(`Diagnostics (${graph.diagnostics.length})\n`);
      for (const diagnostic of graph.diagnostics) {
        emitDiagnostic(
          {
            code: diagnostic.code.toLowerCase(),
            message: `${diagnostic.relativePath ?? ""}: ${diagnostic.message}`,
          },
          { quiet: false, debug: options.debug },
        );
      }
    }
  }
  return EXIT_CODES.ok;
}
