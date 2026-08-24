#!/usr/bin/env node
// ACKit MCP stdio entry point (official SDK transport only; ADR-0008).
import process from "node:process";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createAckitMcpServer } from "./server.js";

async function main(): Promise<void> {
  const { server } = await createAckitMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Clean shutdown when stdio closes (REQ-MCP-004).
  process.stdin.on("end", () => {
    process.exitCode = 0;
  });
}

void main().catch((error: unknown) => {
  // stdout must stay protocol-pure; diagnostics go to stderr only.
  process.stderr.write(`ackit mcp: fatal ${(error as Error).message}\n`);
  process.exitCode = 1;
});
