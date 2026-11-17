import * as assert from "node:assert";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { diagnosticKind, resolveFindingPath } from "../../diagnostics.js";

suite("ACKit diagnostic boundaries (without a VS Code host)", () => {
  for (const [severity, expected] of Object.entries({
    critical: "Error",
    high: "Error",
    medium: "Warning",
    low: "Information",
    info: "Hint",
  })) {
    test(`maps ${severity} to ${expected}`, () =>
      assert.strictEqual(diagnosticKind(severity), expected));
  }
  let fixture: string;
  let root: string;
  setup(() => {
    fixture = mkdtempSync(path.join(tmpdir(), "ackit-vscode-unit-"));
    root = path.join(fixture, "repo");
    mkdirSync(path.join(root, "src"), { recursive: true });
    mkdirSync(path.join(fixture, "repo-other"));
    writeFileSync(path.join(root, "src", "app.ts"), "fixture\n");
    writeFileSync(path.join(fixture, "repo-other", "outside.txt"), "outside\n");
  });
  teardown(() => {
    assert.strictEqual(path.dirname(fixture), path.resolve(tmpdir()));
    assert.ok(path.basename(fixture).startsWith("ackit-vscode-unit-"));
    rmSync(fixture, { recursive: true, force: true });
  });
  test("resolves a real contained file with portable separators", () => {
    const expected = realpathSync(path.join(root, "src", "app.ts"));
    assert.strictEqual(resolveFindingPath(root, "src/app.ts"), expected);
    assert.strictEqual(resolveFindingPath(root, "src\\app.ts"), expected);
  });
  test("rejects traversal, sibling-prefix, absolute, empty and NUL paths", () => {
    for (const relative of [
      "../repo-other/outside.txt",
      "..\\repo-other\\outside.txt",
      path.join(root, "src/app.ts"),
      "C:\\outside.txt",
      "",
      "src\0app.ts",
      "missing.ts",
    ]) {
      assert.strictEqual(resolveFindingPath(root, relative), null, relative);
    }
  });
  test("rejects a directory junction/symlink escaping the workspace", () => {
    symlinkSync(
      path.join(fixture, "repo-other"),
      path.join(root, "link"),
      process.platform === "win32" ? "junction" : "dir",
    );
    assert.strictEqual(resolveFindingPath(root, "link/outside.txt"), null);
  });
});
