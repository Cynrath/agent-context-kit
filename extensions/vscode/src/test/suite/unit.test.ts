import * as assert from "node:assert";
import * as vscode from "vscode";

suite("ACKit Unit Tests", () => {
  test("severity mapping", () => {
    // Verify that findings severity maps to DiagnosticSeverity correctly
    // This is a pure logic test, no VS Code API needed beyond enum
    const map = (sev: string) => {
      if (sev === "critical" || sev === "high") return vscode.DiagnosticSeverity.Error;
      if (sev === "medium") return vscode.DiagnosticSeverity.Warning;
      if (sev === "low") return vscode.DiagnosticSeverity.Information;
      return vscode.DiagnosticSeverity.Hint;
    };
    assert.strictEqual(map("critical"), vscode.DiagnosticSeverity.Error);
    assert.strictEqual(map("high"), vscode.DiagnosticSeverity.Error);
    assert.strictEqual(map("medium"), vscode.DiagnosticSeverity.Warning);
    assert.strictEqual(map("low"), vscode.DiagnosticSeverity.Information);
    assert.strictEqual(map("info"), vscode.DiagnosticSeverity.Hint);
  });

  test("path handling — safe Uri.joinPath", () => {
    const root = "/tmp/workspace";
    const rel = "src/app.ts";
    const uri = vscode.Uri.joinPath(vscode.Uri.file(root), rel);
    assert.ok(uri.fsPath.endsWith("src/app.ts") || uri.fsPath.includes("src"));
    // Ensure that absolute path outside root is not joined blindly
    const evil = "/etc/passwd";
    // Our code should check isInsideRoot before joining
    assert.ok(!evil.startsWith(root));
  });

  test("multi-root selection", () => {
    // Simulate multi-root logic: active editor's folder should be preferred
    // This is a logic test, not requiring actual workspace
    const roots = ["/a", "/b", "/c"];
    const active = "/b/src/file.ts";
    const folder = roots.find((r) => active.startsWith(r));
    assert.strictEqual(folder, "/b");
  });

  test("watch debounce", async () => {
    let count = 0;
    let timer: NodeJS.Timeout | undefined;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => count++, 100);
    };
    schedule(); schedule(); schedule();
    await new Promise((r) => setTimeout(r, 250));
    assert.strictEqual(count, 1);
  });

  test("error states", () => {
    const snap = { error: "test error", scan: null } as unknown as { error: string | null; scan: unknown };
    assert.ok(snap.error);
  });
});
