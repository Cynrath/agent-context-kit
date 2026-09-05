import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { EvidenceRegistry } from "../../../src/core/evidence/index.js";
import { EvidenceStore } from "../../../src/core/evidence/index.js";
import { syncRegistry } from "../../../src/core/evidence/sync.js";
import type { RepositoryRoot } from "../../../src/core/filesystem/root.js";
import { resolveRepositoryRoot } from "../../../src/core/filesystem/root.js";
import { serialize, TaskStore } from "../../../src/core/tasks/index.js";
import { computeStateBinding } from "../../../src/core/verification/binding.js";
import { buildVerificationBundle } from "../../../src/core/verification/bundle.js";
import { VerdictStore } from "../../../src/core/verification/store.js";
import {
  assessVerdictIndependence,
  VERDICT_PROBLEM_CODES,
} from "../../../src/core/verification/verdict.js";

let rootPath = "";
const today = "2026-08-31";

beforeAll(async () => {
  rootPath = await mkdtemp(path.join(tmpdir(), "ackit-verify-"));
  execFileSync("git", ["-C", rootPath, "init", "-q"], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "config", "user.email", "t@example.com"], {
    stdio: "ignore",
  });
  execFileSync("git", ["-C", rootPath, "config", "user.name", "t"], { stdio: "ignore" });
  await writeFile(path.join(rootPath, "README.md"), "# verify fixture\n", "utf8");
  execFileSync("git", ["-C", rootPath, "add", "."], { stdio: "ignore" });
  execFileSync("git", ["-C", rootPath, "commit", "-q", "-m", "init"], { stdio: "ignore" });
});

afterAll(async () => {
  await rm(rootPath, { recursive: true, force: true });
});

function verdictInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaId: "ackit.verdict.v1",
    verdict: "PASS",
    verifier: { agent: "fresh-verifier/1.0", context: "fresh", issuedAt: today },
    findings: [],
    checkedCriteria: ["AC-001", "AC-002"],
    summary: "criteria met with recorded evidence",
    ...overrides,
  };
}

async function resolvedRoot(): Promise<RepositoryRoot> {
  const resolved = await resolveRepositoryRoot(rootPath);
  if (!resolved.ok) throw new Error(resolved.diagnostic.message);
  return resolved.root;
}

async function evidenceRegistryFor(taskId: string): Promise<EvidenceRegistry | null> {
  return new EvidenceStore(await resolvedRoot()).load(taskId);
}

async function bindingFor(taskId: string) {
  return computeStateBinding(rootPath, taskId);
}

/**
 * Registration proof for fresh-context inputs (TASK-0080): the CURRENT
 * binding plus its bundle digest as the reviewed-bundle proof — exactly
 * what the CLI supplies after a `--bundle` match, so unit tests exercise
 * genuinely independent verdicts. Negative independence tests bypass this
 * helper deliberately.
 */
async function proofFor(taskId: string) {
  const binding = await bindingFor(taskId);
  return { binding, reviewedBundleDigest: binding.bundleDigest };
}

async function setupTaskWithEvidence(): Promise<string> {
  const store = new TaskStore(rootPath);
  const created = await store.create("verification fixture");
  const taskId = created.meta.id;
  const found = await store.find(taskId);
  if (found === null) throw new Error("task doc missing before authoring");
  const docAbs = path.join(
    rootPath,
    "docs",
    "tasks",
    "active",
    path.basename(created.relativePath),
  );
  const body = [
    "## Acceptance criteria",
    "",
    "- [ ] Criterion one.",
    "- [ ] Criterion two.",
    "",
    "## Completion notes",
    "",
    "(placeholder)",
  ].join("\n");
  await writeFile(docAbs, serialize(found.doc.meta, body), "utf8");
  const doc = await store.find(taskId);
  if (doc === null) throw new Error("task doc missing after authoring");
  const registry = syncRegistry(doc.doc, null, today);
  const first = registry.criteria[0];
  if (first === undefined) throw new Error("criterion missing after sync");
  first.status = "verified";
  first.evidence = [
    { type: "test", ref: "pnpm vitest run tests/unit (all passed)", recordedAt: today },
  ];
  await new EvidenceStore(await resolvedRoot()).save(taskId, registry);
  return taskId;
}

describe("VerdictStore registration validation (ADR-0026 §4)", () => {
  it("registers a valid PASS verdict with allocated sequential id", async () => {
    const taskId = await setupTaskWithEvidence();
    const verdicts = new VerdictStore(rootPath);
    const registered = await verdicts.register(taskId, verdictInput(), {
      evidenceRegistry: await evidenceRegistryFor(taskId),
      ...(await proofFor(taskId)),
    });
    expect(registered.id).toBe("VR-0001");
    expect(registered.verdict).toBe("PASS");
    const latest = await verdicts.latest(taskId);
    expect(latest?.id).toBe("VR-0001");
  });

  it("MANDATED: REWORK_REQUIRED registers and latest governs (append-only)", async () => {
    const taskId = await setupTaskWithEvidence();
    const verdicts = new VerdictStore(rootPath);
    const registry = await evidenceRegistryFor(taskId);
    const rework = await verdicts.register(
      taskId,
      verdictInput({
        verdict: "REWORK_REQUIRED",
        findings: [
          {
            severity: "blocking",
            criterion: "AC-002",
            code: "REQUIRED_RUNTIME_EVIDENCE_MISSING",
            message: "no runtime evidence for criterion two",
          },
        ],
      }),
      { evidenceRegistry: registry, ...(await proofFor(taskId)) },
    );
    expect(rework.verdict).toBe("REWORK_REQUIRED");
    const pass = await verdicts.register(
      taskId,
      verdictInput({ verdict: "PASS_WITH_WARNINGS", checkedCriteria: ["AC-001", "AC-002"] }),
      { evidenceRegistry: registry, ...(await proofFor(taskId)) },
    );
    const all = await verdicts.list(taskId);
    expect(all.map((v) => v.id)).toEqual(["VR-0001", "VR-0002"]);
    expect((await verdicts.latest(taskId))?.id).toBe(pass.id);
  });

  it("rejects: wrong schemaId, unknown fields, blocking-on-PASS (stable codes)", async () => {
    const taskId = await setupTaskWithEvidence();
    const verdicts = new VerdictStore(rootPath);
    const registry = await evidenceRegistryFor(taskId);
    await expect(
      verdicts.register(taskId, verdictInput({ schemaId: "evil.verdict.v9" }), {
        evidenceRegistry: registry,
        ...(await proofFor(taskId)),
      }),
    ).rejects.toMatchObject({ code: VERDICT_PROBLEM_CODES.schema });
    await expect(
      verdicts.register(taskId, verdictInput({ injected: true }), {
        evidenceRegistry: registry,
        ...(await proofFor(taskId)),
      }),
    ).rejects.toMatchObject({ code: VERDICT_PROBLEM_CODES.schema });
    await expect(
      verdicts.register(
        taskId,
        verdictInput({
          findings: [{ severity: "blocking", criterion: "AC-001", code: "X_FAIL", message: "m" }],
        }),
        { evidenceRegistry: registry, ...(await proofFor(taskId)) },
      ),
    ).rejects.toMatchObject({ code: VERDICT_PROBLEM_CODES.blockingOnPass });
  });

  it("rejects forged criterion references (T18)", async () => {
    const taskId = await setupTaskWithEvidence();
    const verdicts = new VerdictStore(rootPath);
    const registry = await evidenceRegistryFor(taskId);
    await expect(
      verdicts.register(taskId, verdictInput({ checkedCriteria: ["AC-999"] }), {
        evidenceRegistry: registry,
        ...(await proofFor(taskId)),
      }),
    ).rejects.toMatchObject({ code: VERDICT_PROBLEM_CODES.criterionUnknown });
  });

  it("rejects unknown tasks (cross-repository confusion, T21) and bad ids", async () => {
    const verdicts = new VerdictStore(rootPath);
    await expect(
      verdicts.register("TASK-9999", verdictInput(), { taskExists: async () => false }),
    ).rejects.toMatchObject({ code: VERDICT_PROBLEM_CODES.taskUnknown });
    await expect(
      verdicts.register("../escape", verdictInput(), { taskExists: async () => true }),
    ).rejects.toMatchObject({ code: "VERDICT-TASK-ID-INVALID" });
  });

  it("tampered verdict files are rejected on read (T18)", async () => {
    const taskId = await setupTaskWithEvidence();
    const verdicts = new VerdictStore(rootPath);
    const registry = await evidenceRegistryFor(taskId);
    await verdicts.register(taskId, verdictInput(), {
      evidenceRegistry: registry,
      ...(await proofFor(taskId)),
    });
    const file = path.join(rootPath, ".ackit", "workflow", taskId, "verdicts", "VR-0001.yaml");
    const { readFile, writeFile } = await import("node:fs/promises");
    const raw = await readFile(file, "utf8");
    await writeFile(file, `${raw}injected: true\n`, "utf8");
    await expect(verdicts.read(taskId, "VR-0001")).rejects.toMatchObject({
      code: VERDICT_PROBLEM_CODES.schema,
    });
  });
});

describe("verification bundle (ADR-0026 §3)", () => {
  it("builds a bounded deterministic bundle with the mandated material", async () => {
    const taskId = await setupTaskWithEvidence();
    const verdicts = new VerdictStore(rootPath);
    const registry = await evidenceRegistryFor(taskId);
    await verdicts.register(taskId, verdictInput(), {
      evidenceRegistry: registry,
      ...(await proofFor(taskId)),
    });
    const root = await resolvedRoot();
    const first = await buildVerificationBundle(root, taskId);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const md = first.bundle.markdown;
    expect(md).toContain("ackit.verification-bundle.v2");
    expect(md).toContain("You are an INDEPENDENT verifier");
    expect(md).toContain("## Task document");
    expect(md).toContain("## Acceptance criteria + evidence");
    expect(md).toContain("AC-001");
    expect(md).toContain("pnpm vitest run tests/unit");
    expect(md).toContain("## Registered verdicts");
    expect(md).toContain("VR-0001 PASS");
    // Determinism: same state → byte-identical bundle.
    const second = await buildVerificationBundle(root, taskId);
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.bundle.markdown).toBe(md);
    // JSON variant present.
    expect(first.bundle.json).toContain('"task":');
  });

  it("unknown tasks are reported, not thrown", async () => {
    const root = await resolvedRoot();
    const result = await buildVerificationBundle(root, "TASK-9999");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.diagnostic.code).toBe("BUNDLE-TASK-UNKNOWN");
  });
});

describe("verifier independence (TASK-0080, ADR-0031)", () => {
  it("fresh verdict + matching bundle proof registers as independent", async () => {
    const taskId = await setupTaskWithEvidence();
    const verdicts = new VerdictStore(rootPath);
    const registered = await verdicts.register(taskId, verdictInput(), {
      evidenceRegistry: await evidenceRegistryFor(taskId),
      ...(await proofFor(taskId)),
    });
    expect(registered.reviewedBundleDigest).toBe(registered.binding.bundleDigest);
    const assessment = assessVerdictIndependence(registered);
    expect(assessment).toMatchObject({ independent: true, basis: "reviewed-bundle" });
    expect(assessment.problemCode).toBeNull();
    const summary = await verdicts.latestVerdictSummary(taskId);
    expect(summary).toMatchObject({ independent: true, bound: true, fresh: true });
    expect(summary?.independenceCode).toBeNull();
  });

  it("fresh verdict WITHOUT bundle proof is refused (VERDICT-INDEPENDENCE-UNPROVEN)", async () => {
    const taskId = await setupTaskWithEvidence();
    const verdicts = new VerdictStore(rootPath);
    await expect(
      verdicts.register(taskId, verdictInput(), {
        evidenceRegistry: await evidenceRegistryFor(taskId),
        binding: await bindingFor(taskId),
      }),
    ).rejects.toMatchObject({ code: VERDICT_PROBLEM_CODES.independenceUnproven });
    // Refused registrations leave no record behind.
    expect(await verdicts.latest(taskId)).toBeNull();
  });

  it("mismatched reviewed-bundle proof is refused (VERDICT-BUNDLE-MISMATCH)", async () => {
    const taskId = await setupTaskWithEvidence();
    const verdicts = new VerdictStore(rootPath);
    await expect(
      verdicts.register(taskId, verdictInput(), {
        evidenceRegistry: await evidenceRegistryFor(taskId),
        binding: await bindingFor(taskId),
        reviewedBundleDigest: "0".repeat(64),
      }),
    ).rejects.toMatchObject({ code: VERDICT_PROBLEM_CODES.bundleMismatch });
  });

  it("same-context verdict registers without proof but is flagged non-independent", async () => {
    const taskId = await setupTaskWithEvidence();
    const verdicts = new VerdictStore(rootPath);
    const registered = await verdicts.register(
      taskId,
      verdictInput({ verifier: { agent: "implementer/1.0", context: "same", issuedAt: today } }),
      { evidenceRegistry: await evidenceRegistryFor(taskId), binding: await bindingFor(taskId) },
    );
    expect(registered.reviewedBundleDigest).toBeNull();
    expect(assessVerdictIndependence(registered)).toMatchObject({
      independent: false,
      basis: "same-context",
      problemCode: VERDICT_PROBLEM_CODES.independenceUnproven,
    });
    const summary = await verdicts.latestVerdictSummary(taskId);
    expect(summary).toMatchObject({ independent: false, fresh: true });
    expect(summary?.independenceCode).toBe(VERDICT_PROBLEM_CODES.independenceUnproven);
  });

  it("replayed verdict content is refused (VERDICT-REPLAY-REJECTED)", async () => {
    const taskId = await setupTaskWithEvidence();
    const verdicts = new VerdictStore(rootPath);
    const registry = await evidenceRegistryFor(taskId);
    await verdicts.register(taskId, verdictInput(), {
      evidenceRegistry: registry,
      ...(await proofFor(taskId)),
    });
    // Byte-identical content re-presented (even with a fresh proof — state
    // is unchanged so the proof matches) is replay, not re-verification.
    await expect(
      verdicts.register(taskId, verdictInput(), {
        evidenceRegistry: registry,
        ...(await proofFor(taskId)),
      }),
    ).rejects.toMatchObject({ code: VERDICT_PROBLEM_CODES.replayRejected });
    // New judged content (distinct summary) registers as the next id.
    const second = await verdicts.register(taskId, verdictInput({ summary: "second review" }), {
      evidenceRegistry: registry,
      ...(await proofFor(taskId)),
    });
    expect(second.id).toBe("VR-0002");
  });

  it("replay is detected across state change (old judgment cannot launder a new binding)", async () => {
    const taskId = await setupTaskWithEvidence();
    const verdicts = new VerdictStore(rootPath);
    const registry = await evidenceRegistryFor(taskId);
    await verdicts.register(taskId, verdictInput(), {
      evidenceRegistry: registry,
      ...(await proofFor(taskId)),
    });
    // State moves on; the attacker re-presents the old verdict file. The
    // fresh binding would differ, but the CONTENT digest matches VR-0001.
    const { writeFile: wf } = await import("node:fs/promises");
    const probe = (await import("node:path")).join(rootPath, `src-replay-80-${taskId.slice(5)}.js`);
    await wf(probe, "export const replay = true;\n", "utf8");
    try {
      await expect(
        verdicts.register(taskId, verdictInput(), {
          evidenceRegistry: registry,
          binding: await bindingFor(taskId),
          reviewedBundleDigest: (await bindingFor(taskId)).bundleDigest,
        }),
      ).rejects.toMatchObject({ code: VERDICT_PROBLEM_CODES.replayRejected });
    } finally {
      const { unlink } = await import("node:fs/promises");
      await unlink(probe);
    }
  });

  it("legacy unbound verdicts classify as non-independent (VERDICT-BINDING-MISSING)", async () => {
    const taskId = await setupTaskWithEvidence();
    const { stringify } = await import("yaml");
    const { mkdir: mk, writeFile: wf } = await import("node:fs/promises");
    const taskPath = (await import("node:path")).join(
      rootPath,
      ".ackit",
      "workflow",
      taskId,
      "verdicts",
    );
    await mk(taskPath, { recursive: true });
    await wf(
      (await import("node:path")).join(taskPath, "VR-0001.yaml"),
      stringify({ ...(verdictInput() as Record<string, unknown>), id: "VR-0001", taskId }),
      "utf8",
    );
    const verdicts = new VerdictStore(rootPath);
    const latest = await verdicts.latest(taskId);
    if (latest === null) throw new Error("legacy record missing");
    expect(assessVerdictIndependence(latest)).toMatchObject({
      independent: false,
      basis: "legacy-unbound",
      problemCode: VERDICT_PROBLEM_CODES.bindingMissing,
    });
  });
});
