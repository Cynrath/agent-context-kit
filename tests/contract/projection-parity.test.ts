/**
 * Projection parity: CLI ≡ SDK ≡ MCP ≡ Action on the canonical status
 * snapshot (TASK-0083). One composed read model, four surfaces, no
 * separate engines — proven fixture-by-fixture, offline.
 */
import { execFile as execFileCallback, execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/index.js";
import { buildStatusReport } from "../../src/index.js";
import { createAckitMcpServer } from "../../src/mcp/server.js";

const execFile = promisify(execFileCallback);

async function makeFixture(): Promise<{ dir: string; taskId: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "ackit-proj-parity-"));
  execFileSync("git", ["-C", dir, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", dir, "config", "user.email", "t@example.com"], { stdio: "ignore" });
  execFileSync("git", ["-C", dir, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(dir, "ackit.yml"), "schemaVersion: 1\n", "utf8");
  await writeFile(path.join(dir, "AGENTS.md"), "# parity\n", "utf8");
  await writeFile(path.join(dir, "README.md"), "# parity\n", "utf8");
  execFileSync("git", ["-C", dir, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", dir, "commit", "-q", "-m", "init"], { stdio: "ignore" });
  const { TaskStore, serialize } = await import("../../src/core/tasks/index.js");
  const store = new TaskStore(dir);
  const created = await store.create("projection parity fixture");
  const found = await store.find(created.meta.id);
  if (found === null) throw new Error("task missing");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path.join(dir, "docs", "tasks", "active"), { recursive: true });
  await writeFile(
    path.join(dir, "docs", "tasks", "active", path.basename(created.relativePath)),
    serialize(
      found.doc.meta,
      [
        "## Acceptance criteria",
        "",
        "- [x] Parity done.",
        "",
        "## Completion notes",
        "",
        "Parity proven.",
      ].join("\n"),
    ),
    "utf8",
  );
  await store.start(created.meta.id);
  return { dir, taskId: created.meta.id };
}

async function cliStatus(dir: string, taskId: string): Promise<string> {
  const chunks: string[] = [];
  const orig = process.stdout.write;
  const origE = process.stderr.write;
  process.stdout.write = ((c: string) => {
    chunks.push(String(c));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((_c: string) => true) as typeof process.stderr.write;
  try {
    await runCli(["node", "ackit", "--root", dir, "--json", "status", taskId]);
    return chunks.join("");
  } finally {
    process.stdout.write = orig;
    process.stderr.write = origE;
  }
}

async function mcpStatus(dir: string, taskId: string): Promise<string> {
  const { server } = await createAckitMcpServer(dir);
  const client = new Client({ name: "parity-client", version: "0.0.1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({ name: "ackit_status", arguments: { taskId } });
    return (result.content as Array<{ type: string; text: string }>).map((c) => c.text).join("");
  } finally {
    await client.close();
  }
}

describe("projection parity: one status snapshot on every surface (TASK-0083)", () => {
  it("CLI ≡ SDK ≡ MCP byte-identical status report", async () => {
    const { dir, taskId } = await makeFixture();
    try {
      const sdk = JSON.stringify(await buildStatusReport(dir, taskId));
      const cli = await cliStatus(dir, taskId);
      const mcp = await mcpStatus(dir, taskId);
      expect(JSON.parse(cli)).toEqual(JSON.parse(sdk));
      expect(JSON.parse(mcp)).toEqual(JSON.parse(sdk));
      expect(JSON.parse(cli).schemaVersion).toBe("ackit.status.v1");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("MCP exposes no mutation surface (read-only decision holds)", async () => {
    const { dir } = await makeFixture();
    try {
      const { server } = await createAckitMcpServer(dir);
      const client = new Client({ name: "parity-client", version: "0.0.1" });
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      try {
        const { tools } = await client.listTools();
        const verbs = [
          "record",
          "register",
          "create",
          "complete",
          "advance",
          "sync",
          "export",
          "import",
          "write",
          "delete",
          "update",
          "mutat",
        ];
        for (const tool of tools) {
          const name = tool.name.toLowerCase();
          expect(
            verbs.some((verb) => name.includes(verb)),
            `${tool.name} looks like a mutation surface`,
          ).toBe(false);
        }
      } finally {
        await client.close();
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("GitHub Action passes the status snapshot through (read-only parity by construction)", async () => {
    const { dir, taskId } = await makeFixture();
    const runnerTemp = await mkdtemp(path.join(tmpdir(), "ackit-action-parity-"));
    try {
      const repoRoot = path.resolve(import.meta.dirname, "..", "..");
      const actionEntry = path.join(repoRoot, "dist", "action", "index.js");
      const result = await execFile(process.execPath, [actionEntry], {
        cwd: dir,
        timeout: 60_000,
        env: {
          ...process.env,
          INPUT_COMMAND: "status",
          INPUT_ARGS: taskId,
          INPUT_FAIL_THRESHOLD: "high",
          INPUT_UPLOAD_SARIF: "false",
          RUNNER_TEMP: runnerTemp,
        },
      }).catch((error: { code?: number; stdout?: string; stderr?: string }) => ({
        code: error.code ?? 1,
        stdout: error.stdout ?? "",
        stderr: error.stderr ?? "",
      }));
      const outcome =
        typeof result === "object" &&
        "code" in (result as object) &&
        typeof (result as { code: unknown }).code === "number"
          ? (result as { code: number; stdout: string; stderr: string })
          : { code: 0, stdout: result as unknown as string, stderr: "" };
      expect(outcome.code).toBe(0);
      const findingsRaw = await readFile(path.join(runnerTemp, "ackit-findings.json"), "utf8");
      const findings = JSON.parse(findingsRaw) as { schemaVersion: string; task: { id: string } };
      expect(findings.schemaVersion).toBe("ackit.status.v1");
      expect(findings.task.id).toBe(taskId);
    } finally {
      await rm(dir, { recursive: true, force: true });
      await rm(runnerTemp, { recursive: true, force: true });
    }
  });
});
