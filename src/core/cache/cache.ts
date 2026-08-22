import { createHash } from "node:crypto";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { getPackageIdentity } from "../../shared/version.js";
import type { RepositoryRoot } from "../filesystem/root.js";

export const CACHE_DIR_RELATIVE = ".ackit/cache/scan";
export const RULE_SCHEMA_VERSION = 1;

export interface CacheEntry {
  key: string;
  ruleSchemaVersion: number;
  engineVersion: string;
  configDigest: string;
  policyDigest: string;
  findings: unknown[];
}

/**
 * Content-addressed cache (REQ-BASE-004): mtime is never trusted; the key
 * binds content hash + rule schema version + engine version + config and
 * policy digests.
 */
export function computeCacheKey(input: {
  contentHash: string;
  configDigest: string;
  policyDigest: string;
}): string {
  const identity = getPackageIdentity();
  return createHash("sha256")
    .update(
      [
        input.contentHash,
        RULE_SCHEMA_VERSION,
        identity.version,
        input.configDigest,
        input.policyDigest,
      ].join("\u0000"),
    )
    .digest("hex");
}

function cachePath(root: RepositoryRoot, key: string): string {
  return path.join(root.canonicalPath, ".ackit", "cache", "scan", `${key}.json`);
}

export async function cacheGet(root: RepositoryRoot, key: string): Promise<CacheEntry | null> {
  try {
    const raw = await fsp.readFile(cachePath(root, key), "utf8");
    const parsed = JSON.parse(raw) as CacheEntry;
    if (parsed.ruleSchemaVersion !== RULE_SCHEMA_VERSION) return null;
    if (parsed.key !== key) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function cacheSet(root: RepositoryRoot, entry: CacheEntry): Promise<void> {
  const file = cachePath(root, entry.key);
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, `${JSON.stringify(entry, null, 2)}\n`, "utf8");
}

/**
 * `ackit cache clean`: removes ONLY the ACKit cache subtree. Callers prove
 * scope with fs snapshots in tests (REQ-GOV-008 adjacency).
 */
export async function cleanCache(root: RepositoryRoot): Promise<{ removedBytes: number }> {
  const cacheDir = path.join(root.canonicalPath, ".ackit", "cache");
  let removedBytes = 0;
  const measure = async (dir: string): Promise<number> => {
    let total = 0;
    try {
      for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
        const absolute = path.join(dir, entry.name);
        if (entry.isDirectory()) total += await measure(absolute);
        else total += (await fsp.stat(absolute)).size;
      }
    } catch {
      return 0;
    }
    return total;
  };
  removedBytes = await measure(cacheDir);
  try {
    await fsp.rm(cacheDir, { recursive: true, force: true });
  } catch {
    // Already absent — cleaning to the same state is success.
  }
  return { removedBytes };
}
