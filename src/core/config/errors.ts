export type ConfigErrorCode =
  | "CFG-FILE-MISSING"
  | "CFG-YAML-SYNTAX"
  | "CFG-SCHEMA-VERSION"
  | "CFG-UNKNOWN-KEY"
  | "CFG-INVALID-VALUE"
  | "CFG-READ-FAILED";

export interface ConfigErrorLocation {
  line: number;
  column: number;
}

/**
 * Structured config error per REQ-CFG-003/005: stable code, precise
 * file:line location, received value, and a remediation hint (often a
 * did-you-mean suggestion).
 */
export interface ConfigError {
  code: ConfigErrorCode;
  message: string;
  file?: string | undefined;
  location?: ConfigErrorLocation | undefined;
  path?: readonly (string | number)[] | undefined;
  received?: unknown;
  suggestion?: string | undefined;
}

/** Nearest allowed key for did-you-mean hints (case-insensitive Levenshtein ≤ 2). */
export function nearestKey(input: string, allowed: readonly string[]): string | undefined {
  const lowered = input.toLowerCase();
  let best: { key: string; distance: number } | undefined;
  for (const key of allowed) {
    const distance = levenshtein(lowered, key.toLowerCase());
    if (distance <= 2 && (best === undefined || distance < best.distance)) {
      best = { key, distance };
    }
  }
  return best?.key;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length] ?? Number.MAX_SAFE_INTEGER;
}
