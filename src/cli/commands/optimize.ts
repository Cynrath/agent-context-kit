import path from "node:path";
import process from "node:process";
import { loadAckitConfig } from "../../core/config/index.js";
import { analyzeOptimize, applyFixes } from "../../core/context/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { emitDiagnostic } from "../../shared/diagnostics.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import { getPackageIdentity } from "../../shared/version.js";
import type { InstructionsCommandOptions } from "../context.js";
import { reportConfigErrors } from "./config.js";

/** `ackit optimize` v2 (REQ-V020-B-001..005): explain + fix plan with filters and waste estimates. */
export async function runOptimizeCommand(
  options: Omit<InstructionsCommandOptions, "provider" | "forPath"> & {
    fix: boolean;
    dryRun: boolean;
    profile?: string | undefined;
    explain?: boolean | undefined;
    category?: string | undefined;
    minSeverity?: string | undefined;
    format?: string | undefined;
    diff?: boolean | undefined;
  },
): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const configResult = await loadAckitConfig(rootRequested, {
    configPath: options.config,
  });
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
  let suggestions = await analyzeOptimize(rootResolution.root, {
    maxTokens: configResult.config.instructions.maxTokenEstimatePerFile,
    profile: profileRes.resolved,
  });

  // Filters: --category and --min-severity (deterministic)
  const severityRank: Record<string, number> = { low: 1, medium: 2, high: 3 };
  if (options.category) {
    suggestions = suggestions.filter((s) => s.category === options.category);
  }
  if (options.minSeverity) {
    const min = options.minSeverity.toLowerCase();
    const minRank = severityRank[min] ?? 0;
    if (minRank === 0) {
      emitDiagnostic(
        { code: "usage-error", message: `unknown --min-severity ${options.minSeverity}` },
        { quiet: options.quiet, debug: options.debug },
      );
      return EXIT_CODES.usage;
    }
    suggestions = suggestions.filter((s) => (severityRank[s.severity] ?? 0) >= minRank);
  }

  // Format handling
  const fmt = (options.format ?? (options.json ? "json" : "terminal")).toLowerCase();
  if (!["terminal", "json", "markdown", "sarif"].includes(fmt)) {
    emitDiagnostic(
      { code: "usage-error", message: `unknown --format ${options.format}` },
      { quiet: options.quiet, debug: options.debug },
    );
    return EXIT_CODES.usage;
  }

  let outcomes: Awaited<ReturnType<typeof applyFixes>> = [];
  if (options.fix) {
    outcomes = await applyFixes(rootResolution.root, suggestions, { dryRun: options.dryRun });
    if (options.dryRun) {
      // Verify dry-run did not touch FS: we already guarantee applyFixes with dryRun doesn't write
      // Emit diff preview via outcomes
    }
  }

  // JSON output (pure stdout, diagnostics on stderr)
  const isJson = fmt === "json" || options.json;
  if (isJson) {
    const payload: Record<string, unknown> = {
      schemaVersion: "ackit.optimize.v0",
      tool: "ackit",
      command: "optimize",
      fix: options.fix,
      dryRun: options.dryRun,
      suggestionCount: suggestions.length,
      suggestions,
      fixOutcomes: outcomes,
      profile: {
        requested: profileRes.resolved.requested,
        resolved: profileRes.resolved.resolved.name,
        source: profileRes.resolved.source,
      },
    };
    // --explain adds provenance explicitly (already in suggestions.provenance)
    if (options.explain) {
      // Ensure provenance is present in JSON
      payload["explain"] = true;
    }
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return EXIT_CODES.ok;
  }

  // Terminal / markdown / sarif
  if (fmt === "markdown") {
    if (!options.quiet) {
      process.stdout.write(`# Optimize Report (${suggestions.length} suggestion(s))\n\n`);
      for (const s of suggestions) {
        process.stdout.write(
          `- **[${s.severity}] ${s.category}** (${s.confidence ?? "medium"}): ${s.message}\n  - Evidence: ${(s.evidence ?? []).map((e) => e.relativePath).join(", ")}\n  - Remediation: ${s.remediation}\n`,
        );
        if (s.tokenWasteEstimate !== undefined)
          process.stdout.write(`  - Waste: ${s.tokenWasteEstimate} tokens (estimate)\n`);
        if (options.explain && s.provenance)
          process.stdout.write(`  - Provenance: ${s.provenance.graphNodeIds.join(", ")}\n`);
        if (s.plan)
          process.stdout.write(
            `  - Plan: ${s.plan.target} ${s.plan.action}\n\`\`\`diff\n${s.plan.diff}\n\`\`\`\n`,
          );
      }
    }
    return EXIT_CODES.ok;
  }

  if (fmt === "sarif") {
    // Minimal SARIF 2.1.0 for optimize suggestions as results
    const sarif = {
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: { driver: { name: "ackit", version: getPackageIdentity().version, rules: [] } },
          results: suggestions.map((s) => ({
            ruleId: s.id,
            level: s.severity === "high" ? "error" : s.severity === "medium" ? "warning" : "note",
            message: { text: s.message },
            locations: (s.evidence ?? []).map((e) => ({
              physicalLocation: {
                artifactLocation: { uri: e.relativePath },
                region: e.line ? { startLine: e.line } : undefined,
              },
            })),
          })),
        },
      ],
    };
    process.stdout.write(`${JSON.stringify(sarif, null, 2)}\n`);
    return EXIT_CODES.ok;
  }

  // terminal default
  if (!options.quiet) {
    process.stdout.write(`${suggestions.length} suggestion(s)\n`);
    for (const suggestion of suggestions) {
      const waste =
        suggestion.tokenWasteEstimate !== undefined
          ? ` waste ${suggestion.tokenWasteEstimate} tokens`
          : "";
      const prov =
        options.explain && suggestion.provenance
          ? ` provenance ${suggestion.provenance.graphNodeIds.join(",")}`
          : "";
      process.stdout.write(
        `  [${suggestion.severity}/${suggestion.confidence ?? "medium"}] ${suggestion.category}: ${suggestion.message}${waste}${prov}\n`,
      );
      for (const ev of suggestion.evidence ?? []) {
        process.stdout.write(`    evidence: ${ev.relativePath}${ev.line ? `:${ev.line}` : ""}\n`);
      }
      process.stdout.write(`    remediation: ${suggestion.remediation}\n`);
      if (suggestion.plan && (options.diff || options.dryRun)) {
        process.stdout.write(
          `    plan: ${suggestion.plan.target} ${suggestion.plan.action}\n${suggestion.plan.diff}\n`,
        );
      }
    }
    for (const outcome of outcomes) {
      process.stdout.write(
        `fix ${outcome.action} ${outcome.target}${outcome.detail.startsWith("+") || outcome.detail.startsWith("-") ? `\n${outcome.detail}` : ` — ${outcome.detail}`}\n`,
      );
    }
  }
  return EXIT_CODES.ok;
}
