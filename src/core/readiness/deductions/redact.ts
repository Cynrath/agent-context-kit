const SECRET_PATTERNS: RegExp[] = [
  /AKIA[0-9A-Z]{16}/g,
  /ghp_[A-Za-z0-9_]{10,}/g,
  /-----BEGIN PRIVATE KEY-----/g,
  /Server=.*Password=/gi,
  /pat_[A-Za-z0-9_]{10,}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  /xox[bpas]-[A-Za-z0-9-]+/g,
];

export function redactExcerpt(excerpt: string | undefined): string | undefined {
  if (!excerpt) return excerpt;
  let out = excerpt.slice(0, 200);
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  // Also replace generic high-entropy secret-like tokens: 20+ alphanum
  // But avoid over-redacting normal words; only if contains secret hint.
  // We keep it simple: already handled above patterns covers required 5 shapes.
  // Additionally detect private key block continuation
  if (out.includes("PRIVATE KEY")) out = out.replace(/PRIVATE KEY/g, "[REDACTED]");
  return out;
}

export function containsSecretPlaintext(text: string): boolean {
  for (const pattern of SECRET_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags.replace("g", ""));
    if (re.test(text)) return true;
  }
  return false;
}
