/**
 * v0.5 trust-flow demo as test (TASK-0085).
 *
 * The reproducible public demo, executed — not narrated. One scripted flow
 * proves the differentiated core end to end with asserted codes, digests,
 * and cross-process resume equivalence:
 *
 *   claim done → blocked (proof/verdict missing) → evidence added →
 *   bundle generated → state-bound verdict registered → eligible →
 *   state moves → stale verdict blocks → fresh bundle/verdict restores →
 *   completed → checkpoint/handoff exported → SECOND PROCESS resumes.
 *
 * Runs in CI like every other test (deterministic fixture, synthetic
 * content, offline). The human-readable companion is
 * docs/guides/demo-trust-flow.md (same command sequence).
 */
import { execFile as execFileCallback, execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/index.js";
import { EXIT_CODES } from "../../src/shared/exit-codes.js";

const execFile = promisify(execFileCallback);
const DATE = "2026-08-31";

let rootPath = "";
let cliEntry = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-trust-demo-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# trust flow demo\n", "utf8");
  await writeFile(path.join(rootPath, "src-impl.js"), "export const x = 1;\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
  cliEntry = path.resolve(import.meta.dirname, "..", "..", "dist", "cli", "index.js");
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

/** In-process CLI (the demo's first session). */
async function session(args: string[]): Promise<CliResult> {
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

/** Fresh OS process (the demo's second session — zero shared memory). */
async function secondProcess(args: string[]): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFile(
      process.execPath,
      [cliEntry, "--root", rootPath, ...args],
      { timeout: 60_000, maxBuffer: 8 * 1024 * 1024 },
    );
    return { code: 0, stdout, stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof failure.code === "number" ? failure.code : 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
    };
  }
}

describe("v0.5 trust-flow demo (TASK-0080..0082 composed)", () => {
  it("claim → blocked → proven → eligible → stale → restored → completed → resumed", async () => {
    const { TaskStore, serialize } = await import("../../src/core/tasks/index.js");
    const { mkdir: mk } = await import("node:fs/promises");

    // ---- STAGE 1: intent + plan + the task claims done.
    await session(["intent", "new", "Demo the trust flow"]);
    const store = new TaskStore(rootPath);
    await mk(path.join(rootPath, "docs", "plans"), { recursive: true });
    await writeFile(path.join(rootPath, "docs", "plans", "demo.md"), "# demo plan\n", "utf8");
    const created = await session([
      "task",
      "create",
      "Demo trust fixture",
      "--intent",
      "INTENT-0001",
      "--plan",
      "docs/plans/demo.md",
    ]);
    expect(created.code).toBe(EXIT_CODES.ok);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";
    expect(taskId).toMatch(/^TASK-\d{4}$/);
    const found = await store.find(taskId);
    if (found === null) throw new Error("task missing");
    const docAbs = path.join(rootPath, ...found.doc.relativePath.split("/"));
    await writeFile(
      docAbs,
      serialize(
        found.doc.meta,
        [
          "## Acceptance criteria",
          "",
          "- [x] Demo thing done.",
          "- [x] Second demo thing done.",
          "",
          "## Completion notes",
          "",
          "Demo things implemented; evidence recorded below.",
        ].join("\n"),
      ),
      "utf8",
    );
    await session(["workflow", "set", taskId, "--profile", "standard"]);
    await session(["task", "start", taskId]);
    expect((await session(["workflow", "advance", taskId])).code).toBe(EXIT_CODES.ok);
    expect((await session(["workflow", "advance", taskId])).code).toBe(EXIT_CODES.ok);
    expect((await session(["workflow", "advance", taskId])).code).toBe(EXIT_CODES.ok);

    // ---- STAGE 2: completion is BLOCKED — proof and verdict are missing.
    const blocked = await session(["task", "complete", taskId]);
    expect(blocked.code).toBe(EXIT_CODES.usage);
    expect(blocked.stderr).toContain("MISSING_REQUIRED_ARTIFACT");
    expect(blocked.stderr).toContain("MISSING_VERIFIER_VERDICT");

    // ---- STAGE 3: evidence added; the verdict blocker stands alone.
    await session(["evidence", "sync", taskId]);
    await session([
      "evidence",
      "verify",
      taskId,
      "--criterion",
      "AC-001",
      "--type",
      "test",
      "--ref",
      "pnpm vitest run (demo green)",
    ]);
    await session([
      "evidence",
      "verify",
      taskId,
      "--criterion",
      "AC-002",
      "--type",
      "build",
      "--ref",
      "pnpm build (demo green)",
    ]);
    await session(["workflow", "advance", taskId, "--to", "verify"]);
    const stillBlocked = await session(["task", "complete", taskId]);
    expect(stillBlocked.code).toBe(EXIT_CODES.usage);
    expect(stillBlocked.stderr).toContain("MISSING_VERIFIER_VERDICT");
    expect(stillBlocked.stderr).not.toContain("MISSING_REQUIRED_ARTIFACT");

    // ---- STAGE 4: bundle generated; status narrates the next action.
    await mk(path.join(rootPath, ".ackit", "demo"), { recursive: true });
    const bundled = await session([
      "verification",
      "bundle",
      taskId,
      "--format",
      "json",
      "--out",
      ".ackit/demo/bundle.json",
    ]);
    expect(bundled.code).toBe(EXIT_CODES.ok);
    const prestige = await session(["status", taskId]);
    expect(prestige.stdout).toContain("MISSING_VERIFIER_VERDICT");
    expect(prestige.stdout).toContain(`ackit verification bundle ${taskId}`);

    // ---- STAGE 5: state-bound verdict registered; digests match.
    const verdictYaml = [
      'schemaId: "ackit.verdict.v1"',
      `taskId: "${taskId}"`,
      'verdict: "PASS"',
      "verifier:",
      '  agent: "demo-verifier/1.0"',
      '  context: "fresh"',
      `  issuedAt: "${DATE}"`,
      "findings: []",
      "checkedCriteria:",
      '  - "AC-001"',
      '  - "AC-002"',
      'summary: "demo criteria met with recorded evidence"',
    ].join("\n");
    await writeFile(path.join(rootPath, ".ackit", "demo", "verdict.yaml"), verdictYaml, "utf8");
    // Re-export over the settled review state: review artifacts live
    // under .ackit/ (excluded from binding), so the digest is unchanged —
    // determinism across the authoring step, asserted below.
    await session([
      "verification",
      "bundle",
      taskId,
      "--format",
      "json",
      "--out",
      ".ackit/demo/bundle.json",
    ]);
    const freshBundle = JSON.parse(
      await readFile(path.join(rootPath, ".ackit", "demo", "bundle.json"), "utf8"),
    ) as { binding: { bundleDigest: string } };
    expect(freshBundle.binding.bundleDigest).toMatch(/^[0-9a-f]{64}$/);
    const recorded = await session([
      "--json",
      "verification",
      "record",
      taskId,
      "--verdict",
      ".ackit/demo/verdict.yaml",
      "--bundle",
      ".ackit/demo/bundle.json",
    ]);
    expect(recorded.code).toBe(EXIT_CODES.ok);
    const record = JSON.parse(recorded.stdout) as {
      bundleDigest: string;
      independent: boolean;
    };
    // Digest match: the registered verdict references EXACTLY the bundle
    // the verifier reviewed (TASK-0080), which is current state (0079).
    expect(record.independent).toBe(true);
    expect(record.bundleDigest).toBe(freshBundle.binding.bundleDigest);

    // ---- STAGE 6: completion eligible (asserted, not yet taken).
    const eligible = await session(["--json", "status", taskId]);
    expect(eligible.code).toBe(EXIT_CODES.ok);
    const eligibleReport = JSON.parse(eligible.stdout) as {
      blockers: string[];
      next: { command: string }[];
      verdict: { fresh: boolean; independent: boolean };
    };
    expect(eligibleReport.blockers).toEqual([]);
    expect(eligibleReport.verdict).toMatchObject({ fresh: true, independent: true });
    expect(eligibleReport.next).toEqual([
      {
        action: `complete task ${taskId}`,
        command: `ackit task complete ${taskId}`,
        reason: "all completion gates pass",
      },
    ]);

    // ---- STAGE 7: a second implementation pass moves reviewed state,
    // so the recorded verdict goes stale and blocks completion.
    await writeFile(path.join(rootPath, "src-demo-v2.js"), "export const demo = 2;\n", "utf8");
    const stale = await session(["task", "complete", taskId]);
    expect(stale.code).toBe(EXIT_CODES.usage);
    expect(stale.stderr).toContain("VERDICT-STATE-STALE");
    expect(stale.stderr).toContain("sourceState");
    const staleStatus = await session(["status", taskId]);
    expect(staleStatus.stdout).toContain("STALE (VERDICT-STATE-STALE: sourceState");

    // ---- STAGE 8: fresh bundle + fresh verdict restore eligibility.
    // The new bundle digest differs (state-sensitive binding), and the
    // new verdict content differs (replay would refuse the old file).
    await session([
      "verification",
      "bundle",
      taskId,
      "--format",
      "json",
      "--out",
      ".ackit/demo/bundle.json",
    ]);
    const secondBundle = JSON.parse(
      await readFile(path.join(rootPath, ".ackit", "demo", "bundle.json"), "utf8"),
    ) as { binding: { bundleDigest: string } };
    expect(secondBundle.binding.bundleDigest).not.toBe(freshBundle.binding.bundleDigest);
    await writeFile(
      path.join(rootPath, ".ackit", "demo", "verdict-2.yaml"),
      verdictYaml.replace(
        'summary: "demo criteria met with recorded evidence"',
        'summary: "demo re-verified after the second pass"',
      ),
      "utf8",
    );
    const rerecorded = await session([
      "verification",
      "record",
      taskId,
      "--verdict",
      ".ackit/demo/verdict-2.yaml",
      "--bundle",
      ".ackit/demo/bundle.json",
    ]);
    expect(rerecorded.code).toBe(EXIT_CODES.ok);
    const restored = await session(["--json", "status", taskId]);
    expect(restored.code).toBe(EXIT_CODES.ok);
    expect((JSON.parse(restored.stdout) as { blockers: string[] }).blockers).toEqual([]);

    // ---- STAGE 9: completion succeeds.
    const completed = await session(["task", "complete", taskId]);
    expect(completed.code).toBe(EXIT_CODES.ok);
    expect(completed.stdout).toContain("completed");

    // ---- STAGE 10: checkpoint + portable handoff exported.
    await session([
      "checkpoint",
      "create",
      taskId,
      "--next-objective",
      "demo resumed across processes",
      "--next-command",
      `ackit status ${taskId}`,
    ]);
    const handoff = await session([
      "checkpoint",
      "export",
      taskId,
      "--format",
      "json",
      "--out",
      ".ackit/demo/handoff.json",
    ]);
    expect(handoff.code).toBe(EXIT_CODES.ok);
    const handoffJson = JSON.parse(
      await readFile(path.join(rootPath, ".ackit", "demo", "handoff.json"), "utf8"),
    ) as { schemaVersion: string };
    expect(handoffJson.schemaVersion).toBe("ackit.handoff.v2");

    // ---- STAGE 11: a SECOND PROCESS resumes (zero shared memory).
    const imported = await secondProcess(["checkpoint", "import", ".ackit/demo/handoff.json"]);
    expect(imported.code).toBe(0);
    expect(imported.stdout).toContain(`${taskId}: handoff CP-0001 fresh`);
    expect(imported.stdout).toContain("demo resumed across processes");
    const resumed = await secondProcess(["task", "resume", taskId]);
    expect(resumed.code).toBe(0);
    expect(resumed.stdout).toContain("demo resumed across processes");
    // Agreement: the second process sees the same completed state.
    const remoteStatus = await secondProcess(["--json", "status", taskId]);
    expect(remoteStatus.code).toBe(0);
    const remoteReport = JSON.parse(remoteStatus.stdout) as {
      task: { id: string; status: string };
    };
    expect(remoteReport.task).toMatchObject({ id: taskId, status: "completed" });
  }, 180_000);
});
