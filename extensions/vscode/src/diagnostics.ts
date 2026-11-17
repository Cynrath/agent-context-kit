import { realpathSync } from "node:fs";
import path from "node:path";

export function diagnosticKind(severity: string): "Error" | "Warning" | "Information" | "Hint" {
  if (severity === "critical" || severity === "high") return "Error";
  if (severity === "medium") return "Warning";
  if (severity === "low") return "Information";
  return "Hint";
}

/** Findings may only address existing files inside the canonical workspace. */
export function resolveFindingPath(root: string, relativePath: string): string | null {
  if (
    !relativePath ||
    relativePath.includes("\0") ||
    path.win32.isAbsolute(relativePath) ||
    path.posix.isAbsolute(relativePath)
  )
    return null;
  try {
    const canonicalRoot = realpathSync(root);
    const full = realpathSync(path.resolve(canonicalRoot, relativePath.replaceAll("\\", path.sep)));
    const relative = path.relative(canonicalRoot, full);
    if (
      !relative ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    )
      return null;
    return full;
  } catch {
    return null;
  }
}
