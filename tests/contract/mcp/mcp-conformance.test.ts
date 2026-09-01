import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAckitMcpServer } from "../../../src/mcp/server.js";
import { getPackageIdentity } from "../../../src/shared/version.js";

let rootPath: string;

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-mcp-"));
  await writeFile(path.join(rootPath, "AGENTS.md"), "# mcp fixture agents\n");
  await writeFile(path.join(rootPath, "README.md"), "# fixture\n");
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function connect(): Promise<{ client: Client; close(): Promise<void> }> {
  const { server } = await createAckitMcpServer(rootPath);
  const client = new Client({ name: "test-client", version: "0.0.1" });
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

describe("ackit MCP conformance (REQ-MCP-004)", () => {
  it("initialize handshake reports identity from the single source of truth", async () => {
    const session = await connect();
    try {
      // The client already completed initialize inside connect(); verify serverInfo fields.
      expect(session.client.getServerVersion()).toMatchObject({
        name: "ackit",
        version: getPackageIdentity().version,
      });
    } finally {
      await session.close();
    }
  });

  it("tools/list exposes the fifteen read-only tools; write tools absent", async () => {
    const session = await connect();
    try {
      const { tools } = await session.client.listTools();
      const names = tools.map((tool) => tool.name).sort();
      expect(names).toEqual([
        "ackit_doctor",
        "ackit_drift_check",
        "ackit_get_checkpoint",
        "ackit_get_intent",
        "ackit_get_task",
        "ackit_instruction_graph",
        "ackit_list_roles",
        "ackit_list_skills",
        "ackit_list_tasks",
        "ackit_pack",
        "ackit_policy_check",
        "ackit_scan",
        "ackit_validate_skills",
        "ackit_verification_bundle",
        "ackit_workflow_status",
      ]);
    } finally {
      await session.close();
    }
  });

  it("every read-only tool answers on a real fixture repository", async () => {
    process.env["ACKIT_ROOT"] = rootPath;
    const session = await connect();
    try {
      for (const name of [
        "ackit_scan",
        "ackit_doctor",
        "ackit_pack",
        "ackit_instruction_graph",
        "ackit_list_skills",
        "ackit_validate_skills",
        "ackit_list_tasks",
        "ackit_policy_check",
        "ackit_list_roles",
      ]) {
        const result = await session.client.callTool({ name, arguments: {} });
        expect(result.isError ?? false, `${name} errored`).toBe(false);
        expect(Array.isArray(result.content)).toBe(true);
      }
      const taskResult = await session.client.callTool({
        name: "ackit_get_task",
        arguments: { id: "TASK-9999" },
      });
      expect(taskResult.isError ?? false).toBe(false);
    } finally {
      delete process.env["ACKIT_ROOT"];
      await session.close();
    }
  });

  it("workflow expansion tools answer read-only with correct semantics", async () => {
    // Fixture: create a task + workflow state + evidence via the core stores,
    // then verify the MCP tools surface them without mutation.
    const { TaskStore } = await import("../../../src/core/tasks/index.js");
    const { WorkflowStore } = await import("../../../src/core/workflow/index.js");
    const { EvidenceStore } = await import("../../../src/core/evidence/index.js");
    const { syncRegistry } = await import("../../../src/core/evidence/sync.js");
    const store = new TaskStore(rootPath);
    const created = await store.create("mcp workflow fixture");
    const taskId = created.meta.id;
    const { resolveRepositoryRoot } = await import("../../../src/core/filesystem/root.js");
    const resolved = await resolveRepositoryRoot(rootPath);
    if (!resolved.ok) throw new Error(resolved.diagnostic.message);
    await new WorkflowStore(resolved.root).setProfile(taskId, "standard");
    const evidenceStore = new EvidenceStore(resolved.root);
    const doc = await store.find(taskId);
    if (doc === null) throw new Error("task missing");
    await evidenceStore.save(taskId, syncRegistry(doc.doc, null, "2026-08-31"));

    process.env["ACKIT_ROOT"] = rootPath;
    const session = await connect();
    try {
      const status = await session.client.callTool({
        name: "ackit_workflow_status",
        arguments: { taskId },
      });
      expect(status.isError ?? false).toBe(false);
      const statusText = JSON.stringify(status.content);
      expect(statusText).toContain("standard");

      const evidence = await session.client.callTool({
        name: "ackit_drift_check",
        arguments: { taskId },
      });
      expect(evidence.isError ?? false).toBe(false);

      const bundle = await session.client.callTool({
        name: "ackit_verification_bundle",
        arguments: { taskId },
      });
      expect(bundle.isError ?? false).toBe(false);
      const bundleText = JSON.stringify(bundle.content);
      expect(bundleText).toContain("ackit.verification-bundle.v1");

      const legacyStatus = await session.client.callTool({
        name: "ackit_workflow_status",
        arguments: { taskId: "TASK-9999" },
      });
      expect(legacyStatus.isError ?? false).toBe(false);
      expect(JSON.stringify(legacyStatus.content)).toContain("no workflow state");
    } finally {
      delete process.env["ACKIT_ROOT"];
      await session.close();
    }
  });

  it("resources/list and resources/read work", async () => {
    process.env["ACKIT_ROOT"] = rootPath;
    const session = await connect();
    try {
      const { resources } = await session.client.listResources();
      const uris = resources.map((resource) => resource.uri);
      expect(uris).toContain("repo://summary");
      expect(uris).toContain("repo://instructions-graph");
      expect(uris).toContain("repo://skills-catalog");
      expect(uris).toContain("repo://tasks-active");
      expect(uris).toContain("repo://policy");
      const read = await session.client.readResource({ uri: "repo://summary" });
      const firstContent = read.contents[0];
      expect(firstContent !== undefined && "text" in firstContent).toBe(true);
      if (firstContent !== undefined && "text" in firstContent) {
        expect(firstContent.text).toContain("instructionNodeCount");
      }
    } finally {
      delete process.env["ACKIT_ROOT"];
      await session.close();
    }
  });

  it("prompts/get returns deterministic template messages", async () => {
    const session = await connect();
    try {
      for (const name of ["onboarding", "scan-remediation", "context-optimization"]) {
        const prompt = await session.client.getPrompt({ name, arguments: {} });
        expect(prompt.messages.length).toBeGreaterThan(0);
      }
      const twice = await session.client.getPrompt({ name: "task-execution", arguments: {} });
      const once = await session.client.getPrompt({ name: "task-execution", arguments: {} });
      expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
    } finally {
      await session.close();
    }
  });

  it("unknown tool yields an error outcome and the server survives", async () => {
    const session = await connect();
    try {
      let rejected = false;
      let errored = false;
      try {
        const result = await session.client.callTool({
          name: "ackit_does_not_exist",
          arguments: {},
        });
        errored = (result.isError ?? false) === true;
      } catch {
        rejected = true;
      }
      expect(rejected || errored).toBe(true);
      // Server still responsive afterwards.
      const { tools } = await session.client.listTools();
      expect(tools.length).toBeGreaterThan(0);
    } finally {
      await session.close();
    }
  });

  it("missing required tool arguments are rejected by schema validation", async () => {
    const session = await connect();
    try {
      const result = await session.client.callTool({ name: "ackit_get_task", arguments: {} });
      // Either a protocol-level rejection surfaced as isError, or our handler
      // returned structured JSON — but never a silent success with content.
      if ((result.isError ?? false) === false) {
        const text = JSON.stringify(result.content);
        expect(text).toContain("unknown task");
      }
    } finally {
      await session.close();
    }
  });
});
