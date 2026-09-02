import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-skill-export-"));
  const skillDir = path.join(rootPath, ".agents", "skills", "export-fixture");
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    [
      "---",
      'name: "export-fixture"',
      'description: "Fixture skill for export."',
      "---",
      "",
      "## Steps",
      "",
      "1. Do the thing.",
    ].join("\n"),
    "utf8",
  );
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function cli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const chunks: string[] = [];
  const errChunks: string[] = [];
  const originalWrite = process.stdout.write;
  const originalErr = process.stderr.write;
  process.stdout.write = ((chunk: string) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => {
    errChunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  try {
    const code = await runCli(["node", "ackit", "--root", rootPath, ...args]);
    return { code, stdout: chunks.join(""), stderr: errChunks.join("") };
  } finally {
    process.stdout.write = originalWrite;
    process.stderr.write = originalErr;
  }
}

describe("ackit skills export CLI (TASK-0057)", () => {
  it("exports claude/copilot/generic projections deterministically", async () => {
    const claude = await cli([
      "skills",
      "export",
      "--provider",
      "claude",
      "--out",
      "exported/claude",
    ]);
    expect(claude.code).toBe(EXIT_CODES.ok);
    expect(claude.stdout).toContain("exported 1 skill(s)");
    const { readFile } = await import("node:fs/promises");
    const claudeFile = await readFile(
      path.join(rootPath, "exported", "claude", "export-fixture", "SKILL.md"),
      "utf8",
    );
    expect(claudeFile).toContain('name: "export-fixture"');

    const copilot = await cli([
      "skills",
      "export",
      "--provider",
      "copilot",
      "--out",
      "exported/copilot",
    ]);
    expect(copilot.code).toBe(EXIT_CODES.ok);
    const copilotFile = await readFile(
      path.join(
        rootPath,
        "exported",
        "copilot",
        "export-fixture",
        "export-fixture.instructions.md",
      ),
      "utf8",
    );
    expect(copilotFile).toContain("applyTo:");

    const generic = await cli([
      "skills",
      "export",
      "--provider",
      "generic",
      "--out",
      "exported/generic",
    ]);
    expect(generic.code).toBe(EXIT_CODES.ok);
    const genericFile = await readFile(
      path.join(rootPath, "exported", "generic", "export-fixture", "export-fixture.md"),
      "utf8",
    );
    expect(genericFile).toContain("# Skill: export-fixture");
  });

  it("refuses overwrites without --force; --force overwrites explicitly", async () => {
    const refused = await cli([
      "skills",
      "export",
      "--provider",
      "generic",
      "--out",
      "exported/generic",
    ]);
    expect(refused.code).toBe(EXIT_CODES.securityBoundary);
    expect(refused.stderr).toContain("skill-export-exists");

    const forced = await cli([
      "skills",
      "export",
      "--provider",
      "generic",
      "--out",
      "exported/generic",
      "--force",
    ]);
    expect(forced.code).toBe(EXIT_CODES.ok);
  });

  it("refuses traversal out-paths and unknown providers", async () => {
    const traversal = await cli([
      "skills",
      "export",
      "--provider",
      "generic",
      "--out",
      "../escape",
    ]);
    expect(traversal.code).toBe(EXIT_CODES.securityBoundary);
    const unknown = await cli([
      "skills",
      "export",
      "--provider",
      "vendor-x",
      "--out",
      "exported/x",
    ]);
    expect(unknown.code).toBe(EXIT_CODES.usage);
    expect(unknown.stderr).toContain("unknown provider");
  });
});
