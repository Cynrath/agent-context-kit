import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli/index.js";
import { extractFrontmatter } from "../../src/core/instructions/frontmatter.js";
import { discoverBuiltinSkills } from "../../src/core/skills/install.js";
import { isValidKebabName, MAX_DESCRIPTION_LENGTH } from "../../src/core/skills/types.js";
import { EXIT_CODES } from "../../src/shared/exit-codes.js";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));

const EXPECTED_BUILTINS = [
  "ackit-context-optimization",
  "ackit-policy-authoring",
  "ackit-scan-and-fix",
  "ackit-workflow",
] as const;

/**
 * Explicit machine-readable command cases paired with each builtin skill.
 * Each entry is the argv (without the leading `node ackit`) that must parse
 * and whose `--help` must exit 0. This is the durable SKILL↔CLI parity table:
 * adding a new documented command requires adding its case here, and removing
 * a CLI command breaks the smoke below instead of silently rotting templates.
 */
const SKILL_COMMAND_CASES: Record<(typeof EXPECTED_BUILTINS)[number], string[][]> = {
  "ackit-workflow": [
    ["task", "create"],
    ["task", "list"],
    ["task", "show"],
    ["task", "doctor"],
    ["task", "archive"],
    ["task", "resume"],
    ["task", "complete"],
    ["workflow", "set"],
    ["workflow", "show"],
    ["workflow", "advance"],
    ["workflow", "verify"],
    ["checkpoint", "create"],
    ["checkpoint", "show"],
    ["checkpoint", "validate"],
    ["checkpoint", "export"],
    ["evidence", "sync"],
    ["evidence", "verify"],
    ["evidence", "validate"],
    ["verification", "bundle"],
    ["verification", "record"],
    ["verification", "show"],
    ["drift", "check"],
    ["doctor"],
    ["scan"],
  ],
  "ackit-scan-and-fix": [["scan"], ["policy", "check"], ["config", "check"]],
  "ackit-context-optimization": [["pack"], ["optimize"]],
  "ackit-policy-authoring": [
    ["policy", "check"],
    ["config", "check"],
    ["task", "complete"],
    ["checkpoint", "export"],
    ["verification", "record"],
  ],
};

function captureStdout(): { output(): string; restore(): void } {
  const chunks: string[] = [];
  const spy = vi.spyOn(process.stdout, "write").mockImplementation(((chunk: string) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  return {
    output: () => chunks.join(""),
    restore: () => {
      spy.mockRestore();
    },
  };
}

async function helpExitsZero(argv: readonly string[]): Promise<void> {
  const captured = captureStdout();
  try {
    const code = await runCli(["node", "ackit", ...argv, "--help"]);
    expect(code, `help invocation failed for: ackit ${argv.join(" ")}`).toBe(EXIT_CODES.ok);
  } finally {
    captured.restore();
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

/** Extracts `ackit ...` code-span payloads from markdown (deterministic, no NL parsing). */
function extractAckitSnippets(markdown: string): string[] {
  const out: string[] = [];
  for (const match of markdown.matchAll(/`ackit\s+([^`]+)`/g)) {
    const payload = (match[1] ?? "").trim();
    if (payload.length > 0) out.push(payload);
  }
  return out;
}

/** Normalizes a snippet payload into argv-like tokens (strips placeholders/quotes). */
function tokenizeSnippet(payload: string): string[] {
  return payload
    .split(/\s+/)
    .map((token) => token.replace(/^["'<([]+|["'>)\],;|]+$/g, ""))
    .filter((token) => token.length > 0 && !token.startsWith("-") && !token.includes("="))
    .map((token) => token.split("|")[0] ?? token)
    .filter((token) => token.length > 0 && /^[A-Za-z0-9_<#.:/]+$/.test(token));
}

describe("builtin SKILL↔CLI parity (TASK-0077)", () => {
  it("ships exactly the four expected builtins, sorted", async () => {
    const { skills } = await discoverBuiltinSkills();
    expect(skills.map((skill) => skill.name)).toEqual([...EXPECTED_BUILTINS]);
  });

  it("validates frontmatter name/path for every builtin SKILL.md", async () => {
    const { skills } = await discoverBuiltinSkills();
    expect(skills.length).toBe(EXPECTED_BUILTINS.length);
    for (const skill of skills) {
      const raw = await readFile(path.join(skill.sourceDir, "SKILL.md"), "utf8");
      const { frontmatter } = extractFrontmatter(raw);
      expect(frontmatter, `${skill.name}: missing frontmatter`).not.toBeNull();
      const name = frontmatter?.["name"];
      const description = frontmatter?.["description"];
      expect(typeof name).toBe("string");
      expect(name).toBe(skill.name);
      expect(isValidKebabName(skill.name)).toBe(true);
      expect(path.basename(skill.sourceDir)).toBe(skill.name);
      expect(typeof description).toBe("string");
      expect((description as string).length).toBeGreaterThan(0);
      expect((description as string).length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
      // Every builtin ships at least SKILL.md plus its references dir.
      expect(skill.files).toContain("SKILL.md");
    }
  });

  it('catches the removed stale shorthand (ackit task "<title>" without create)', async () => {
    const { skills } = await discoverBuiltinSkills();
    const stale = /ackit\s+task\s+"[^"]+"/;
    for (const skill of skills) {
      const raw = await readFile(path.join(skill.sourceDir, "SKILL.md"), "utf8");
      // The historical shorthand `ackit task "<title>"` (no subcommand) is
      // rejected by the parser; templates must use `ackit task create`.
      // Allow the corrected form which contains `task create "..."`.
      const withoutCreate = raw.replaceAll("task create", "task_create_kept");
      expect(
        stale.test(withoutCreate),
        `${skill.name}: stale 'ackit task "<title>"' shorthand without 'create'`,
      ).toBe(false);
      for (const file of skill.files) {
        if (!file.startsWith("references/") || !file.endsWith(".md")) continue;
        const refRaw = await readFile(path.join(skill.sourceDir, file), "utf8");
        const refWithoutCreate = refRaw.replaceAll("task create", "task_create_kept");
        expect(stale.test(refWithoutCreate), `${skill.name}/${file}: stale shorthand`).toBe(false);
      }
    }
  });

  it("requires current workflow lifecycle semantics in ackit-workflow", async () => {
    const { skills } = await discoverBuiltinSkills();
    const workflow = skills.find((skill) => skill.name === "ackit-workflow");
    expect(workflow).toBeDefined();
    if (workflow === undefined) throw new Error("ackit-workflow builtin missing");
    const raw = await readFile(path.join(workflow.sourceDir, "SKILL.md"), "utf8");
    for (const required of [
      "task create",
      "task archive --completed",
      "TASK-COMPLETED-IN-ACTIVE",
      "workflow advance",
      "checkpoint",
      "evidence",
      "verification",
      "drift",
      "task doctor",
      "scan --ci",
    ]) {
      expect(raw.includes(required), `ackit-workflow SKILL.md missing '${required}'`).toBe(true);
    }
  });

  it("requires policy check (not config-only) in ackit-policy-authoring", async () => {
    const { skills } = await discoverBuiltinSkills();
    const policy = skills.find((skill) => skill.name === "ackit-policy-authoring");
    expect(policy).toBeDefined();
    if (policy === undefined) throw new Error("ackit-policy-authoring builtin missing");
    const raw = await readFile(path.join(policy.sourceDir, "SKILL.md"), "utf8");
    expect(raw.includes("ackit policy check")).toBe(true);
    expect(raw.includes("POL-OFFLINE-BLOCKED")).toBe(true);
  });

  it("requires exact suppression syntax in ackit-scan-and-fix", async () => {
    const { skills } = await discoverBuiltinSkills();
    const scan = skills.find((skill) => skill.name === "ackit-scan-and-fix");
    expect(scan).toBeDefined();
    if (scan === undefined) throw new Error("ackit-scan-and-fix builtin missing");
    const raw = await readFile(path.join(scan.sourceDir, "SKILL.md"), "utf8");
    expect(raw.includes("# ackit-ignore:ACKIT")).toBe(true);
    expect(raw.includes("ACKIT099")).toBe(true);
    expect(raw.includes("ackit policy check")).toBe(true);
  });

  it("requires task-aware pack and managed-only fix in ackit-context-optimization", async () => {
    const { skills } = await discoverBuiltinSkills();
    const pack = skills.find((skill) => skill.name === "ackit-context-optimization");
    expect(pack).toBeDefined();
    if (pack === undefined) throw new Error("ackit-context-optimization builtin missing");
    const raw = await readFile(path.join(pack.sourceDir, "SKILL.md"), "utf8");
    expect(raw.includes("--task")).toBe(true);
    expect(raw.includes("--resume")).toBe(true);
    expect(raw.includes("ACKit-managed surfaces")).toBe(true);
  });

  it("smokes --help for every explicit skill command case", async () => {
    for (const skill of EXPECTED_BUILTINS) {
      for (const argv of SKILL_COMMAND_CASES[skill]) {
        await helpExitsZero(argv);
      }
    }
  }, 120_000);

  it("every documented ackit snippet maps to a known CLI command prefix", async () => {
    // Valid top-level + subcommand prefixes derived from the explicit cases
    // above (plus `sync`/`skills` lifecycle commands referenced in docs).
    const validPrefixes = new Set<string>();
    for (const cases of Object.values(SKILL_COMMAND_CASES)) {
      for (const argv of cases) {
        validPrefixes.add(argv.slice(0, 2).join(" "));
        validPrefixes.add(argv[0] ?? "");
      }
    }
    for (const extra of [
      "sync",
      "skills install",
      "skills validate",
      "skills list",
      "intent validate",
    ]) {
      validPrefixes.add(extra);
    }
    const { skills } = await discoverBuiltinSkills();
    for (const skill of skills) {
      const files = ["SKILL.md", ...skill.files.filter((f) => f.startsWith("references/"))];
      for (const file of files) {
        const raw = await readFile(path.join(skill.sourceDir, file), "utf8");
        for (const snippet of extractAckitSnippets(raw)) {
          const tokens = tokenizeSnippet(snippet);
          if (tokens.length === 0) continue;
          const two = tokens.slice(0, 2).join(" ");
          const one = tokens[0] ?? "";
          const ok = validPrefixes.has(two) || validPrefixes.has(one);
          expect(
            ok,
            `${skill.name}/${file}: documented snippet 'ackit ${snippet}' does not map to a known CLI command (tokens: ${tokens.join(", ")})`,
          ).toBe(true);
        }
      }
    }
  });

  it("packages the same corrected templates via the npm files whitelist", async () => {
    const pkg = JSON.parse(await readFile(path.join(REPO_ROOT, "package.json"), "utf8")) as {
      files?: string[];
    };
    expect(pkg.files).toContain("templates");
    const { skills } = await discoverBuiltinSkills();
    for (const skill of skills) {
      for (const file of skill.files) {
        const absolute = path.join(skill.sourceDir, file);
        const content = await readFile(absolute, "utf8");
        expect(content.length).toBeGreaterThan(0);
        expect(absolute.replace(/\\/g, "/")).toContain(`templates/skills/${skill.name}/`);
      }
    }
  });
});
