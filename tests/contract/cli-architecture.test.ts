import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const CLI_DIR = fileURLToPath(new URL("../../src/cli/", import.meta.url));
const CORE_DIR = fileURLToPath(new URL("../../src/core/", import.meta.url));
const MCP_DIR = fileURLToPath(new URL("../../src/mcp/", import.meta.url));

function lineCount(path: string): number {
  return readFileSync(path, "utf8").split("\n").length;
}

describe("CLI module architecture (TASK-0002 / REQ-ARCH-008)", () => {
  it("entrypoint index.ts stays a minimal bootstrap under 200 lines", () => {
    expect(lineCount(`${CLI_DIR}index.ts`)).toBeLessThan(200);
  });

  it("program.ts stays under 500 lines", () => {
    expect(lineCount(`${CLI_DIR}program.ts`)).toBeLessThan(500);
  });

  it("every command module stays under 500 lines", () => {
    const files = readdirSync(`${CLI_DIR}commands`).filter((f) => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThanOrEqual(12);
    for (const file of files) {
      const count = lineCount(`${CLI_DIR}commands/${file}`);
      expect(count, `${file} has ${count} lines`).toBeLessThan(500);
    }
  });

  it("command and shared modules never import program or entrypoint", () => {
    const files = [
      ...readdirSync(`${CLI_DIR}commands`)
        .filter((f) => f.endsWith(".ts"))
        .map((f) => `${CLI_DIR}commands/${f}`),
      `${CLI_DIR}context.ts`,
      `${CLI_DIR}errors.ts`,
      `${CLI_DIR}output.ts`,
      `${CLI_DIR}root.ts`,
    ];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      expect(src.includes(`"../program.js"`), `${file} imports program`).toBe(false);
      expect(src.includes(`"./program.js"`), `${file} imports program`).toBe(false);
      expect(src.includes(`"../index.js"`), `${file} imports entrypoint`).toBe(false);
      expect(src.includes(`"./index.js"`), `${file} imports entrypoint`).toBe(false);
    }
  });

  it("core and mcp layers never import CLI modules", () => {
    const stacks: Array<[string, string]> = [
      [CORE_DIR, "../../core"],
      [MCP_DIR, "../../mcp"],
    ];
    for (const [dir, label] of stacks) {
      const walk = (d: string): string[] =>
        readdirSync(d, { recursive: true })
          .filter((f) => String(f).endsWith(".ts"))
          .map((f) => `${d}/${String(f)}`);
      for (const file of walk(dir)) {
        const src = readFileSync(file, "utf8");
        expect(src.includes(`/cli/`), `${label} file ${file} imports cli`).toBe(false);
      }
    }
  });
});
