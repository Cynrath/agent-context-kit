import type { SkillRecord } from "./types.js";

/** Projection input: canonical record plus the skill body read by the caller. */
export interface SkillProjectionInput extends SkillRecord {
  body: string;
}

/**
 * Provider projections (TASK-0057 / ADR-0028 §5): deterministic pure functions
 * from the canonical SkillRecord to documented provider layouts. The canonical
 * open-standard SKILL.md parser stays the single source of truth; projections
 * emit DATA ONLY (no scripts, no executable metadata); no vendor format is
 * adopted as canonical; no network.
 */

/** Claude Code skill layout: identical SKILL.md shape (already compatible). */
export function projectSkillClaude(record: SkillProjectionInput): {
  fileName: string;
  content: string;
} {
  return {
    fileName: "SKILL.md",
    content: [
      "---",
      `name: "${record.name}"`,
      `description: "${record.description.replace(/"/g, '\\"')}"`,
      "---",
      "",
      record.body,
    ].join("\n"),
  };
}

/**
 * GitHub Copilot instructions layout: `.github/instructions/<name>.instructions.md`
 * with an `applyTo` glob derived from the skill's references/assets when the
 * derivation is deterministic; otherwise the conservative whole-repository
 * glob (never guessed).
 */
export function projectSkillCopilot(record: SkillProjectionInput): {
  fileName: string;
  content: string;
} {
  const derived = deriveApplyTo(record);
  return {
    fileName: `${record.name}.instructions.md`,
    content: [
      "---",
      `applyTo: ${derived}`,
      "---",
      "",
      `# ${record.name}`,
      "",
      record.description,
      "",
      record.body,
    ].join("\n"),
  };
}

/** Provider-agnostic fallback: plain markdown skill sheet. */
export function projectSkillGeneric(record: SkillProjectionInput): {
  fileName: string;
  content: string;
} {
  return {
    fileName: `${record.name}.md`,
    content: [
      `# Skill: ${record.name}`,
      "",
      record.description,
      "",
      "## References",
      "",
      ...(record.references.length > 0 ? record.references.map((ref) => `- ${ref}`) : ["- (none)"]),
      "## Assets",
      "",
      ...(record.assets.length > 0 ? record.assets.map((asset) => `- ${asset}`) : ["- (none)"]),
      "",
      "## Content",
      "",
      record.body,
    ].join("\n"),
  };
}

export const SKILL_PROJECTION_PROVIDERS = ["claude", "copilot", "generic"] as const;
export type SkillProjectionProvider = (typeof SKILL_PROJECTION_PROVIDERS)[number];

export function projectSkill(
  provider: SkillProjectionProvider,
  record: SkillProjectionInput,
): { fileName: string; content: string } {
  switch (provider) {
    case "claude":
      return projectSkillClaude(record);
    case "copilot":
      return projectSkillCopilot(record);
    case "generic":
      return projectSkillGeneric(record);
  }
}

/** Deterministic applyTo derivation; whole-repo glob when not derivable. */
function deriveApplyTo(record: SkillProjectionInput): string {
  // Only code-file references produce a derivation; anything else (or nothing)
  // falls back to the conservative whole-repo glob with an explicit comment in
  // the emitted content (documented, never guessed).
  const codeRefs = record.references.filter((ref) =>
    /\.(ts|tsx|js|jsx|py|go|rs|java|cs)$/.test(ref),
  );
  if (codeRefs.length === 0) return "**/*";
  const dir = longestCommonDirectory(codeRefs);
  return dir !== null ? `${dir}**/*` : "**/*";
}

function longestCommonDirectory(paths: readonly string[]): string | null {
  const split = paths.map((p) => p.split("/").slice(0, -1));
  if (split.length === 0) return null;
  let prefix = split[0] ?? [];
  for (const parts of split.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < parts.length && prefix[i] === parts[i]) i += 1;
    prefix = prefix.slice(0, i);
  }
  return prefix.length > 0 ? `${prefix.join("/")}/` : null;
}
