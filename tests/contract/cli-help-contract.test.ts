import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli/index.js";
import { createAckitMcpServer } from "../../src/mcp/server.js";
import { EXIT_CODES } from "../../src/shared/exit-codes.js";

/**
 * Public-surface leak contract (v0.1.1 regression coverage).
 *
 * Internal traceability identifiers (`REQ-*`, `ADR-*`) and rebuild-era markers
 * (VNEXT, GOAL2, rebuild/ackit-vnext) belong to internal documents — they must
 * never appear in end-user visible CLI help or human-facing MCP metadata.
 *
 * Deliberately NOT forbidden: `TASK-####` — that is legitimate user-facing
 * task-id syntax documented by `ackit task create --help`.
 */
const FORBIDDEN_TOKENS = ["REQ-", "ADR-", "VNEXT", "GOAL2", "rebuild/ackit-vnext"] as const;

/** Core commands that must always be discovered by the help-matrix parser. */
const REQUIRED_TOP_LEVEL_COMMANDS = [
  "config",
  "scan",
  "instructions",
  "skills",
  "task",
  "init",
  "pack",
  "cache",
  "policy",
  "workspaces",
  "doctor",
  "optimize",
  "mcp",
  "report",
  "hooks",
] as const;

function assertNoForbiddenTokens(text: string, context: string): void {
  for (const token of FORBIDDEN_TOKENS) {
    expect(text.includes(token), `${context} leaks internal identifier "${token}"`).toBe(false);
  }
}

function captureStdout(): { output(): string; restore(): void } {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  return {
    output: () => chunks.join(""),
    restore: () => {
      spy.mockRestore();
    },
  };
}

async function captureHelp(argv: readonly string[]): Promise<string> {
  const captured = captureStdout();
  try {
    const code = await runCli([...argv]);
    expect(code, `help invocation failed for: ${argv.join(" ")}`).toBe(EXIT_CODES.ok);
    return captured.output();
  } finally {
    captured.restore();
  }
}

/**
 * Extracts command names from a Commander help "Commands:" section.
 * Only lines indented by EXACTLY two spaces count (entry lines); Commander
 * wraps long descriptions at the description column (deeper indent), so
 * wrapped continuation lines never produce phantom entries.
 */
function extractCommandNames(helpText: string): string[] {
  const names: string[] = [];
  let inCommandsSection = false;
  for (const line of helpText.split(/\r?\n/)) {
    if (/^Commands?:$/.test(line.trimEnd())) {
      inCommandsSection = true;
      continue;
    }
    if (!inCommandsSection) continue;
    if (line.trim() === "") {
      inCommandsSection = false;
      continue;
    }
    const entry = /^ {2}(?! )(\S+)/.exec(line);
    if (entry?.[1]) names.push(entry[1]);
  }
  // Commander injects a built-in `help [command]` entry into every parent
  // with subcommands; it rejects `--help` itself and is not product surface.
  return names.filter((name) => name !== "help");
}

describe("public CLI help cleanliness contract", () => {
  it("top-level help carries no internal requirement/rebuild identifiers", async () => {
    const help = await captureHelp(["node", "ackit", "--help"]);
    expect(help).toContain("Usage: ackit");
    assertNoForbiddenTokens(help, "ackit --help");
  });

  it("top-level help lists the full registered command set", async () => {
    const help = await captureHelp(["node", "ackit", "--help"]);
    const names = extractCommandNames(help);
    for (const required of REQUIRED_TOP_LEVEL_COMMANDS) {
      expect(names, `top-level help should register "${required}"`).toContain(required);
    }
  });

  it("every registered command and nested subcommand help is clean", async () => {
    const topLevelNames = extractCommandNames(await captureHelp(["node", "ackit", "--help"]));
    expect(topLevelNames.length).toBeGreaterThanOrEqual(REQUIRED_TOP_LEVEL_COMMANDS.length);
    for (const name of topLevelNames) {
      const commandHelp = await captureHelp(["node", "ackit", name, "--help"]);
      assertNoForbiddenTokens(commandHelp, `ackit ${name} --help`);
      for (const nested of extractCommandNames(commandHelp)) {
        const nestedHelp = await captureHelp(["node", "ackit", name, nested, "--help"]);
        assertNoForbiddenTokens(nestedHelp, `ackit ${name} ${nested} --help`);
      }
    }
  });

  it("keeps legitimate user-facing TASK-#### id syntax documentable", async () => {
    const createHelp = await captureHelp(["node", "ackit", "task", "create", "--help"]);
    expect(createHelp).toContain("TASK-####");
  });
});

describe("public MCP surface cleanliness contract", () => {
  let rootPath: string;

  beforeAll(async () => {
    rootPath = await mkdtemp(path.join(tmpdir(), "ackit-help-contract-"));
    await writeFile(path.join(rootPath, "AGENTS.md"), "# help-contract fixture\n");
    await writeFile(path.join(rootPath, "README.md"), "# fixture\n");
  });

  afterAll(async () => {
    await rm(rootPath, { recursive: true, force: true });
  });

  afterEach(() => {
    delete process.env["ACKIT_ROOT"];
  });

  async function connect(): Promise<{ client: Client; close(): Promise<void> }> {
    const { server } = await createAckitMcpServer(rootPath);
    const client = new Client({ name: "help-contract-client", version: "0.0.1" });
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

  it("tool and resource metadata carry no internal identifiers", async () => {
    const session = await connect();
    try {
      const { tools } = await session.client.listTools();
      for (const tool of tools) {
        assertNoForbiddenTokens(`${tool.name} ${tool.description ?? ""}`, `tool ${tool.name}`);
      }
      const { resources } = await session.client.listResources();
      for (const resource of resources) {
        assertNoForbiddenTokens(
          `${resource.name} ${resource.description ?? ""}`,
          `resource ${resource.uri}`,
        );
      }
    } finally {
      await session.close();
    }
  });

  it("prompt bodies and descriptions carry no internal identifiers", async () => {
    const session = await connect();
    try {
      const { prompts } = await session.client.listPrompts();
      expect(prompts.length).toBeGreaterThan(0);
      for (const prompt of prompts) {
        assertNoForbiddenTokens(
          `${prompt.name} ${prompt.description ?? ""}`,
          `prompt ${prompt.name}`,
        );
        const result = await session.client.getPrompt({ name: prompt.name, arguments: {} });
        for (const message of result.messages) {
          const content = message.content;
          if (content.type === "text") {
            assertNoForbiddenTokens(content.text, `prompt ${prompt.name} body`);
          }
        }
      }
    } finally {
      await session.close();
    }
  });
});
