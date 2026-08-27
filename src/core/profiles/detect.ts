import type { ProfileId } from "./types.js";

function toPosix(value: string): string {
  return value
    .split("\\")
    .join("/")
    .replace(/^([A-Za-z]):\//, "");
}

function normalizeFile(p: string): string {
  const posix = toPosix(p);
  // strip leading ./ and repo root segment if absolute-ish
  let n = posix.replace(/^\.\//, "");
  // If absolute path like C:/..., toPosix already stripped drive. For /abs/path, keep basename logic.
  // For our detection, we only care about repo-relative suffixes.
  // Normalize: remove leading slash
  n = n.replace(/^\//, "");
  // For Windows absolute like C:\repo\AGENTS.md -> toPosix gives /AGENTS.md or AGENTS.md depending.
  // We extract suffix after repo root: if path contains AGENTS.md etc, we match basename or exact relative.
  return n;
}

/**
 * Pure auto-detect over repo-relative file list.
 * - AGENTS.md -> codex
 * - CLAUDE.md -> claude
 * - .github/copilot-instructions.md -> copilot
 * - GEMINI.md -> gemini
 * Deterministic: sorted, case-sensitive, POSIX.
 */
export function detectProfiles(files: readonly string[]): ProfileId | null {
  const normalized = files.map(normalizeFile);
  // sort for determinism
  const sorted = [...normalized].sort();
  const _has = (target: string): boolean =>
    sorted.some((f) => (f === target || f.endsWith(`/${target}`) ? true : f === target));
  // Exact checks: for nested detection we check basename or exact relative
  // Safer: check if any file equals target or ends with /target and not part of longer name
  const present = new Set<string>();
  for (const f of sorted) {
    const base = f.split("/").pop() ?? "";
    if (f === "AGENTS.md" || base === "AGENTS.md") present.add("codex");
    if (f === "CLAUDE.md" || base === "CLAUDE.md") present.add("claude");
    if (f === ".github/copilot-instructions.md") present.add("copilot");
    if (f === "GEMINI.md" || base === "GEMINI.md") present.add("gemini");
  }
  // Alternative precise check for copilot: must be exactly .github/copilot-instructions.md
  // Already done via base, but we filter to exact path
  // Re-evaluate copilot strictly
  const hasCopilotExact = sorted.includes(".github/copilot-instructions.md");
  if (!hasCopilotExact) present.delete("copilot");
  // For codex/claude/gemini, presence of basename at any depth counts? Spec says AGENTS.md at root/nested for codex fixture.
  // We already count any depth.
  if (present.size === 1) {
    const only = [...present][0];
    return only ?? null;
  }
  if (present.size === 0) return null;
  // ambiguous -> null signals fallback generic
  return null;
}

export function detectProfileDetailed(files: readonly string[]): {
  detected: ProfileId | null;
  ambiguous: boolean;
  providers: string[];
} {
  const normalized = files.map(normalizeFile).sort();
  const providers: string[] = [];
  const hasCodex = normalized.some((f) => f === "AGENTS.md" || f.endsWith("/AGENTS.md"));
  const hasClaude = normalized.some((f) => f === "CLAUDE.md" || f.endsWith("/CLAUDE.md"));
  const hasCopilot = normalized.includes(".github/copilot-instructions.md");
  const hasGemini = normalized.some((f) => f === "GEMINI.md" || f.endsWith("/GEMINI.md"));
  if (hasCodex) providers.push("codex");
  if (hasClaude) providers.push("claude");
  if (hasCopilot) providers.push("copilot");
  if (hasGemini) providers.push("gemini");
  if (providers.length === 1)
    return { detected: providers[0] as ProfileId, ambiguous: false, providers };
  if (providers.length === 0) return { detected: null, ambiguous: false, providers };
  return { detected: null, ambiguous: true, providers };
}
