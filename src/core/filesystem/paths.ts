import path from "node:path";
import process from "node:process";

/**
 * Converts any path to canonical POSIX (forward-slash) form (REQ-TEST-007).
 * Both separators are converted regardless of host platform: repository
 * inputs may carry Windows-style backslashes on any OS, and canonical
 * machine-independent output always uses "/". (Trade-off documented: a
 * literal backslash inside a POSIX filename cannot be represented.)
 */
export function toPosix(value: string): string {
  return value.split("\\").join("/");
}

export type NormalizeFailureReason = "absolute" | "escapes-root" | "empty-segment-invalid";

export type NormalizeResult =
  | { ok: true; value: string }
  | { ok: false; reason: NormalizeFailureReason };

/**
 * Normalizes a repository-relative path string to its canonical POSIX form.
 * Pure string-level validation performed BEFORE any filesystem access:
 * absolute paths and `..` escapes are rejected here so they can never reach
 * the fs layer (REQ-FS-001, REQ-GOV-003).
 *
 * Windows drive letters, UNC prefixes, and NUL bytes count as absolute/invalid.
 */
export function normalizeRelativePath(input: string): NormalizeResult {
  if (input.includes("\0")) {
    return { ok: false, reason: "absolute" };
  }
  const posix = toPosix(input.trim());
  if (posix.length === 0) {
    return { ok: true, value: "" };
  }
  const looksAbsolute =
    path.posix.isAbsolute(posix) || /^[a-zA-Z]:(?:\/|$)/.test(posix) || posix.startsWith("//");
  if (looksAbsolute) {
    return { ok: false, reason: "absolute" };
  }
  const segments: string[] = [];
  for (const segment of posix.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (segments.length === 0) {
        return { ok: false, reason: "escapes-root" };
      }
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return { ok: true, value: segments.join("/") };
}

/**
 * Containment test on already-resolved absolute paths. Inputs may be native
 * or POSIX form; both sides are canonicalized to forward slashes first so
 * behavior is identical on every platform. Comparison is case-insensitive
 * when requested (win32/darwin default filesystems) and requires either
 * equality with the root or a full-segment extension (`root` never matches
 * `root-sibling`).
 */
export function isInsideRoot(
  canonicalRoot: string,
  candidateRealPath: string,
  platformIsCaseInsensitive = process.platform === "win32",
): boolean {
  const root = toPosix(canonicalRoot);
  const candidate = toPosix(candidateRealPath);
  const normRoot = platformIsCaseInsensitive ? root.toLowerCase() : root;
  const normCandidate = platformIsCaseInsensitive ? candidate.toLowerCase() : candidate;
  if (normCandidate === normRoot) {
    return true;
  }
  const rootPrefix = normRoot.endsWith("/") ? normRoot : `${normRoot}/`;
  return normCandidate.startsWith(rootPrefix);
}
