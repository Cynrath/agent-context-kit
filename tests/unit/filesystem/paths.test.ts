import { describe, expect, it } from "vitest";
import {
  isInsideRoot,
  normalizeRelativePath,
  toPosix,
} from "../../../src/core/filesystem/paths.js";

describe("toPosix", () => {
  it("converts native separators", () => {
    expect(toPosix("a\\b\\c")).toBe("a/b/c");
    expect(toPosix("a/b/c")).toBe("a/b/c");
  });
});

describe("normalizeRelativePath", () => {
  it("normalizes dot segments and backslashes to canonical POSIX form", () => {
    expect(normalizeRelativePath("./a/./b") satisfies unknown).toEqual({ ok: true, value: "a/b" });
    expect(normalizeRelativePath("a\\b") satisfies unknown).toEqual({ ok: true, value: "a/b" });
    expect(normalizeRelativePath("a//b") satisfies unknown).toEqual({ ok: true, value: "a/b" });
    expect(normalizeRelativePath("docs/readme.md") satisfies unknown).toEqual({
      ok: true,
      value: "docs/readme.md",
    });
  });

  it("resolves interior parent segments without escaping", () => {
    expect(normalizeRelativePath("a/../b") satisfies unknown).toEqual({ ok: true, value: "b" });
    expect(normalizeRelativePath("a/b/../../c") satisfies unknown).toEqual({
      ok: true,
      value: "c",
    });
  });

  it("rejects absolute paths", () => {
    for (const input of ["/abs/path", "C:\\abs", "C:/abs", "\\\\server\\share"]) {
      const result = normalizeRelativePath(input);
      expect(result).toEqual({ ok: false, reason: "absolute" });
    }
  });

  it("rejects string-level root escapes before any fs access", () => {
    expect(normalizeRelativePath("../outside") satisfies unknown).toEqual({
      ok: false,
      reason: "escapes-root",
    });
    expect(normalizeRelativePath("a/../../outside") satisfies unknown).toEqual({
      ok: false,
      reason: "escapes-root",
    });
  });

  it("maps empty input to the repository root itself", () => {
    expect(normalizeRelativePath("") satisfies unknown).toEqual({ ok: true, value: "" });
  });
});

describe("isInsideRoot", () => {
  const root = "O:\\repo";

  it("accepts the root itself and full-segment descendants", () => {
    expect(isInsideRoot(root, "O:\\repo")).toBe(true);
    expect(isInsideRoot(root, "O:\\repo\\src\\file.ts")).toBe(true);
  });

  it("rejects prefix-siblings that merely share a prefix string", () => {
    expect(isInsideRoot(root, "O:\\repo-other\\file.ts")).toBe(false);
  });

  it("rejects outside targets on any platform semantics", () => {
    expect(isInsideRoot(root, "C:\\elsewhere\\file.txt", false)).toBe(false);
  });

  it("compares case-insensitively when the platform says so", () => {
    expect(isInsideRoot(root, "o:\\REPO\\File.TS", true)).toBe(true);
    expect(isInsideRoot(root, "o:\\REPO\\File.TS", false)).toBe(false);
  });
});
