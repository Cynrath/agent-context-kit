import type { RepositoryRoot } from "../filesystem/root.js";
import { collectScanTargets } from "../filesystem/scan-targets.js";
import { DEFAULT_CONCURRENCY } from "../filesystem/types.js";
import { computeFingerprint, redactEvidence } from "./redact.js";
import type { Finding, FindingDraft, ScanDiagnostic, ScanResult, ScanRule } from "./types.js";
import { FindingSchema } from "./types.js";

export interface ScanPipelineOptions {
  rules: readonly ScanRule[];
  limits?: import("../filesystem/types.js").TraversalLimits | undefined;
  userExcludeGlobs?: readonly string[] | undefined;
  signal?: AbortSignal | undefined;
  /** Batch size for file evaluation (deterministic order preserved). */
  concurrency?: number | undefined;
}

interface LineColumn {
  line: number;
  column: number;
}

/**
 * Scan pipeline (REQ-SCAN-001): discovery → ignore/filter → text/binary →
 * bounded parallel rule evaluation → normalize (redact at construction) →
 * fingerprint → deterministic sort (relativePath → ruleId → line → column).
 * Cancellation keeps the result structurally valid with aborted=true.
 */
export async function runScan(
  root: RepositoryRoot,
  options: ScanPipelineOptions,
): Promise<ScanResult> {
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
  const diagnostics: ScanDiagnostic[] = [];
  const findings: Finding[] = [];
  let filesScanned = 0;
  let aborted = false;

  const collection = await collectScanTargets(root, {
    limits: options.limits,
    userExcludeGlobs: options.userExcludeGlobs,
  });
  diagnostics.push(...collection.diagnostics);
  if (options.signal?.aborted) {
    return { findings, diagnostics, filesScanned, aborted: true };
  }

  const textTargets = collection.targets.filter((target) => target.kind === "text");

  for (let offset = 0; offset < textTargets.length; offset += concurrency) {
    if (options.signal?.aborted) {
      aborted = true;
      break;
    }
    const batch = textTargets.slice(offset, offset + concurrency);
    const batchResults = await Promise.all(
      batch.map((target) => evaluateTarget(target, options.rules)),
    );
    for (const result of batchResults) {
      filesScanned += 1;
      findings.push(...result.findings);
      diagnostics.push(...result.diagnostics);
    }
  }

  if (options.signal?.aborted && !aborted) {
    aborted = true;
  }

  sortFindings(findings);
  return { findings, diagnostics, filesScanned, aborted };
}

function sortFindings(findings: Finding[]): void {
  findings.sort((a, b) => {
    if (a.relativePath !== b.relativePath) return a.relativePath < b.relativePath ? -1 : 1;
    if (a.ruleId !== b.ruleId) return a.ruleId < b.ruleId ? -1 : 1;
    if (a.line !== b.line) return a.line - b.line;
    return a.column - b.column;
  });
}

async function evaluateTarget(
  target: { relativePath: string; absolutePath: string; kind: string },
  rules: readonly ScanRule[],
): Promise<{ findings: Finding[]; diagnostics: ScanDiagnostic[] }> {
  const findings: Finding[] = [];
  const diagnostics: ScanDiagnostic[] = [];
  let content: string;
  try {
    const raw = await import("node:fs/promises");
    const buffer = await raw.readFile(target.absolutePath);
    content = buffer.toString("utf8");
  } catch (error) {
    diagnostics.push({
      code: "SCAN-READ-FAILED",
      message: `cannot read file for evaluation: ${(error as Error).message}`,
      relativePath: target.relativePath,
    });
    return { findings, diagnostics };
  }
  for (const rule of rules) {
    if (!rule.appliesTo(target.relativePath)) continue;
    let drafts: FindingDraft[];
    try {
      drafts = rule.evaluate({ relativePath: target.relativePath, content });
    } catch (error) {
      diagnostics.push({
        code: "SCAN-RULE-FAILED",
        message: `rule ${rule.id} failed: ${(error as Error).message}`,
        relativePath: target.relativePath,
      });
      continue;
    }
    for (const draft of drafts) {
      const position = offsetToLineColumn(content, draft.offset);
      const evidence = redactEvidence(draft.rawEvidence);
      const relativePath = target.relativePath;
      findings.push(
        FindingSchema.parse({
          ruleId: draft.ruleId,
          severity: draft.severity,
          category: draft.category,
          message: draft.message,
          relativePath,
          line: position.line,
          column: position.column,
          fingerprint: computeFingerprint({
            ruleId: draft.ruleId,
            relativePath,
            line: position.line,
            column: position.column,
            redactedEvidence: evidence,
          }),
          evidence,
          remediation: draft.remediation,
          documentationKey: draft.documentationKey,
          suppressed: false,
          suppressionReason: null,
        }),
      );
    }
  }
  return { findings, diagnostics };
}

function offsetToLineColumn(content: string, offset: number): LineColumn {
  const clamped = Math.max(0, Math.min(offset, content.length));
  let line = 1;
  let column = 1;
  for (let index = 0; index < clamped; index += 1) {
    if (content.charCodeAt(index) === 10) {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}
