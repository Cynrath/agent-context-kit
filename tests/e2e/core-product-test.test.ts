import { execFile as execFileCallback, execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/index.js";
import { EXIT_CODES } from "../../src/shared/exit-codes.js";

const execFile = promisify(execFileCallback);

/**
 * CORE PRODUCT TEST (expansion prompt, §22): the full cross-agent lifecycle
 * without any provider-specific conversation history. Agent A (intent →
 * tasks → partial implementation → evidence → checkpoint) "ends its
 * session"; Agent B — a FRESH PROCESS with zero shared state — loads the
 * resume context, continues from the exact next action, completes the work;
 * ACKit verifies evidence + produces the bundle; a fresh verdict gates
 * completion. Both denial paths (missing evidence, REWORK verdict) are
 * exercised before the passing path.
 *
 * Process isolation: in addition to the fresh in-process CLI invocations
 * (each re-reads all state from disk — no conversation/memory carry-over),
 * this test ALSO resumes through a genuinely spawned OS child process
 * (`node dist/cli/index.js task resume <id>` via execFile) with zero shared
 * JS memory, reading only persisted repository state.
 */

let rootPath = "";
const today = new Date().toISOString().slice(0, 10);

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-core-product-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# core product test\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
});

afterAll(async () => {
  // maxRetries: on Windows a spawned child process (the child-process resume
  // assertion) may still be finalizing file handles under .ackit/workflow/
  // when teardown runs; a single rm can race it with ENOTEMPTY. Retrying
  // makes teardown deterministic without weakening any assertion.
  await rm(rootPath, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
});

async function agentA(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return runCliJson(args);
}

async function agentB(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  // Agent B is a fresh process by construction of this test: every call is a
  // new runCli invocation with no shared in-memory state (stores re-read disk).
  return runCliJson(args);
}

async function runCliJson(
  args: string[],
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
    const code = await runCli(["node", "ackit", "--root", rootPath, ...args]);
    return { code, stdout: chunks.join(""), stderr: errChunks.join("") };
  } finally {
    process.stdout.write = originalWrite;
    process.stderr.write = originalErr;
  }
}

function taskIdFrom(stdout: string): string {
  const id = /TASK-\d{4}/.exec(stdout)?.[0];
  if (id === undefined) throw new Error(`no task id in: ${stdout}`);
  return id;
}

describe("CORE PRODUCT TEST (§22, TASK-0062)", () => {
  it("full lifecycle: Agent A checkpoint → fresh Agent B resume → evidence gate → verifier → completion", {
    timeout: 120000,
  }, async () => {
    // ---- Agent A: records intent, creates the plan/task, implements part.
    await agentA(["intent", "new", "Make the build green on Windows"]);
    const fsp = await import("node:fs/promises");
    const intentDir = path.join(rootPath, "docs", "intent");
    const intentNames = await fsp.readdir(intentDir);
    const intentName = intentNames.find((n) => n.endsWith(".md"));
    if (intentName === undefined) throw new Error("intent doc missing");
    await fsp.writeFile(
      path.join(intentDir, intentName),
      [
        "---",
        'schemaId: "ackit.intent.v1"',
        'id: "INTENT-0001"',
        'title: "Make the build green on Windows"',
        "status: accepted",
        `createdAt: "${today}"`,
        'source: "user request"',
        'problem: "The build fails on path separators on Windows."',
        'desiredOutcome: "pnpm build passes on Windows, Linux and macOS."',
        "constraints: []",
        "nonGoals: []",
        "affectedSystems:",
        '  - "src/build"',
        "acceptanceCriteria:",
        '  - id: "AC-001"',
        '    requirement: "Build passes on all platforms"',
        "openQuestions: []",
        "risks: []",
        "---",
      ].join("\n"),
      "utf8",
    );
    await fsp.mkdir(path.join(rootPath, "docs", "plans"), { recursive: true });
    await fsp.writeFile(path.join(rootPath, "docs", "plans", "build.md"), "# plan\n", "utf8");

    const created = await agentA([
      "task",
      "create",
      "Fix Windows build",
      "--intent",
      "INTENT-0001",
      "--plan",
      "docs/plans/build.md",
    ]);
    const taskId = taskIdFrom(created.stdout);
    const taskDir = path.join(rootPath, "docs", "tasks", "active");
    const taskNames = await fsp.readdir(taskDir);
    const taskName = taskNames.find((n) => n.endsWith(".md"));
    if (taskName === undefined) throw new Error("task doc missing");
    const docPath = path.join(taskDir, taskName);
    const raw = await fsp.readFile(docPath, "utf8");
    const fm = raw.slice(0, raw.indexOf("---", 3) + 3);
    await fsp.writeFile(
      docPath,
      `${fm}
## Purpose

Fix the Windows build path handling.

## Affected files

- src/build/**

## Acceptance criteria

- [x] Build passes on all platforms
- [ ] Green on the CI matrix

## Completion notes

Fixed separators; evidence + verdict below.
`,
      "utf8",
    );

    await agentA(["workflow", "set", taskId, "--profile", "standard"]);
    await agentA(["task", "start", taskId]);
    await agentA(["workflow", "advance", taskId]); // intent → plan
    await agentA(["workflow", "advance", taskId]); // plan → tasks
    await agentA(["workflow", "advance", taskId]); // tasks → implement
    await mkdir(path.join(rootPath, "src", "build"), { recursive: true });
    await writeFile(
      path.join(rootPath, "src", "build", "paths.ts"),
      'export const join = (...parts: string[]) => parts.join("/");\n',
      "utf8",
    );
    await agentA(["evidence", "sync", taskId]);
    await agentA([
      "evidence",
      "verify",
      taskId,
      "--criterion",
      "AC-001",
      "--type",
      "build",
      "--ref",
      "pnpm build (green on win/linux/mac)",
    ]);

    // ---- DENIAL PATH 1: mandatory evidence missing (AC-002 has no evidence).
    const denial1 = await agentA(["evidence", "validate", taskId]);
    expect(denial1.code).toBe(EXIT_CODES.thresholdExceeded);
    const denialText = denial1.stderr.toUpperCase();
    expect(
      denialText.includes("REQUIRED_EVIDENCE_MISSING") ||
        denialText.includes("CRITERION_UNVERIFIED"),
    ).toBe(true);

    // ---- Agent A checkpoints with the exact next action; the session ENDS.
    const checkpoint = await agentA([
      "checkpoint",
      "create",
      taskId,
      "--next-objective",
      "Register AC-002 evidence, verify, and obtain the fresh verdict",
      "--next-path",
      "src/build/paths.ts",
      "--next-command",
      `ackit evidence verify ${taskId} --criterion AC-002`,
      "--next-expected",
      "evidence complete",
    ]);
    expect(checkpoint.stdout).toContain("CP-0001");

    // ---- Agent B: DIFFERENT PROCESS, zero conversation state. Understands
    // intent, completed work, pending work, and the exact next action.
    const resume = await agentB(["task", "resume", taskId]);
    expect(resume.stdout).toContain("# Resume");
    // Intent understanding survives the provider switch: problem + outcome.
    expect(resume.stdout).toContain("The build fails on path separators");
    expect(resume.stdout).toContain("pnpm build passes on Windows");
    expect(resume.stdout).toContain("INTENT-0001");
    expect(resume.stdout).toContain("## Completed work");
    expect(resume.stdout).toContain("Build passes on all platforms");
    expect(resume.stdout).toContain("## Pending work");
    expect(resume.stdout).toContain("Green on the CI matrix");
    expect(resume.stdout).toContain("## Next action");
    expect(resume.stdout).toContain(
      "Register AC-002 evidence, verify, and obtain the fresh verdict",
    );

    // Task-aware resume pack also works for Agent B (deterministic).
    const pack = await agentB(["pack", "--task", taskId, "--resume", "--max-tokens", "4000"]);
    expect(pack.code).toBe(EXIT_CODES.ok);

    // ---- SPAWNED-PROCESS RESUME: a genuine child OS process (no shared JS
    // memory with this test process) re-reads the persisted state and must
    // reach the same resume conclusions. This proves the resumability
    // property without any in-process shortcut.
    const repoRoot = path.resolve(import.meta.dirname, "..", "..");
    const cliEntry = path.join(repoRoot, "dist", "cli", "index.js");
    const spawned = await execFile(
      process.execPath,
      [cliEntry, "--root", rootPath, "task", "resume", taskId],
      { encoding: "utf8" },
    );
    const spawnedResume = spawned.stdout;
    expect(spawnedResume).toContain("# Resume");
    expect(spawnedResume).toContain("The build fails on path separators");
    expect(spawnedResume).toContain("pnpm build passes on Windows");
    expect(spawnedResume).toContain("INTENT-0001");
    expect(spawnedResume).toContain("## Completed work");
    expect(spawnedResume).toContain("## Pending work");
    expect(spawnedResume).toContain("## Next action");
    expect(spawnedResume).toContain(
      "Register AC-002 evidence, verify, and obtain the fresh verdict",
    );
    // The spawned process and the in-process invocation agree byte-for-byte
    // on the deterministic resume block (same repository + same state).
    const inProcessResume = resume.stdout;
    expect(spawnedResume).toBe(inProcessResume);

    // ---- Agent B continues from the exact next action.
    await agentB([
      "evidence",
      "verify",
      taskId,
      "--criterion",
      "AC-002",
      "--type",
      "ci",
      "--ref",
      "CI matrix run (3 platforms green)",
    ]);
    const evidenceOk = await agentB(["evidence", "validate", taskId]);
    expect(evidenceOk.code).toBe(EXIT_CODES.ok);
    await agentB(["workflow", "advance", taskId]); // implement → verify
    await agentB(["workflow", "verify", taskId, "--outcome", "pass"]);

    // ---- ACKit produces the independent verification bundle.
    const bundle = await agentB(["verification", "bundle", taskId, "--out", "docs/bundle.yaml.md"]);
    expect(bundle.code).toBe(EXIT_CODES.ok);
    const bundleContent = await readFile(path.join(rootPath, "docs", "bundle.yaml.md"), "utf8");
    expect(bundleContent).toContain("ackit.verification-bundle.v2");
    expect(bundleContent).toContain("INTENT-0001");
    expect(bundleContent).toContain("AC-001");
    expect(bundleContent).toContain("Verifier role contract");

    // ---- Fresh verifier (a REWORK first, then the corrected PASS).
    // TASK-0080: fresh-context verdicts prove review with the bundle JSON.
    // Review artifacts live under .ackit/ (excluded from state binding —
    // ADR-0031 §5), so exporting/authoring them never stales the proof.
    await mkdir(path.join(rootPath, ".ackit", "reviews"), { recursive: true });
    const reworkYaml = [
      'schemaId: "ackit.verdict.v1"',
      `taskId: "${taskId}"`,
      'verdict: "REWORK_REQUIRED"',
      "verifier:",
      '  agent: "fresh-verifier/1.0"',
      '  context: "fresh"',
      `  issuedAt: "${today}"`,
      "findings:",
      "  - severity: blocking",
      '    criterion: "AC-002"',
      '    code: "CI_EVIDENCE_STALE"',
      '    message: "attach the matrix run ids"',
      "checkedCriteria:",
      '  - "AC-001"',
      '  - "AC-002"',
      'summary: "rework"',
    ].join("\n");
    await writeFile(
      path.join(rootPath, ".ackit", "reviews", "verdict-rework.yaml"),
      reworkYaml,
      "utf8",
    );
    const reworkBundle = await agentB([
      "verification",
      "bundle",
      taskId,
      "--format",
      "json",
      "--out",
      ".ackit/reviews/bundle-rework.json",
    ]);
    expect(reworkBundle.code).toBe(EXIT_CODES.ok);
    const rework = await agentB([
      "verification",
      "record",
      taskId,
      "--verdict",
      ".ackit/reviews/verdict-rework.yaml",
      "--bundle",
      ".ackit/reviews/bundle-rework.json",
    ]);
    expect(rework.code).toBe(EXIT_CODES.ok);

    // ---- DENIAL PATH 2: REWORK_REQUIRED verdict blocks completion.
    const rawTick = await fsp.readFile(docPath, "utf8");
    await fsp.writeFile(
      docPath,
      rawTick.replace(
        "- [ ] Green on the CI matrix",
        "- [x] Green on the CI matrix (matrix run ids attached)",
      ),
      "utf8",
    );
    const denial2 = await agentB(["task", "complete", taskId]);
    expect(denial2.code).toBe(EXIT_CODES.usage);
    expect(denial2.stderr).toContain("VERDICT_BLOCKING");

    // Fresh verifier re-reviews with the matrix ids attached and passes.
    // The criterion tick moved state, so a FRESH bundle (exported after the
    // new verdict file is authored) proves the review.
    const passYaml = [
      'schemaId: "ackit.verdict.v1"',
      `taskId: "${taskId}"`,
      'verdict: "PASS"',
      "verifier:",
      '  agent: "fresh-verifier/1.0"',
      '  context: "fresh"',
      `  issuedAt: "${today}"`,
      "findings: []",
      "checkedCriteria:",
      '  - "AC-001"',
      '  - "AC-002"',
      'summary: "matrix run ids verified; criteria met"',
    ].join("\n");
    await writeFile(
      path.join(rootPath, ".ackit", "reviews", "verdict-pass.yaml"),
      passYaml,
      "utf8",
    );
    const passBundle = await agentB([
      "verification",
      "bundle",
      taskId,
      "--format",
      "json",
      "--out",
      ".ackit/reviews/bundle-pass.json",
    ]);
    expect(passBundle.code).toBe(EXIT_CODES.ok);
    const pass = await agentB([
      "verification",
      "record",
      taskId,
      "--verdict",
      ".ackit/reviews/verdict-pass.yaml",
      "--bundle",
      ".ackit/reviews/bundle-pass.json",
    ]);
    expect(pass.code).toBe(EXIT_CODES.ok);
    expect(pass.stdout).toContain("PASS");

    // ---- All gates pass: task may complete.
    const completed = await agentB(["task", "complete", taskId]);
    expect(completed.code).toBe(EXIT_CODES.ok);
    expect(completed.stdout).toContain("completed");

    // ---- The journal recorded the observable transitions.
    const journal = await agentB(["journal", "show", "--limit", "4"]);
    expect(journal.stdout).toContain("task-transition");
    expect(journal.stdout).toContain("verdict-registered");
  });
});
