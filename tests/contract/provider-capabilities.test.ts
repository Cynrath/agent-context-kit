/**
 * Provider-capability table contract (TASK-0083).
 *
 * Every modeled provider-surface difference must trace to an official
 * primary source with a freshness date; non-differences are pinned so
 * future edits cannot silently inflate provider count into modeling.
 * ACKit's projection mapping (managed files, skill roots) is asserted
 * against the researched D1–D3 rows.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REQUIRED_SURFACES = [
  "codex-cli",
  "claude-code",
  "gemini-cli",
  "copilot-chat",
  "copilot-coding-agent",
  "copilot-review",
  "vscode-agent-mode",
];

interface CapabilitySource {
  surface: string;
  url: string;
  accessed: string;
}

interface CapabilityTable {
  schemaVersion: string;
  researchedAt: string;
  surfaces: Record<string, Record<string, unknown>>;
  ackitProjection: {
    managedFiles: string[];
    skillExportTargets: string[];
    skillRootsByTarget: Record<string, string[]>;
    notes: string[];
  };
  differences: { id: string; statement: string; sources: CapabilitySource[] }[];
  nonDifferences: { id: string; statement: string }[];
}

function loadTable(): CapabilityTable {
  const raw = readFileSync(
    path.join(import.meta.dirname, "..", "fixtures", "provider-capabilities.json"),
    "utf8",
  );
  return JSON.parse(raw) as CapabilityTable;
}

describe("provider capability table (TASK-0083)", () => {
  it("covers exactly the seven audited surfaces with dated official sources", () => {
    const table = loadTable();
    expect(table.schemaVersion).toBe("ackit.provider-capabilities.v1");
    expect(table.researchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Object.keys(table.surfaces).sort()).toEqual([...REQUIRED_SURFACES].sort());
    for (const [surface, mechanisms] of Object.entries(table.surfaces)) {
      expect(Array.isArray(mechanisms["alwaysOn"]), `${surface} alwaysOn`).toBe(true);
      expect((mechanisms["alwaysOn"] as string[]).length).toBeGreaterThan(0);
      expect(Array.isArray(mechanisms["skillsRoots"]), `${surface} skillsRoots`).toBe(true);
    }
  });

  it("every difference cites at least one official source with a freshness date", () => {
    const table = loadTable();
    const ids = new Set<string>();
    for (const difference of table.differences) {
      expect(difference.id).toMatch(/^D\d+$/);
      expect(ids.has(difference.id), `duplicate ${difference.id}`).toBe(false);
      ids.add(difference.id);
      expect(difference.statement.length).toBeGreaterThan(20);
      expect(difference.sources.length).toBeGreaterThan(0);
      for (const source of difference.sources) {
        expect(REQUIRED_SURFACES).toContain(source.surface);
        expect(source.url.startsWith("https://"), `${difference.id} non-https source`).toBe(true);
        expect(source.url).not.toMatch(/blog|medium\.com|dev\.to/);
        expect(source.accessed).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
    // The ten researched material differences are all modeled (no silent drops).
    expect([...ids].sort()).toEqual(
      ["D1", "D10", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9"].sort(),
    );
  });

  it("non-differences are pinned against count inflation", () => {
    const table = loadTable();
    expect(table.nonDifferences.length).toBeGreaterThan(0);
    const ids = new Set<string>();
    for (const entry of table.nonDifferences) {
      expect(entry.id).toMatch(/^N\d+$/);
      expect(ids.has(entry.id), `duplicate ${entry.id}`).toBe(false);
      ids.add(entry.id);
    }
    expect(ids.has("N2")).toBe(true); // SKILL.md convergence bounds export targets
  });

  it("ACKit projection mapping covers the researched file/root rows (D1-D3)", () => {
    const table = loadTable();
    const { managedFiles, skillRootsByTarget } = table.ackitProjection;
    // D1: every surface's primary always-on file is emitted by ACKit.
    const primaryFiles = new Map([
      ["codex-cli", "AGENTS.md"],
      ["claude-code", "CLAUDE.md"],
      ["gemini-cli", "GEMINI.md"],
      ["copilot-chat", ".github/copilot-instructions.md"],
      ["copilot-coding-agent", "AGENTS.md"],
      ["copilot-review", "AGENTS.md"],
      ["vscode-agent-mode", ".github/copilot-instructions.md"],
    ]);
    for (const [surface, file] of primaryFiles) {
      expect(managedFiles, `${surface} primary file`).toContain(file);
    }
    // D3: every researched skills root is reachable through a projection target.
    const reachableRoots = new Set(Object.values(skillRootsByTarget).flat());
    for (const root of [".agents/skills", ".claude/skills", ".github/skills"]) {
      expect(reachableRoots, `skills root ${root}`).toContain(root);
    }
    // N2 convergence: no codex/gemini-only export target exists (identical
    // SKILL.md bytes would be provider-count inflation, not modeling).
    expect(table.ackitProjection.skillExportTargets.sort()).toEqual([
      "claude",
      "copilot",
      "generic",
    ]);
  });
});
