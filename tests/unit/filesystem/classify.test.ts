import { describe, expect, it } from "vitest";
import { classifyContent } from "../../../src/core/filesystem/classify.js";

function ascii(text: string): Buffer {
  return Buffer.from(text, "latin1");
}

describe("classifyContent", () => {
  it("classifies empty content as text", () => {
    expect(classifyContent(Buffer.alloc(0))).toBe("text");
  });

  it("detects UTF-8 BOM as text", () => {
    expect(classifyContent(Buffer.from([0xef, 0xbb, 0xbf, 0x61]))).toBe("text");
  });

  it("detects UTF-16/32 BOMs as text", () => {
    expect(classifyContent(Buffer.from([0xff, 0xfe, 0x41, 0x00]))).toBe("text");
    expect(classifyContent(Buffer.from([0xfe, 0xff]))).toBe("text");
    expect(classifyContent(Buffer.from([0x00, 0x00, 0xfe, 0xff]))).toBe("text");
  });

  it("classifies a NUL byte anywhere as binary", () => {
    expect(classifyContent(ascii("hello\0world"))).toBe("binary");
  });

  it("keeps ordinary ASCII text as text", () => {
    expect(classifyContent(ascii("key=value\n# comment\r\n"))).toBe("text");
  });

  it("treats UTF-8 continuation bytes as printable text", () => {
    const utf8 = Buffer.from("şğü öç émoji ✓", "utf8");
    expect(classifyContent(utf8)).toBe("text");
  });

  it("flags dense control-character payloads as binary", () => {
    const bytes: number[] = [];
    for (let index = 0; index < 256; index += 1) {
      bytes.push(index % 2 === 0 ? 0x01 : 0x41);
    }
    expect(classifyContent(Buffer.from(bytes))).toBe("binary");
  });
});
