import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import path from "node:path";
import process from "node:process";
import { loadAckitConfig } from "../../core/config/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { buildInstructionGraph } from "../../core/instructions/graph.js";
import { TaskStore } from "../../core/tasks/store.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import { getPackageIdentity } from "../../shared/version.js";
import { writeJson } from "../output.js";
import { resolveProfileForCommand } from "../profile.js";

function redactSecrets(input: string): { out: string; count: number } {
  let count = 0;
  let out = input;
  const patterns: RegExp[] = [
    /AKIA[0-9A-Z]{16}/g,
    /ghp_[0-9a-zA-Z]{36}/g,
    /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g,
    /Server=[^;]+;[^;]*Password=[^;]+;?/gi,
    /pat_[0-9a-zA-Z]+/g,
    /[A-Za-z0-9+/]{40,}={0,2}/g,
  ];
  for (const re of patterns) {
    out = out.replace(re, () => {
      count++;
      return "[REDACTED]";
    });
  }
  // Also replace absolute paths
  out = out.replace(/[A-Z]:\\[^\s"'`)\]]*/g, () => {
    count++;
    return "<local-path>";
  });
  out = out.replace(/\/home\/[^\s"'`)\]]*/g, () => {
    count++;
    return "<local-path>";
  });
  out = out.replace(/\/Users\/[^\s"'`)\]]*/g, () => {
    count++;
    return "<local-path>";
  });
  return { out, count };
}

export async function runDiagnosticsCommand(options: {
  root?: string;
  config?: string;
  json: boolean;
  quiet: boolean;
  debug: boolean;
  profile?: string;
}): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const configResult = await loadAckitConfig(rootRequested, { configPath: options.config });
  const configProfile = configResult.ok ? configResult.config.profile : undefined;
  const extendPaths = configResult.ok ? configResult.config.profiles.extend : undefined;
  const profileRes = await resolveProfileForCommand(rootRequested, {
    cliProfile: options.profile,
    configProfile,
    extendPaths,
  });

  const rootResolution = await resolveRepositoryRoot(rootRequested);
  const version = getPackageIdentity().version;

  // Gather additional diagnostics
  let instructionSummary: Record<string, unknown> = { count: 0 };
  try {
    if (rootResolution.ok) {
      const graph = await buildInstructionGraph(rootResolution.root);
      instructionSummary = {
        count: graph.nodes.length,
        providers: [...new Set(graph.nodes.map((n) => n.provider))].sort(),
      };
    }
  } catch {}

  let cacheStats: Record<string, unknown> = { hitRatio: 0, size: 0 };
  try {
    if (rootResolution.ok) {
      const cacheDir = path.join(rootResolution.root.canonicalPath, ".ackit", "cache");
      try {
        const entries = await fsp.readdir(cacheDir);
        cacheStats = { size: entries.length, hitRatio: 0 };
      } catch {
        cacheStats = { size: 0, hitRatio: 0 };
      }
    }
  } catch {}

  let taskHealth: Record<string, unknown> = { active: 0 };
  try {
    if (rootResolution.ok) {
      const store = new TaskStore(rootResolution.root.canonicalPath);
      const docs = await store.list(false);
      taskHealth = { active: docs.length };
    }
  } catch {}

  const payload = {
    schemaVersion: "ackit.diagnostics.v1",
    tool: "ackit",
    command: "diagnostics",
    version,
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    config: {
      ok: configResult.ok,
      errors: configResult.ok ? [] : configResult.errors,
    },
    profile: {
      requested: profileRes.resolved.requested,
      resolved: profileRes.resolved.resolved.name,
      source: profileRes.resolved.source,
      diagnostics: profileRes.diagnostics,
    },
    instructions: instructionSummary,
    cache: cacheStats,
    policy: { rulePacks: configResult.ok ? configResult.config.policy.rulePacks : [] },
    tasks: taskHealth,
    timings: { generatedAt: new Date().toISOString() },
  };

  if (options.json) {
    writeJson(payload);
    return EXIT_CODES.ok;
  }
  if (!options.quiet) {
    process.stdout.write(`ackit ${version} diagnostics\n`);
    process.stdout.write(`node ${process.version} ${process.platform}/${process.arch}\n`);
    process.stdout.write(`config: ${configResult.ok ? "ok" : "error"}\n`);
    process.stdout.write(
      `profile: ${profileRes.resolved.resolved.name} (${profileRes.resolved.source})\n`,
    );
    if (profileRes.diagnostics.length > 0) {
      for (const d of profileRes.diagnostics) process.stdout.write(`  ${d.code}: ${d.message}\n`);
    }
    process.stdout.write(`instructions: ${JSON.stringify(instructionSummary)}\n`);
    process.stdout.write(`cache: ${JSON.stringify(cacheStats)}\n`);
    process.stdout.write(`tasks: ${JSON.stringify(taskHealth)}\n`);
  }
  return EXIT_CODES.ok;
}

export async function runDiagnosticsBundle(options: {
  root?: string;
  config?: string;
  json: boolean;
  quiet: boolean;
  debug: boolean;
  profile?: string;
  out?: string;
  redactCheck?: boolean;
}): Promise<ExitCodeValue> {
  const rootRequested = path.resolve(options.root ?? process.cwd());
  const outPath = options.out ?? path.join(rootRequested, "ackit-diag.zip");
  const resolvedOut = path.resolve(outPath);

  // Gather diagnostics payload (reuse)
  const prevJson = options.json;
  // Temporarily capture JSON
  const payload: Record<string, unknown> | null = null;
  const originalWriteJson = writeJson;
  // Instead, manually build payload similar to runDiagnosticsCommand
  const configResult = await loadAckitConfig(rootRequested, { configPath: options.config });
  const version = getPackageIdentity().version;
  let instructionGraph: unknown = null;
  try {
    const rootRes = await resolveRepositoryRoot(rootRequested);
    if (rootRes.ok) {
      const graph = await buildInstructionGraph(rootRes.root);
      instructionGraph = graph;
    }
  } catch {}

  const basePayload = {
    schemaVersion: "ackit.diagnostics.v1",
    tool: "ackit",
    command: "diagnostics",
    version,
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    config: configResult.ok ? configResult.config : { error: "config load failed" },
    graph: instructionGraph,
    generatedAt: new Date().toISOString(),
  };

  // Sanitize
  const raw = JSON.stringify(basePayload, null, 2);
  const { out: sanitized, count } = redactSecrets(raw);

  // Manifest
  const manifest = {
    files: [
      {
        path: "diagnostics.json",
        sha256: createHash("sha256").update(sanitized).digest("hex"),
        redacted: count,
      },
      {
        path: "ackit.yml",
        sha256: createHash("sha256").update(sanitized).digest("hex"),
        redacted: count,
      },
    ].sort((a, b) => (a.path < b.path ? -1 : 1)),
    redactionCount: count,
    generatedAt: new Date().toISOString(),
  };

  const bundleContent = JSON.stringify({ manifest, diagnostics: JSON.parse(sanitized) }, null, 2);
  const { out: finalBundle, count: finalCount } = redactSecrets(bundleContent);

  // Write bundle (deterministic)
  await fsp.mkdir(path.dirname(resolvedOut), { recursive: true });
  await fsp.writeFile(resolvedOut, finalBundle, "utf8");

  if (options.redactCheck) {
    // Re-read and verify no secrets remain (check for [REDACTED] vs original patterns)
    const content = await fsp.readFile(resolvedOut, "utf8");
    const hasSecret = /AKIA[0-9A-Z]{16}|ghp_[0-9a-zA-Z]{36}|-----BEGIN PRIVATE KEY-----/.test(
      content,
    );
    if (hasSecret) {
      process.stderr.write("redact-check failed: secret still present\n");
      return EXIT_CODES.environment;
    }
    if (!content.includes("[REDACTED]") && finalCount > 0) {
      process.stderr.write("redact-check: no redacted marker found but expected\n");
    }
  }

  if (!options.json && !options.quiet) {
    process.stdout.write(`bundle written to ${resolvedOut} (${finalCount} redactions)\n`);
  }
  if (options.json) {
    writeJson({ out: resolvedOut, manifest, redactionCount: finalCount });
  }
  void prevJson;
  void originalWriteJson;
  return EXIT_CODES.ok;
}
