import { promises as fsp } from "node:fs";
import path from "node:path";
import type { RepositoryRoot } from "../filesystem/root.js";
import { installSkills } from "../skills/install.js";
import type { ManagedBlockResult } from "./managed-block.js";
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
  const actions: InitAction[] = [];
  const surfacePlans = await planInstructionSurfaces(root, { agents: options.agents });

  for (const surface of surfacePlans) {
    if (!options.dryRun && surface.result.action !== "unchanged") {
      await fsp.mkdir(path.dirname(surface.absolute), { recursive: true });
      await fsp.writeFile(surface.absolute, surface.result.output, "utf8");
    }
    actions.push({
      file: surface.relativeFile,
      provider: surface.provider,
      action: surface.action,
      detail: surface.detail,
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

/**
 * Shared instruction-surface planning pass (TASK-0072): computes, for each
 * requested provider, the managed-block decision WITHOUT writing. Both
 * `planOrApplyInit` (init lifecycle) and the managed-asset sync engine use
 * this so ownership logic exists exactly once. Content-driven: the engine
 * returns action "unchanged" when canonical content already matches, and
 * callers must not write in that case.
 */
export interface InstructionSurfacePlan {
  provider: InitProvider;
  relativeFile: string;
  absolute: string;
  /** Managed-block engine decision (created/updated/repaired/unchanged). */
  result: ManagedBlockResult;
  /** Public init vocabulary mapped from result.action. */
  action: InitAction["action"];
  detail: string;
}

export async function planInstructionSurfaces(
  root: RepositoryRoot,
  options: PlanInitOptions = {},
): Promise<InstructionSurfacePlan[]> {
  const providers = resolveAgents(options.agents);
  const plans: InstructionSurfacePlan[] = [];
  for (const provider of providers) {
    const relativeFile = TARGET_FILES[provider];
    const absolute = path.join(root.canonicalPath, ...relativeFile.split("/"));
    const existing = await readIfExists(absolute);
    const inner = MANAGED_INNER[provider];

    if (existing !== null && existing.trim().length > 0 && !hasManagedBlock(existing, provider)) {
      // Existing USER file without an ACKit block: refuse rather than touch.
      plans.push({
        provider,
        relativeFile,
        absolute,
        result: { output: existing ?? "", action: "unchanged" },
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
    plans.push({
      provider,
      relativeFile,
      absolute,
      result,
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
  return plans;
}
