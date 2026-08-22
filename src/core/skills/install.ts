import { type Dirent, promises as fsp } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RepositoryRoot } from "../filesystem/root.js";
import { checksumContent } from "../instructions/references.js";
import { isValidKebabName } from "./types.js";

export const SKILLS_LOCK_SCHEMA_VERSION = 1;
export const LOCK_FILE_RELATIVE = ".ackit/skills.lock.json";
const _BUILTIN_MARKER = "ackit-workflow";

export interface LockEntry {
  name: string;
  version: string;
  /** sha256 of the builtin SKILL.md content at the last install/sync. */
  checksum: string;
  /** Repository-relative paths managed by ACKit. */
  files: string[];
}

export interface SkillsLock {
  schemaVersion: number;
  generatedBy: string;
  skills: LockEntry[];
}

export interface BuiltinSkill {
  name: string;
  sourceDir: string;
  files: string[];
}

export type InstallStatus =
  | "installed"
  | "up-to-date"
  | "updated"
  | "conflict-user-modified"
  | "refused-third-party"
  | "reinstalled";

export interface InstallOutcome {
  skill: string;
  status: InstallStatus;
  message: string;
}

export interface InstallOptions {
  /** Overrides builtin template discovery (test seam / packaged fallback). */
  builtinsDir?: string | undefined;
  /** Acknowledge user modifications on OWNED skills (still refuses third-party). */
  force?: boolean | undefined;
  version?: string | undefined;
}

// ---------------------------------------------------------------------------
// Lock handling
// ---------------------------------------------------------------------------

export async function readSkillsLock(root: RepositoryRoot): Promise<SkillsLock> {
  try {
    const raw = await fsp.readFile(
      path.join(root.canonicalPath, ...LOCK_FILE_RELATIVE.split("/")),
      "utf8",
    );
    const parsed = JSON.parse(raw) as Partial<SkillsLock>;
    return {
      schemaVersion: SKILLS_LOCK_SCHEMA_VERSION,
      generatedBy: typeof parsed.generatedBy === "string" ? parsed.generatedBy : "ackit",
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    };
  } catch {
    return { schemaVersion: SKILLS_LOCK_SCHEMA_VERSION, generatedBy: "ackit", skills: [] };
  }
}

export async function writeSkillsLock(root: RepositoryRoot, lock: SkillsLock): Promise<void> {
  const lockDir = path.join(root.canonicalPath, ".ackit");
  await fsp.mkdir(lockDir, { recursive: true });
  await fsp.writeFile(
    path.join(lockDir, "skills.lock.json"),
    `${JSON.stringify(lock, null, 2)}\n`,
    "utf8",
  );
}

/** Contract helper (REQ-SKILL-004): lock entries must never contain absolute paths. */
export function lockHasAbsolutePaths(lock: SkillsLock): boolean {
  for (const entry of lock.skills) {
    for (const file of entry.files) {
      if (path.isAbsolute(file) || /^[A-Za-z]:/.test(file) || file.includes("\\")) {
        return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Builtin discovery
// ---------------------------------------------------------------------------

export async function discoverBuiltinSkills(builtinsDir?: string | undefined): Promise<{
  dir: string;
  skills: BuiltinSkill[];
}> {
  const dir =
    builtinsDir !== undefined
      ? builtinsDir
      : ((await findTemplatesSkillsDir()) ?? "templates/skills");
  const skills: BuiltinSkill[] = [];
  let entries: Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return { dir, skills };
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || !isValidKebabName(entry.name)) continue;
    const sourceDir = path.join(dir, entry.name);
    try {
      await fsp.access(path.join(sourceDir, "SKILL.md"));
    } catch {
      continue;
    }
    skills.push({
      name: entry.name,
      sourceDir,
      files: await listRelativeFiles(sourceDir, sourceDir),
    });
  }
  skills.sort((a, b) => (a.name < b.name ? -1 : 1));
  return { dir, skills };
}

async function findTemplatesSkillsDir(): Promise<string | null> {
  let current = path.dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate =
      path.basename(current) === "templates" ? current : path.join(current, "templates");
    if (path.basename(current) === "templates" || (await isDir(path.join(candidate, "skills")))) {
      const withSkills = path.basename(current) === "templates" ? current : candidate;
      if (await isDir(path.join(withSkills, "skills"))) return path.join(withSkills, "skills");
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  void process;
  return null;
}

async function isDir(candidate: string): Promise<boolean> {
  try {
    return (await fsp.stat(candidate)).isDirectory();
  } catch {
    return false;
  }
}

async function listRelativeFiles(base: string, dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      out.push(...(await listRelativeFiles(base, path.join(dir, entry.name))));
    } else if (entry.isFile()) {
      out.push(toPosix(path.relative(base, path.join(dir, entry.name))));
    }
  }
  return out.sort();
}

function toPosix(value: string): string {
  return value.split("\\").join("/");
}

// ---------------------------------------------------------------------------
// Install / sync
// ---------------------------------------------------------------------------

/**
 * Installs every builtin skill idempotently (REQ-SKILL-002/003):
 * - missing → installed
 * - identical → up-to-date (zero diff)
 * - differs but untracked in lock → refused-third-party (exit-class 4)
 * - differs and owned, user modified since last sync → conflict unless --force
 * - differs and owned, unchanged locally → updated
 */
export async function installSkills(
  root: RepositoryRoot,
  options: InstallOptions = {},
): Promise<InstallOutcome[]> {
  const { skills } = await discoverBuiltinSkills(options.builtinsDir);
  const lock = await readSkillsLock(root);
  const outcomes: InstallOutcome[] = [];

  for (const skill of skills) {
    const targetDir = path.join(root.canonicalPath, ".agents", "skills", skill.name);
    const skillMd = path.join(targetDir, "SKILL.md");
    const sourceChecksum = checksumContent(
      await fsp.readFile(path.join(skill.sourceDir, "SKILL.md")),
    );
    const existingContent = await readIfExists(skillMd);

    if (existingContent === null) {
      await copyTree(skill.sourceDir, targetDir);
      upsertLockEntry(lock, {
        name: skill.name,
        version: options.version ?? readOwnVersion(),
        checksum: sourceChecksum,
        files: skill.files.map((file) => `.agents/skills/${skill.name}/${file}`),
      });
      outcomes.push({ skill: skill.name, status: "installed", message: "skill created" });
      continue;
    }

    const targetChecksum = checksumContent(existingContent);
    const lockedEntry = lock.skills.find((entry) => entry.name === skill.name);

    if (targetChecksum === sourceChecksum) {
      upsertLockEntry(lock, {
        name: skill.name,
        version: options.version ?? readOwnVersion(),
        checksum: sourceChecksum,
        files: skill.files.map((file) => `.agents/skills/${skill.name}/${file}`),
      });
      outcomes.push({
        skill: skill.name,
        status: "up-to-date",
        message: "already matches builtin",
      });
      continue;
    }

    if (lockedEntry === undefined) {
      outcomes.push({
        skill: skill.name,
        status: "refused-third-party",
        message:
          "a non-owned skill with this name exists; ACKit never overwrites third-party skills (rename it or remove it first)",
      });
      continue;
    }

    const userModified = targetChecksum !== lockedEntry.checksum;
    if (userModified && options.force !== true) {
      outcomes.push({
        skill: skill.name,
        status: "conflict-user-modified",
        message:
          "owned skill was modified locally; re-run with --force to discard local edits or keep them",
      });
      continue;
    }

    await fsp.rm(targetDir, { recursive: true, force: true });
    await copyTree(skill.sourceDir, targetDir);
    upsertLockEntry(lock, {
      name: skill.name,
      version: options.version ?? readOwnVersion(),
      checksum: sourceChecksum,
      files: skill.files.map((file) => `.agents/skills/${skill.name}/${file}`),
    });
    outcomes.push({
      skill: skill.name,
      status: userModified ? "updated" : "updated",
      message: userModified ? "local edits discarded via --force" : "updated from builtin",
    });
  }

  await writeSkillsLock(root, lock);
  return outcomes;
}

function upsertLockEntry(lock: SkillsLock, entry: LockEntry): void {
  const index = lock.skills.findIndex((existing) => existing.name === entry.name);
  if (index >= 0) lock.skills[index] = entry;
  else lock.skills.push(entry);
  lock.skills.sort((a, b) => (a.name < b.name ? -1 : 1));
}

async function copyTree(from: string, to: string): Promise<void> {
  await fsp.mkdir(to, { recursive: true });
  await fsp.cp(from, to, { recursive: true, verbatimSymlinks: false });
}

async function readIfExists(file: string): Promise<string | null> {
  try {
    return await fsp.readFile(file, "utf8");
  } catch {
    return null;
  }
}

let cachedVersion: string | undefined;

function readOwnVersion(): string {
  if (cachedVersion === undefined) {
    try {
      // Works from src/ and dist/ alike; falls back gracefully when unpackaged.
      const require = createRequire(import.meta.url);
      const pkg = require("../../../package.json") as { version?: string };
      cachedVersion = typeof pkg.version === "string" ? pkg.version : "0.0.0-dev";
    } catch {
      cachedVersion = "0.0.0-dev";
    }
  }
  return cachedVersion;
}
