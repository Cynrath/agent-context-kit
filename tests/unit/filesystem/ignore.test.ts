import { describe, expect, it } from "vitest";
import { IgnoreEngine } from "../../../src/core/filesystem/ignore.js";

describe("IgnoreEngine.decideFile", () => {
  it("explains built-in structural excludes", () => {
    const engine = new IgnoreEngine();
    expect(engine.decideFile("node_modules/pkg/index.js").source).toEqual({
      layer: "builtin",
      pattern: "node_modules",
    });
    expect(engine.decideFile("src/dist/output.js").ignored).toBe(true);
    expect(engine.isDirectoryIgnored(".git")).toBe(true);
  });

  it("does not ignore files that merely share a prefix with a builtin name", () => {
    const engine = new IgnoreEngine();
    expect(engine.decideFile("src/distribution.ts").ignored).toBe(false);
    expect(engine.decideFile("node_modules.bak/file.txt").ignored).toBe(false);
  });

  it("applies root and nested .gitignore layers from the stack cache", () => {
    const engine = new IgnoreEngine();
    engine.injectGitignoreForTest("", "*.log\n!keep.log");
    engine.injectGitignoreForTest("custom-dir", "secret.txt");
    expect(engine.decideFile("debug.log").ignored).toBe(true);
    expect(engine.decideFile("keep.log").ignored).toBe(false);
    // Builtin structural excludes win before gitignore layers are consulted.
    expect(engine.decideFile("build/secret.txt").source).toEqual({
      layer: "builtin",
      pattern: "build",
    });
    expect(engine.decideFile("custom-dir/secret.txt").source).toEqual({
      layer: "gitignore",
      file: "custom-dir/.gitignore",
    });
    // Root rule still reaches nested paths.
    expect(engine.decideFile("custom-dir/x.log").ignored).toBe(true);
  });

  it("evaluates user exclude globs last", () => {
    const engine = new IgnoreEngine({ userExcludeGlobs: ["**/*.generated.ts"] });
    expect(engine.decideFile("src/api.generated.ts").source).toEqual({
      layer: "user-exclude",
      pattern: "**/*.generated.ts",
    });
    expect(engine.decideFile("src/handwritten.ts").ignored).toBe(false);
  });

  it("never ignores the repository root itself", () => {
    const engine = new IgnoreEngine();
    expect(engine.isDirectoryIgnored("")).toBe(false);
  });
});
