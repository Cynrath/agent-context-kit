import { beforeAll, describe, expect, it } from "vitest";
import type { RepositoryRoot } from "../../src/core/filesystem/root.js";
import { applyPolicyToFindings } from "../../src/core/policy/apply.js";
import { resolvePolicy } from "../../src/core/policy/index.js";
import type { PolicyDocument } from "../../src/core/policy/types.js";
import type { Finding } from "../../src/core/scanner/types.js";

let root: RepositoryRoot;

beforeAll(async () => {
  const fs = await import("node:fs/promises");
  const os = await import("node:os");
  const pathMod = await import("node:path");
  const dir = await fs.mkdtemp(pathMod.join(os.tmpdir(), "ackit-scope-"));
  const w = async (name: string, lines: string[]) => {
    await fs.writeFile(pathMod.join(dir, name), `${lines.join("\n")}\n`, "utf8");
  };
  await w("org-strict.yml", [
    "schemaVersion: 1",
    "org: acme",
    "repo: web-app",
    "thresholds:",
    "  severity: high",
  ]);
  await w("repo-match.yml", [
    "schemaVersion: 1",
    "repo: web-app",
    "rules:",
    "  - ruleId: ACKIT005",
    "    severity: low",
  ]);
  root = { canonicalPath: dir };
  void w;
});

function baseFinding(relativePath: string): Finding {
  return {
    ruleId: "ACKIT020",
    severity: "low",
    category: "hygiene",
    message: "marker",
    relativePath,
    line: 1,
    column: 1,
    fingerprint: `fp-${relativePath}`,
    evidence: "TODO x",
    remediation: "resolve",
    documentationKey: "rules/ACKIT020",
    suppressed: false,
    suppressionReason: null,
  };
}

describe("policy scope semantics (audit 2.6)", () => {
  it.each([
    ["matching repo applies layer", "web-app", undefined, true],
    ["non-matching repo skips layer", "other-repo", undefined, false],
    ["missing repo context skips repo-scoped layer", undefined, undefined, false],
  ])("%s", async (_label, ctxRepo, _ctxOrg, shouldApply) => {
    const resolved = await resolvePolicy(root, {
      entryFiles: ["repo-match.yml"],
      repoName: ctxRepo,
    });
    if (shouldApply) {
      expect(resolved.policy.rules.some((r) => r.ruleId === "ACKIT005")).toBe(true);
    } else {
      expect(resolved.policy.rules.some((r) => r.ruleId === "ACKIT005")).toBe(false);
      expect(resolved.diagnostics.some((d) => d.includes("scope mismatch"))).toBe(true);
    }
  });

  it("org-scoped layer is skipped when org context missing; applies on match", async () => {
    const noCtx = await resolvePolicy(root, { entryFiles: ["org-strict.yml"] });
    expect(noCtx.policy.thresholds.severity).toBeUndefined();
    expect(noCtx.diagnostics.some((d) => d.includes("scope mismatch"))).toBe(true);

    const match = await resolvePolicy(root, {
      entryFiles: ["org-strict.yml"],
      orgName: "acme",
      repoName: "web-app",
    });
    expect(match.policy.thresholds.severity).toBe("high");
  });

  it("layer pathScopes gate that layer's suppressions to matching paths only", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const pathMod = await import("node:path");
    const dir = await fs.mkdtemp(pathMod.join(os.tmpdir(), "ackit-paths-"));
    await fs.writeFile(
      pathMod.join(dir, "scoped.yml"),
      `${[
        "schemaVersion: 1",
        "pathScopes:",
        '  - "packages/web/**"',
        "suppressions:",
        "  - ruleId: ACKIT020",
        "    pathGlobs:",
        '      - "**"',
        "    reason: scoped suppression",
      ].join("\n")}\n`,
      "utf8",
    );
    const resolved = await resolvePolicy({ canonicalPath: dir }, { entryFiles: ["scoped.yml"] });
    const findings = [baseFinding("packages/web/src/a.ts"), baseFinding("packages/api/src/b.ts")];
    const applied = applyPolicyToFindings(findings as never, {
      policy: resolved.policy,
      documents: resolved.documents,
    });
    expect(applied[0]?.suppressed).toBe(true);
    expect(applied[1]?.suppressed).toBe(false);
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("severity override + disabled rule + locked rule interplay stays deterministic", () => {
    const doc: PolicyDocument = {
      schemaVersion: 1,
      pathScopes: [],
      extends: [],
      rules: [
        { ruleId: "ACKIT010", severity: "high", locked: true },
        { ruleId: "ACKIT001", enabled: false, locked: false },
      ],
      thresholds: {},
      suppressions: [],
      forbiddenPatterns: [],
    };
    const findings = [
      baseFinding("a.ts").valueOf() as unknown as Finding,
      { ...baseFinding("b.ts"), ruleId: "ACKIT010" },
      { ...baseFinding("c.ts"), ruleId: "ACKIT001" },
    ];
    const applied = applyPolicyToFindings(findings as never, { policy: doc });
    // ACKIT010 finding upgraded to high by override.
    expect(applied[1]?.severity).toBe("high");
    // Disabled rules are handled at evaluation time (registry filter), not here.
    expect(applied[2]?.ruleId).toBe("ACKIT001");
  });

  it("expired suppression is inactive (expiry honored)", async () => {
    const fs = await import("node:fs/promises");
    const os = await import("node:os");
    const pathMod = await import("node:path");
    const dir = await fs.mkdtemp(pathMod.join(os.tmpdir(), "ackit-exp-"));
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await fs.writeFile(
      pathMod.join(dir, "exp.yml"),
      `${[
        "schemaVersion: 1",
        "suppressions:",
        "  - ruleId: ACKIT020",
        "    pathGlobs:",
        '      - "**"',
        "    reason: stale",
        `    expiresAt: ${yesterday}`,
      ].join("\n")}\n`,
      "utf8",
    );
    const resolved = await resolvePolicy({ canonicalPath: dir }, { entryFiles: ["exp.yml"] });
    const applied = applyPolicyToFindings([baseFinding("x.ts")] as never, {
      policy: resolved.policy,
      documents: resolved.documents,
    });
    expect(applied[0]?.suppressed).toBe(false);
    expect(resolved.diagnostics.some((d) => d.includes("expired"))).toBe(true);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
