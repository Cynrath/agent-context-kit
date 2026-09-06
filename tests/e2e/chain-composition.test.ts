/**
 * v0.5 chain-composition proof (TASK-0086, corrected TASK-0088).
 *
 * One fixture, every surface, one canonical snapshot: status projection
 * over bound verification state (0079/0080/0081) agrees byte-for-byte
 * across CLI ≡ SDK ≡ MCP ≡ Action; the portable handoff (0082) carries
 * that same status contract and validates fresh; the chain ends with
 * task completion on the composed state.
 *
 * Release lifecycle assertions (source version, stable pointer, tag
 * shape) belong in the release/version contract tests
 * (tests/contract/version-parity.test.ts,
 * tests/contract/version-single-source.test.ts,
 * tests/contract/release-notes.test.ts,
 * tests/contract/ci-pinning.test.ts,
 * tests/contract/release-tag-context.test.ts) — never here. This test
 * MUST pass on ordinary checkouts and on exact tagged checkouts alike
 * (the release workflow validates the tagged commit); it asserts nothing
 * about repository tags. No tag/publish/release side effects anywhere in
 * this flow.
 */
import { execFile as execFileCallback, execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/index.js";
import { buildStatusReport } from "../../src/index.js";
import { createAckitMcpServer } from "../../src/mcp/server.js";
import { EXIT_CODES } from "../../src/shared/exit-codes.js";

const execFile = promisify(execFileCallback);
const DATE = "2026-08-31";

let rootPath = "";
let repoRoot = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-chain-"));
  repoRoot = path.resolve(import.meta.dirname, "..", "..");
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# chain fixture\n", "utf8");
  await writeFile(path.join(rootPath, "src-impl.js"), "export const x = 1;\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function cli(args: string[]): Promise<CliResult> {
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

async function mcpStatus(taskId: string): Promise<unknown> {
  const { server } = await createAckitMcpServer(rootPath);
  const client = new Client({ name: "chain-client", version: "0.0.1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({ name: "ackit_status", arguments: { taskId } });
    const text = (result.content as Array<{ type: string; text: string }>)
      .map((c) => c.text)
      .join("");
    return JSON.parse(text) as unknown;
  } finally {
    await client.close();
  }
}

describe("v0.5 chain composition (TASK-0086)", () => {
  it("one snapshot on every surface, handoff carrying it, completion on the composed state", async () => {
    const { TaskStore, serialize } = await import("../../src/core/tasks/index.js");
    const { mkdir: mk } = await import("node:fs/promises");
    await cli(["intent", "new", "Chain the v0.5 line"]);
    await mk(path.join(rootPath, "docs", "plans"), { recursive: true });
    await writeFile(path.join(rootPath, "docs", "plans", "chain.md"), "# plan\n", "utf8");
    const created = await cli([
      "task",
      "create",
      "Chain fixture",
      "--intent",
      "INTENT-0001",
      "--plan",
      "docs/plans/chain.md",
    ]);
    expect(created.code).toBe(EXIT_CODES.ok);
    const taskId = /TASK-\d{4}/.exec(created.stdout)?.[0] ?? "";
    const store = new TaskStore(rootPath);
    const found = await store.find(taskId);
    if (found === null) throw new Error("task missing");
    await writeFile(
      path.join(rootPath, ...found.doc.relativePath.split("/")),
      serialize(
        found.doc.meta,
        [
          "## Acceptance criteria",
          "",
          "- [x] Chain thing done.",
          "- [x] Second chain thing done.",
          "",
          "## Completion notes",
          "",
          "Chain things implemented; evidence recorded below.",
        ].join("\n"),
      ),
      "utf8",
    );
    await cli(["workflow", "set", taskId, "--profile", "standard"]);
    await cli(["task", "start", taskId]);
    await cli(["workflow", "advance", taskId]);
    await cli(["workflow", "advance", taskId]);
    await cli(["workflow", "advance", taskId]);
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
      "pnpm vitest run (chain green)",
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
      "pnpm build (chain green)",
    ]);
    await cli(["workflow", "advance", taskId, "--to", "verify"]);
    await mk(path.join(rootPath, ".ackit", "chain"), { recursive: true });
    expect(
      (
        await cli([
          "verification",
          "bundle",
          taskId,
          "--format",
          "json",
          "--out",
          ".ackit/chain/bundle.json",
        ])
      ).code,
    ).toBe(EXIT_CODES.ok);
    await writeFile(
      path.join(rootPath, ".ackit", "chain", "verdict.yaml"),
      [
        'schemaId: "ackit.verdict.v1"',
        `taskId: "${taskId}"`,
        'verdict: "PASS"',
        "verifier:",
        '  agent: "chain-verifier/1.0"',
        '  context: "fresh"',
        `  issuedAt: "${DATE}"`,
        "findings: []",
        "checkedCriteria:",
        '  - "AC-001"',
        '  - "AC-002"',
        'summary: "chain criteria met with recorded evidence"',
      ].join("\n"),
      "utf8",
    );
    expect(
      (
        await cli([
          "verification",
          "record",
          taskId,
          "--verdict",
          ".ackit/chain/verdict.yaml",
          "--bundle",
          ".ackit/chain/bundle.json",
        ])
      ).code,
    ).toBe(EXIT_CODES.ok);

    // ---- Surfaces agreeing: CLI ≡ SDK ≡ MCP ≡ Action, byte-for-byte.
    const cliJson = (await cli(["--json", "status", taskId])).stdout;
    const sdkJson = JSON.stringify(await buildStatusReport(rootPath, taskId));
    const mcpJson = JSON.stringify(await mcpStatus(taskId));
    expect(JSON.parse(cliJson)).toEqual(JSON.parse(sdkJson));
    expect(JSON.parse(mcpJson)).toEqual(JSON.parse(sdkJson));
    const snapshot = JSON.parse(sdkJson) as {
      schemaVersion: string;
      blockers: string[];
      verdict: { fresh: boolean; independent: boolean };
    };
    expect(snapshot.schemaVersion).toBe("ackit.status.v1");
    expect(snapshot.blockers).toEqual([]);
    expect(snapshot.verdict).toMatchObject({ fresh: true, independent: true });

    const runnerTemp = await mkdtemp(path.join(tmpdir(), "ackit-chain-action-"));
    try {
      const actionEntry = path.join(repoRoot, "dist", "action", "index.js");
      const actioned = await execFile(process.execPath, [actionEntry], {
        cwd: rootPath,
        timeout: 60_000,
        env: {
          ...process.env,
          INPUT_COMMAND: "status",
          INPUT_ARGS: taskId,
          INPUT_FAIL_THRESHOLD: "high",
          INPUT_UPLOAD_SARIF: "false",
          RUNNER_TEMP: runnerTemp,
        },
      }).then(
        () => ({ code: 0 }),
        (error: { code?: number }) => ({ code: error.code ?? 1 }),
      );
      expect(actioned.code).toBe(0);
      const actionJson = JSON.parse(
        await readFile(path.join(runnerTemp, "ackit-findings.json"), "utf8"),
      ) as unknown;
      expect(actionJson).toEqual(JSON.parse(sdkJson));
    } finally {
      await rm(runnerTemp, { recursive: true, force: true });
    }

    // ---- Handoff carries the same status contract + digests, validates fresh.
    // NOTE: the handoff embeds status computed AT EXPORT TIME (after the
    // checkpoint below exists), so the comparison baseline is rebuilt
    // here — the composition property is handoff.status == live status.
    await cli([
      "checkpoint",
      "create",
      taskId,
      "--next-objective",
      "chain handoff objective",
      "--next-command",
      `ackit task complete ${taskId}`,
    ]);
    const sdkJsonAtExport = JSON.stringify(await buildStatusReport(rootPath, taskId));
    const snapshotAtExport = JSON.parse(sdkJsonAtExport) as {
      blockers: string[];
      next: unknown[];
    };
    expect(
      (
        await cli([
          "checkpoint",
          "export",
          taskId,
          "--format",
          "json",
          "--out",
          ".ackit/chain/handoff.json",
        ])
      ).code,
    ).toBe(EXIT_CODES.ok);
    const handoff = JSON.parse(
      await readFile(path.join(rootPath, ".ackit", "chain", "handoff.json"), "utf8"),
    ) as {
      schemaVersion: string;
      status: { blockers: string[]; next: unknown[] };
      verification: { bundleDigest: string };
    };
    expect(handoff.schemaVersion).toBe("ackit.handoff.v2");
    expect(handoff.status.blockers).toEqual(snapshotAtExport.blockers);
    expect(handoff.status.next).toEqual(snapshotAtExport.next);
    const imported = await cli(["checkpoint", "import", ".ackit/chain/handoff.json"]);
    expect(imported.code).toBe(EXIT_CODES.ok);
    expect(imported.stdout).toContain("fresh");

    // ---- Chain end: completion succeeds on the composed state.
    // NOTE (TASK-0088): release lifecycle assertions (source version,
    // stable pointer, tag presence/absence) intentionally live in the
    // release/version contract tests, not here — this composition proof
    // must pass identically on untagged checkouts and on the exact
    // tagged checkout the release workflow validates.
    const completed = await cli(["task", "complete", taskId]);
    expect(completed.code).toBe(EXIT_CODES.ok);
  }, 180_000);
});
