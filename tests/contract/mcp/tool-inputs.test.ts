import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { describe, expect, it } from "vitest";
import { createAckitMcpServer } from "../../../src/mcp/server.js";

async function session(options: { finding?: boolean; suppress?: boolean } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "ackit-mcp-inputs-"));
  await writeFile(path.join(root, "AGENTS.md"), "# Instructions\nReview repository checks.\n");
  await writeFile(path.join(root, "README.md"), "# Fixture\n");
  await writeFile(
    path.join(root, "ackit.yml"),
    "schemaVersion: 1\npolicy:\n  extends: [ackit-policy.yml]\n",
  );
  await writeFile(
    path.join(root, "ackit-policy.yml"),
    "schemaVersion: 1\nthresholds:\n  severity: low\n" +
      (options.suppress
        ? [
            "suppressions:",
            "  - ruleId: ACKIT020",
            "    pathGlobs: [inside.txt]",
            "    reason: intentional fixture marker",
            '    expiresAt: "2099-12-31"',
            "",
          ].join("\n")
        : ""),
  );
  if (options.finding) await writeFile(path.join(root, "inside.txt"), "TODO: fixture\n");
  const { server } = await createAckitMcpServer(root);
  const client = new Client({ name: "input-contract", version: "0.0.1" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    close: async () => {
      await client.close();
      expect(path.dirname(root)).toBe(path.resolve(tmpdir()));
      await rm(root, { recursive: true, force: true });
    },
  };
}

describe("MCP documented inputs and severity hints", () => {
  it("the reference table matches all live tool schema properties", async () => {
    const current = await session();
    try {
      const reference = await readFile("docs/reference/mcp.md", "utf8");
      const rows = [...reference.matchAll(/^\| (ackit_[a-z_]+) \| ([^|]*) \|/gm)];
      const documented = new Map(
        rows.map((row) => [
          row[1],
          (row[2] ?? "").trim() === "—"
            ? []
            : (row[2] ?? "")
                .split(",")
                .map((arg) => arg.trim().replace(/\?$/, ""))
                .sort(),
        ]),
      );
      const { tools } = await current.client.listTools();
      expect([...documented.keys()].sort()).toEqual(tools.map((tool) => tool.name).sort());
      for (const tool of tools) {
        const properties = Object.keys(tool.inputSchema.properties ?? {}).sort();
        expect(properties, tool.name).toEqual(documented.get(tool.name));
        expect(properties).not.toContain("root");
        expect(properties).not.toContain("includeGlobs");
      }
    } finally {
      await current.close();
    }
  });
  it.each([
    { ci: undefined, finding: true, suppress: false, hint: 0 },
    { ci: false, finding: true, suppress: false, hint: 0 },
    { ci: true, finding: true, suppress: false, hint: 1 },
    { ci: true, finding: false, suppress: false, hint: 0 },
    { ci: true, finding: true, suppress: true, hint: 0 },
  ])(
    "ci=$ci finding=$finding suppress=$suppress hints $hint",
    async ({ ci, finding, suppress, hint }) => {
      const current = await session({ finding, suppress });
      try {
        const result = await current.client.callTool({
          name: "ackit_scan",
          arguments: ci === undefined ? {} : { ci },
        });
        expect(result.isError ?? false).toBe(false);
        const text = (result.content as { type: string; text: string }[])
          .map((item) => item.text)
          .join("");
        const [report, exitHint] = text.split("\nexit_code_hint=");
        expect(exitHint).toBe(String(hint));
        const findings = (
          JSON.parse(report ?? "null") as { findings: { ruleId: string; suppressed: boolean }[] }
        ).findings;
        expect(findings.some((item) => item.ruleId === "ACKIT020")).toBe(finding);
        if (suppress)
          expect(findings.find((item) => item.ruleId === "ACKIT020")?.suppressed).toBe(true);
        expect((await current.client.listTools()).tools.length).toBe(16);
      } finally {
        await current.close();
      }
    },
  );
});
