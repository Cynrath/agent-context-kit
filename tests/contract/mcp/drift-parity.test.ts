import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { assembleDriftInput, detectWorkflowDrift } from "../../../src/core/drift/index.js";
import { createAckitMcpServer } from "../../../src/mcp/server.js";

async function makeFixture(): Promise<{ dir: string; taskId: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "ackit-drift-parity-"));
  execFileSync("git", ["-C", dir, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", dir, "config", "user.email", "t@example.com"], { stdio: "ignore" });
  execFileSync("git", ["-C", dir, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(dir, "ackit.yml"), "schemaVersion: 1\n", "utf8");
  await writeFile(path.join(dir, "AGENTS.md"), "# parity\n", "utf8");
  await mkdir(path.join(dir, "docs", "tasks", "active"), { recursive: true });
  await writeFile(
    path.join(dir, "docs", "tasks", "active", "TASK-0001-parity.md"),
    [
      "---",
      'id: "TASK-0001"',
      'title: "parity fixture"',
      "status: active",
      "schemaVersion: 2",
      "dependencies:",
      "  []",
      'createdAt: "2026-01-01"',
      "completedAt: null",
      "---",
      "",
      "## Purpose",
      "",
      "parity",
      "",
      "## Affected files",
      "",
      "- src/owned.ts",
      "",
      "## Acceptance criteria",
      "",
      "- [ ] parity",
      "",
      "## Completion notes",
      "",
      "(placeholder)",
    ].join("\n"),
    "utf8",
  );
  await writeFile(path.join(dir, "README.md"), "# parity\n", "utf8");
  execFileSync("git", ["-C", dir, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", dir, "commit", "-q", "-m", "init"], { stdio: "ignore" });
  // Untracked file outside declared scope → deterministic warning fixture.
  await writeFile(path.join(dir, "UNPLANNED.md"), "# surprise\n", "utf8");
  return { dir, taskId: "TASK-0001" };
}

async function cliDrift(dir: string, taskId: string) {
  const chunks: string[] = [];
  const orig = process.stdout.write;
  const origE = process.stderr.write;
  process.stdout.write = ((c: string) => {
    chunks.push(String(c));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((_c: string) => true) as typeof process.stderr.write;
  try {
    const code = await runCli(["node", "ackit", "--root", dir, "--json", "drift", "check", taskId]);
    return { code, json: JSON.parse(chunks.join("")) as { findings: unknown[] } };
  } finally {
    process.stdout.write = orig;
    process.stderr.write = origE;
  }
}

async function mcpDrift(dir: string, taskId: string) {
  const { server } = await createAckitMcpServer(dir);
  const client = new Client({ name: "parity-client", version: "0.0.1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  try {
    const result = await client.callTool({ name: "ackit_drift_check", arguments: { taskId } });
    const text = (result.content as Array<{ type: string; text: string }>)
      .map((c) => c.text)
      .join("");
    return JSON.parse(text) as { findings: unknown[] };
  } finally {
    await client.close();
  }
}

describe("TASK-0070 drift parity: CLI ≡ MCP ≡ core on identical fixtures", () => {
  it("same state + same taskId ⇒ identical finding codes/severities/order", async () => {
    const { dir, taskId } = await makeFixture();
    try {
      const cli = await cliDrift(dir, taskId);
      const mcp = await mcpDrift(dir, taskId);
      const assembled = await assembleDriftInput(dir, taskId);
      if (!assembled.ok) throw new Error(assembled.message);
      const core = detectWorkflowDrift(assembled.input);

      // Same length, same ordered codes/severities — byte-comparable semantics.
      expect(mcp.findings).toEqual(cli.json.findings);
      expect(mcp.findings).toEqual(JSON.parse(JSON.stringify(core)));
      // Warnings preserved (UNPLANNED_FILE_CHANGE is a warning for quick/legacy).
      const codes = (mcp.findings as Array<{ code: string; severity: string }>).map((f) => f.code);
      expect(codes).toContain("UNPLANNED_FILE_CHANGE");
      // Deterministic order: sorted by code → taskId → detail.
      const sorted = [
        ...(mcp.findings as Array<{ code: string; taskId: string; detail: string }>),
      ].sort(
        (a, b) =>
          a.code.localeCompare(b.code) ||
          a.taskId.localeCompare(b.taskId) ||
          a.detail.localeCompare(b.detail),
      );
      expect(mcp.findings).toEqual(sorted);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("MCP remains read-only (no mutation tools)", async () => {
    const { dir } = await makeFixture();
    try {
      const { server } = await createAckitMcpServer(dir);
      const client = new Client({ name: "parity-client", version: "0.0.1" });
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport);
      await client.connect(clientTransport);
      try {
        const { tools } = await client.listTools();
        const names = tools.map((t) => t.name);
        expect(names).toContain("ackit_drift_check");
        // No write tools: workflow set/advance/verify, checkpoint create, etc. absent.
        for (const banned of [
          "ackit_workflow_set",
          "ackit_workflow_advance",
          "ackit_checkpoint_create",
          "ackit_task_complete",
        ]) {
          expect(names).not.toContain(banned);
        }
      } finally {
        await client.close();
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
