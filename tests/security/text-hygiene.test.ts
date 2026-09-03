import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { checkText, formatFinding } from "../../scripts/check-text-hygiene.mjs";

// NOTE: control characters below are built with String.fromCharCode and the
// expected "\\uXXXX" forms with plain concatenation, so this source file
// itself contains neither raw control bytes nor backslash-u sequences.

const BEL_CHAR = String.fromCharCode(0x07);
const NUL_CHAR = String.fromCharCode(0x00);
const DEL_CHAR = String.fromCharCode(0x7f);
const ESC_CHAR = String.fromCharCode(0x1b);
const BS = String.fromCharCode(0x5c);
const BEL = `a${BEL_CHAR}ckit sync`;
const U7 = `${BS}u0007`;

const SCRIPT = ["scripts/check-text-hygiene.mjs"];

function run(args: string[], input?: Buffer): { code: number; stdout: Buffer; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, [...SCRIPT, ...args], {
      cwd: process.cwd(),
      input,
      stdio: ["pipe", "pipe", "pipe"],
    }) as Buffer;
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    const failed = error as { status?: number; stdout?: Buffer; stderr?: Buffer };
    return {
      code: failed.status ?? 2,
      stdout: (failed.stdout as Buffer) ?? Buffer.alloc(0),
      stderr: String(failed.stderr ?? ""),
    };
  }
}

function fixture(name: string, content: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), "ackit-hygiene-"));
  const file = path.join(dir, name);
  writeFileSync(file, content, "utf8");
  return file;
}

function cleanup(file: string): void {
  rmSync(path.dirname(file), { recursive: true, force: true });
}

describe("text hygiene unit (checkText)", () => {
  it("flags BEL with file/line/column/code point/escaped form", () => {
    const { findings, total } = checkText(BEL, "pr-body.md");
    expect(total).toBe(1);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      file: "pr-body.md",
      line: 1,
      column: 2,
      codePoint: "U+0007",
      escaped: U7,
      name: "BEL",
    });
    expect(formatFinding(findings[0] as never)).toBe(`pr-body.md:1:2: U+0007 (${U7} BEL)`);
  });

  it("rejects NUL and DEL", () => {
    expect(checkText(`a${NUL_CHAR}b`, "f").total).toBe(1);
    expect(checkText(`a${DEL_CHAR}b`, "f").total).toBe(1);
    expect(checkText(`a${NUL_CHAR}b`, "f").findings[0]).toMatchObject({ codePoint: "U+0000" });
    expect(checkText(`a${DEL_CHAR}b`, "f").findings[0]).toMatchObject({ codePoint: "U+007F" });
  });

  it("allows LF/TAB/CR and normal Markdown/Unicode/Turkish text", () => {
    const tab = String.fromCharCode(0x09);
    const clean = [
      "# Title `code` \\ backslash",
      "",
      "- [x] Gunesli Istanbul: gsocI — emoji",
      `CJK: test | tab${tab}here | CRLF ok`,
      "| table | pipe |",
      "```",
      "fenced",
      "```",
    ].join("\n");
    expect(checkText(`${clean}\r\ntrailing crlf\r\n`, "clean.md").total).toBe(0);
  });

  it("reports locations across lines", () => {
    const { findings } = checkText(`ok\nbad${ESC_CHAR}here\nok`, "f");
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ line: 2, column: 4, codePoint: "U+001B" });
  });
});

describe("text hygiene CLI end-to-end", () => {
  it("exact BEL regression fails and identifies U+0007 without echoing it", () => {
    const file = fixture("bel.md", `${BEL}\n`);
    try {
      const { code, stdout } = run([file]);
      expect(code).toBe(1);
      const text = stdout.toString("utf8");
      expect(text).toContain("U+0007");
      expect(text).toContain("BEL");
      // The dangerous byte itself must never be echoed back.
      expect([...stdout].some((byte) => byte === 0x07)).toBe(false);
    } finally {
      cleanup(file);
    }
  });

  it("clean Markdown passes", () => {
    const file = fixture("clean.md", "# Hi\n\n- [x] done\n");
    try {
      expect(run([file]).code).toBe(0);
    } finally {
      cleanup(file);
    }
  });

  it("stdin mode checks piped bodies", () => {
    expect(run(["--stdin"], Buffer.from("# clean\n", "utf8")).code).toBe(0);
    const dirty = run(["--stdin"], Buffer.from(`${BEL}\n`, "utf8"));
    expect(dirty.code).toBe(1);
    expect(dirty.stdout.toString("utf8")).toContain("U+0007");
  });

  it("missing file is a usage/IO error, not a finding", () => {
    const { code } = run(["docs/no-such-file-xyz.md"]);
    expect(code).toBe(2);
  });

  it("no arguments prints usage with exit 2", () => {
    expect(run([]).code).toBe(2);
  });

  it("check-text-hygiene.mjs exits 0 on the working tree", () => {
    expect(run(["--repo", "--quiet"]).code).toBe(0);
  }, 60000);
});
