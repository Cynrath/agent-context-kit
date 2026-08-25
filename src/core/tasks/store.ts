import { type Dirent, promises as fsp } from "node:fs";
import path from "node:path";
import {
  acceptanceUnchecked,
  extractSection,
  hasRealCompletionNotes,
  newTaskBody,
  type TaskDoc,
  type TaskMeta,
  TaskMetaSchema,
} from "./types.js";

export const ACTIVE_DIR = "docs/tasks/active";
export const ARCHIVE_DIR = "docs/tasks/archive";
const ID_PATTERN = /TASK-(\d{4})/;

export class TaskStore {
  constructor(private readonly repositoryRoot: string) {}

  private get activeDir(): string {
    return path.join(this.repositoryRoot, ...ACTIVE_DIR.split("/"));
  }

  private get archiveDir(): string {
    return path.join(this.repositoryRoot, ...ARCHIVE_DIR.split("/"));
  }

  async list(includeArchive = true): Promise<TaskDoc[]> {
    const docs: TaskDoc[] = [];
    docs.push(...(await this.listDir(this.activeDir, ACTIVE_DIR)));
    if (includeArchive) docs.push(...(await this.listDir(this.archiveDir, ARCHIVE_DIR)));
    return docs.sort((a, b) => (a.meta.id < b.meta.id ? -1 : 1));
  }

  private async listDir(dir: string, relativeBase: string): Promise<TaskDoc[]> {
    let entries: Dirent[];
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const docs: TaskDoc[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const absolute = path.join(dir, entry.name);
      try {
        docs.push(await this.readDoc(absolute, `${relativeBase}/${entry.name}`));
      } catch {
        // Listing stays tolerant (REQ-TASKS-001); unparsable documents are
        // surfaced by doctor() (REQ-GOV-007), which re-reads raw entries.
      }
    }
    return docs;
  }

  async nextId(): Promise<string> {
    const all = await this.list(true);
    let max = 0;
    for (const doc of all) {
      const match = ID_PATTERN.exec(doc.meta.id);
      if (match !== null && match[1] !== undefined) {
        max = Math.max(max, Number.parseInt(match[1], 10));
      }
      const fileMatch = ID_PATTERN.exec(path.basename(doc.relativePath));
      if (fileMatch !== null && fileMatch[1] !== undefined) {
        max = Math.max(max, Number.parseInt(fileMatch[1], 10));
      }
    }
    return `TASK-${String(max + 1).padStart(4, "0")}`;
  }

  async create(title: string, dependencies: readonly string[] = []): Promise<TaskDoc> {
    if (title.trim().length === 0) throw new Error("task title must not be empty");
    const id = await this.nextId();
    await fsp.mkdir(this.activeDir, { recursive: true });
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "untitled";
    const fileName = `${id}-${slug}.md`;
    const meta: TaskMeta = TaskMetaSchema.parse({
      id,
      title: title.trim(),
      status: "pending",
      schemaVersion: 2,
      dependencies: [...dependencies],
      createdAt: new Date().toISOString().slice(0, 10),
      completedAt: null,
    });
    const body = newTaskBody(meta.title, meta.dependencies);
    const fileContent = serialize(meta, body);
    await fsp.writeFile(path.join(this.activeDir, fileName), fileContent, "utf8");
    return { meta, relativePath: `${ACTIVE_DIR}/${fileName}`, body };
  }

  async find(id: string): Promise<{ doc: TaskDoc; archived: boolean } | null> {
    for (const archived of [false, true]) {
      for (const doc of await this.listDir(
        archived ? this.archiveDir : this.activeDir,
        archived ? ARCHIVE_DIR : ACTIVE_DIR,
      )) {
        if (doc.meta.id === id) return { doc, archived };
      }
    }
    return null;
  }

  async start(id: string): Promise<void> {
    const found = await this.requireActive(id);
    if (found.doc.meta.status === "active") return;
    if (found.doc.meta.status !== "pending" && found.doc.meta.status !== "blocked") {
      throw new Error(`cannot start a ${found.doc.meta.status} task`);
    }
    for (const other of await this.list(false)) {
      if (other.meta.id !== id && other.meta.status === "active") {
        throw new Error(
          `another task is already active (${other.meta.id}: ${other.meta.title}); complete or block it first`,
        );
      }
    }
    await this.writeStatus(found.doc, "active");
  }

  /**
   * Completion gate (REQ-TASKS-004): unchecked acceptance items, placeholder
   * completion notes, or non-completed dependencies block completion.
   * --force overrides with an explicit warning banner in CLI output.
   */
  async complete(
    id: string,
    options: { force?: boolean | undefined } = {},
  ): Promise<{ forced: boolean; warnings: string[] }> {
    const found = await this.find(id);
    if (found === null || found.archived) throw new Error(`unknown task '${id}'`);
    if (found.doc.meta.status !== "active") {
      throw new Error(`task '${id}' is ${found.doc.meta.status}; only active tasks can complete`);
    }
    const warnings: string[] = [];
    const blockers: string[] = [];
    const unchecked = acceptanceUnchecked(found.doc.body);
    if (unchecked > 0) blockers.push(`${unchecked} unchecked acceptance criteria item(s)`);
    if (!hasRealCompletionNotes(found.doc.body))
      blockers.push("completion notes missing/placeholder");
    for (const dep of found.doc.meta.dependencies) {
      const depFound = await this.find(dep);
      if (depFound === null) blockers.push(`dependency '${dep}' does not exist`);
      else if (depFound.doc.meta.status !== "completed")
        blockers.push(`dependency '${dep}' is not completed`);
    }
    if (blockers.length > 0) {
      if (options.force !== true) {
        throw new Error(`completion gate blocked: ${blockers.join("; ")}`);
      }
      warnings.push(`--force overrode: ${blockers.join("; ")}`);
    }
    await this.writeStatus(found.doc, "completed", new Date().toISOString().slice(0, 10));
    return { forced: options.force === true, warnings };
  }

  async archive(id: string): Promise<string> {
    const found = await this.find(id);
    if (found === null) throw new Error(`unknown task '${id}'`);
    if (!found.archived) {
      if (found.doc.meta.status !== "completed") {
        throw new Error("only completed tasks can be archived");
      }
      await fsp.mkdir(this.archiveDir, { recursive: true });
      const source = path.join(this.repositoryRoot, ...found.doc.relativePath.split("/"));
      const target = path.join(this.archiveDir, path.basename(found.doc.relativePath));
      await fsp.rename(source, target);
      return `${ARCHIVE_DIR}/${path.basename(found.doc.relativePath)}`;
    }
    return found.doc.relativePath;
  }

  async doctor(): Promise<{ ok: boolean; problems: string[] }> {
    const problems: string[] = [];
    const all = await this.list(true);
    // REQ-GOV-007: documents that fail to parse must be visible to the
    // integrity gate instead of being silently skipped by listing.
    problems.push(...(await this.unparsableDocProblems()));
    const byId = new Map<string, TaskDoc>();
    for (const doc of all) {
      if (byId.has(doc.meta.id)) problems.push(`duplicate task id ${doc.meta.id}`);
      byId.set(doc.meta.id, doc);
      if (path.basename(doc.relativePath) !== expectedFileName(doc)) {
        problems.push(`${doc.meta.id}: file name/id mismatch (${doc.relativePath})`);
      }
    }
    for (const doc of all) {
      for (const dep of doc.meta.dependencies) {
        if (!byId.has(dep)) problems.push(`${doc.meta.id}: dependency '${dep}' does not exist`);
      }
      if (doc.meta.status === "completed" && acceptanceUnchecked(doc.body) > 0) {
        problems.push(`${doc.meta.id}: completed with unchecked acceptance criteria`);
      }
      if (doc.meta.status === "completed" && !hasRealCompletionNotes(doc.body)) {
        problems.push(`${doc.meta.id}: completed without real completion notes`);
      }
    }
    const activeCount = all.filter((doc) => doc.meta.status === "active").length;
    if (activeCount > 1) problems.push(`${activeCount} tasks are simultaneously active`);

    // Dependency cycle detection (iterative DFS with colors).
    const color = new Map<string, number>();
    const visit = (id: string): boolean => {
      const state = color.get(id) ?? 0;
      if (state === 1) return true;
      if (state === 2) return false;
      color.set(id, 1);
      const doc = byId.get(id);
      for (const dep of doc?.meta.dependencies ?? []) {
        if (visit(dep)) return true;
      }
      color.set(id, 2);
      return false;
    };
    for (const doc of all) {
      if (color.get(doc.meta.id) === 2) continue;
      if (visit(doc.meta.id)) {
        problems.push(`dependency cycle detected involving ${doc.meta.id}`);
        break;
      }
    }
    return { ok: problems.length === 0, problems };
  }

  private async requireActive(id: string): Promise<{ doc: TaskDoc }> {
    const found = await this.find(id);
    if (found === null || found.archived) throw new Error(`unknown active task '${id}'`);
    return { doc: found.doc };
  }

  private async unparsableDocProblems(): Promise<string[]> {
    const problems: string[] = [];
    for (const [dir, base] of [
      [this.activeDir, ACTIVE_DIR],
      [this.archiveDir, ARCHIVE_DIR],
    ] as const) {
      let entries: Dirent[];
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
        try {
          await this.readDoc(path.join(dir, entry.name), `${base}/${entry.name}`);
        } catch (error) {
          problems.push(
            `${base}/${entry.name}: unparsable task document (${(error as Error).message})`,
          );
        }
      }
    }
    return problems;
  }

  private async writeStatus(
    doc: TaskDoc,
    status: TaskMeta["status"],
    completedAt?: string,
  ): Promise<void> {
    doc.meta.status = status;
    if (status === "completed" && completedAt !== undefined) doc.meta.completedAt = completedAt;
    const absolute = path.join(this.repositoryRoot, ...doc.relativePath.split("/"));
    const raw = await fsp.readFile(absolute, "utf8");
    const updated = raw
      .replace(/^status:\s*.*$/m, `status: ${status}`)
      .replace(/^completedAt:\s*.*$/m, `completedAt: ${doc.meta.completedAt ?? "null"}`);
    await fsp.writeFile(absolute, updated, "utf8");
  }

  private async readDoc(absolute: string, relativePath: string): Promise<TaskDoc> {
    const raw = await fsp.readFile(absolute, "utf8");
    const { extractFrontmatter } = await import("../instructions/frontmatter.js");
    const { frontmatter, body } = extractFrontmatter(raw);
    if (frontmatter === null) throw new Error("missing frontmatter");
    const meta = TaskMetaSchema.parse(frontmatter);
    void extractSection;
    return { meta, relativePath, body };
  }
}

function expectedFileName(doc: TaskDoc): string {
  return doc.relativePath.split("/").pop() ?? "";
}

export function serialize(meta: TaskMeta, body: string): string {
  return [
    "---",
    `id: "${meta.id}"`,
    `title: "${meta.title.replace(/"/g, '\\"')}"`,
    `status: ${meta.status}`,
    `schemaVersion: ${meta.schemaVersion}`,
    "dependencies:",
    ...(meta.dependencies.length === 0 ? ["  []"] : meta.dependencies.map((dep) => `  - "${dep}"`)),
    `createdAt: "${meta.createdAt}"`,
    `completedAt: ${meta.completedAt ?? "null"}`,
    "---",
    "",
    body,
  ].join("\n");
}
