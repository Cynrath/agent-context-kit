import { promises as fsp } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { ProfileSchema } from "./schema.js";
import type { Profile, ProfileDiagnostic } from "./types.js";

const MAX_EXTEND = 8;
const MAX_FILE_BYTES = 32 * 1024;

function toPosix(p: string): string {
  return p.split("\\").join("/");
}

function isUrl(value: string): boolean {
  return /^(https?:\/\/|\/\/)/i.test(value.trim());
}

function normalizeRepoRelative(repoRoot: string, requested: string): string | null {
  const posix = toPosix(requested);
  if (path.isAbsolute(requested) || posix.startsWith("/")) return null;
  // prevent escaping via .. segment that would go outside root after join
  const joined = path.resolve(repoRoot, requested);
  return joined;
}

async function isContained(repoRoot: string, absolute: string): Promise<boolean> {
  try {
    const realRoot = await fsp.realpath(repoRoot);
    const realTarget = await fsp.realpath(absolute).catch(async () => {
      // if file doesn't exist yet, check parent dir
      const dir = path.dirname(absolute);
      const realDir = await fsp.realpath(dir);
      return path.join(realDir, path.basename(absolute));
    });
    const rel = path.relative(realRoot, realTarget);
    if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
    return true;
  } catch {
    return false;
  }
}

export interface LoadCustomProfilesResult {
  profiles: Map<string, Profile>;
  diagnostics: ProfileDiagnostic[];
}

export async function loadCustomProfiles(
  repoRoot: string,
  extendPaths: readonly string[] | undefined,
  availableBuiltIns: Map<string, Profile>,
): Promise<LoadCustomProfilesResult> {
  const merged = new Map<string, Profile>(availableBuiltIns);
  const diagnostics: ProfileDiagnostic[] = [];
  const paths = extendPaths ?? [];

  if (paths.length > MAX_EXTEND) {
    diagnostics.push({
      code: "PROFILE-LIMIT",
      message: `too many profiles.extend entries: ${paths.length} > ${MAX_EXTEND}`,
      remediation: `reduce extend list to <= ${MAX_EXTEND}`,
    });
    // truncate to limit
    // proceed with first MAX_EXTEND
  }
  const limited = paths.slice(0, MAX_EXTEND);

  for (const rawPath of limited) {
    if (isUrl(rawPath)) {
      diagnostics.push({
        code: "PROFILE-NETWORK-REFUSED",
        message: `remote URL fetch is forbidden per REQ-V020-GOV-001: ${rawPath}`,
        remediation: "use pre-installed local file",
        file: rawPath,
      });
      continue;
    }
    const absolute = normalizeRepoRelative(repoRoot, rawPath);
    if (absolute === null) {
      diagnostics.push({
        code: "PROFILE-PATH-ESCAPE",
        message: `profile path escapes repo root: ${rawPath}`,
        remediation: "use repo-relative path inside repository",
        file: rawPath,
      });
      continue;
    }
    // containment via realpath
    const contained = await isContained(repoRoot, absolute);
    if (!contained) {
      diagnostics.push({
        code: "PROFILE-PATH-ESCAPE",
        message: `profile path escapes repo root: ${rawPath}`,
        remediation: "use repo-relative path inside repository",
        file: rawPath,
      });
      continue;
    }
    let stat: import("node:fs").Stats;
    try {
      stat = await fsp.stat(absolute);
    } catch {
      diagnostics.push({
        code: "PROFILE-INVALID",
        message: `cannot read profile file: ${rawPath}`,
        file: rawPath,
      });
      continue;
    }
    if (stat.size > MAX_FILE_BYTES) {
      diagnostics.push({
        code: "PROFILE-LIMIT",
        message: `profile file too large: ${rawPath} (${stat.size} bytes > ${MAX_FILE_BYTES})`,
        file: rawPath,
      });
      continue;
    }
    let content: string;
    try {
      content = await fsp.readFile(absolute, "utf8");
    } catch (e) {
      diagnostics.push({
        code: "PROFILE-INVALID",
        message: (e as Error).message,
        file: rawPath,
      });
      continue;
    }
    let parsed: unknown;
    try {
      parsed = parseYaml(content);
    } catch (e) {
      diagnostics.push({
        code: "PROFILE-INVALID",
        message: `YAML parse error: ${(e as Error).message}`,
        file: rawPath,
      });
      continue;
    }
    const result = ProfileSchema.safeParse(parsed);
    if (!result.success) {
      const first = result.error.issues[0];
      diagnostics.push({
        code: "PROFILE-INVALID",
        message: first ? `${first.path.join(".")}: ${first.message}` : "invalid profile",
        remediation: first
          ? `received: ${JSON.stringify((first as unknown as { input: unknown }).input ?? parsed)}`
          : undefined,
        file: rawPath,
        line: 1,
      });
      continue;
    }
    const profile = result.data as unknown as Profile;
    merged.set(profile.name, profile);
  }

  return { profiles: merged, diagnostics };
}

export async function discoverProfilesDir(repoRoot: string): Promise<string[]> {
  const dir = path.join(repoRoot, "profiles");
  try {
    const entries = await fsp.readdir(dir);
    return entries
      .filter((e) => e.endsWith(".yml") || e.endsWith(".yaml"))
      .map((e) => `./profiles/${e}`);
  } catch {
    return [];
  }
}

export async function loadAllProfiles(
  repoRoot: string,
  extendPaths: readonly string[] | undefined,
  builtIns: Map<string, Profile>,
): Promise<LoadCustomProfilesResult> {
  // extendPaths takes precedence; if none, discover profiles/*.yml convenience
  let paths = extendPaths;
  let autoDiscovered = false;
  if (paths === undefined || paths.length === 0) {
    const discovered = await discoverProfilesDir(repoRoot);
    if (discovered.length > 0) {
      paths = discovered;
      autoDiscovered = true;
    }
  }
  if (paths === undefined || paths.length === 0) return { profiles: builtIns, diagnostics: [] };
  // if auto-discovered, don't treat as error if empty; just load
  const result = await loadCustomProfiles(repoRoot, paths, builtIns);
  // Suppress diagnostics for auto-discovered empty? already handled.
  void autoDiscovered;
  return result;
}
