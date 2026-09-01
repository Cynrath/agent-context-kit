import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-drift-cli-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# drift cli fixture\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
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

describe("ackit drift check CLI integration (§9)", () => {
  it("reports findings with --ci gate semantics on a real repository", async () => {
    const created = await cli(["task", "create", "drift cli fixture"]);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";

    // Author a declared scope + a dependency on a task that is not completed.
    const docAbs = path.join(
      rootPath,
      "docs",
      "tasks",
      "active",
      path.basename(
        // task file naming mirrors TaskStore slug rules
        `${taskId}-drift-cli-fixture.md`,
      ),
    );
    const { readFile } = await import("node:fs/promises");
    const raw = await readFile(docAbs, "utf8");
    const frontmatterEnd = raw.indexOf("---", 3);
    const body = [
      "## Affected files",
      "",
      "- src/a/**",
      "",
      "## Acceptance criteria",
      "",
      "- [ ] A.",
      "",
      "## Completion notes",
      "",
      "(placeholder)",
    ].join("\n");
    const { serialize } = await import("../../../src/core/tasks/index.js");
    const { TaskStore } = await import("../../../src/core/tasks/index.js");
    const found = await new TaskStore(rootPath).find(taskId);
    if (found === null) throw new Error("task doc missing before authoring");
    await writeFile(docAbs, serialize(found.doc.meta, body), "utf8");

    // Unplanned change outside declared scope (untracked file).
    await mkdir(path.join(rootPath, "src"), { recursive: true });
    await writeFile(path.join(rootPath, "src", "security.ts"), "export const s = 1;\n", "utf8");

    const report = await cli(["drift", "check", taskId]);
    expect(report.code).toBe(EXIT_CODES.ok); // no --ci → advisory exit 0
    expect(report.stdout).toContain("UNPLANNED_FILE_CHANGE");
    expect(report.stdout).toContain("src/security.ts");

    // Task updated to declare the new scope first → finding disappears.
    const bodyUpdated = [
      "## Affected files",
      "",
      "- src/a/**",
      "- src/security.ts",
      "",
      "## Acceptance criteria",
      "",
      "- [ ] A.",
      "",
      "## Completion notes",
      "",
      "(placeholder)",
    ].join("\n");
    const found2 = await new TaskStore(rootPath).find(taskId);
    if (found2 === null) throw new Error("task doc missing before update");
    await writeFile(docAbs, serialize(found2.doc.meta, bodyUpdated), "utf8");
    const clean = await cli(["drift", "check", taskId]);
    expect(clean.stdout).not.toContain("UNPLANNED_FILE_CHANGE");

    // --ci with blocking findings exits 1: make the workflow require artifacts.
    await cli(["workflow", "set", taskId, "--profile", "standard"]);
    await writeFile(path.join(rootPath, "src", "outside.ts"), "export const o = 1;\n", "utf8");
    const bodyNarrow = [
      "## Affected files",
      "",
      "- src/a/**",
      "",
      "## Acceptance criteria",
      "",
      "- [ ] A.",
      "",
      "## Completion notes",
      "",
      "(placeholder)",
    ].join("\n");
    const found3 = await new TaskStore(rootPath).find(taskId);
    if (found3 === null) throw new Error("task doc missing before narrowing");
    await writeFile(docAbs, serialize(found3.doc.meta, bodyNarrow), "utf8");
    const gated = await cli(["drift", "check", taskId, "--ci"]);
    expect(gated.code).toBe(EXIT_CODES.thresholdExceeded);
    expect(gated.stdout).toContain("BLOCKING");

    const json = await cli(["--json", "drift", "check", taskId]);
    const parsed = JSON.parse(json.stdout) as { findings: { code: string }[] };
    expect(Array.isArray(parsed.findings)).toBe(true);
  });

  it("unknown tasks fail with usage exit code", async () => {
    const unknown = await cli(["drift", "check", "TASK-9999"]);
    expect(unknown.code).toBe(EXIT_CODES.usage);
  });
});
