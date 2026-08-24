import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { executeConfiguredScan } from "../../src/core/scanner/orchestrate.js";

let repo: { rootPath: string; cleanup(): Promise<void> };

beforeAll(async () => {
  const rootPath = await mkdtemp(path.join(os.tmpdir(), "ackit-polwire-"));
  // A file that triggers ACKIT020 (TODO marker) and ACKIT001 (token shape).
  await writeFile(
    path.join(rootPath, "sample.txt"),
    ["// TODO fix this", `aws_key = ${"AKIA"}IOSFODNN7EXAMPLE`].join("\n") + "\n",
    "utf8",
  );
  repo = { rootPath, cleanup: () => rm(rootPath, { recursive: true, force: true }) };
});

afterAll(async () => {
  await repo.cleanup();
});

describe("policy rule plan wiring (audit item 2)", () => {
  it("enabled: false prevents rule from producing findings", async () => {
    await writeFile(
      path.join(repo.rootPath, "ackit-policy.yml"),
      ["schemaVersion: 1", "rules:", "  - ruleId: ACKIT020", "    enabled: false"].join("\n") +
        "\n",
      "utf8",
    );
    await writeFile(
      path.join(repo.rootPath, "ackit.yml"),
      ["schemaVersion: 1", "policy:", "  extends:", "    - ackit-policy.yml"].join("\n") + "\n",
      "utf8",
    );

    const result = await executeConfiguredScan(repo.rootPath);
    const ackit020 = result.findings.filter((f) => f.ruleId === "ACKIT020");
    expect(ackit020).toHaveLength(0);
    // ACKIT001 should still fire (not disabled).
    expect(result.findings.some((f) => f.ruleId === "ACKIT001")).toBe(true);
  });

  it("forbiddenPatterns produce findings as first-class rules", async () => {
    await writeFile(
      path.join(repo.rootPath, "ackit-policy.yml"),
      [
        "schemaVersion: 1",
        "forbiddenPatterns:",
        "  - id: ACKIT950",
        '    pattern: "eval\\\\("',
        "    severity: high",
        "    message: eval() is forbidden",
      ].join("\n") + "\n",
      "utf8",
    );
    await writeFile(path.join(repo.rootPath, "code.js"), "eval(input);\n");

    // Remove the disable so we can see all rules.
    await writeFile(
      path.join(repo.rootPath, "ackit-policy.yml"),
      [
        "schemaVersion: 1",
        "forbiddenPatterns:",
        "  - id: ACKIT950",
        '    pattern: "eval\\\\("',
        "    severity: high",
        "    message: eval() is forbidden",
      ].join("\n") + "\n",
      "utf8",
    );
    await writeFile(path.join(repo.rootPath, "code.js"), "eval(input);\n");

    const result = await executeConfiguredScan(repo.rootPath);
    const fp = result.findings.find((f) => f.ruleId === "ACKIT950" && f.relativePath === "code.js");
    expect(fp).toBeDefined();
    expect(fp?.severity).toBe("high");
    expect(fp?.relativePath).toBe("code.js");
  });

  it("severity override upgrades finding severity deterministically", async () => {
    await writeFile(
      path.join(repo.rootPath, "ackit.yml"),
      ["schemaVersion: 1", "policy:", "  extends:", "    - ackit-policy.yml"].join("\n") + "\n",
      "utf8",
    );
    await writeFile(
      path.join(repo.rootPath, "ackit-policy.yml"),
      ["schemaVersion: 1", "rules:", "  - ruleId: ACKIT020", "    severity: high"].join("\n") +
        "\n",
      "utf8",
    );
    await writeFile(path.join(repo.rootPath, "todo.txt"), "// TODO upgrade\n");

    const result = await executeConfiguredScan(repo.rootPath);
    const ackit020 = result.findings.filter((f) => f.ruleId === "ACKIT020");
    expect(ackit020.length).toBeGreaterThan(0);
    expect(ackit020[0]?.severity).toBe("high"); // overridden from low
  });
});
