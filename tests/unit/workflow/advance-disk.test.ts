import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-adv-disk-"));
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function cli(
  args: string[],
  cwd: string = rootPath,
): Promise<{ code: number; stdout: string; stderr: string }> {
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
    const code = await runCli(["node", "ackit", "--root", cwd, ...args]);
    return { code, stdout: chunks.join(""), stderr: errChunks.join("") };
  } finally {
    process.stdout.write = originalWrite;
    process.stderr.write = originalErr;
  }
}

async function makeRepo(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "ackit-advcase-"));
  execFileSync("git", ["-C", dir, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", dir, "config", "user.email", "t@example.com"], { stdio: "ignore" });
  execFileSync("git", ["-C", dir, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(dir, "ackit.yml"), "schemaVersion: 1\n", "utf8");
  await writeFile(path.join(dir, "AGENTS.md"), "# t\n", "utf8");
  return dir;
}

async function createTask(dir: string, planRef?: string): Promise<string> {
  await mkdir(path.join(dir, "docs", "tasks", "active"), { recursive: true });
  const created = await cli(["task", "create", "advance disk fixture"], dir);
  const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";
  // Attach planRef directly (task create has no planRef flag in this build).
  if (planRef !== undefined) {
    const { readdir, readFile } = await import("node:fs/promises");
    const files = await readdir(path.join(dir, "docs", "tasks", "active"));
    const file = files.find((f) => f.startsWith(taskId)) ?? "";
    const abs = path.join(dir, "docs", "tasks", "active", file);
    const raw = await readFile(abs, "utf8");
    await writeFile(
      abs,
      raw.replace(/^status:.*$/m, `status: pending\nplanRef: "${planRef}"`),
      "utf8",
    );
  }
  return taskId;
}

describe("TASK-0068 advance gate validates disk existence", () => {
  it("declared-but-missing plan blocks advance with deterministic finding", async () => {
    const dir = await makeRepo();
    try {
      const taskId = await createTask(dir, "docs/plans/missing-plan.md");
      // Standard profile: intent → plan requires plan artifact at plan stage.
      // First need intent to get past intent stage: create a real intent.
      const intent = await cli(["intent", "new", "advance intent"], dir);
      expect(intent.code).toBe(EXIT_CODES.ok);
      // Attach intentRef so intent stage can pass.
      const { readdir, readFile } = await import("node:fs/promises");
      const files = await readdir(path.join(dir, "docs", "tasks", "active"));
      const file = files.find((f) => f.startsWith(taskId)) ?? "";
      const abs = path.join(dir, "docs", "tasks", "active", file);
      const raw = await readFile(abs, "utf8");
      const intentId = /INTENT-\d{4}/.exec(intent.stdout)?.[0] ?? "INTENT-0001";
      await writeFile(
        abs,
        raw.replace(/^status:.*$/m, `status: pending\nintentRef: "${intentId}"`),
        "utf8",
      );
      await cli(["workflow", "set", taskId, "--profile", "standard"], dir);
      // Advancing intent → plan validates the TARGET (plan) artifact, which is
      // declared-but-absent → deterministic denial (no implicit creation).
      const toPlan = await cli(["workflow", "advance", taskId], dir);
      expect(toPlan.code).toBe(EXIT_CODES.thresholdExceeded);
      expect(toPlan.stderr).toContain("missing required artifact");
      expect(toPlan.stderr).toContain("plan");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("valid nested plan path passes (no implicit creation)", async () => {
    const dir = await makeRepo();
    try {
      await mkdir(path.join(dir, "docs", "plans", "nested"), { recursive: true });
      await writeFile(path.join(dir, "docs", "plans", "nested", "p.md"), "# plan\n", "utf8");
      const taskId = await createTask(dir, "docs/plans/nested/p.md");
      const { readdir, readFile } = await import("node:fs/promises");
      const files = await readdir(path.join(dir, "docs", "tasks", "active"));
      const file = files.find((f) => f.startsWith(taskId)) ?? "";
      const abs = path.join(dir, "docs", "tasks", "active", file);
      const raw = await readFile(abs, "utf8");
      const intent = await cli(["intent", "new", "advance intent"], dir);
      const intentId = /INTENT-\d{4}/.exec(intent.stdout)?.[0] ?? "INTENT-0001";
      await writeFile(
        abs,
        raw.replace(/^status:.*$/m, `status: pending\nintentRef: "${intentId}"`),
        "utf8",
      );
      await cli(["workflow", "set", taskId, "--profile", "standard"], dir);
      expect((await cli(["workflow", "advance", taskId], dir)).code).toBe(EXIT_CODES.ok);
      const pastPlan = await cli(["workflow", "advance", taskId], dir);
      // Plan file exists → advance past plan succeeds (to tasks).
      expect(pastPlan.code).toBe(EXIT_CODES.ok);
      expect(pastPlan.stdout).toContain("tasks");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("absolute path and traversal are denied (schema + gate, no escape)", async () => {
    // TaskMetaSchema already rejects absolute/traversal planRef at parse time
    // (deterministic schema deny); the advance-gate containment in
    // refExistsOnDisk is defense-in-depth for any ref that reaches the gate.
    for (const evil of ["/etc/passwd", "../outside.md", "../../etc/passwd"]) {
      const dir = await makeRepo();
      try {
        const taskId = await createTask(dir, evil);
        // Task is unparsable → doctor reports it deterministically …
        const doctor = await cli(["task", "doctor"], dir);
        expect(doctor.code).not.toBe(EXIT_CODES.ok);
        expect(doctor.stderr).toMatch(/unparsable|TASK-REF-MISSING/);
        // … and the workflow gate cannot resolve the task (usage deny, never a pass).
        const set = await cli(["workflow", "set", taskId, "--profile", "standard"], dir);
        expect(set.code).toBe(EXIT_CODES.usage);
        void taskId;
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
  });

  it("missing required declaration also denies (no planRef at all)", async () => {
    const dir = await makeRepo();
    try {
      const taskId = await createTask(dir, undefined);
      const { readdir, readFile } = await import("node:fs/promises");
      const files = await readdir(path.join(dir, "docs", "tasks", "active"));
      const file = files.find((f) => f.startsWith(taskId)) ?? "";
      const abs = path.join(dir, "docs", "tasks", "active", file);
      const raw = await readFile(abs, "utf8");
      const intent = await cli(["intent", "new", "advance intent"], dir);
      const intentId = /INTENT-\d{4}/.exec(intent.stdout)?.[0] ?? "INTENT-0001";
      await writeFile(
        abs,
        raw.replace(/^status:.*$/m, `status: pending\nintentRef: "${intentId}"`),
        "utf8",
      );
      await cli(["workflow", "set", taskId, "--profile", "standard"], dir);
      // No planRef at all → intent → plan denied (missing plan artifact).
      const toPlan = await cli(["workflow", "advance", taskId], dir);
      expect(toPlan.code).toBe(EXIT_CODES.thresholdExceeded);
      expect(toPlan.stderr).toContain("missing required artifact");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
