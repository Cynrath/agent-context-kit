import { createHash } from "node:crypto";

/**
 * Canonical hashing module for verification state binding (TASK-0079,
 * ADR-0030). This is the ONE place where binding digests are computed:
 * SHA-256 over UTF-8 bytes of a domain-separated canonical payload with
 * stable key ordering. No mtimes, no absolute paths, no secret values in
 * persisted binding payloads.
 *
 * Do NOT use uncontrolled `JSON.stringify()` as a public digest contract —
 * always hash through `domainDigest()` (or `sha256HexUtf8()` over
 * `stableCanonicalJson()`), so key order can never affect a digest.
 */

/** Canonical JSON: sorted object keys, undefined dropped, arrays ordered. */
export function stableCanonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableCanonicalJson(item)).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries
      .map(([k, v]) => `${JSON.stringify(k)}:${stableCanonicalJson(v)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

/** SHA-256 hex digest of a UTF-8 string. */
export function sha256HexUtf8(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Domain-separated digest: `SHA-256("ackit/state-binding/v1:<domain>\n" +
 * canonical(value))`. The domain prefix keeps digests for different bound
 * field classes in separate namespaces (a task-contract digest can never
 * collide with an evidence digest of identical JSON shape).
 */
export function domainDigest(domain: string, value: unknown): string {
  return sha256HexUtf8(`ackit/state-binding/v1:${domain}\n${stableCanonicalJson(value)}`);
}

/** Collapse runs of whitespace (requirement/title normalization). */
export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Lowercase hex-64 digest pattern (strict, for schemas and parsing). */
export const HEX64_PATTERN = /^[0-9a-f]{64}$/;
