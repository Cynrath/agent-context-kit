/** Deterministic glob matching: `**` spans segments, `*` stays in-segment. */
export function globMatches(glob: string, relativePath: string): boolean {
  const NUL = String.fromCharCode(0);
  const source = glob
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, NUL)
    .replace(/\*/g, "[^/]*")
    .split(NUL)
    .join(".*");
  return new RegExp(`^${source}$`).test(relativePath);
}
