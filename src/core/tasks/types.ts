import { z } from "zod";

export const TASK_SCHEMA_VERSION = 2;
export const TASK_STATUSES = ["pending", "active", "completed", "blocked"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** Repository-relative POSIX reference path (no absolute/traversal/drive). */
const refPath = z
  .string()
  .min(1)
  .max(300)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.startsWith("../") &&
      !/^[a-zA-Z]:/.test(value) &&
      !value.includes("\\") &&
      !value.includes(".."),
    "repository-relative POSIX path expected (no absolute or traversal)",
  );

/**
 * Task frontmatter v2 (REQ-TASKS-002) — ADDITIVE workflow-expansion references
 * (ADR-0025 §5): optional artifact refs; schemaVersion intentionally stays 2
 * (old documents parse identically; ref-less serialization byte-identical).
 */
export const TaskMetaSchema = z.object({
  id: z.string().regex(/^TASK-\d{4}$/),
  title: z.string().min(1),
  status: z.enum(TASK_STATUSES).default("pending"),
  schemaVersion: z.literal(TASK_SCHEMA_VERSION),
  dependencies: z.array(z.string().regex(/^TASK-\d{4}$/)).default([]),
  createdAt: z.string(),
  completedAt: z.string().nullable().default(null),
  intentRef: z
    .string()
    .regex(/^INTENT-\d{4}$/)
    .optional(),
  specRefs: z.array(refPath).max(8).optional(),
  decisionRefs: z.array(refPath).max(8).optional(),
  planRef: refPath.optional(),
});

export type TaskMeta = z.infer<typeof TaskMetaSchema>;

export interface TaskDoc {
  meta: TaskMeta;
  relativePath: string;
  body: string;
}

export const PLACEHOLDER_TEXT = "(placeholder)";

export function acceptanceUnchecked(body: string): number {
  const section = extractSection(body, "Acceptance criteria");
  if (section === null) return 0;
  return (section.match(/^- \[ \]/gm) ?? []).length;
}

export function hasRealCompletionNotes(body: string): boolean {
  const section = extractSection(body, "Completion notes");
  if (section === null) return false;
  return section.replace(/[\s-]/g, "").length > 0 && !section.includes(PLACEHOLDER_TEXT);
}

export function extractSection(body: string, heading: string): string | null {
  const pattern = new RegExp(`^## ${heading}\\s*$`, "m");
  const match = pattern.exec(body);
  if (match === null || match.index === undefined) return null;
  const start = match.index + match[0].length;
  const next = body.slice(start).search(/^## /m);
  return next === -1 ? body.slice(start) : body.slice(start, start + next);
}

export function newTaskBody(title: string, dependencies: readonly string[]): string {
  return [
    "",
    "## Purpose",
    "",
    `Implement: ${title}.`,
    "",
    "## Scope",
    "",
    "- ",
    "",
    "## Out of scope",
    "",
    "- ",
    "",
    "## Affected files",
    "",
    "- ",
    "",
    "## Required tests",
    "",
    "- ",
    "",
    "## Acceptance criteria",
    "",
    "- [ ] Implementation matches scope.",
    "- [ ] Test plan executed with pass counts recorded.",
    "",
    "## Test steps",
    "",
    "1. ",
    "",
    "## Risks",
    "",
    "- ",
    "",
    "## Rollback plan",
    "",
    "Focused commit revert.",
    "",
    "## Completion notes",
    "",
    "(placeholder)",
    "",
    dependencies.length > 0 ? `Dependencies: ${dependencies.join(", ")}` : "",
    "",
  ]
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n");
}
