import { createHash } from "node:crypto";

/**
 * Redacts a raw evidence match before any Finding is constructed
 * (REQ-GOV-005, ADR-0009): keeps a short prefix/suffix so the finding stays
 * locatable, replaces the middle with an opaque mask. The raw value can never
 * reach reporters because they only ever receive Finding objects.
 */
export function redactEvidence(rawEvidence: string): string {
  const value = rawEvidence.replace(/\s+/g, " ").trim();
  if (value.length === 0) {
    return "";
  }
  if (value.length <= 8) {
    return "*".repeat(value.length);
  }
  const prefix = value.slice(0, 4);
  const suffix = value.slice(-2);
  const maskedLength = Math.max(4, value.length - prefix.length - suffix.length);
  return `${prefix}${"*".repeat(maskedLength)}${suffix}`;
}

/**
 * Machine-path-independent fingerprint (REQ-BASE-002): derived only from
 * repo-relative semantic data (rule, relative path, position, evidence
 * shape), never from absolute paths or machine state.
 */
export function computeFingerprint(input: {
  ruleId: string;
  relativePath: string;
  line: number;
  column: number;
  redactedEvidence: string;
}): string {
  const canonical = [
    input.ruleId,
    input.relativePath.split("\\").join("/"),
    String(input.line),
    String(input.column),
    input.redactedEvidence,
  ].join("\u0000");
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}
