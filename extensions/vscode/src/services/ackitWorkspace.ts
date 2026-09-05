import type { InstructionGraph, ScanResult, ScoreReport } from "@cynrath/agent-context-kit";
import {
  analyzeOptimize,
  buildContextPack,
  buildInstructionGraph,
  buildStatusReport,
  loadAckitConfig,
  resolveEffectiveStack,
  scanRepository,
  scoreRepository,
  validateSkills,
} from "@cynrath/agent-context-kit";
import * as vscode from "vscode";

export interface ActiveTaskStatus {
  taskId: string;
  title: string;
  status: string;
  stage: string | null;
  blockerCount: number;
  blockers: string[];
  next: { action: string; command?: string; reason: string }[];
}

export interface WorkspaceSnapshot {
  root: string;
  scan: ScanResult | null;
  readiness: ScoreReport | null;
  graph: InstructionGraph | null;
  diagnostics: { config: unknown; tasks: unknown; policy: unknown } | null;
  optimize: unknown[] | null;
  /** Canonical task status snapshot (TASK-0083 parity; null when no active task). */
  taskStatus: ActiveTaskStatus | null;
  error: string | null;
  updatedAt: number;
}

export class AckitWorkspaceService implements vscode.Disposable {
  private snapshots = new Map<string, WorkspaceSnapshot>();
  private disposables: vscode.Disposable[] = [];
  private debounceTimer: NodeJS.Timeout | undefined;
  private currentAbort: AbortController | undefined;
  private readonly _onDidChange = new vscode.EventEmitter<string>();
  readonly onDidChange = this._onDidChange.event;

  constructor() {
    // Watch for file changes across all workspace roots
    const watcher = vscode.workspace.createFileSystemWatcher("**/*", false, false, false);
    const schedule = () => this.scheduleRefresh();
    watcher.onDidCreate(schedule, this, this.disposables);
    watcher.onDidChange(schedule, this, this.disposables);
    watcher.onDidDelete(schedule, this, this.disposables);
    this.disposables.push(watcher);
    // Also watch active editor changes for graph
    vscode.window.onDidChangeActiveTextEditor(
      () => this._onDidChange.fire("graph"),
      this,
      this.disposables,
    );
    vscode.workspace.onDidChangeWorkspaceFolders(
      () => this.scheduleRefresh(),
      this,
      this.disposables,
    );
  }

  dispose() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.currentAbort?.abort();
    this._onDidChange.dispose();
    for (const d of this.disposables) d.dispose();
  }

  getRoots(): string[] {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return [process.cwd()];
    return folders.map((f) => f.uri.fsPath);
  }

  getRootForActiveEditor(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
      if (folder) return folder.uri.fsPath;
    }
    const roots = this.getRoots();
    return roots[0];
  }

  getSnapshot(root?: string): WorkspaceSnapshot | undefined {
    const key = root ?? this.getRootForActiveEditor() ?? this.getRoots()[0];
    if (!key) return undefined;
    return this.snapshots.get(key);
  }

  async refreshAll(): Promise<void> {
    const roots = this.getRoots();
    for (const root of roots) {
      await this.refreshRoot(root);
    }
  }

  private scheduleRefresh() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      void this.refreshAll();
    }, 400);
  }

  async refreshRoot(root: string): Promise<void> {
    // Cancel previous
    this.currentAbort?.abort();
    const ac = new AbortController();
    this.currentAbort = ac;
    const signal = ac.signal;

    const snapshot: WorkspaceSnapshot = this.snapshots.get(root) ?? {
      root,
      scan: null,
      readiness: null,
      graph: null,
      diagnostics: null,
      optimize: null,
      taskStatus: null,
      error: null,
      updatedAt: 0,
    };

    try {
      // Avoid scanning own cache/dist
      if (signal.aborted) throw new DOMException("aborted", "AbortError");
      const scan = await scanRepository({ canonicalPath: root }, { signal });
      snapshot.scan = scan;
      if (signal.aborted) throw new DOMException("aborted", "AbortError");
      const graph = await buildInstructionGraph({ canonicalPath: root }, { signal });
      snapshot.graph = graph;
      if (signal.aborted) throw new DOMException("aborted", "AbortError");
      // Readiness: need pack, skills, etc.
      try {
        const pack = await buildContextPack({ canonicalPath: root }, { maxTokens: 50000, signal });
        const skills = await validateSkills({ canonicalPath: root });
        // Use scoreRepository with minimal inputs
        const readiness = scoreRepository(
          {
            graph: graph as never,
            pack: pack as never,
            scan,
            skills: skills as never,
            policy: { findings: [] } as never,
            tasks: { dirExists: true, totalTasks: 0 } as never,
          },
          {},
        );
        snapshot.readiness = readiness as unknown as ScoreReport;
      } catch {
        snapshot.readiness = null;
      }
      if (signal.aborted) throw new DOMException("aborted", "AbortError");
      // Optimize via SDK
      try {
        const suggestions = await analyzeOptimize({ canonicalPath: root }, { signal });
        snapshot.optimize = suggestions as unknown[];
      } catch {
        snapshot.optimize = [];
      }
      // Diagnostics: config + tasks
      try {
        const config = await loadAckitConfig(root);
        snapshot.diagnostics = {
          config: config.ok ? "ok" : config.errors,
          tasks: "ok",
          policy: "ok",
        };
      } catch (e) {
        snapshot.diagnostics = { config: String(e), tasks: null, policy: null };
      }
      if (signal.aborted) throw new DOMException("aborted", "AbortError");
      // Canonical task status (TASK-0083 parity): same snapshot as
      // `ackit status` via the SDK read model — null when no active task.
      try {
        const report = await buildStatusReport(root);
        snapshot.taskStatus =
          report.task === null
            ? null
            : {
                taskId: report.task.id,
                title: report.task.title,
                status: report.task.status,
                stage: report.task.stage,
                blockerCount: report.blockers.length,
                blockers: report.blockers.slice(0, 5),
                next: report.next.slice(0, 3).map((n) => ({
                  action: n.action,
                  ...(n.command !== undefined ? { command: n.command } : {}),
                  reason: n.reason,
                })),
              };
      } catch {
        snapshot.taskStatus = null;
      }
      snapshot.error = null;
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return;
      snapshot.error = (e as Error).message;
    } finally {
      snapshot.updatedAt = Date.now();
      this.snapshots.set(root, snapshot);
      this._onDidChange.fire(root);
    }
  }
}
