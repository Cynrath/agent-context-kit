import path from "node:path";
import process from "node:process";
import { type RepositoryRoot, resolveRepositoryRoot } from "../core/filesystem/root.js";

/** Converts an absolute path to a deterministic repo-relative POSIX form. */
export function toRepoRelative(root: string, absolutePath: string): string {
  const relative = path.relative(root, absolutePath);
  return relative.split(path.sep).join("/");
}

/**
 * Shared CLI root resolution step: requested → resolved canonical repository
 * root. Commands render the failure with their own quiet/debug flags.
 */
export async function resolveCliRoot(
  rootOption: string | undefined,
): Promise<{ ok: true; root: RepositoryRoot } | { ok: false; message: string }> {
  const rootRequested = path.resolve(rootOption ?? process.cwd());
  const resolution = await resolveRepositoryRoot(rootRequested);
  if (!resolution.ok) {
    return { ok: false, message: resolution.diagnostic.message };
  }
  return { ok: true, root: resolution.root };
}
