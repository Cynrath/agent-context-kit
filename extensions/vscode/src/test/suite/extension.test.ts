import * as assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { WorkspaceSnapshot } from "../../services/ackitWorkspace.js";

suite("ACKit Extension Integration", () => {
  let root: string;
  let snapshot: WorkspaceSnapshot;
  suiteSetup(async () => {
    const folder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(folder, "Disposable workspace missing");
    root = folder.uri.fsPath;
    const ext = vscode.extensions.getExtension("Cynrath.ackit-vscode");
    assert.ok(ext, "Extension not found");
    await ext.activate();
    assert.ok(ext.isActive, "Extension not active");
    snapshot = await vscode.commands.executeCommand<WorkspaceSnapshot>("ackit.refresh");
  });

  test("registers every advertised command and view", async () => {
    const ext = vscode.extensions.getExtension("Cynrath.ackit-vscode");
    assert.ok(ext?.isActive);
    const pkg = ext.packageJSON as {
      contributes: { commands: { command: string }[]; views: { ackit: { id: string }[] } };
    };
    const commands = await vscode.commands.getCommands(true);
    for (const command of pkg.contributes.commands)
      assert.ok(commands.includes(command.command), command.command);
    for (const view of ["ackit.readiness", "ackit.findings", "ackit.graph", "ackit.tasks"])
      assert.ok(
        pkg.contributes.views.ackit.some((item) => item.id === view),
        view,
      );
  });
  test("service provides real scan, graph, readiness and optimization data", () => {
    assert.ok(snapshot);
    assert.strictEqual(snapshot.error, null);
    assert.ok(
      snapshot.scan?.findings.some(
        (finding) => finding.relativePath === "sample.txt" && finding.ruleId === "ACKIT020",
      ),
    );
    assert.ok(snapshot.graph?.nodes.some((node) => node.relativePath === "AGENTS.md"));
    assert.ok(snapshot.readiness, "SDK identity/templates failed to load");
    assert.ok(Number.isFinite(snapshot.readiness.overall));
    assert.ok(Array.isArray(snapshot.optimize));
  });
  test("refresh publishes actual ACKit diagnostics for the fixture finding", async () => {
    const snapshot = await vscode.commands.executeCommand<WorkspaceSnapshot>("ackit.refresh");
    assert.ok(snapshot?.readiness, "Packaged SDK identity/templates failed to load");
    assert.ok(Number.isFinite(snapshot.readiness.overall));
    const uri = vscode.Uri.file(path.join(root, "sample.txt"));
    const diagnostics = vscode.languages
      .getDiagnostics(uri)
      .filter((item) => item.source === "ackit");
    assert.ok(
      diagnostics.some((item) => item.code === "ACKIT020"),
      "Fixture diagnostic missing",
    );
  });
  test("opens a contained finding and refuses traversal", async () => {
    await vscode.commands.executeCommand("ackit.openFinding", {
      relativePath: "sample.txt",
      line: 1,
      column: 1,
    });
    const editor = vscode.window.activeTextEditor;
    assert.strictEqual(editor?.document.uri.fsPath, path.join(root, "sample.txt"));
    await vscode.commands.executeCommand("ackit.openFinding", {
      relativePath: "../outside.txt",
      line: 1,
      column: 1,
    });
    assert.strictEqual(
      vscode.window.activeTextEditor?.document.uri.fsPath,
      editor?.document.uri.fsPath,
    );
  });
  test("diagnostics command opens actual JSON output", async () => {
    await vscode.commands.executeCommand("ackit.diagnostics");
    const document = vscode.window.activeTextEditor?.document;
    assert.strictEqual(document?.languageId, "json");
    const data = JSON.parse(document?.getText() ?? "null") as { config: unknown; tasks: unknown };
    assert.strictEqual(data.config, "ok");
    assert.strictEqual(data.tasks, "ok");
  });
  test("service reflects a fixture create/change/delete lifecycle", async () => {
    const file = path.join(root, "lifecycle.txt");
    fs.writeFileSync(file, "TODO: lifecycle fixture\n", "utf8");
    snapshot = await vscode.commands.executeCommand<WorkspaceSnapshot>("ackit.refresh");
    assert.ok(snapshot.scan?.findings.some((finding) => finding.relativePath === "lifecycle.txt"));
    fs.writeFileSync(file, "Resolved lifecycle fixture\n", "utf8");
    snapshot = await vscode.commands.executeCommand<WorkspaceSnapshot>("ackit.refresh");
    assert.ok(!snapshot.scan?.findings.some((finding) => finding.relativePath === "lifecycle.txt"));
    fs.unlinkSync(file);
    snapshot = await vscode.commands.executeCommand<WorkspaceSnapshot>("ackit.refresh");
    assert.strictEqual(snapshot.error, null);
  });
});
