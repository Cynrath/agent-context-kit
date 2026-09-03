import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../../src/cli/index.js";
import { loadAckitConfig } from "../../../src/core/config/load.js";
import { detectWorkflowDrift } from "../../../src/core/drift/check.js";
import {
  defaultProfileFromConfig,
  effectiveRequiredArtifacts,
  resolveProfileRequirements,
  workflowOverridesFromConfig,
} from "../../../src/core/workflow/profiles.js";
import { EXIT_CODES } from "../../../src/shared/exit-codes.js";

let rootPath = "";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-wfconfig-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

async function cli(
  args: string[],
  cwd: string = rootPath,
): Promise<{ code: number; stdout: string; stderr: string }> {
  const chunks: string[] = [];
  const errChunks: string[] = [];
  const originalWrite = process.stdout.write;
  const originalErr = process.stderr.write;
  process.stdout.write = ((chunk: string) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string) => {
    errChunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;
  try {
    const code = await runCli(["node", "ackit", "--root", cwd, ...args]);
    return { code, stdout: chunks.join(""), stderr: errChunks.join("") };
  } finally {
    process.stdout.write = originalWrite;
    process.stderr.write = originalErr;
  }
}

function taskDoc(id = "TASK-0001") {
  return {
    meta: {
      id,
      title: "t",
      status: "active" as const,
      schemaVersion: 2 as const,
      dependencies: [] as string[],
      createdAt: "2026-01-01",
      completedAt: null,
    },
    relativePath: `docs/tasks/active/${id}-t.md`,
    body: "## Affected files\n\n- src/a.ts\n",
  };
}

describe("TASK-0067 workflow config wiring", () => {
  it("no config → current defaults (legacy preservation)", () => {
    expect(workflowOverridesFromConfig(undefined)).toEqual({});
    expect(defaultProfileFromConfig(undefined)).toBeUndefined();
    expect(resolveProfileRequirements("quick")).toEqual({
      requiresVerdict: false,
      requiresEvidence: false,
    });
    expect(resolveProfileRequirements("standard")).toEqual({
      requiresVerdict: true,
      requiresEvidence: true,
    });
    // Effective artifacts equal catalog when no overrides.
    expect(effectiveRequiredArtifacts("quick", "verify", {}).artifacts).toEqual([]);
    expect(effectiveRequiredArtifacts("standard", "verify", {}).artifacts).toEqual(["evidence"]);
  });

  it("valid config tightens quick (evidence + verdict)", () => {
    const overrides = workflowOverridesFromConfig({
      workflow: {
        requireVerifier: true,
        profiles: { requireEvidence: true, requireVerdict: true },
      },
    });
    expect(overrides).toEqual({ requireVerifier: true, requireEvidence: true });
    const effective = resolveProfileRequirements("quick", overrides);
    expect(effective).toEqual({ requiresVerdict: true, requiresEvidence: true });
    // Advance gate: quick verify now requires both.
    expect(effectiveRequiredArtifacts("quick", "verify", overrides).artifacts).toEqual([
      "evidence",
      "verdict",
    ]);
    // Standard stays tight (already true) — additive, no loosening.
    expect(resolveProfileRequirements("standard", { requireVerifier: false })).toEqual({
      requiresVerdict: true,
      requiresEvidence: true,
    });
  });

  it("per-section requireVerdict wins over top-level requireVerifier", () => {
    const overrides = workflowOverridesFromConfig({
      workflow: { requireVerifier: true, profiles: { requireVerdict: false } },
    });
    // profiles.requireVerdict (false) is the specific layer → wins.
    expect(overrides.requireVerifier).toBe(false);
    // Additive-only: standard stays true regardless.
    expect(resolveProfileRequirements("standard", overrides).requiresVerdict).toBe(true);
  });

  it("defaultProfile resolves only for the frozen set", () => {
    expect(defaultProfileFromConfig({ workflow: { defaultProfile: "standard" } })).toBe("standard");
    expect(defaultProfileFromConfig({ workflow: {} })).toBeUndefined();
    expect(
      // biome-ignore lint/suspicious/noExplicitAny: testing invalid input
      defaultProfileFromConfig({ workflow: { defaultProfile: "enterprise" as any } }),
    ).toBeUndefined();
  });

  it("malformed workflow config fails deterministically (CFG-*)", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ackit-wfcfg-bad-"));
    try {
      await writeFile(
        path.join(dir, "ackit.yml"),
        ["schemaVersion: 1", "workflow:", "  defaultProfile: enterprise"].join("\n"),
        "utf8",
      );
      const result = await loadAckitConfig(dir, {});
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]?.code).toMatch(/^CFG-/);
      }
      await writeFile(
        path.join(dir, "ackit.yml"),
        ["schemaVersion: 1", "workflow:", "  bogusKey: true"].join("\n"),
        "utf8",
      );
      const unknown = await loadAckitConfig(dir, {});
      expect(unknown.ok).toBe(false);
      if (!unknown.ok) {
        expect(unknown.errors.some((e) => e.code === "CFG-UNKNOWN-KEY")).toBe(true);
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("drift respects effective verifier requirement (tightened quick)", () => {
    const base = {
      taskId: "TASK-0001",
      taskDoc: taskDoc(),
      workflow: { profile: "quick" as const, stage: "verify" },
      requiredArtifacts: [] as readonly string[],
      existingArtifacts: ["task"] as readonly string[],
      referencePathsExist: [] as readonly string[],
      evidence: null,
      latestVerdict: null,
      checkpoint: null,
      checkpointProblems: [] as readonly { code: string; message: string }[],
      changedFiles: [] as readonly string[],
      dependencies: [] as readonly { id: string; completed: boolean }[],
    };
    // Legacy default: quick needs no verdict.
    expect(detectWorkflowDrift(base).some((f) => f.code === "MISSING_VERIFIER_VERDICT")).toBe(
      false,
    );
    // Tightened: same state now reports the missing verdict as blocking.
    const tightened = detectWorkflowDrift({ ...base, requiresVerdict: true });
    const finding = tightened.find((f) => f.code === "MISSING_VERIFIER_VERDICT");
    expect(finding?.severity).toBe("blocking");
  });

  it("workflow set uses configured defaultProfile; show reports effective config", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ackit-wfcfg-e2e-"));
    try {
      execFileSync("git", ["-C", dir, "init", "-q"], { stdio: "ignore" });
      execFileSync("git", ["-C", dir, "config", "user.email", "t@example.com"], {
        stdio: "ignore",
      });
      execFileSync("git", ["-C", dir, "config", "user.name", "t"], { stdio: "ignore" });
      await writeFile(
        path.join(dir, "ackit.yml"),
        [
          "schemaVersion: 1",
          "workflow:",
          "  defaultProfile: quick",
          "  requireVerifier: true",
          "  profiles:",
          "    requireEvidence: true",
          "    requireVerdict: true",
        ].join("\n"),
        "utf8",
      );
      await mkdir(path.join(dir, "docs", "tasks", "active"), { recursive: true });
      await writeFile(
        path.join(dir, "docs", "tasks", "active", "TASK-0001-t.md"),
        [
          "---",
          'id: "TASK-0001"',
          'title: "t"',
          "status: pending",
          "schemaVersion: 2",
          "dependencies:",
          "  []",
          'createdAt: "2026-01-01"',
          "completedAt: null",
          "---",
          "",
          "## Purpose",
          "",
          "t",
          "",
          "## Acceptance criteria",
          "",
          "- [ ] x",
          "",
          "## Completion notes",
          "",
          "(placeholder)",
        ].join("\n"),
        "utf8",
      );
      await writeFile(path.join(dir, "AGENTS.md"), "# t\n", "utf8");
      // No --profile → uses configured default (quick).
      const set = await cli(["workflow", "set", "TASK-0001"], dir);
      expect(set.code).toBe(EXIT_CODES.ok);
      expect(set.stdout).toContain("quick");
      const show = await cli(["workflow", "show", "TASK-0001", "--json"], dir);
      expect(show.code).toBe(EXIT_CODES.ok);
      const payload = JSON.parse(show.stdout);
      expect(payload.profile).toBe("quick");
      expect(payload.effectiveRequiresEvidence).toBe(true);
      expect(payload.effectiveRequiresVerdict).toBe(true);
      expect(payload.configuredDefaultProfile).toBe("quick");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("legacy repo without workflow config keeps usage error for missing --profile", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ackit-wfcfg-leg-"));
    try {
      execFileSync("git", ["-C", dir, "init", "-q"], { stdio: "ignore" });
      execFileSync("git", ["-C", dir, "config", "user.email", "t@example.com"], {
        stdio: "ignore",
      });
      execFileSync("git", ["-C", dir, "config", "user.name", "t"], { stdio: "ignore" });
      await writeFile(path.join(dir, "ackit.yml"), "schemaVersion: 1\n", "utf8");
      await mkdir(path.join(dir, "docs", "tasks", "active"), { recursive: true });
      await writeFile(
        path.join(dir, "docs", "tasks", "active", "TASK-0001-t.md"),
        [
          "---",
          'id: "TASK-0001"',
          'title: "t"',
          "status: pending",
          "schemaVersion: 2",
          "dependencies:",
          "  []",
          'createdAt: "2026-01-01"',
          "completedAt: null",
          "---",
          "",
          "body",
        ].join("\n"),
        "utf8",
      );
      const set = await cli(["workflow", "set", "TASK-0001"], dir);
      expect(set.code).toBe(EXIT_CODES.usage);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
