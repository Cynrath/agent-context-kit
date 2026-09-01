import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import type { SkillProjectionInput } from "../../../src/core/skills/project.js";
import {
  projectSkillClaude,
  projectSkillCopilot,
  projectSkillGeneric,
} from "../../../src/core/skills/project.js";
import type { SkillRecord } from "../../../src/core/skills/types.js";
import { validateSkills } from "../../../src/core/skills/validate.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-skillproj-"));
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

function projectionInput(overrides: Partial<SkillProjectionInput> = {}): SkillProjectionInput {
  const base: SkillRecord = {
    name: "deploy-helper",
    description: "Helps deploy safely.",
    relativePath: ".agents/skills/deploy-helper/SKILL.md",
    checksum: "abc123",
    tokenEstimate: 100,
    scripts: [],
    references: ["src/deploy/run.ts", "src/deploy/config.ts"],
    assets: [],
  };
  return { ...base, body: "## Steps\n\n1. Run the checks.", ...overrides };
}

describe("skill provider projections (TASK-0057 / ADR-0028 §5)", () => {
  it("claude projection: identical open-standard SKILL.md shape", () => {
    const result = projectSkillClaude(projectionInput());
    expect(result.fileName).toBe("SKILL.md");
    expect(result.content).toContain('name: "deploy-helper"');
    expect(result.content).toContain('description: "Helps deploy safely."');
    expect(result.content).toContain("## Steps");
  });

  it("copilot projection: instructions file with deterministically derived applyTo", () => {
    const result = projectSkillCopilot(projectionInput());
    expect(result.fileName).toBe("deploy-helper.instructions.md");
    // Both references share src/deploy → derived directory glob.
    expect(result.content).toContain("applyTo: src/deploy/**/*");
    expect(result.content).toContain("# deploy-helper");
    // No code references → conservative whole-repo glob (never guessed).
    const fallback = projectSkillCopilot(projectionInput({ references: ["docs/guide.md"] }));
    expect(fallback.content).toContain("applyTo: **/*");
  });

  it("generic projection: provider-agnostic skill sheet", () => {
    const result = projectSkillGeneric(projectionInput());
    expect(result.fileName).toBe("deploy-helper.md");
    expect(result.content).toContain("# Skill: deploy-helper");
    expect(result.content).toContain("- src/deploy/run.ts");
    expect(result.content).toContain("## Content");
  });

  it("projections are deterministic: same input → byte-identical output", () => {
    const input = projectionInput();
    expect(projectSkillClaude(input)).toEqual(projectSkillClaude(input));
    expect(projectSkillCopilot(input)).toEqual(projectSkillCopilot(input));
    expect(projectSkillGeneric(input)).toEqual(projectSkillGeneric(input));
  });

  it("round-trip: claude projection reparses as a valid skill (identity preserved)", async () => {
    // Project a real skill from a fixture repo, write it as a Claude-layout
    // skill dir, and re-validate discovery: the canonical identity (name +
    // description frontmatter) survives the projection round-trip. References
    // are validator-discovered metadata from the ORIGINAL body — the Claude
    // layout preserves them only when the body carries them; projections
    // never invent metadata (documented limitation).
    const skillDir = path.join(rootPath, ".agents", "skills", "deploy-helper");
    await mkdir(skillDir, { recursive: true });
    const projection = projectSkillClaude(projectionInput());
    await writeFile(path.join(skillDir, "SKILL.md"), projection.content, "utf8");
    const resolved = await resolveRepositoryRoot(rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    const { skills } = await validateSkills(resolved.root);
    const reread = skills.find((s) => s.name === "deploy-helper");
    expect(reread?.description).toBe("Helps deploy safely.");
    expect(reread?.relativePath.endsWith("SKILL.md")).toBe(true);
  });

  it("projections emit no executable metadata (data-only)", () => {
    for (const projection of [
      projectSkillClaude(projectionInput()),
      projectSkillCopilot(projectionInput()),
      projectSkillGeneric(projectionInput()),
    ]) {
      expect(projection.content).not.toMatch(/scripts?\s*:/i);
      expect(projection.content).not.toMatch(/run\s*:/i);
    }
  });
});
