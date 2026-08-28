import path from "node:path";
import process from "node:process";
import { loadAckitConfig } from "../../core/config/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import {
  buildInstructionGraph,
  type ProviderId,
  resolveEffectiveStack,
} from "../../core/instructions/index.js";
import type { EffectiveStackInfo } from "../../core/instructions/types.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import type { InstructionsCommandOptions } from "../context.js";
import { INSTRUCTIONS_REPORT_SCHEMA_VERSION } from "../context.js";
import { reportConfigErrors } from "./config.js";

/**
 * `ackit instructions` v2 (REQ-V020-D-001..003): prints the discovered graph as
 * a stable tree, or pure JSON; --provider/--for resolve an effective stack;
 * --explain adds per-node why-included provenance.
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

  // Profile resolution (TASK-0010)
  const { resolveProfileForCommand } = await import("../profile.js");
  const profileRes = await resolveProfileForCommand(rootRequested, {
    cliProfile: options.profile,
    configProfile: configResult.config.profile,
    extendPaths: configResult.config.profiles.extend,
  });
  for (const d of profileRes.diagnostics) {
    emitDiagnostic(
      { code: d.code.toLowerCase(), message: d.message },
      { quiet: options.quiet, debug: options.debug },
    );
  }
  // Map --profile to provider if --provider not set: profile provider determines filter
  let effectiveProvider = options.provider as ProviderId | undefined;
  if (effectiveProvider === undefined && options.profile !== undefined) {
    // Use resolved profile's provider if not generic, else no filter
    const prov = profileRes.resolved.resolved.provider;
    if (prov !== "generic") effectiveProvider = prov as ProviderId;
  }

  const graph = await buildInstructionGraph(rootResolution.root, {
    maxTokenEstimatePerFile: configResult.config.instructions.maxTokenEstimatePerFile,
    profile: profileRes.resolved,
  });

  if (options.json) {
    let chain: string[] | null = null;
    let detailed: EffectiveStackInfo | null = null;
    const providerForChain = effectiveProvider ?? (options.provider as ProviderId | undefined);
    if (providerForChain !== undefined) {
      if (options.explain) {
        detailed = resolveEffectiveStack(graph, providerForChain, options.forPath ?? "", {
          detailed: true,
          profile: profileRes.resolved,
        }) as EffectiveStackInfo;
        chain = detailed.chain;
      } else {
        chain = resolveEffectiveStack(graph, providerForChain, options.forPath ?? "", {
          profile: profileRes.resolved,
        }) as string[];
      }
    } else if (options.explain && options.forPath !== undefined) {
      // Without provider, explain not meaningful; still emit graph
    }

    const payload: Record<string, unknown> = {
      schemaVersion: 2,
      reportSchemaVersion: INSTRUCTIONS_REPORT_SCHEMA_VERSION,
      tool: "ackit",
      command: "instructions",
      nodeCount: graph.nodes.length,
      effectiveChain: chain,
      nodes: graph.nodes,
      diagnostics: graph.diagnostics,
      profile: {
        requested: profileRes.resolved.requested,
        resolved: profileRes.resolved.resolved.name,
        source: profileRes.resolved.source,
      },
    };
    if (detailed !== null) {
      payload["perNode"] = detailed.perNode;
      payload["explainDiagnostics"] = detailed.diagnostics;
    }
    // Include provenance in nodes already (v2)
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return EXIT_CODES.ok;
  }

  // --explain terminal mode
  const explainProvider = effectiveProvider ?? (options.provider as ProviderId | undefined);
  if (options.explain && explainProvider !== undefined) {
    const provider = explainProvider as ProviderId;
    const detailed = resolveEffectiveStack(graph, provider, options.forPath ?? "", {
      detailed: true,
      profile: profileRes.resolved,
    }) as EffectiveStackInfo;
    const forLabel = options.forPath ?? "(repo-wide)";
    process.stdout.write(`${provider} chain for ${forLabel} (weakest → strongest):\n`);
    for (let i = 0; i < detailed.chain.length; i += 1) {
      const id = detailed.chain[i];
      if (!id) continue;
      const info = detailed.perNode[id];
      const node = graph.nodes.find((n) => n.id === id);
      const prec = node?.precedence ?? "?";
      const depth = node?.depth ?? "?";
      const shadow = info?.shadowedBy ? ` shadowedBy ${info.shadowedBy}` : "";
      const dup = info?.duplicateOf ? ` duplicateOf ${info.duplicateOf}` : "";
      const why = info?.why ?? "";
      process.stdout.write(`  ${i}  ${id} [prec ${prec}, depth ${depth}] ${why}${shadow}${dup}\n`);
      if (info?.provenance && info.provenance.length > 0) {
        for (const p of info.provenance) {
          process.stdout.write(`      provenance: ${p.source} — ${p.reason}\n`);
        }
      }
    }
    if (detailed.diagnostics.length > 0) {
      process.stdout.write(`Diagnostics (${detailed.diagnostics.length})\n`);
      for (const diagnostic of detailed.diagnostics) {
        emitDiagnostic(
          {
            code: diagnostic.code.toLowerCase(),
            message: `${diagnostic.relativePath ?? ""}: ${diagnostic.message}`,
          },
          { quiet: false, debug: options.debug },
        );
      }
    }
    // Also show graph diagnostics
    if (graph.diagnostics.length > 0) {
      process.stdout.write(`Graph diagnostics (${graph.diagnostics.length})\n`);
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
    return EXIT_CODES.ok;
  }

  if (!options.quiet) {
    for (const node of graph.nodes) {
      const indent = "  ".repeat(Math.min(node.depth, 6));
      const applyLabel = node.applyTo !== null ? ` [applyTo: ${node.applyTo.join(", ")}]` : "";
      const includeLabel =
        node.includeScopes !== null ? ` [includeScopes: ${node.includeScopes.join(", ")}]` : "";
      const excludeLabel =
        node.excludeScopes !== null ? ` [excludeScopes: ${node.excludeScopes.join(", ")}]` : "";
      const shadowLabel = node.shadowedBy !== null ? ` [shadowedBy: ${node.shadowedBy}]` : "";
      const dupLabel = node.duplicateOf !== null ? ` [duplicateOf: ${node.duplicateOf}]` : "";
      process.stdout.write(
        `${indent}${node.provider}/${node.kind} ${node.relativePath}${applyLabel}${includeLabel}${excludeLabel}${shadowLabel}${dupLabel} (${node.tokenEstimate} tokens, prec ${node.precedence}, depth ${node.depth}, order ${node.orderIndex})\n`,
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
