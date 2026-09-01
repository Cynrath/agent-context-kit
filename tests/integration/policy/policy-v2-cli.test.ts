import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-policyv2-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# policy v2 fixture\n", "utf8");
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

describe("policy v2 enforcement at ACKit-owned boundaries (ADR-0028 §1)", () => {
  it("POLICY-TIER-DENIED: tier2 deny refuses task complete --force (exit 4)", async () => {
    // Configure tier2 = deny in ackit.yml.
    await writeFile(
      path.join(rootPath, "ackit.yml"),
      ["schemaVersion: 1", "autonomy:", "  tier2: deny"].join("\n"),
      "utf8",
    );
    const created = await cli(["task", "create", "policy tier fixture"]);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";
    await cli(["task", "start", taskId]);
    // Leave criteria unchecked so --force would normally be the escape hatch.
    const forced = await cli(["task", "complete", taskId, "--force"]);
    expect(forced.code).toBe(EXIT_CODES.securityBoundary);
    expect(forced.stderr).toContain("POLICY-TIER-DENIED");

    // Non-forced completion still reports the normal gate blocker (usage).
    const gated = await cli(["task", "complete", taskId]);
    expect(gated.code).toBe(EXIT_CODES.usage);

    // Cleanup: allow tier2 and force-complete so later tests obey the
    // single-active rule deterministically.
    await writeFile(
      path.join(rootPath, "ackit.yml"),
      ["schemaVersion: 1", "autonomy:", "  tier2: allow"].join("\n"),
      "utf8",
    );
    const cleaned = await cli(["task", "complete", taskId, "--force"]);
    expect(cleaned.code).toBe(EXIT_CODES.ok);
  });

  it("tier2 allow permits --force; ask in non-tty is treated as deny", async () => {
    await writeFile(
      path.join(rootPath, "ackit.yml"),
      ["schemaVersion: 1", "autonomy:", "  tier2: allow"].join("\n"),
      "utf8",
    );
    const created = await cli(["task", "create", "policy allow fixture"]);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";
    await cli(["task", "start", taskId]);
    const forced = await cli(["task", "complete", taskId, "--force"]);
    expect(forced.code).toBe(EXIT_CODES.ok);
    expect(forced.stderr).toContain("WARNING BANNER");

    // ask: non-tty stdout in the test harness → deny (no silent bypass).
    await writeFile(
      path.join(rootPath, "ackit.yml"),
      ["schemaVersion: 1", "autonomy:", "  tier2: ask"].join("\n"),
      "utf8",
    );
    const created2 = await cli(["task", "create", "policy ask fixture"]);
    const taskId2 = /TASK-\d{4}/.exec(created2.stdout)?.[0] ?? "";
    await cli(["task", "start", taskId2]);
    const forced2 = await cli(["task", "complete", taskId2, "--force"]);
    expect(forced2.code).toBe(EXIT_CODES.securityBoundary);
    expect(forced2.stderr).toContain("POLICY-TIER-ASK");

    // Cleanup: allow tier2 and force-complete for the single-active rule.
    await writeFile(
      path.join(rootPath, "ackit.yml"),
      ["schemaVersion: 1", "autonomy:", "  tier2: allow"].join("\n"),
      "utf8",
    );
    const cleaned = await cli(["task", "complete", taskId2, "--force"]);
    expect(cleaned.code).toBe(EXIT_CODES.ok);
  });

  it("policy check prints the autonomy table and review policy (terminal + JSON)", async () => {
    await writeFile(
      path.join(rootPath, "ackit.yml"),
      [
        "schemaVersion: 1",
        "autonomy:",
        "  tier3: deny",
        "review:",
        "  required:",
        "    - security",
        "    - tests",
        "  blockingSeverity:",
        "    - critical",
      ].join("\n"),
      "utf8",
    );
    const check = await cli(["policy", "check"]);
    expect(check.code).toBe(EXIT_CODES.ok);
    expect(check.stdout).toContain("autonomy:");
    expect(check.stdout).toContain("tier3=deny");
    expect(check.stdout).toContain("review: required=[security, tests]");
    const json = await cli(["--json", "policy", "check"]);
    const parsed = JSON.parse(json.stdout) as {
      autonomy: { tier3: string };
      review: { required: string[] };
    };
    expect(parsed.autonomy.tier3).toBe("deny");
    expect(parsed.review.required).toEqual(["security", "tests"]);
  });
});
