import { parse } from "yaml";

export interface FrontmatterResult {
  frontmatter: Record<string, unknown> | null;
  body: string;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Minimal YAML frontmatter extraction used by copilot *.instructions.md
 * (applyTo) and SKILL.md (name/description). Returns null frontmatter when
 * the file does not start with a `---` block.
 */
export function extractFrontmatter(content: string): FrontmatterResult {
  const normalized = content.replace(/^\uFEFF/, "");
  const match = FRONTMATTER_PATTERN.exec(normalized);
  if (match === null) {
    return { frontmatter: null, body: normalized };
  }
  try {
    const parsed = parse(match[1] ?? "");
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return {
        frontmatter: parsed as Record<string, unknown>,
        body: normalized.slice(match[0].length),
      };
    }
    return { frontmatter: null, body: normalized.slice(match[0].length) };
  } catch {
    return { frontmatter: null, body: normalized.slice(match[0].length) };
  }
}

/** Normalizes applyTo values: string glob, or list of globs. */
export function normalizeApplyTo(value: unknown): string[] | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }
  if (Array.isArray(value)) {
    const globs = value.filter((entry): entry is string => typeof entry === "string");
    return globs.length > 0 ? globs.map((glob) => glob.trim()) : null;
  }
  return null;
}
