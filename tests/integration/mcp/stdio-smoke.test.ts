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

/**
 * Cross-platform stdio helper.
 *
 * Previous version used a simple frame-count poll (expectedFrames >=2)
 * and `child.kill()` after 12s, which was flaky on Windows Node 24:
 * - On slower CI, `ackit_list_tasks` sometimes needed >12s due to cold start +
 *   parallel CI load, so the poll timed out before id=3 arrived.
 * - `child.kill()` truncated the stdout pipe before the final line was flushed,
 *   especially on Windows where SIGTERM handling is less deterministic.
 * - `expectedFrames` counted any response, not the specific ids the test
 *   actually needs, so a single initialize response could satisfy the count
 *   and trigger early kill.
 *
 * Fix: wait for the *specific* JSON-RPC ids the test cares about, keep
 * stdin open until we have them, and shut down gracefully (close stdin,
 * wait for `close`, only kill after a grace period). Timeouts are generous
 * for Windows CI (20s + 5s grace) but still bounded.
 */
function talkToServer(
  lines: string[],
  expectedIds: number[] = [],
): Promise<{ responses: string[]; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI], {
      cwd: fixtureRoot,
      env: { ...process.env, ACKIT_ROOT: fixtureRoot },
      windowsHide: true,
    });
    const responses: string[] = [];
    let buffer = "";
    const waiters: Pending[] = [];
    let stderrText = "";
    let settled = false;

    const tryResolve = (line: string) => {
      const waiter = waiters.shift();
      if (waiter !== undefined) waiter.resolve(line);
      else responses.push(line);
    };

    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("utf8");
      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line.length > 0) {
          tryResolve(line);
        }
        newlineIndex = buffer.indexOf("\n");
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrText += chunk.toString("utf8");
    });

    child.on("error", () => {
      if (!settled) {
        settled = true;
        resolve({ responses, stderr: stderrText });
      }
    });

    // Write lines sequentially with cork/uncork to avoid Windows pipe coalescing issues.
    child.stdin.cork();
    for (const line of lines) {
      child.stdin.write(`${line}\n`);
    }
    child.stdin.uncork();
    // Keep stdin open until we have the expected ids — do not end immediately.
    // The server's `process.stdin.on("end")` only sets exitCode, it does not
    // force exit until the event loop is empty, so keeping stdin open is safe.

    const hasAllExpectedIds = (): boolean => {
      if (expectedIds.length === 0) return false;
      const ids = new Set<number>();
      for (const line of responses) {
        try {
          const parsed = JSON.parse(line) as { id?: unknown };
          if (typeof parsed.id === "number") ids.add(parsed.id);
        } catch {
          // ignore malformed
        }
      }
      // Also check buffered but not yet pushed? responses already includes all complete lines.
      return expectedIds.every((id) => ids.has(id));
    };

    const finish = (): void => {
      if (settled) return;
      settled = true;
      // Graceful shutdown: end stdin, wait for close, then force kill after grace.
      try {
        if (!child.stdin.destroyed) child.stdin.end();
      } catch {
        /* already closed */
      }
      let resolved = false;
      const doResolve = () => {
        if (resolved) return;
        resolved = true;
        // Drain any remaining buffered line without newline (should not happen for JSON-RPC).
        const tail = buffer.trim();
        if (tail.length > 0) {
          try {
            JSON.parse(tail);
            responses.push(tail);
          } catch {
            // ignore
          }
        }
        resolve({ responses, stderr: stderrText });
      };
      child.on("close", doResolve);
      child.on("exit", doResolve);
      // If close doesn't fire quickly, force kill after grace, then resolve.
      setTimeout(() => {
        try {
          child.kill();
        } catch {
          /* already gone */
        }
      }, 800);
      setTimeout(doResolve, 1800);
    };

    const started = Date.now();
    const overallTimeoutMs = 20000;
    const poll = setInterval(() => {
      if (hasAllExpectedIds()) {
        clearInterval(poll);
        clearTimeout(overallTimer);
        finish();
      } else if (Date.now() - started > overallTimeoutMs - 2000) {
        // Will be handled by overallTimer, but keep polling
      }
    }, 50);

    const overallTimer = setTimeout(() => {
      clearInterval(poll);
      finish();
    }, overallTimeoutMs);
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

      const { responses } = await talkToServer([initMessage, badLine, toolsList], [1, 2]);
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
    30000,
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

      const { responses } = await talkToServer([initMessage, initializedNote, callMessage], [1, 3]);
      const callResponse = responses
        .map((line) => JSON.parse(line) as { id?: unknown })
        .find((message) => message.id === 3);
      expect(callResponse).toBeDefined();
    },
    30000,
  );
});
