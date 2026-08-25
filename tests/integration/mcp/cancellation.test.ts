import { promises as fsp } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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

/**
 * Root is an EXPLICIT argument: createAckitMcpServer resolves
 * requestedRoot ?? ACKIT_ROOT ?? cwd (src/mcp/server.ts). An environment
 * variable cannot override an explicit argument — a previous version set
 * ACKIT_ROOT while this helper kept passing the small default root, so the
 * "large fixture" test never actually used its large fixture.
 */
async function connect(root: string): Promise<{ client: Client; close(): Promise<void> }> {
  const { server } = await createAckitMcpServer(root);
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

interface MidFlightFixture {
  root: string;
  marker: string;
  cleanup(): Promise<void>;
}

async function makeMidFlightFixture(prefix: string): Promise<MidFlightFixture> {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  await writeFile(path.join(root, "AGENTS.md"), "# mid-flight fixture\n");
  await mkdir(path.join(root, "pkg"), { recursive: true });
  for (let i = 0; i < 50; i++) {
    await writeFile(
      path.join(root, "pkg", `mod-${i}.ts`),
      `export const mod${i} = ${i};\nfunction helper${i}(): number {\n  return ${i} * 2;\n}\n`,
    );
  }
  const marker = path.join(root, "pkg", "marker-cancel.txt");
  await writeFile(marker, "cancellation marker candidate\n");
  return { root, marker, cleanup: () => rm(root, { recursive: true, force: true }) };
}

/**
 * Test-only deterministic seam: the FIRST filesystem operation that touches
 * the marker candidate aborts the caller's controller. This proves the
 * operation truly began (the observation fires inside the running handler)
 * and lands strictly before normal completion — no wall-clock guessing, no
 * conditional skip. Production code is observed, never modified.
 */
function abortOnMarkerAccess(
  markerAbsolutePath: string,
  controller: AbortController,
): { sawMarker(): boolean; restore(): void } {
  let observed = false;
  const realOpen = fsp.open;
  const spy = vi.spyOn(fsp, "open").mockImplementation(async (...args) => {
    const handle = await realOpen(...(args as Parameters<typeof realOpen>));
    if (
      !observed &&
      typeof args[0] === "string" &&
      path.resolve(args[0]) === path.resolve(markerAbsolutePath)
    ) {
      observed = true;
      controller.abort();
    }
    return handle;
  });
  return { sawMarker: () => observed, restore: () => spy.mockRestore() };
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
    const session = await connect(rootPath);
    try {
      const controller = new AbortController();
      const pending = session.client.callTool({ name: "ackit_pack", arguments: {} }, undefined, {
        signal: controller.signal,
      });
      controller.abort();
      await expect(pending).rejects.toThrow(/abort|cancel/i);

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

  it("cancels ackit_pack mid-flight on the explicit large fixture and recovers afterwards", async () => {
    const fixture = await makeMidFlightFixture("ackit-mcp-cancel-pack-");
    const session = await connect(fixture.root);
    try {
      const controller = new AbortController();
      const seam = abortOnMarkerAccess(fixture.marker, controller);
      // Unconditional: the request MUST reject (cancelled mid-flight), never
      // resolve to a full result. The marker observation proves the handler
      // had entered the content/classification phase before cancellation.
      const pending = session.client.callTool({ name: "ackit_pack", arguments: {} }, undefined, {
        signal: controller.signal,
      });
      await expect(pending).rejects.toThrow(/abort|cancel/i);
      try {
        expect(seam.sawMarker()).toBe(true);
      } finally {
        seam.restore();
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
      await session.close();
      await fixture.cleanup();
    }
  });

  it("cancels ackit_scan mid-flight on the explicit large fixture and recovers afterwards", async () => {
    const fixture = await makeMidFlightFixture("ackit-mcp-cancel-scan-");
    const session = await connect(fixture.root);
    try {
      const controller = new AbortController();
      const seam = abortOnMarkerAccess(fixture.marker, controller);
      const pending = session.client.callTool({ name: "ackit_scan", arguments: {} }, undefined, {
        signal: controller.signal,
      });
      await expect(pending).rejects.toThrow(/abort|cancel/i);
      try {
        expect(seam.sawMarker()).toBe(true);
      } finally {
        seam.restore();
      }

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
      await session.close();
      await fixture.cleanup();
    }
  });
});
