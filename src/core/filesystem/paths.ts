import { promises as fsp } from "node:fs";
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

export type ContainedWriteResult =
  | { ok: true; path: string }
  | { ok: false; reason: "absolute" | "escapes-root" | "link-escape" };

/**
 * Link-aware containment for paths ACKit is about to WRITE (TASK-0084).
 *
 * String-level checks (`..`, absolute form, UNC, NUL) cannot see links: a
 * planted directory link (or Windows junction) inside the repository
 * redirects a lexically-contained `--out` path outside the root, and the
 * write follows it (proven live, TASK-0084 matrix R12/R13). This helper
 * additionally resolves the nearest existing ancestor (plus the final
 * path itself when it already exists, covering planted file links) with
 * `realpath` and requires the result to live inside the real repository
 * root — the same realpath-then-contain pattern the binding layer already
 * uses for artifact reads.
 *
 * Pure check (never creates): callers mkdir/write only on `ok`. The
 * non-existent remainder below the ancestor is created fresh by the
 * caller, so no link can hide there. TOCTOU between check and write is
 * out of scope (local single-operator CLI, same as all local file ops).
 */
export async function resolveContainedWritePath(
  repositoryRoot: string,
  arg: string,
): Promise<ContainedWriteResult> {
  const normalized = normalizeRelativePath(arg);
  if (!normalized.ok) {
    return { ok: false, reason: normalized.reason === "absolute" ? "absolute" : "escapes-root" };
  }
  if (normalized.value.length === 0) {
    return { ok: false, reason: "escapes-root" };
  }
  const resolved = path.resolve(repositoryRoot, ...normalized.value.split("/"));
  if (!isInsideRoot(repositoryRoot, resolved)) {
    return { ok: false, reason: "escapes-root" };
  }
  let realRoot: string;
  try {
    realRoot = await fsp.realpath(repositoryRoot);
  } catch {
    realRoot = repositoryRoot;
  }
  // Final path itself when it exists (planted file link), else the nearest
  // existing ancestor (planted dir link / junction above the target).
  let probe = resolved;
  for (;;) {
    try {
      await fsp.lstat(probe);
      break;
    } catch {
      const parent = path.dirname(probe);
      if (parent === probe) return { ok: false, reason: "link-escape" };
      probe = parent;
    }
  }
  let realProbe: string;
  try {
    realProbe = await fsp.realpath(probe);
  } catch {
    return { ok: false, reason: "link-escape" };
  }
  if (!isInsideRoot(realRoot, realProbe)) {
    return { ok: false, reason: "link-escape" };
  }
  return { ok: true, path: resolved };
}
