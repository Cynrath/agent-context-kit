import { promises as fsp } from "node:fs";
import path from "node:path";
import type { RepositoryRoot } from "../filesystem/root.js";
import { installSkills } from "../skills/install.js";
import { ensureManagedBlock, hasManagedBlock } from "./managed-block.js";

export const INIT_PROVIDERS = ["codex", "claude", "gemini", "copilot"] as const;
export type InitProvider = (typeof INIT_PROVIDERS)[number];

export interface InitAction {
  file: string;
  provider: InitProvider;
  action: "created" | "updated-managed" | "unchanged" | "refused-non-managed" | "repaired";
  detail: string;
}

export interface PlanInitOptions {
  agents?: readonly string[] | undefined;
}

export interface InitPlanResult {
  actions: InitAction[];
  dryRun: boolean;
}

const MANAGED_INNER: Record<InitProvider, string> = {
  codex: [
    "# ACKit canonical workflow",
    "",
    "- Docs-first, task-first: keep one active task under docs/tasks/ with a single `[~]` checklist item.",
    "- Complete tasks only with recorded evidence; then continue with the next dependency-ready task.",
    "- Run `ackit doctor` and `ackit scan --ci` as standing quality gates.",
    "- Offline-first: never send repository content to external services.",
  ].join("\n"),
  claude: "@AGENTS.md",
  gemini: "Read and follow AGENTS.md in the repository root before acting.",
  copilot: "Read and follow AGENTS.md in the repository root before acting.",
};

const TARGET_FILES: Record<InitProvider, string> = {
  codex: "AGENTS.md",
  claude: "CLAUDE.md",
  gemini: "GEMINI.md",
  copilot: ".github/copilot-instructions.md",
};

function resolveAgents(requested?: readonly string[] | undefined): InitProvider[] {
  if (requested === undefined || requested.length === 0 || requested[0] === "all") {
    return [...INIT_PROVIDERS];
  }
  return requested
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is InitProvider =>
      (INIT_PROVIDERS as readonly string[]).includes(entry),
    );
}

async function readIfExists(absolute: string): Promise<string | null> {
  try {
    return await fsp.readFile(absolute, "utf8");
  } catch {
    return null;
  }
}

/**
 * Plans (dry-run) or applies the init lifecycle (REQ-INSTR-009/ONB-001/002).
 * Non-managed existing files are NEVER overwritten: init appends managed
 * blocks or refuses — user bytes stay intact (REQ-GOV-008).
 */
export async function planOrApplyInit(
  root: RepositoryRoot,
  options: PlanInitOptions & { dryRun?: boolean | undefined } = {},
): Promise<InitAction[]> {
  const providers = resolveAgents(options.agents);
  const actions: InitAction[] = [];
  for (const provider of providers) {
    const relativeFile = TARGET_FILES[provider];
    const absolute = path.join(root.canonicalPath, ...relativeFile.split("/"));
    const existing = await readIfExists(absolute);
    const inner = MANAGED_INNER[provider];

    if (existing !== null && existing.trim().length > 0 && !hasManagedBlock(existing, provider)) {
      // Existing USER file without an ACKit block: refuse rather than touch.
      actions.push({
        file: relativeFile,
        provider,
        action: "refused-non-managed",
        detail:
          "existing file has no ackit managed block; refusing to modify user content (REQ-GOV-008)",
      });
      continue;
    }

    const result = ensureManagedBlock(existing, provider, inner);
    const action: InitAction["action"] =
      result.action === "created"
        ? "created"
        : result.action === "repaired"
          ? "repaired"
          : result.action === "updated"
            ? "updated-managed"
            : "unchanged";
    if (!options.dryRun && result.action !== "unchanged") {
      await fsp.mkdir(path.dirname(absolute), { recursive: true });
      await fsp.writeFile(absolute, result.output, "utf8");
    }
    actions.push({
      file: relativeFile,
      provider,
      action,
      detail:
        action === "unchanged"
          ? "managed block already canonical"
          : action === "repaired"
            ? "duplicate legacy blocks collapsed to one"
            : action === "updated-managed"
              ? "managed block content refreshed"
              : "file created with managed block",
    });
  }

  if (!options.dryRun) {
    const skillOutcomes = await installSkills(root);
    for (const outcome of skillOutcomes) {
      actions.push({
        file: `.agents/skills/${outcome.skill}`,
        provider: "codex",
        action: outcome.status === "installed" ? "created" : "unchanged",
        detail: `skill ${outcome.status}: ${outcome.message}`,
      });
    }
  }
  return actions;
}
