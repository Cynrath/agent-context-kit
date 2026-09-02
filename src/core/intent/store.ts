import { type Dirent, promises as fsp } from "node:fs";
import path from "node:path";
import {
  INTENT_ID_PATTERN,
  INTENT_PROBLEM_CODES,
  INTENT_SCHEMA_ID,
  type IntentDoc,
  type IntentMeta,
  IntentMetaSchema,
  type IntentProblem,
} from "./types.js";

/** Committed intent documents live here (docs-first, ADR-0025 §4). */
export const INTENT_DIR = "docs/intent";

const ID_CAPTURE = /INTENT-(\d{4})/;

/**
 * Docs-first intent store (ADR-0025 §4): intent documents are COMMITTED
 * planning artifacts (`docs/intent/INTENT-####-slug.md`), unlike the local
 * `.ackit/` workflow state. Mirrors TaskStore patterns: id validation before
 * any path construction, tolerant listing with doctor-visible parse failures.
 */
export class IntentStore {
  constructor(private readonly repositoryRoot: string) {}

  private get dir(): string {
    return path.join(this.repositoryRoot, ...INTENT_DIR.split("/"));
  }

  async list(): Promise<IntentDoc[]> {
    let entries: Dirent[];
    try {
      entries = await fsp.readdir(this.dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const docs: IntentDoc[] = [];
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      try {
        docs.push(await this.readDoc(path.join(this.dir, entry.name)));
      } catch {
        // Listing stays tolerant (REQ-TASKS-001 pattern); validate surfaces
        // unparsable documents explicitly.
      }
    }
    return docs.sort((a, b) => (a.meta.id < b.meta.id ? -1 : 1));
  }

  async find(id: string): Promise<{ doc: IntentDoc } | null> {
    if (!INTENT_ID_PATTERN.test(id)) return null;
    for (const doc of await this.list()) {
      if (doc.meta.id === id) return { doc };
    }
    return null;
  }

  async nextId(): Promise<string> {
    let max = 0;
    let entries: Dirent[] = [];
    try {
      entries = await fsp.readdir(this.dir, { withFileTypes: true });
    } catch {
      entries = [];
    }
    for (const doc of await this.list()) {
      const match = ID_CAPTURE.exec(doc.meta.id);
      if (match !== null && match[1] !== undefined) {
        max = Math.max(max, Number.parseInt(match[1], 10));
      }
    }
    for (const entry of entries) {
      const match = ID_CAPTURE.exec(entry.name);
      if (match !== null && match[1] !== undefined) {
        max = Math.max(max, Number.parseInt(match[1], 10));
      }
    }
    return `INTENT-${String(max + 1).padStart(4, "0")}`;
  }

  /** Create a scaffold document; the agent/human authors the content. */
  async create(title: string): Promise<IntentDoc> {
    if (title.trim().length === 0) throw new Error("intent title must not be empty");
    const id = await this.nextId();
    await fsp.mkdir(this.dir, { recursive: true });
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "untitled";
    const fileName = `${id}-${slug}.md`;
    const relativePath = `${INTENT_DIR}/${fileName}`;
    const meta: IntentMeta = IntentMetaSchema.parse({
      id,
      title: title.trim(),
      status: "draft",
      createdAt: new Date().toISOString().slice(0, 10),
      problem: "(describe the problem this work solves)",
      desiredOutcome: "(describe the measurable desired outcome)",
    });
    const body = newIntentBody(meta);
    await fsp.writeFile(path.join(this.dir, fileName), serialize(meta, body), "utf8");
    return { meta, relativePath, body };
  }

  /**
   * Validate all intent documents (or one when id given). Returns structured
   * problems; never throws for reportable cases (THREAT_MODEL T16/T17/T26):
   * frontmatter AND body pass the canonical secret gate — secret-shaped
   * content can never become a referenceable intent artifact.
   */
  async validate(id?: string): Promise<{ ok: boolean; problems: IntentProblem[] }> {
    const problems: IntentProblem[] = [];
    const docs =
      id !== undefined
        ? (await this.find(id)) !== null
          ? [(await this.find(id))?.doc]
          : []
        : await this.list();
    if (id !== undefined && (docs.length === 0 || docs[0] === undefined)) {
      problems.push({ code: "INTENT-NOT-FOUND", message: `intent '${id}' does not exist` });
      return { ok: false, problems };
    }
    const { runSecretGateOnContent } = await import("./gate.js");
    const seenIds = new Set<string>();
    for (const doc of docs) {
      if (doc === undefined) continue;
      if (doc.relativePath !== undefined && seenIds.has(doc.meta.id)) {
        problems.push({
          code: "INTENT-ID-DUPLICATE",
          message: `duplicate intent id ${doc.meta.id}`,
        });
      }
      seenIds.add(doc.meta.id);
      const criteria = new Set<string>();
      for (const criterion of doc.meta.acceptanceCriteria) {
        if (criteria.has(criterion.id)) {
          problems.push({
            code: INTENT_PROBLEM_CODES.duplicateCriterion,
            message: `${doc.meta.id}: duplicate criterion id ${criterion.id}`,
          });
        }
        criteria.add(criterion.id);
      }
      const secretHits = runSecretGateOnContent(serialize(doc.meta, doc.body));
      if (secretHits.length > 0) {
        problems.push({
          code: INTENT_PROBLEM_CODES.secretContent,
          message: `${doc.meta.id}: secret-shaped content detected (${secretHits.join(", ")}) — redact before accepting`,
        });
      }
    }
    return { ok: problems.length === 0, problems };
  }

  private async readDoc(absolute: string): Promise<IntentDoc> {
    const raw = await fsp.readFile(absolute, "utf8");
    const { extractFrontmatter } = await import("../instructions/frontmatter.js");
    const { frontmatter, body } = extractFrontmatter(raw);
    if (frontmatter === null) throw new Error("missing frontmatter");
    const meta = IntentMetaSchema.parse(frontmatter);
    const relativePath = `${INTENT_DIR}/${path.basename(absolute)}`;
    return { meta, relativePath, body };
  }
}

function newIntentBody(meta: IntentMeta): string {
  return [
    `# ${meta.title}`,
    "",
    "Intent document (ackit.intent.v1). Fill the frontmatter fields with real",
    "content, then set status: accepted. ACKit validates; it never infers.",
    "",
    "## Notes",
    "",
    "- Context, links, and rationale live here.",
    "",
  ].join("\n");
}

export function serialize(meta: IntentMeta, body: string): string {
  const lines: string[] = [
    "---",
    `schemaId: "${INTENT_SCHEMA_ID}"`,
    `id: "${meta.id}"`,
    `title: "${meta.title.replace(/"/g, '\\"')}"`,
    `status: ${meta.status}`,
    `createdAt: "${meta.createdAt}"`,
    `source: "${meta.source.replace(/"/g, '\\"')}"`,
    `problem: "${meta.problem.replace(/"/g, '\\"')}"`,
    `desiredOutcome: "${meta.desiredOutcome.replace(/"/g, '\\"')}"`,
    "constraints:",
    ...(meta.constraints.length === 0 ? ["  []"] : meta.constraints.map((c) => `  - "${c}"`)),
    "nonGoals:",
    ...(meta.nonGoals.length === 0 ? ["  []"] : meta.nonGoals.map((c) => `  - "${c}"`)),
    "affectedSystems:",
    ...(meta.affectedSystems.length === 0
      ? ["  []"]
      : meta.affectedSystems.map((c) => `  - "${c}"`)),
    "acceptanceCriteria:",
    ...(meta.acceptanceCriteria.length === 0
      ? ["  []"]
      : meta.acceptanceCriteria.map(
          (c) => `  - id: "${c.id}"\n    requirement: "${c.requirement}"`,
        )),
    "openQuestions:",
    ...(meta.openQuestions.length === 0 ? ["  []"] : meta.openQuestions.map((c) => `  - "${c}"`)),
    "risks:",
    ...(meta.risks.length === 0 ? ["  []"] : meta.risks.map((c) => `  - "${c}"`)),
    "---",
    "",
    body,
  ];
  return `${lines.join("\n")}\n`;
}
