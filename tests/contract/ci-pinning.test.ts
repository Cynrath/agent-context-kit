import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const WORKFLOW = path.join(process.cwd(), ".github", "workflows", "ci.yml");

/** Supply-chain gate (REQ-SEC-004): every `uses:` must be a full commit SHA
 * with a human-readable version comment on the same or previous line. */
describe("CI workflow hardening", () => {
  const raw = readFileSync(WORKFLOW, "utf8");

  it("pins every action to a full 40-char commit SHA", () => {
    const usesLines = [...raw.matchAll(/^\s*-?\s*uses:\s*(\S+)\s*$/gm)].map(
      (match) => match[1] ?? "",
    );
    expect(usesLines.length).toBeGreaterThan(0);
    for (const ref of usesLines) {
      const [action, sha] = ref.split("@");
      expect(action, `unpinned action: ${ref}`).toBeTruthy();
      expect(sha, `action '${action}' not SHA-pinned: '${sha}'`).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it("carries a version comment for each pinned action", () => {
    expect(raw).toContain("# actions/checkout@v4");
    expect(raw).toContain("# actions/setup-node@v4");
    expect(raw).toContain("# pnpm/action-setup@v4");
  });

  it("scopes permissions to contents: read and has no publish triggers", () => {
    expect(raw).toContain("permissions:");
    expect(raw).toMatch(/contents:\s*read/);
    expect(raw).not.toMatch(/branches:\s*\n?\s*-\s*"?master/);
    expect(raw).not.toContain("release:");
    expect(raw).not.toContain("publish");
    expect(raw.toLowerCase()).not.toContain("npm publish");
  });

  it("covers the required matrix and hardening jobs", () => {
    for (const os of ["ubuntu-latest", "windows-latest", "macos-latest"]) {
      expect(raw.includes(`os: [ubuntu-latest, windows-latest, macos-latest]`)).toBe(true);
      void os;
    }
    expect(raw).toContain('node: ["22", "24"]');
    expect(raw).toContain("self-scan");
    expect(raw).toContain("package-smoke");
    expect(raw).toContain("scan --ci --exclude pnpm-lock.yaml");
    expect(raw).toContain("smoke:package");
  });
});
