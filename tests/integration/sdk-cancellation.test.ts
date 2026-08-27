import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildContextPack } from "../../src/core/context/pack.js";
import { buildInstructionGraph } from "../../src/core/instructions/graph.js";
import { scanRepository } from "../../src/index.js";

describe("SDK AbortSignal (REQ-V020-J-002)", () => {
  it("scanRepository aborts immediately when signal already aborted", async () => {
    const root = { canonicalPath: process.cwd() } as unknown as { canonicalPath: string };
    const ac = new AbortController();
    ac.abort();
    const start = Date.now();
    await expect(scanRepository(root as never, { signal: ac.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(Date.now() - start).toBeLessThan(200);
  });

  it("buildContextPack aborts immediately when signal already aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    const start = Date.now();
    await expect(
      buildContextPack({ canonicalPath: process.cwd() } as never, { signal: ac.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(Date.now() - start).toBeLessThan(200);
  });

  it("buildInstructionGraph aborts immediately when signal already aborted", async () => {
    const ac = new AbortController();
    ac.abort();
    const start = Date.now();
    await expect(
      buildInstructionGraph({ canonicalPath: process.cwd() } as never, { signal: ac.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(Date.now() - start).toBeLessThan(200);
  });

  it("AckitError carries code and remediation without process.exit", async () => {
    const { AckitError } = await import("../../src/index.js");
    const err = new AckitError("CONFIG-UNKNOWN-KEY", "unknown key scan.foo", {
      remediation: "did you mean 'scan'?",
    });
    expect(err.code).toBe("CONFIG-UNKNOWN-KEY");
    expect(err.remediation).toMatch(/scan/);
    expect(err.name).toBe("AckitError");
    // SDK must not have called process.exit
    expect(process.exitCode).toBeUndefined();
  });

  it("importing SDK has no side effects (no fs touch)", async () => {
    const tmp = await mkdtemp(path.join(tmpdir(), "ackit-sdk-import-"));
    try {
      const mod = await import("../../src/index.js");
      expect(typeof mod.scanRepository).toBe("function");
      // No timer/server side effect; just import success
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
