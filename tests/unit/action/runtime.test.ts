import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runAction, splitActionArgs } from "../../../src/action/runtime.js";
import type { Finding } from "../../../src/core/scanner/types.js";
import { getPackageIdentity } from "../../../src/shared/version.js";

const dirs: string[] = [];
afterEach(async () => {
  for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    ruleId: "ACKIT020",
    severity: "low",
    category: "hygiene",
    message: "Review marker",
    relativePath: "sample.txt",
    line: 2,
    column: 1,
    fingerprint: "fixture",
    evidence: "",
    remediation: "Review",
    documentationKey: "rules/ACKIT020",
    suppressed: false,
    suppressionReason: null,
    ...overrides,
  };
}

async function execute(
  findings: Finding[],
  options: {
    status?: number | null;
    threshold?: string;
    error?: Error;
    signal?: NodeJS.Signals;
    stdout?: string;
    sarif?: string;
    args?: string;
  } = {},
) {
  const dir = await mkdtemp(path.join(tmpdir(), "ackit-action-test-"));
  dirs.push(dir);
  const messages: string[] = [];
  let argv: string[] = [];
  const code = runAction({
    env: {
      RUNNER_TEMP: dir,
      GITHUB_OUTPUT: path.join(dir, "outputs"),
      GITHUB_STEP_SUMMARY: path.join(dir, "summary"),
      INPUT_FAIL_THRESHOLD: options.threshold ?? "high",
      INPUT_UPLOAD_SARIF: options.sarif ?? "true",
      INPUT_ARGS: options.args ?? "",
    },
    invoke: (args) => {
      argv = args;
      return {
        status: options.status === undefined ? 0 : options.status,
        stdout: options.stdout ?? JSON.stringify({ findings }),
        error: options.error,
        signal: options.signal,
      };
    },
    log: (message) => messages.push(message),
    error: (message) => messages.push(message),
  });
  return { dir, code, messages, argv };
}

describe("Action threshold and process contract", () => {
  it("fails at the threshold even when the CLI returns zero", async () => {
    expect((await execute([finding({ severity: "high" })])).code).toBe(1);
  });
  it("passes below threshold and when no findings exist", async () => {
    expect((await execute([finding()])).code).toBe(0);
    expect((await execute([])).code).toBe(0);
  });
  it("honors policy suppression without hiding the report", async () => {
    const result = await execute([finding({ severity: "critical", suppressed: true })]);
    expect(result.code).toBe(0);
    expect(result.messages).toEqual([]);
    expect(
      JSON.parse(await readFile(path.join(result.dir, "ackit-findings.json"), "utf8")).findings[0]
        .suppressed,
    ).toBe(true);
  });
  it.each([1, 2, 3, 4, 5])("preserves CLI code %i even with a parsed report", async (status) => {
    expect((await execute([finding({ severity: "critical" })], { status })).code).toBe(status);
  });
  it("fails closed on launch error, timeout, signal, empty or malformed JSON", async () => {
    for (const options of [
      { status: null, error: new Error("synthetic timeout") },
      { status: null, signal: "SIGTERM" as const },
      { stdout: "" },
      { stdout: "malformed" },
      { stdout: "[]" },
    ])
      expect((await execute([], options)).code).not.toBe(0);
  });
  it("rejects invalid threshold, boolean and quoting before invoking CLI", async () => {
    for (const options of [{ threshold: "hgh" }, { sarif: "yes" }, { args: '"unclosed' }]) {
      const result = await execute([], options);
      expect(result.code).not.toBe(0);
      expect(result.argv).toEqual([]);
    }
  });
  it("uses the canonical SARIF 2.1.0 writer and actual package identity", async () => {
    const { dir } = await execute([finding({ relativePath: "src\\sample.ts" })]);
    const sarif = JSON.parse(await readFile(path.join(dir, "ackit.sarif"), "utf8"));
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].tool.driver.version).toBe(getPackageIdentity().version);
    expect(sarif.runs[0].results[0].locations[0].physicalLocation).toEqual({
      artifactLocation: { uri: "src/sample.ts" },
      region: { startLine: 2, startColumn: 1 },
    });
    expect(await readFile(path.join(dir, "outputs"), "utf8")).toContain("sarif-path=");
  });
  it("does not advertise a SARIF output when it was not produced", async () => {
    const { dir } = await execute([], { sarif: "false" });
    expect(await readFile(path.join(dir, "outputs"), "utf8")).not.toContain("sarif-path=");
    await expect(readFile(path.join(dir, "ackit.sarif"))).rejects.toMatchObject({ code: "ENOENT" });
  });
  it("escapes annotation property delimiters and workflow command newlines", async () => {
    const result = await execute([
      finding({ relativePath: "a,b:c\nfile.txt", message: "first\n::error::fake" }),
    ]);
    expect(result.messages[0]).toContain("file=a%2Cb%3Ac%0Afile.txt");
    expect(result.messages[0]).toContain("first%0A::error::fake");
    expect(result.messages[0]).not.toContain("\n");
  });
  it("passes metacharacters as literal argv, without shell evaluation", async () => {
    const result = await execute([], { args: '"$(echo unsafe)" "; echo unsafe"' });
    expect(result.argv.slice(2, -1)).toEqual(["$(echo unsafe)", "; echo unsafe"]);
    expect(splitActionArgs('--root "directory with spaces"\t--quiet')).toEqual([
      "--root",
      "directory with spaces",
      "--quiet",
    ]);
  });
});
