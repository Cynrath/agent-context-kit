import * as path from "node:path";
import {
  analyzeOptimize,
  buildInstructionGraph,
  resolveEffectiveStack,
  scanRepository,
  scoreRepository,
} from "@cynrath/agent-context-kit";
import * as vscode from "vscode";
import { AckitWorkspaceService } from "./services/ackitWorkspace.js";

let service: AckitWorkspaceService | undefined;
let output: vscode.OutputChannel | undefined;

// --- Tree Data Providers ---

class ReadinessProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  constructor(private svc: AckitWorkspaceService) {
    svc.onDidChange(() => this._onDidChangeTreeData.fire());
  }
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(el: vscode.TreeItem) {
    return el;
  }
  async getChildren(el?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    const snap = this.svc.getSnapshot();
    if (!snap?.readiness) {
      const item = new vscode.TreeItem(
        snap?.error ? `Error: ${snap.error}` : "No readiness data — run Refresh",
        vscode.TreeItemCollapsibleState.None,
      );
      item.tooltip = snap?.error ?? "No data";
      return [item];
    }
    const r = snap.readiness as unknown as {
      overall: number;
      categories: Array<{
        id: string;
        score: number;
        max: number;
        deductions: Array<{ message: string }>;
      }>;
    };
    if (!el) {
      const overall = new vscode.TreeItem(
        `Overall ${r.overall}/100`,
        vscode.TreeItemCollapsibleState.Expanded,
      );
      overall.tooltip = `Overall readiness ${r.overall}/100`;
      overall.iconPath = new vscode.ThemeIcon(r.overall >= 80 ? "pass" : "warning");
      const cats = r.categories.map((c) => {
        const item = new vscode.TreeItem(
          `${c.id} ${c.score}/${c.max}`,
          vscode.TreeItemCollapsibleState.Collapsed,
        );
        item.description = `${c.score}/${c.max}`;
        item.tooltip = c.deductions.map((d) => d.message).join("\n") || c.id;
        // Store category for children
        (item as unknown as { _cat: typeof c })._cat = c;
        return item;
      });
      return [overall, ...cats];
    }
    // Category children: deductions
    const cat = (el as unknown as { _cat?: { deductions: Array<{ message: string }> } })._cat;
    if (cat) {
      return cat.deductions.slice(0, 10).map((d) => {
        const item = new vscode.TreeItem(d.message, vscode.TreeItemCollapsibleState.None);
        item.tooltip = d.message;
        item.iconPath = new vscode.ThemeIcon("info");
        return item;
      });
    }
    return [];
  }
}

class FindingsProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  constructor(private svc: AckitWorkspaceService) {
    svc.onDidChange(() => this._onDidChangeTreeData.fire());
  }
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(el: vscode.TreeItem) {
    return el;
  }
  async getChildren(el?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    const snap = this.svc.getSnapshot();
    if (!snap?.scan) {
      return [
        new vscode.TreeItem(
          snap?.error ? `Error: ${snap.error}` : "No findings — run Refresh",
          vscode.TreeItemCollapsibleState.None,
        ),
      ];
    }
    const findings = (
      snap.scan as unknown as {
        findings: Array<{
          ruleId: string;
          severity: string;
          message: string;
          relativePath: string;
          line: number;
          column: number;
        }>;
      }
    ).findings;
    if (!el) {
      // Group by severity
      const groups = new Map<string, typeof findings>();
      for (const f of findings) {
        const g = groups.get(f.severity) ?? [];
        g.push(f);
        groups.set(f.severity, g);
      }
      const order = ["critical", "high", "medium", "low", "info"];
      return order
        .filter((s) => groups.has(s))
        .map((sev) => {
          const list = groups.get(sev) ?? [];
          const item = new vscode.TreeItem(
            `${sev} (${list.length})`,
            vscode.TreeItemCollapsibleState.Collapsed,
          );
          item.iconPath = new vscode.ThemeIcon(
            sev === "critical" || sev === "high" ? "error" : sev === "medium" ? "warning" : "info",
          );
          (item as unknown as { _sev: string; _list: typeof findings })._sev = sev;
          (item as unknown as { _sev: string; _list: typeof findings })._list = list;
          return item;
        });
    }
    const sev = (el as unknown as { _sev?: string; _list?: typeof findings })._sev;
    const list = (el as unknown as { _sev?: string; _list?: typeof findings })._list;
    if (sev && list) {
      return list.slice(0, 50).map((f) => {
        const item = new vscode.TreeItem(
          `${f.ruleId}: ${f.message.slice(0, 60)}`,
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = f.relativePath;
        item.tooltip = `${f.ruleId} ${f.severity}\n${f.relativePath}:${f.line}:${f.column}\n${f.message}`;
        item.command = {
          command: "ackit.openFinding",
          title: "Open Finding",
          arguments: [f],
        };
        return item;
      });
    }
    return [];
  }
}

class GraphProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  constructor(private svc: AckitWorkspaceService) {
    svc.onDidChange(() => this._onDidChangeTreeData.fire());
  }
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(el: vscode.TreeItem) {
    return el;
  }
  async getChildren(el?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    const snap = this.svc.getSnapshot();
    if (!snap?.graph) {
      return [
        new vscode.TreeItem(
          snap?.error ? `Error: ${snap.error}` : "No graph — run Refresh",
          vscode.TreeItemCollapsibleState.None,
        ),
      ];
    }
    const graph = snap.graph as unknown as {
      nodes: Array<{
        id: string;
        relativePath: string;
        provider: string;
        precedence: number;
        provenance: Array<{ source: string }>;
      }>;
    };
    if (!el) {
      return graph.nodes.slice(0, 100).map((n) => {
        const item = new vscode.TreeItem(`${n.id}`, vscode.TreeItemCollapsibleState.None);
        item.description = `${n.provider} prec ${n.precedence}`;
        item.tooltip = `${n.relativePath}\nprovenance: ${n.provenance.map((p) => p.source).join(", ")}`;
        item.command = { command: "ackit.showGraph", title: "Show Graph", arguments: [n.id] };
        return item;
      });
    }
    return [];
  }
}

class TasksProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  constructor(private svc: AckitWorkspaceService) {
    svc.onDidChange(() => this._onDidChangeTreeData.fire());
  }
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(el: vscode.TreeItem) {
    return el;
  }
  async getChildren(el?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    const snap = this.svc.getSnapshot();
    // Canonical task status snapshot (TASK-0083 parity with `ackit status`).
    const status = snap?.taskStatus as
      | {
          taskId: string;
          title: string;
          status: string;
          stage: string | null;
          blockerCount: number;
          blockers: string[];
          next: { action: string; command?: string; reason: string }[];
        }
      | null
      | undefined;
    if (!status) {
      const item = new vscode.TreeItem(
        snap?.diagnostics ? "Tasks: see diagnostics" : "No tasks",
        vscode.TreeItemCollapsibleState.None,
      );
      item.tooltip = "Tasks are managed via docs/tasks, use ACKit: Diagnostics for details";
      return [item];
    }
    if (!el) {
      const head = new vscode.TreeItem(
        `${status.taskId} — ${status.title.slice(0, 50)}`,
        vscode.TreeItemCollapsibleState.Expanded,
      );
      head.description = status.stage ? `stage ${status.stage}` : status.status;
      head.tooltip = `${status.taskId} [${status.status}]${status.stage ? ` stage ${status.stage}` : ""}\n${status.blockerCount} blocker(s)`;
      head.iconPath = new vscode.ThemeIcon(status.blockerCount === 0 ? "pass" : "warning");
      const blockers = new vscode.TreeItem(
        status.blockerCount === 0
          ? "No blockers — completion eligible"
          : `Blockers (${status.blockerCount})`,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      (blockers as unknown as { _kind: string })._kind = "blockers";
      const next = new vscode.TreeItem("Next actions", vscode.TreeItemCollapsibleState.Collapsed);
      (next as unknown as { _kind: string })._kind = "next";
      return [head, blockers, next];
    }
    const kind = (el as unknown as { _kind?: string })._kind;
    if (kind === "blockers") {
      if (status.blockers.length === 0) {
        return [new vscode.TreeItem("Completion eligible", vscode.TreeItemCollapsibleState.None)];
      }
      return status.blockers.map((b) => {
        const item = new vscode.TreeItem(b.slice(0, 100), vscode.TreeItemCollapsibleState.None);
        item.tooltip = b;
        item.iconPath = new vscode.ThemeIcon("warning");
        return item;
      });
    }
    if (kind === "next") {
      return status.next.map((n) => {
        const item = new vscode.TreeItem(
          n.action.slice(0, 100),
          vscode.TreeItemCollapsibleState.None,
        );
        item.description = n.command ?? "";
        item.tooltip = `${n.action}${n.command ? `\n${n.command}` : ""}\n${n.reason}`;
        return item;
      });
    }
    return [];
  }
}

class PolicyProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  constructor(private svc: AckitWorkspaceService) {
    svc.onDidChange(() => this._onDidChangeTreeData.fire());
  }
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(el: vscode.TreeItem) {
    return el;
  }
  async getChildren(): Promise<vscode.TreeItem[]> {
    const snap = this.svc.getSnapshot();
    const item = new vscode.TreeItem(
      snap?.diagnostics ? "Policy: see diagnostics" : "No policy",
      vscode.TreeItemCollapsibleState.None,
    );
    item.tooltip = "Policy details via ACKit: Diagnostics";
    return [item];
  }
}

class OptimizeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  constructor(private svc: AckitWorkspaceService) {
    svc.onDidChange(() => this._onDidChangeTreeData.fire());
  }
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  getTreeItem(el: vscode.TreeItem) {
    return el;
  }
  async getChildren(): Promise<vscode.TreeItem[]> {
    const snap = this.svc.getSnapshot();
    const list =
      (snap?.optimize as unknown as Array<{
        id: string;
        category: string;
        severity: string;
        message: string;
        tokenWasteEstimate?: number;
        evidencePaths: string[];
      }>) ?? [];
    if (list.length === 0)
      return [new vscode.TreeItem("No optimizations", vscode.TreeItemCollapsibleState.None)];
    return list.slice(0, 30).map((s) => {
      const item = new vscode.TreeItem(
        `${s.severity} ${s.category}: ${s.message.slice(0, 50)}`,
        vscode.TreeItemCollapsibleState.None,
      );
      item.description = s.tokenWasteEstimate
        ? `waste ~${s.tokenWasteEstimate}`
        : (s.evidencePaths[0] ?? "");
      item.tooltip = `${s.id}\n${s.message}\nEvidence: ${s.evidencePaths.join(", ")}\nWaste: ${s.tokenWasteEstimate ?? 0}`;
      return item;
    });
  }
}

export async function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("ACKit");
  output.appendLine("ACKit extension activating…");
  service = new AckitWorkspaceService();

  const readinessProvider = new ReadinessProvider(service);
  const findingsProvider = new FindingsProvider(service);
  const graphProvider = new GraphProvider(service);
  const tasksProvider = new TasksProvider(service);
  const policyProvider = new PolicyProvider(service);
  const optimizeProvider = new OptimizeProvider(service);

  context.subscriptions.push(
    vscode.window.createTreeView("ackit.readiness", { treeDataProvider: readinessProvider }),
    vscode.window.createTreeView("ackit.findings", { treeDataProvider: findingsProvider }),
    vscode.window.createTreeView("ackit.graph", { treeDataProvider: graphProvider }),
    vscode.window.createTreeView("ackit.tasks", { treeDataProvider: tasksProvider }),
    vscode.window.createTreeView("ackit.policy", { treeDataProvider: policyProvider }),
    vscode.window.createTreeView("ackit.optimize", { treeDataProvider: optimizeProvider }),
  );

  const diagCollection = vscode.languages.createDiagnosticCollection("ackit");
  context.subscriptions.push(diagCollection);

  async function refreshDiagnostics() {
    const snap = service?.getSnapshot();
    if (!snap?.scan) return;
    const findings = (
      snap.scan as unknown as {
        findings: Array<{
          ruleId: string;
          severity: string;
          message: string;
          relativePath: string;
          line: number;
          column: number;
        }>;
      }
    ).findings;
    diagCollection.clear();
    const byUri = new Map<string, vscode.Diagnostic[]>();
    for (const f of findings) {
      // Skip if no valid path
      if (!f.relativePath || f.relativePath.includes("\0")) continue;
      // Safe URI construction
      let uri: vscode.Uri;
      try {
        const root =
          service?.getSnapshot()?.root ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? "";
        if (!root) continue;
        // Only create diagnostics for files that are inside workspace
        const full = path.isAbsolute(f.relativePath)
          ? f.relativePath
          : path.join(root, f.relativePath);
        // Ensure inside root
        if (!full.startsWith(root)) continue;
        uri = vscode.Uri.file(full);
      } catch {
        continue;
      }
      const line = Math.max(0, (f.line ?? 1) - 1);
      const col = Math.max(0, (f.column ?? 1) - 1);
      // Handle invalid line/col: if 0, use 0,0 range
      const range = new vscode.Range(line, col, line, col + 10);
      const severity =
        f.severity === "critical" || f.severity === "high"
          ? vscode.DiagnosticSeverity.Error
          : f.severity === "medium"
            ? vscode.DiagnosticSeverity.Warning
            : f.severity === "low"
              ? vscode.DiagnosticSeverity.Information
              : vscode.DiagnosticSeverity.Hint;
      const diag = new vscode.Diagnostic(range, f.message, severity);
      diag.code = f.ruleId;
      diag.source = "ackit";
      const key = uri.toString();
      const arr = byUri.get(key) ?? [];
      arr.push(diag);
      byUri.set(key, arr);
    }
    for (const [key, diags] of byUri) {
      const uri = vscode.Uri.parse(key);
      diagCollection.set(uri, diags);
    }
  }

  // Refresh diagnostics when service changes
  service.onDidChange(() => {
    void refreshDiagnostics();
    readinessProvider.refresh();
    findingsProvider.refresh();
    graphProvider.refresh();
    tasksProvider.refresh();
    policyProvider.refresh();
    optimizeProvider.refresh();
  });

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("ackit.refresh", async () => {
      const roots = service?.getRoots() ?? [];
      for (const r of roots) await service?.refreshRoot(r);
      vscode.window.showInformationMessage(`ACKit: refreshed ${roots.length} workspace(s)`);
    }),
    vscode.commands.registerCommand("ackit.showGraph", async (nodeId?: string) => {
      const snap = service?.getSnapshot();
      if (!snap?.graph) {
        vscode.window.showInformationMessage("ACKit: no graph, run Refresh");
        return;
      }
      const graph = snap.graph as unknown as { nodes: Array<{ id: string; relativePath: string }> };
      if (nodeId) {
        const node = graph.nodes.find((n) => n.id === nodeId);
        if (node) {
          const doc = await vscode.workspace.openTextDocument(
            vscode.Uri.file(path.join(snap.root, node.relativePath)),
          );
          await vscode.window.showTextDocument(doc);
          return;
        }
      }
      const pick = await vscode.window.showQuickPick(
        graph.nodes.map((n) => ({ label: n.id, description: n.relativePath })),
        { placeHolder: "Instruction graph nodes" },
      );
      if (pick) vscode.window.showInformationMessage(`Selected ${pick.label}`);
    }),
    vscode.commands.registerCommand("ackit.showReadiness", async () => {
      const snap = service?.getSnapshot();
      if (!snap?.readiness) {
        vscode.window.showInformationMessage("ACKit: no readiness, run Refresh");
        return;
      }
      const r = snap.readiness as unknown as {
        overall: number;
        categories: Array<{ id: string; score: number }>;
      };
      const cat = await vscode.window.showQuickPick(
        r.categories.map((c) => ({
          label: `${c.id} ${c.score}/100`,
          description: `score ${c.score}`,
        })),
        { placeHolder: `Overall ${r.overall}/100 — categories` },
      );
      if (cat) vscode.window.showInformationMessage(cat.label);
    }),
    vscode.commands.registerCommand(
      "ackit.openFinding",
      async (finding: { relativePath: string; line: number; column: number }) => {
        try {
          const root =
            service?.getSnapshot()?.root ??
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ??
            "";
          if (!root) return;
          const full = path.join(root, finding.relativePath);
          const uri = vscode.Uri.file(full);
          const doc = await vscode.workspace.openTextDocument(uri);
          const editor = await vscode.window.showTextDocument(doc);
          const pos = new vscode.Position(
            Math.max(0, finding.line - 1),
            Math.max(0, finding.column - 1),
          );
          editor.selection = new vscode.Selection(pos, pos);
          editor.revealRange(new vscode.Range(pos, pos));
        } catch (e) {
          vscode.window.showErrorMessage(`Could not open finding: ${e}`);
        }
      },
    ),
    vscode.commands.registerCommand("ackit.instructionsForCurrentFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage("No active editor");
        return;
      }
      const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
      if (!folder) {
        vscode.window.showInformationMessage("File not in workspace");
        return;
      }
      const root = folder.uri.fsPath;
      const forPath = path
        .relative(root, editor.document.uri.fsPath)
        .split(path.sep)
        .join(path.posix.sep);
      try {
        const graph = await buildInstructionGraph({ canonicalPath: root });
        const stack = resolveEffectiveStack(graph, "codex", forPath, {
          detailed: true,
        }) as unknown as {
          chain: string[];
          perNode: Record<string, { why: string; provenance: Array<{ source: string }> }>;
        };
        if (stack.chain.length === 0) {
          vscode.window.showInformationMessage(`No effective instructions for ${forPath}`);
          return;
        }
        const items = stack.chain.map((id) => {
          const info = stack.perNode[id];
          return {
            label: id,
            description: info?.why ?? "",
            detail: info?.provenance.map((p) => p.source).join(", ") ?? "",
          };
        });
        const pick = await vscode.window.showQuickPick(items, {
          placeHolder: `Effective instructions for ${forPath} — ${stack.chain.length} nodes`,
        });
        if (pick) vscode.window.showInformationMessage(pick.label);
      } catch (e) {
        vscode.window.showErrorMessage(`Failed to resolve instructions: ${e}`);
      }
    }),
    vscode.commands.registerCommand("ackit.optimize", async () => {
      const root = service?.getRootForActiveEditor() ?? service?.getRoots()[0];
      if (!root) {
        vscode.window.showInformationMessage("No workspace");
        return;
      }
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "ACKit: analyzing optimizations…",
        },
        async () => {
          try {
            const suggestions = await analyzeOptimize({ canonicalPath: root });
            if (suggestions.length === 0) {
              vscode.window.showInformationMessage("ACKit: no optimizations found");
              return;
            }
            const pick = await vscode.window.showQuickPick(
              suggestions.map((s) => ({
                label: `${s.severity} ${s.category}: ${s.message.slice(0, 80)}`,
                description: s.tokenWasteEstimate
                  ? `waste ~${s.tokenWasteEstimate}`
                  : (s.evidencePaths[0] ?? ""),
                detail: s.remediation,
                suggestion: s,
              })),
              { placeHolder: `${suggestions.length} optimizations — pick to see details` },
            );
            if (pick) {
              const s = (pick as unknown as { suggestion: (typeof suggestions)[number] })
                .suggestion;
              const action = await vscode.window.showInformationMessage(
                `${s.message}\nEvidence: ${s.evidencePaths.join(", ")}\nRemediation: ${s.remediation}`,
                "Show Details",
                "Preview Diff",
              );
              if (action === "Preview Diff" && s.plan?.diff) {
                const doc = await vscode.workspace.openTextDocument({
                  content: s.plan.diff,
                  language: "diff",
                });
                await vscode.window.showTextDocument(doc);
              }
            }
          } catch (e) {
            vscode.window.showErrorMessage(`Optimize failed: ${e}`);
          }
        },
      );
    }),
    vscode.commands.registerCommand("ackit.diagnostics", async () => {
      const snap = service?.getSnapshot();
      if (!snap?.diagnostics) {
        vscode.window.showInformationMessage("ACKit: no diagnostics, run Refresh");
        return;
      }
      const d = snap.diagnostics as unknown as { config: unknown; tasks: unknown; policy: unknown };
      const content = JSON.stringify(d, null, 2);
      const doc = await vscode.workspace.openTextDocument({ content, language: "json" });
      await vscode.window.showTextDocument(doc);
    }),
  );

  // Initial refresh debounced (avoid blocking startup)
  setTimeout(() => void service?.refreshAll(), 800);

  output.appendLine("ACKit extension activated with real providers");
  // Ensure service is disposed
  context.subscriptions.push({ dispose: () => service?.dispose() });
}

export function deactivate() {
  output?.dispose();
  service?.dispose();
}
