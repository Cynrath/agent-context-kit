export const SKILL_BASENAME = "SKILL.md";
/** Matches `.agents/skills/<name>/SKILL.md` at any repository depth. */
export const SKILL_PATH_PATTERN = /(^|\/)\.agents\/skills\/([^/]+)\/SKILL\.md$/;

/** Open-standard kebab-case skill name. */
const KEBAB_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const MAX_DESCRIPTION_LENGTH = 1024;
export const MAX_REFERENCE_CHAIN_DEPTH = 3;

export interface SkillRecord {
  /** Skill name from frontmatter (must equal parent directory name). */
  name: string;
  description: string;
  relativePath: string;
  checksum: string;
  tokenEstimate: number;
  scripts: string[];
  references: string[];
  assets: string[];
}

export interface SkillIssue {
  id: string;
  tier: "strict" | "warning";
  message: string;
  relativePath: string;
}

export interface SkillValidationResult {
  skills: SkillRecord[];
  issues: SkillIssue[];
}

export function isValidKebabName(name: string): boolean {
  return KEBAB_PATTERN.test(name);
}
