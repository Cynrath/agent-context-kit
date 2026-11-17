import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";

const cli = path.join(process.cwd(), "dist/cli/index.js");

describe("CLI MCP startup root precedence", () => {
  it.each(["flag", "environment", "cwd"])(
    "uses the %s root without a per-call override",
    async (mode) => {
      const fixture = await mkdtemp(path.join(tmpdir(), "ackit-mcp-startup-"));
      const selected = path.join(fixture, "selected repository");
      const working = path.join(fixture, "working repository");
      await mkdir(selected);
      await mkdir(working);
      for (const [root, name] of [
        [selected, "selected.txt"],
        [working, "working.txt"],
      ] as const) {
        await writeFile(path.join(root, "AGENTS.md"), "# Instructions\nReview checks.\n");
        await writeFile(path.join(root, name), "TODO: fixture\n");
      }
      const env = Object.fromEntries(
        ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"].flatMap((key) => {
          const value = process.env[key];
          return value === undefined ? [] : [[key, value]];
        }),
      );
      if (mode !== "cwd") env["ACKIT_ROOT"] = mode === "flag" ? working : selected;
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [cli, ...(mode === "flag" ? ["--root", selected] : []), "mcp", "serve"],
        cwd: working,
        env,
        stderr: "pipe",
      });
      const client = new Client({ name: "startup-root-test", version: "0.0.1" });
      try {
        await client.connect(transport);
        const result = await client.callTool({ name: "ackit_scan", arguments: {} });
        expect(result.isError ?? false).toBe(false);
        const text = (result.content as { text: string }[]).map((item) => item.text).join("");
        const report = JSON.parse(text.split("\nexit_code_hint=")[0] ?? "null") as {
          findings: { relativePath: string }[];
        };
        const paths = report.findings.map((finding) => finding.relativePath);
        expect(paths).toContain(mode === "cwd" ? "working.txt" : "selected.txt");
        expect(paths).not.toContain(mode === "cwd" ? "selected.txt" : "working.txt");
      } finally {
        await client.close();
        expect(path.dirname(fixture)).toBe(path.resolve(tmpdir()));
        await rm(fixture, { recursive: true, force: true });
      }
    },
  );
});
