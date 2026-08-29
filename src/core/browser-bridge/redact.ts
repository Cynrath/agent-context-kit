/**
 * Defense-in-depth redaction for Bridge responses (ADR-0025 §9).
 * Mirrors dashboard/SCM redaction shapes (ACKIT001-005) and absolute-path scrub.
 */

const SECRET_PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  { re: /AKIA[0-9A-Z]{16}/g, replacement: "[REDACTED]" },
  { re: /ghp_[0-9a-zA-Z]{36}/g, replacement: "[REDACTED]" },
  {
    re: /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g,
    replacement: "[REDACTED]",
  },
  {
    re: /postgres:\/\/[^"'`\s)]+/gi,
    replacement: "[REDACTED]",
  },
  {
    re: /[A-Z]:\\[^\s"'`)\]]*/g,
    replacement: "<local-path>",
  },
  {
    re: /\/home\/[^\s"'`)\]]*/g,
    replacement: "<local-path>",
  },
  {
    re: /\/Users\/[^\s"'`)\]]*/g,
    replacement: "<local-path>",
  },
];

export function redactForBridge(input: string): string {
  let out = input;
  for (const p of SECRET_PATTERNS) {
    // Reset lastIndex for stateful global regexes re-used across calls
    p.re.lastIndex = 0;
    out = out.replace(p.re, p.replacement);
  }
  return out;
}

export function redactObjectForBridge<T>(value: T): T {
  const json = JSON.stringify(value, (_k, v: unknown) => {
    if (typeof v === "string") return redactForBridge(v);
    return v;
  });
  // JSON.stringify already used redaction in replacer; the extra string-pass
  // covers keys that were not visited as string values (e.g. embedded in a pre-serialized blob).
  const reparsed = JSON.parse(redactForBridge(json)) as T;
  return reparsed;
}
