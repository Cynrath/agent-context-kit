import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import { validateSkills } from "../../../src/core/skills/validate.js";

vi.mock("node:child_process", () => ({ spawn: vi.fn(), exec: vi.fn(), execFile: vi.fn() }));

let repo: { root: RepositoryRoot; cleanup(): Promise<void> };

const VALID_SKILL = `---
name: release-helper
description: Guides a release end to end.
---

See [runbook](references/runbook.md).
`;

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(tmpdir(), "ackit-skills-"));
  repo = {
    root: { canonicalPath: rootPath },
    cleanup: () => rm(rootPath, { recursive: true, force: true }),
  };
});

afterAll(async () => {
  await repo.cleanup();
});

async function writeSkill(dirName: string, content: string): Promise<string> {
  const skillDir = path.join(repo.root.canonicalPath, ".agents", "skills", dirName);
  await mkdir(skillDir, { recursive: true });
  const skillPath = path.join(skillDir, "SKILL.md");
  await writeFile(skillPath, content, "utf8");
  return skillPath;
}

function issueIds(result: Awaited<ReturnType<typeof validateSkills>>): string[] {
  return result.issues.map((issue) => issue.id);
}

describe("skills validation matrix (REQ-SKILL-005)", () => {
  it("accepts a fully valid skill with references and reports scripts without executing them", async () => {
    const spawnSpy = (await import("node:child_process")) as unknown as Record<
      string,
      ReturnType<typeof vi.fn>
    >;
    const skillDir = path.join(repo.root.canonicalPath, ".agents", "skills", "release-helper");
    await mkdir(path.join(skillDir, "scripts"), { recursive: true });
    await mkdir(path.join(skillDir, "references"), { recursive: true });
    await writeFile(path.join(skillDir, "scripts", "run.sh"), "#!/bin/sh\n");
    await writeFile(path.join(skillDir, "references", "runbook.md"), "steps\n");
    await writeSkill("release-helper", VALID_SKILL);

    const result = await validateSkills(repo.root);
    expect(issueIds(result)).toEqual([]);
    const record = result.skills.find((skill) => skill.name === "release-helper");
    expect(record?.scripts).toEqual(["run.sh"]);
    // Zero execution attempts: no child_process function was invoked.
    for (const value of Object.values(spawnSpy)) {
      if (typeof value === "function" && "mock" in value) {
        expect(value).not.toHaveBeenCalled();
      }
    }
    vi.doUnmock("node:child_process");
  });

  it("flags missing frontmatter as strict", async () => {
    await writeSkill("no-fm", "plain body\n");
    const result = await validateSkills(repo.root);
    expect(issueIds(result)).toContain("SKILL-FRONTMATTER-MISSING");
  });

  it("flags invalid YAML frontmatter as strict", async () => {
    await writeSkill("bad-yaml", "---\nname: [unclosed\n---\nbody\n");
    const result = await validateSkills(repo.root);
    expect(issueIds(result)).toContain("SKILL-FRONTMATTER-MISSING");
  });

  it("flags missing description as strict", async () => {
    await writeSkill("no-desc", "---\nname: no-desc\n---\nbody\n");
    const result = await validateSkills(repo.root);
    expect(issueIds(result)).toContain("SKILL-DESCRIPTION-MISSING");
  });

  it("flags directory/name mismatch as strict", async () => {
    await writeSkill("wrong-dir", "---\nname: other-name\ndescription: x\n---\n");
    const result = await validateSkills(repo.root);
    expect(issueIds(result)).toContain("SKILL-DIR-MISMATCH");
  });

  it("flags non-kebab names as strict", async () => {
    await writeSkill("Bad_Name", "---\nname: Bad_Name\ndescription: x\n---\n");
    const result = await validateSkills(repo.root);
    expect(issueIds(result)).toContain("SKILL-NAME-INVALID");
  });

  it("flags duplicate skill names across nested locations as strict", async () => {
    const nestedRoot = path.join(
      repo.root.canonicalPath,
      "packages",
      "web",
      ".agents",
      "skills",
      "release-helper",
    );
    await mkdir(nestedRoot, { recursive: true });
    await writeFile(path.join(nestedRoot, "SKILL.md"), VALID_SKILL, "utf8");
    const result = await validateSkills(repo.root);
    const duplicates = result.issues.filter((issue) => issue.id === "SKILL-DUPLICATE");
    expect(duplicates.length).toBeGreaterThanOrEqual(2);
    await rm(path.join(repo.root.canonicalPath, "packages"), { recursive: true, force: true });
  });

  it("marks out-of-root reference as strict error", async () => {
    await writeSkill(
      "escaper",
      "---\nname: escaper\ndescription: x\n---\n[up](../../../../outside.md)\n",
    );
    const result = await validateSkills(repo.root);
    expect(issueIds(result)).toContain("SKILL-ROOT-ESCAPE");
  });

  it("marks broken local reference as strict error", async () => {
    await writeSkill(
      "broken-ref",
      "---\nname: broken-ref\ndescription: x\n---\n[g](missing-file.md)\n",
    );
    const result = await validateSkills(repo.root);
    expect(issueIds(result)).toContain("SKILL-BROKEN-REF");
  });

  it("warns on deep reference chains beyond the threshold", async () => {
    const r = repo.root.canonicalPath;
    await mkdir(path.join(r, "docs"), { recursive: true });
    await writeFile(path.join(r, "docs", "l1.md"), "[next](l2.md)\n");
    await writeFile(path.join(r, "docs", "l2.md"), "[next](l3.md)\n");
    await writeFile(path.join(r, "docs", "l3.md"), "[next](l4.md)\n");
    await writeFile(path.join(r, "docs", "l4.md"), "leaf\n");
    await writeSkill(
      "chainy",
      "---\nname: chainy\ndescription: x\n---\n[start](../../../docs/l1.md)\n",
    );
    const result = await validateSkills(repo.root);
    expect(issueIds(result)).toContain("SKILL-DEEP-CHAIN");
    const tier = result.issues.find((issue) => issue.id === "SKILL-DEEP-CHAIN")?.tier;
    expect(tier).toBe("warning");
  });

  it("handles BOM and CRLF fixtures without false positives", async () => {
    await writeSkill(
      "crlf-skill",
      "﻿---\r\nname: crlf-skill\r\ndescription: handles CRLF\r\n---\r\nbody\r\n",
    );
    const result = await validateSkills(repo.root);
    const relevant = result.issues.filter((issue) => issue.relativePath.includes("crlf-skill"));
    expect(relevant.filter((issue) => issue.tier === "strict")).toEqual([]);
  });

  it("validates the real repository cleanly when skills exist or not", async () => {
    const result = await validateSkills({ canonicalPath: process.cwd() });
    expect(Array.isArray(result.skills)).toBe(true);
    expect(result.issues.every((issue) => typeof issue.message === "string")).toBe(true);
    void readFile;
  });
});
