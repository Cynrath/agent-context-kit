import path from "node:path";
import process from "node:process";
import { loadAckitConfig } from "../../core/config/index.js";
import { resolveRepositoryRoot } from "../../core/filesystem/root.js";
import { EXIT_CODES, type ExitCodeValue } from "../../shared/exit-codes.js";
import { getPackageIdentity } from "../../shared/version.js";
import { writeJson } from "../output.js";
import { resolveProfileForCommand } from "../profile.js";

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
  if (options.json) {
    writeJson({
      schemaVersion: "ackit.diagnostics.v1",
      tool: "ackit",
      command: "diagnostics",
      version: getPackageIdentity().version,
      profile: {
        requested: profileRes.resolved.requested,
        resolved: profileRes.resolved.resolved.name,
        source: profileRes.resolved.source,
      },
      builtIns: [...profileRes.builtIns.keys()].sort(),
      customCount: Math.max(0, profileRes.available.size - profileRes.builtIns.size),
      diagnostics: profileRes.diagnostics.map((d) => ({ code: d.code, message: d.message })),
      configOk: configResult.ok,
      rootOk: rootResolution.ok,
    });
    return EXIT_CODES.ok;
  }
  if (!options.quiet) {
    process.stdout.write(
      `profile: ${profileRes.resolved.resolved.name} (${profileRes.resolved.source})\n`,
    );
    if (profileRes.diagnostics.length > 0) {
      for (const d of profileRes.diagnostics) process.stdout.write(`  ${d.code}: ${d.message}\n`);
    }
  }
  return EXIT_CODES.ok;
}
