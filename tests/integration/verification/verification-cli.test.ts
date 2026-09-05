import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";
const today = "2026-08-31";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-verify-cli-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# verify cli fixture\n", "utf8");
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

describe("ackit verification CLI integration (ADR-0026)", () => {
  it("bundle → record → show round-trip on a real repository", async () => {
    const created = await cli(["task", "create", "verification cli flow"]);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";

    // Sync + verify evidence so criterion refs are real.
    await cli(["evidence", "sync", taskId]);
    await cli([
      "evidence",
      "verify",
      taskId,
      "--criterion",
      "AC-001",
      "--type",
      "test",
      "--ref",
      "pnpm vitest run (all passed)",
    ]);
    await cli([
      "evidence",
      "verify",
      taskId,
      "--criterion",
      "AC-002",
      "--type",
      "build",
      "--ref",
      "pnpm build",
    ]);

    const bundle = await cli(["verification", "bundle", taskId]);
    expect(bundle.code).toBe(EXIT_CODES.ok);
    expect(bundle.stdout).toContain("ackit.verification-bundle.v2");
    expect(bundle.stdout).toContain("You are an INDEPENDENT verifier");
    expect(bundle.stdout).toContain("AC-001 [verified]");

    const bundleFile = await cli(["verification", "bundle", taskId, "--out", "docs/bundle.md"]);
    expect(bundleFile.code).toBe(EXIT_CODES.ok);
    const { readFile } = await import("node:fs/promises");
    const written = await readFile(path.join(rootPath, "docs", "bundle.md"), "utf8");
    expect(written).toContain("ackit.verification-bundle.v2");

    const escapeAttempt = await cli(["verification", "bundle", taskId, "--out", "../escape.md"]);
    expect(escapeAttempt.code).toBe(EXIT_CODES.securityBoundary);

    // Review artifacts live under .ackit/ (excluded from state binding):
    // bundle → author verdict → record, in chronological review order.
    // (Files written after the bundle export otherwise change state and
    // stale the proof — ADR-0031 §5.)
    const verdictYaml = [
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
      'summary: "criteria verified with recorded evidence"',
    ].join("\n");
    const reviewsDir = path.join(rootPath, ".ackit", "reviews");
    await mkdir(reviewsDir, { recursive: true });
    const jsonBundle = await cli([
      "verification",
      "bundle",
      taskId,
      "--format",
      "json",
      "--out",
      ".ackit/reviews/bundle.json",
    ]);
    expect(jsonBundle.code).toBe(EXIT_CODES.ok);
    await writeFile(path.join(reviewsDir, "verdict.yaml"), verdictYaml, "utf8");
    const record = await cli([
      "verification",
      "record",
      taskId,
      "--verdict",
      ".ackit/reviews/verdict.yaml",
      "--bundle",
      ".ackit/reviews/bundle.json",
    ]);
    expect(record.code).toBe(EXIT_CODES.ok);
    expect(record.stdout).toContain("VR-0001 registered (PASS)");

    // A fresh-context claim WITHOUT the reviewed bundle is refused with a
    // stable code (self-issued artifacts cannot silently qualify).
    const unprovenYaml = verdictYaml.replace(
      'summary: "criteria verified with recorded evidence"',
      'summary: "unproven fresh claim"',
    );
    await writeFile(path.join(reviewsDir, "verdict-unproven.yaml"), unprovenYaml, "utf8");
    const unproven = await cli([
      "verification",
      "record",
      taskId,
      "--verdict",
      ".ackit/reviews/verdict-unproven.yaml",
    ]);
    expect(unproven.code).toBe(EXIT_CODES.usage);
    expect(unproven.stderr).toContain("verdict-independence-unproven");

    // Replaying the already-registered verdict content is refused, even
    // though the state is unchanged (replay is about content, not staleness).
    const replay = await cli([
      "verification",
      "record",
      taskId,
      "--verdict",
      ".ackit/reviews/verdict.yaml",
      "--bundle",
      ".ackit/reviews/bundle.json",
    ]);
    expect(replay.code).toBe(EXIT_CODES.usage);
    expect(replay.stderr).toContain("verdict-replay-rejected");

    const show = await cli(["verification", "show", taskId]);
    expect(show.code).toBe(EXIT_CODES.ok);
    expect(show.stdout).toContain("verdict: PASS");
    expect(show.stdout).toContain("fresh-verifier/1.0");

    const showJson = await cli(["--json", "verification", "show", taskId]);
    expect(showJson.code).toBe(EXIT_CODES.ok);
    expect(showJson.stdout).toContain('"independent": true');

    // Blocking-on-PASS is rejected with a stable code.
    const badYaml = verdictYaml
      .replace('verdict: "PASS"', 'verdict: "PASS"')
      .replace(
        "findings: []",
        [
          "findings:",
          "  - severity: blocking",
          '    criterion: "AC-001"',
          '    code: "X_FAIL"',
          '    message: "should not parse with PASS"',
        ].join("\n"),
      );
    await writeFile(path.join(reviewsDir, "verdict-bad.yaml"), badYaml, "utf8");
    const bad = await cli([
      "verification",
      "record",
      taskId,
      "--verdict",
      ".ackit/reviews/verdict-bad.yaml",
    ]);
    expect(bad.code).toBe(EXIT_CODES.usage);
    expect(bad.stderr).toContain("verdict-blocking-on-pass");
  });

  it("forged criteria and traversal verdict files are refused", async () => {
    const created = await cli(["task", "create", "forgery guard flow"]);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";
    await cli(["evidence", "sync", taskId]);
    const forgedYaml = [
      'schemaId: "ackit.verdict.v1"',
      `taskId: "${taskId}"`,
      'verdict: "PASS"',
      "verifier:",
      '  agent: "forger"',
      '  context: "same"',
      `  issuedAt: "${today}"`,
      "findings: []",
      "checkedCriteria:",
      '  - "AC-999"',
      'summary: "forged"',
    ].join("\n");
    await writeFile(path.join(rootPath, "docs", "verdict-forged.yaml"), forgedYaml, "utf8");
    const forged = await cli([
      "verification",
      "record",
      taskId,
      "--verdict",
      "docs/verdict-forged.yaml",
    ]);
    expect(forged.code).toBe(EXIT_CODES.usage);
    expect(forged.stderr).toContain("verdict-criterion-unknown");

    const traversal = await cli(["verification", "record", taskId, "--verdict", "../etc/passwd"]);
    expect(traversal.code).toBe(EXIT_CODES.securityBoundary);
  });
});
