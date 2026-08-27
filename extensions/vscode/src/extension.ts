import * as vscode from "vscode";
import { scanRepository, buildInstructionGraph, scoreRepository } from "@cynrath/agent-context-kit";

let output: vscode.OutputChannel | undefined;

export async function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("ACKit");
  output.appendLine("ACKit extension activated");

  const diagCollection = vscode.languages.createDiagnosticCollection("ackit");

  async function refresh() {
    try {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
      // Use SDK directly (no shell, no network)
      const result = await scanRepository({ canonicalPath: root } as never);
      diagCollection.clear();
      for (const finding of result.findings) {
        const uri = vscode.Uri.file(`${root}/${finding.relativePath}`);
        const range = new vscode.Range(finding.line - 1, finding.column - 1, finding.line - 1, finding.column + 10);
        const diag = new vscode.Diagnostic(range, finding.message, vscode.DiagnosticSeverity.Warning);
        diag.code = finding.ruleId;
        diag.source = "ackit";
        const existing = diagCollection.get(uri) ?? [];
        diagCollection.set(uri, [...existing, diag]);
      }
      vscode.window.showInformationMessage(`ACKit: ${result.findings.length} findings, ${result.filesScanned} files`);
    } catch (e) {
      vscode.window.showErrorMessage(`ACKit refresh failed: ${e}`);
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("ackit.refresh", refresh),
    vscode.commands.registerCommand("ackit.showGraph", async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
      const graph = await buildInstructionGraph({ canonicalPath: root } as never);
      const pick = await vscode.window.showQuickPick(graph.nodes.map((n) => n.id), { placeHolder: "Instruction graph nodes" });
      if (pick) vscode.window.showInformationMessage(`Selected ${pick}`);
    }),
    vscode.commands.registerCommand("ackit.optimize", async () => {
      vscode.window.showInformationMessage("ACKit optimize: run `ackit optimize` in terminal");
    }),
    vscode.commands.registerCommand("ackit.diagnostics", async () => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
      const graph = await buildInstructionGraph({ canonicalPath: root } as never);
      vscode.window.showInformationMessage(`ACKit diagnostics: ${graph.nodes.length} instruction nodes`);
    }),
    diagCollection,
    ...(output ? [output] : []),
  );

  // Watch for file changes (debounced)
  const watcher = vscode.workspace.createFileSystemWatcher("**/*", false, false, false);
  let debounce: NodeJS.Timeout | undefined;
  watcher.onDidChange(() => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void refresh(), 400);
  });
  context.subscriptions.push(watcher);

  // Initial refresh
  void refresh();
}

export function deactivate() {
  output?.dispose();
}
