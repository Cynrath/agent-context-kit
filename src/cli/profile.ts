import { promises as fsp } from "node:fs";
import path from "node:path";
import { loadBuiltInProfiles } from "../core/profiles/built-ins.js";
import { loadAllProfiles } from "../core/profiles/loader.js";
import { resolveProfile } from "../core/profiles/resolve.js";
import type { Profile, ResolvedProfile } from "../core/profiles/types.js";

export interface ProfileResolution {
  resolved: ResolvedProfile;
  builtIns: Map<string, Profile>;
  available: Map<string, Profile>;
  diagnostics: import("../core/profiles/types.js").ProfileDiagnostic[];
}

export async function resolveProfileForCommand(
  repoRoot: string,
  options: {
    cliProfile?: string | undefined;
    configProfile?: string | undefined;
    extendPaths?: readonly string[] | undefined;
  },
): Promise<ProfileResolution> {
  const builtIns = loadBuiltInProfiles();
  const { profiles: available, diagnostics: loadDiagnostics } = await loadAllProfiles(
    repoRoot,
    options.extendPaths,
    builtIns,
  );

  // Gather detected files via list (scan targets light)
  let detectedFiles: string[] = [];
  try {
    const { collectScanTargets } = await import("../core/filesystem/scan-targets.js");
    const { resolveRepositoryRoot } = await import("../core/filesystem/root.js");
    const res = await resolveRepositoryRoot(repoRoot);
    if (res.ok) {
      const collected = await import("../core/filesystem/scan-targets.js").then((m) =>
        m.collectScanTargets(res.root, { skipClassification: true }),
      );
      detectedFiles = collected.targets.map((t) => t.relativePath);
    } else {
      // fallback: list .github etc manually?
      detectedFiles = [];
    }
  } catch {
    detectedFiles = [];
  }
  // Also include top-level provider files quickly if scan fails: try direct stat
  if (detectedFiles.length === 0) {
    const candidates = ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md"];
    for (const c of candidates) {
      try {
        await fsp.access(path.join(repoRoot, ...c.split("/")));
        detectedFiles.push(c);
      } catch {}
    }
  }

  const resolved = resolveProfile({
    cliProfile: options.cliProfile,
    configProfile: options.configProfile,
    detectedFiles,
    available,
  });

  const allDiagnostics = [...loadDiagnostics];
  if (resolved.diagnostic) allDiagnostics.push(resolved.diagnostic);

  return { resolved, builtIns, available, diagnostics: allDiagnostics };
}
