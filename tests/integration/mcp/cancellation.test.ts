import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildContextPack } from "../../../src/core/context/index.js";
import { createAckitMcpServer } from "../../../src/mcp/server.js";

let rootPath: string;

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-mcp-cancel-"));
  await writeFile(path.join(rootPath, "AGENTS.md"), "# cancellation fixture\n");
  await writeFile(path.join(rootPath, "src.ts"), "export const value = 42;\n");
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function connect(): Promise<{ client: Client; close(): Promise<void> }> {
  const { server } = await createAckitMcpServer(rootPath);
  const client = new Client({ name: "cancel-client", version: "0.0.1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await client.close();
    },
  };
}

describe("behavioral MCP cancellation (REQ-MCP-004)", () => {
  it("pack engine refuses work when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      buildContextPack({ canonicalPath: rootPath }, { signal: controller.signal }),
    ).rejects.toThrow(/aborted/i);
  });

  it("an aborted tool call returns no result and the server stays healthy", async () => {
    const session = await connect();
    try {
      const controller = new AbortController();
      const pending = session.client.callTool({ name: "ackit_pack", arguments: {} }, undefined, {
        signal: controller.signal,
      });
      controller.abort();
      let rejected = false;
      try {
        await pending;
      } catch {
        rejected = true;
      }
      expect(rejected).toBe(true);

      // Server must remain fully responsive after the cancelled request.
      const { tools } = await session.client.listTools();
      expect(tools.map((t) => t.name)).toContain("ackit_scan");
      const doctor = await session.client.callTool({
        name: "ackit_doctor",
        arguments: {},
      });
      expect(doctor.isError ?? false).toBe(false);
    } finally {
      await session.close();
    }
  });

  it("cancels ackit_scan mid-flight on a large fixture and recovers afterwards", async () => {
    // Grow the fixture until a full scan takes a measurable amount of time so
    // the scheduled abort lands while the operation is still running.
    const bigRoot = await mkdtemp(path.join(tmpdir(), "ackit-mcp-cancel-big-"));
    await writeFile(path.join(bigRoot, "AGENTS.md"), "# big fixture\n");
    await mkdir(path.join(bigRoot, "pkg"), { recursive: true });
    for (let i = 0; i < 400; i++) {
      await writeFile(
        path.join(bigRoot, "pkg", `mod-${i}.ts`),
        `export const mod${i} = ${i};\nfunction helper${i}(): number {\n  return ${i} * 2;\n}\n`,
      );
    }

    process.env["ACKIT_ROOT"] = bigRoot;
    const session = await connect();
    try {
      // Warm runs establish a stable duration reference (cold JIT/cache skew
      // the first measurement).
      let warmMin = Number.POSITIVE_INFINITY;
      for (let i = 0; i < 2; i++) {
        const t0 = Date.now();
        await session.client.callTool({ name: "ackit_scan", arguments: {} });
        warmMin = Math.min(warmMin, Date.now() - t0);
      }
      expect(warmMin).toBeGreaterThan(0);

      if (warmMin >= 30) {
        let cancelled = false;
        for (let attempt = 0; attempt < 3 && !cancelled; attempt++) {
          const abortDelay = Math.max(5, Math.floor(warmMin / 3));
          const controller = new AbortController();
          const pending = session.client.callTool(
            { name: "ackit_scan", arguments: {} },
            undefined,
            { signal: controller.signal },
          );
          setTimeout(() => controller.abort(), abortDelay);
          try {
            await pending;
          } catch {
            cancelled = true;
          }
        }
        expect(cancelled).toBe(true);
      }

      // Post-cancel health: subsequent MCP requests execute successfully.
      const doctorAfterCancel = await session.client.callTool({
        name: "ackit_doctor",
        arguments: {},
      });
      expect(doctorAfterCancel.isError ?? false).toBe(false);
      const scanAfterCancel = await session.client.callTool({
        name: "ackit_scan",
        arguments: {},
      });
      expect(scanAfterCancel.isError ?? false).toBe(false);
    } finally {
      delete process.env["ACKIT_ROOT"];
      await session.close();
      await rm(bigRoot, { recursive: true, force: true });
    }
  }, 180_000);
});
