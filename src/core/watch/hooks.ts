import { promises as fsp } from "node:fs";
import path from "node:path";

export const HOOK_START = "# >>> ackit pre-commit (managed) >>>";
export const HOOK_END = "# <<< ackit pre-commit (managed) <<<";
// Managed block (ADR-0028 §3, preCommit lifecycle gate): runs ONLY the
// repository-built ACKit CLI the user explicitly installed — never arbitrary
// repository-specified commands. The drift check is a no-op (exit 0) when no
// workflow task is active, so legacy repositories see no behavior change.
const HOOK_BODY_LINES = [
  "ackit scan --staged --ci || exit 1",
  "ackit drift check-active --ci || exit 1",
];

export interface HookFile {
  absolutePath: string;
}

function hookPath(repoRoot: string): string {
  return path.join(repoRoot, ".git", "hooks", "pre-commit");
}

async function readIfExists(file: string): Promise<string | null> {
  try {
    return await fsp.readFile(file, "utf8");
  } catch {
    return null;
  }
}

function managedBlock(): string {
  return `${[HOOK_START, ...HOOK_BODY_LINES, HOOK_END].join("\n")}\n`;
}

/**
 * Pre-commit hooks installer (REQ-WATCH-002): appends a marker-delimited
 * managed block, preserving any pre-existing hook content byte-exact.
 * Uninstall removes ONLY the owned lines. Existing foreign hooks are never
 * overwritten — chaining is the contract.
 */
export async function installHook(
  repoRoot: string,
): Promise<{ status: "installed" | "already-installed" | "foreign-preserved" }> {
  const file = hookPath(repoRoot);
  const existing = await readIfExists(file);
  if (existing === null) {
    await fsp.mkdir(path.dirname(file), { recursive: true });
    await fsp.writeFile(file, `#!/bin/sh\n\n${managedBlock()}`, "utf8");
    await fsp.chmod(file, 0o755).catch(() => undefined);
    return { status: "installed" };
  }
  if (existing.includes(HOOK_START)) return { status: "already-installed" };
  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  await fsp.writeFile(file, `${existing}${separator}${managedBlock()}`, "utf8");
  return { status: "foreign-preserved" };
}

export async function uninstallHook(
  repoRoot: string,
): Promise<{ status: "removed" | "not-installed" }> {
  const file = hookPath(repoRoot);
  const existing = await readIfExists(file);
  if (existing === null || !existing.includes(HOOK_START)) return { status: "not-installed" };
  const start = existing.indexOf(HOOK_START);
  const end = existing.indexOf(HOOK_END) + HOOK_END.length;
  let cleaned = existing.slice(0, start) + existing.slice(end);
  cleaned = cleaned.replace(/\n{3,}$/, "\n");
  if (cleaned.trim() === "#!/bin/sh") cleaned = "";
  if (cleaned.length === 0) {
    await fsp.rm(file, { force: true });
  } else {
    await fsp.writeFile(file, cleaned, "utf8");
  }
  return { status: "removed" };
}

export async function hookStatus(repoRoot: string): Promise<{ status: "installed" | "absent" }> {
  const existing = await readIfExists(hookPath(repoRoot));
  return { status: existing?.includes(HOOK_START) ? "installed" : "absent" };
}
