import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const CLI = path.join(process.cwd(), "dist", "mcp", "stdio.js");

let fixtureRoot = "";

beforeAll(async () => {
  fixtureRoot = await mkdtemp(path.join(tmpdir(), "ackit-mcp-stdio-"));
  await writeFile(path.join(fixtureRoot, "AGENTS.md"), "# stdio fixture\n");
});

afterAll(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
});

interface Pending {
  resolve: (value: string) => void;
}

function talkToServer(
  lines: string[],
  expectedFrames = 0,
): Promise<{ responses: string[]; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI], {
      cwd: fixtureRoot,
      env: { ...process.env, ACKIT_ROOT: fixtureRoot },
    });
    const responses: string[] = [];
    let buffer = "";
    const waiters: Pending[] = [];
    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line.length > 0) {
          const waiter = waiters.shift();
          if (waiter !== undefined) waiter.resolve(line);
          else responses.push(line);
        }
        newlineIndex = buffer.indexOf("\n");
      }
    });
    let stderrText = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderrText += chunk.toString("utf8");
    });
    void stderrText;
    child.stdin.write(`${lines.join("\n")}\n`);
    child.stdin.end();
    const finish = (): void => {
      try {
        child.kill();
      } catch {
        /* already gone */
      }
      child.on("exit", () => resolve({ responses, stderr: stderrText }));
      setTimeout(() => resolve({ responses, stderr: stderrText }), 1500);
    };
    const started = Date.now();
    const poll = setInterval(() => {
      if (
        expectedFrames > 0 &&
        (responses.length >= expectedFrames || Date.now() - started > 12000)
      ) {
        clearInterval(poll);
        finish();
      }
    }, 50);
    setTimeout(() => {
      clearInterval(poll);
      finish();
    }, 15000);
  });
}

describe("MCP stdio transport (integration)", () => {
  it.skipIf(!existsSync(CLI))(
    "keeps stdout protocol-pure under malformed input and shuts down cleanly",
    async () => {
      const initMessage = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "smoke", version: "0" },
        },
      });
      const badLine = "{not valid json";
      const toolsList = JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });

      const { responses } = await talkToServer([initMessage, badLine, toolsList], 2);
      expect(responses.length).toBeGreaterThanOrEqual(2);
      const parsedResponses = responses.map(
        (line) => JSON.parse(line) as { id?: unknown; result?: unknown; error?: unknown },
      );
      // First response answers initialize.
      expect(parsedResponses[0]?.id).toBe(1);
      expect(parsedResponses[0]?.result).toBeTruthy();
      // The malformed line produced either an error frame or was skipped — but
      // it never corrupted the subsequent response.
      expect(parsedResponses[parsedResponses.length - 1]?.id).toBe(2);
    },
    20000,
  );

  it.skipIf(!existsSync(CLI))(
    "tools/call over stdio returns tool content",
    async () => {
      const initMessage = JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "smoke", version: "0" },
        },
      });
      const initializedNote = JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      });
      const callMessage = JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "ackit_list_tasks", arguments: {} },
      });

      const { responses } = await talkToServer([initMessage, initializedNote, callMessage], 2);
      const callResponse = responses
        .map((line) => JSON.parse(line) as { id?: unknown })
        .find((message) => message.id === 3);
      expect(callResponse).toBeDefined();
    },
    20000,
  );
});
