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

  async create(
    title: string,
    dependencies: readonly string[] = [],
    options: {
      intentRef?: string | undefined;
      specRefs?: readonly string[] | undefined;
      decisionRefs?: readonly string[] | undefined;
      planRef?: string | undefined;
    } = {},
  ): Promise<TaskDoc> {
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
      ...(options.intentRef !== undefined ? { intentRef: options.intentRef } : {}),
      ...(options.specRefs !== undefined && options.specRefs.length > 0
        ? { specRefs: [...options.specRefs] }
        : {}),
      ...(options.decisionRefs !== undefined && options.decisionRefs.length > 0
        ? { decisionRefs: [...options.decisionRefs] }
        : {}),
      ...(options.planRef !== undefined ? { planRef: options.planRef } : {}),
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
   * Completion gate (REQ-TASKS-004 + ADR-0026 §5/§16): unchecked acceptance
   * items, placeholder completion notes, or non-completed dependencies block
   * completion. WORKFLOW-ENABLED tasks (state file present) additionally gate
   * on evidence completeness, verdict requirements, stage, verification
   * attempts, and blocking drift — `VERIFY failed → completed` is structurally
   * impossible for them. --force overrides with an explicit warning banner;
   * legacy tasks keep the exact pre-expansion behavior.
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
    // Workflow gate (ADR-0026 §5/§16): ONLY for workflow-enabled tasks —
    // legacy tasks are untouched. Blockers compose deterministically.
    const workflowBlockers = await this.workflowCompletionBlockers(id, found.doc);
    blockers.push(...workflowBlockers);
    if (blockers.length > 0) {
      if (options.force !== true) {
        throw new Error(`completion gate blocked: ${blockers.join("; ")}`);
      }
      warnings.push(`--force overrode: ${blockers.join("; ")}`);
    }
    await this.writeStatus(found.doc, "completed", new Date().toISOString().slice(0, 10));
    return { forced: options.force === true, warnings };
  }

  /**
   * Deterministic workflow completion blockers for a workflow-enabled task
   * (ADR-0026 §5/§16). Empty for legacy tasks (no state file). Never throws
   * for reportable cases.
   */
  private async workflowCompletionBlockers(id: string, doc: TaskDoc): Promise<string[]> {
    const blockers: string[] = [];
    const { WorkflowStore } = await import("../workflow/index.js");
    const { resolveRepositoryRoot } = await import("../filesystem/root.js");
    const resolved = await resolveRepositoryRoot(this.repositoryRoot);
    if (!resolved.ok) return blockers;
    const workflowStore = new WorkflowStore(resolved.root);
    const wf = await workflowStore.load(id);
    if (wf === null) return blockers; // legacy task — no workflow gate
    const { getProfile } = await import("../workflow/index.js");
    const profile = getProfile(wf.profile);

    // 1. Evidence completeness (ADR-0026 §5): every criterion verified with
    //    qualifying evidence when the profile requires evidence.
    if (profile.requiresEvidence) {
      const { EvidenceStore, validateEvidence } = await import("../evidence/index.js");
      const evidenceStore = new EvidenceStore(resolved.root);
      const registry = await evidenceStore.load(id);
      if (registry === null) {
        blockers.push(
          "MISSING_REQUIRED_ARTIFACT: no evidence registry (run 'ackit evidence sync')",
        );
      } else {
        for (const problem of validateEvidence(registry).problems) {
          blockers.push(`${problem.code}: ${problem.message}`);
        }
      }
    }

    // 2. Verifier verdict (ADR-0026 §4): profile requires an independent
    //    verdict; latest must be PASS-family with zero blocking findings.
    if (profile.requiresVerdict) {
      const { VerdictStore } = await import("../verification/index.js");
      const verdicts = new VerdictStore(this.repositoryRoot);
      const latest = await verdicts.latest(id);
      if (latest === null) {
        blockers.push(
          "MISSING_VERIFIER_VERDICT: profile '" +
            wf.profile +
            "' requires an independent verdict (run 'ackit verification bundle' + record)",
        );
      } else if (
        latest.verdict === "REWORK_REQUIRED" ||
        latest.verdict === "BLOCKED" ||
        latest.findings.some((f) => f.severity === "blocking")
      ) {
        blockers.push(
          `VERDICT_BLOCKING: latest verdict ${latest.id} is ${latest.verdict} with blocking findings`,
        );
      }
    }

    // 3. Stage (ADR-0025 §3): completion requires the profile's completion
    //    stage or later (verify/fix loop may have rewound to implement).
    const stageIndex = profile.stages.indexOf(wf.stage);
    const completionIndex = profile.stages.indexOf(profile.completionStage);
    if (stageIndex < completionIndex) {
      blockers.push(
        `WORKFLOW_STAGE_INVALID: stage '${wf.stage}' is before completion stage '${profile.completionStage}'`,
      );
    }

    // 4. Verification attempts (ADR-0026 §16): the latest recorded attempt
    //    must not be an unresolved failure.
    const latestAttempt = wf.verificationAttempts[wf.verificationAttempts.length - 1];
    if (latestAttempt !== undefined && latestAttempt.outcome === "fail") {
      blockers.push(
        "VERIFICATION_ATTEMPT_FAILED: latest verification attempt failed; record a pass after fixing",
      );
    }

    // 5. Blocking drift findings (ADR-0026 §5): unplanned high-risk scope
    //    changes and unmet dependencies block completion. Composed from the
    //    same deterministic drift core (`detectWorkflowDrift`) — no second
    //    engine.
    try {
      const { detectWorkflowDrift } = await import("../drift/index.js");
      const { BUILTIN_PROFILES } = await import("../workflow/index.js");
      const { EvidenceStore } = await import("../evidence/index.js");
      const { VerdictStore } = await import("../verification/index.js");
      const { CheckpointStore } = await import("../checkpoint/index.js");
      const { changedFiles } = await import("../git/git.js");
      const evidence = await new EvidenceStore(resolved.root).load(id);
      const verdicts = new VerdictStore(this.repositoryRoot);
      const latest = await verdicts.latest(id);
      const checkpoints = new CheckpointStore(resolved.root, this.repositoryRoot);
      const checkpoint = await checkpoints.latest(id);
      const metaExtra = doc.meta as {
        specRefs?: string[] | undefined;
        decisionRefs?: string[] | undefined;
        planRef?: string | undefined;
      };
      const refPaths = [
        ...(metaExtra.specRefs ?? []),
        ...(metaExtra.decisionRefs ?? []),
        ...(metaExtra.planRef !== undefined ? [metaExtra.planRef] : []),
      ];
      const referencePathsExist: string[] = [];
      for (const ref of refPaths) {
        try {
          await fsp.access(path.resolve(this.repositoryRoot, ...ref.split("/")));
          referencePathsExist.push(ref);
        } catch {
          // absent — drift flags it
        }
      }
      const dependencies: { id: string; completed: boolean }[] = [];
      for (const dep of doc.meta.dependencies) {
        const depFound = await this.find(dep);
        dependencies.push({ id: dep, completed: depFound?.doc.meta.status === "completed" });
      }
      let gitChanged: string[] = [];
      try {
        gitChanged = changedFiles(this.repositoryRoot);
      } catch {
        gitChanged = [];
      }
      const requiredForStage =
        BUILTIN_PROFILES[wf.profile].requiredArtifactsByStage[wf.stage] ?? [];
      const findings = detectWorkflowDrift({
        taskId: id,
        taskDoc: doc,
        workflow: { profile: wf.profile, stage: wf.stage },
        requiredArtifacts: requiredForStage,
        existingArtifacts: ["task", ...(evidence !== null ? ["evidence"] : [])],
        referencePathsExist,
        evidence,
        latestVerdict: latest !== null ? { verdict: latest.verdict } : null,
        checkpoint,
        checkpointProblems: [],
        changedFiles: gitChanged,
        dependencies,
      });
      for (const finding of findings) {
        if (finding.severity === "blocking") {
          blockers.push(`${finding.code}: ${finding.detail}`);
        }
      }
    } catch {
      // Drift composition is best-effort in the completion path: a failure to
      // assemble inputs never blocks completion by accident (the dedicated
      // `ackit drift check` command reports the full picture).
    }
    void doc;
    return blockers;
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
      // Artifact-reference validation (ADR-0025 §5): refs must resolve inside
      // this repository — intent ids against the intent store, doc paths against
      // the filesystem (containment-checked). Stable problem codes.
      if (doc.meta.intentRef !== undefined) {
        const { IntentStore } = await import("../intent/store.js");
        const intent = await new IntentStore(this.repositoryRoot).find(doc.meta.intentRef);
        if (intent === null) {
          problems.push(
            `TASK-REF-MISSING: ${doc.meta.id}: intentRef '${doc.meta.intentRef}' does not exist`,
          );
        }
      }
      for (const ref of [
        ...(doc.meta.specRefs ?? []),
        ...(doc.meta.decisionRefs ?? []),
        ...(doc.meta.planRef !== undefined ? [doc.meta.planRef] : []),
      ]) {
        if (!(await this.refExists(ref))) {
          problems.push(
            `TASK-REF-MISSING: ${doc.meta.id}: referenced file '${ref}' does not exist`,
          );
        }
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

  /** Containment-checked reference existence (THREAT_MODEL T19). */
  private async refExists(ref: string): Promise<boolean> {
    const absolute = path.resolve(this.repositoryRoot, ...ref.split("/"));
    const contained =
      absolute === this.repositoryRoot || absolute.startsWith(`${this.repositoryRoot}${path.sep}`);
    if (!contained) return false;
    try {
      await fsp.access(absolute);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Plan-first machine check (ADR-0025 §6): for tasks with a planRef, the
   * plan file's first git commit must not be AFTER the first commit touching
   * the task's declared affected files (plan precedes implementation).
   * Deterministic, best-effort: git-unavailable yields an advisory diagnostic,
   * never a hard failure; tasks without planRef are skipped.
   */
  async planFirstDiagnostics(): Promise<{ code: string; message: string }[]> {
    const diagnostics: { code: string; message: string }[] = [];
    const all = await this.list(false);
    for (const doc of all) {
      if (doc.meta.planRef === undefined) continue;
      const globs = extractSection(doc.body, "Affected files");
      if (globs === null) continue;
      const declared = globs
        .split("\n")
        .map((line) => line.replace(/^[-*]\s*/, "").trim())
        .filter((line) => line.length > 0 && !line.includes("**"));
      if (declared.length === 0) continue;
      try {
        const { execFileSync } = await import("node:child_process");
        const planDate = execFileSync(
          "git",
          ["-C", this.repositoryRoot, "log", "--format=%as", "--reverse", doc.meta.planRef],
          { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
        )
          .split("\n")
          .find((line) => line.trim().length > 0);
        if (planDate === undefined) continue;
        for (const target of declared) {
          const targetDate = execFileSync(
            "git",
            ["-C", this.repositoryRoot, "log", "--format=%as", "--reverse", "--", target],
            { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
          )
            .split("\n")
            .find((line) => line.trim().length > 0);
          if (targetDate === undefined) continue;
          if (targetDate.trim() < planDate.trim()) {
            diagnostics.push({
              code: "TASK-PLAN-AFTER-IMPLEMENTATION",
              message: `${doc.meta.id}: declared area '${target}' has commits (${targetDate.trim()}) before the plan '${doc.meta.planRef}' first appeared (${planDate.trim()})`,
            });
            break;
          }
        }
      } catch {
        // Git unavailable or no history for these paths: advisory only.
        diagnostics.push({
          code: "TASK-PLAN-FIRST-CHECK-UNAVAILABLE",
          message: `${doc.meta.id}: plan-first check skipped (git unavailable or no history for '${doc.meta.planRef}')`,
        });
      }
    }
    return diagnostics;
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
  const lines: string[] = [
    "---",
    `id: "${meta.id}"`,
    `title: "${meta.title.replace(/"/g, '\\"')}"`,
    `status: ${meta.status}`,
    `schemaVersion: ${meta.schemaVersion}`,
    "dependencies:",
    ...(meta.dependencies.length === 0 ? ["  []"] : meta.dependencies.map((dep) => `  - "${dep}"`)),
  ];
  // Additive refs (ADR-0025 §5): written ONLY when present so ref-less task
  // serialization stays byte-identical to the pre-expansion format.
  if (meta.intentRef !== undefined) lines.push(`intentRef: "${meta.intentRef}"`);
  if (meta.specRefs !== undefined && meta.specRefs.length > 0) {
    lines.push("specRefs:");
    lines.push(...meta.specRefs.map((ref) => `  - "${ref}"`));
  }
  if (meta.decisionRefs !== undefined && meta.decisionRefs.length > 0) {
    lines.push("decisionRefs:");
    lines.push(...meta.decisionRefs.map((ref) => `  - "${ref}"`));
  }
  if (meta.planRef !== undefined) lines.push(`planRef: "${meta.planRef}"`);
  lines.push(
    `createdAt: "${meta.createdAt}"`,
    `completedAt: ${meta.completedAt ?? "null"}`,
    "---",
    "",
    body,
  );
  return lines.join("\n");
}
