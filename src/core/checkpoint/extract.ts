import { execFileSync } from "node:child_process";
import type { TaskDoc } from "../tasks/types.js";
import { extractSection } from "../tasks/types.js";

/** Deterministic extraction from task bodies (ADR-0027 §1). */

function sectionItems(body: string, heading: string): string[] {
  const section = extractSection(body, heading);
  if (section === null) return [];
  return section
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0 && line !== "(placeholder)");
}

export interface ExtractedWork {
  completedWork: string[];
  pendingWork: string[];
  decisions: string[];
  failures: string[];
  blockers: string[];
}

/**
 * Checkbox + section extraction: acceptance-criteria checklists determine
 * completed vs pending; decisions/failures/blockers come from explicit
 * task-doc sections when present. Deterministic order preserved.
 */
export function extractWork(taskDoc: TaskDoc): ExtractedWork {
  const criteria = extractSection(taskDoc.body, "Acceptance criteria") ?? "";
  const completedWork: string[] = [];
  const pendingWork: string[] = [];
  for (const line of criteria.split("\n")) {
    const trimmed = line.trim();
    if (/^-\s*\[x\]/i.test(trimmed)) completedWork.push(trimmed.replace(/^-\s*\[x\]\s*/i, ""));
    else if (/^-\s*\[ \]/.test(trimmed)) pendingWork.push(trimmed.replace(/^-\s*\[ \]\s*/, ""));
    else if (/^-\s*\[~\]/.test(trimmed))
      pendingWork.push(`${trimmed.replace(/^-\s*\[~\]\s*/, "")} (in progress)`);
    else if (/^-\s*\[!\]/.test(trimmed))
      pendingWork.push(`${trimmed.replace(/^-\s*\[!\]\s*/, "")} (blocked)`);
  }
  return {
    completedWork,
    pendingWork,
    decisions: sectionItems(taskDoc.body, "Decisions"),
    failures: sectionItems(taskDoc.body, "Failures"),
    blockers: sectionItems(taskDoc.body, "Blockers"),
  };
}

/** Short HEAD sha; `null` when git is unavailable (explicit, never fabricated). */
export function currentGitHead(rootPath: string): string | null {
  try {
    const out = execFileSync("git", ["-C", rootPath, "rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return out.trim();
  } catch {
    return null;
  }
}
