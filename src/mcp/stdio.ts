#!/usr/bin/env node
import { realpathSync } from "node:fs";
// ACKit MCP stdio entry point (official SDK transport only; ADR-0008).
import process from "node:process";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAckitMcpServer } from "./server.js";

export async function serveAckitMcp(requestedRoot?: string): Promise<void> {
  const { server } = await createAckitMcpServer(requestedRoot);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Clean shutdown when stdio closes (REQ-MCP-004).
  process.stdin.on("end", () => {
    process.exitCode = 0;
  });
}

const invokedDirectly = (() => {
  try {
    const entry = process.argv[1];
    return entry !== undefined && realpathSync(entry) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedDirectly)
  void serveAckitMcp().catch((error: unknown) => {
    // stdout must stay protocol-pure; diagnostics go to stderr only.
    process.stderr.write(`ackit mcp: fatal ${(error as Error).message}\n`);
    process.exitCode = 1;
  });
