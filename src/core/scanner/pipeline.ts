import type { RepositoryRoot } from "../filesystem/root.js";
import { collectScanTargets } from "../filesystem/scan-targets.js";
import { DEFAULT_CONCURRENCY } from "../filesystem/types.js";
import { computeFingerprint, redactEvidence } from "./redact.js";
import { SUPPRESSION_ADVISORY_ID } from "./rules/catalog.js";
import { collectSuppressions } from "./rules/shared.js";
import type { Finding, FindingDraft, ScanDiagnostic, ScanResult, ScanRule } from "./types.js";
import { FindingSchema } from "./types.js";

export interface ScanPipelineOptions {
  rules: readonly ScanRule[];
  limits?: import("../filesystem/types.js").TraversalLimits | undefined;
  userExcludeGlobs?: readonly string[] | undefined;
  signal?: AbortSignal | undefined;
  /** Batch size for file evaluation (deterministic order preserved). */
  concurrency?: number | undefined;
  /** Incremental mode: restrict evaluation to these repo-relative paths. */
  filterPaths?: ReadonlySet<string> | undefined;
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
  const filterPaths = options.filterPaths;
  const inFilter = (relativePath: string): boolean =>
    filterPaths === undefined || filterPaths.size === 0 || filterPaths.has(relativePath);

  // Binary-classified files are skipped by design; the decision is surfaced
  // as a diagnostic instead of silence (classifier owns the call, REQ-FS-004).
  for (const target of collection.targets) {
    if (target.kind !== "text" && inFilter(target.relativePath)) {
      diagnostics.push({
        code: "SCAN-BINARY-SKIPPED",
        message:
          "file classified as binary by content sniffing; text rules not applied (unknown extensions are always content-scanned)",
        relativePath: target.relativePath,
      });
    }
  }
  if (options.signal?.aborted) {
    return { findings, diagnostics, filesScanned, aborted: true };
  }

  const textTargets = collection.targets.filter(
    (target) => target.kind === "text" && inFilter(target.relativePath),
  );

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
      const suppression = findSuppression(content, draft.ruleId, position.line);
      const finding = FindingSchema.parse({
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
        suppressed: suppression !== null,
        suppressionReason:
          suppression !== null ? `inline ackit-ignore on line ${suppression.line}` : null,
      });
      findings.push(finding);
      if (suppression !== null) {
        // Every applied bypass is itself a visible, non-suppressible advisory.
        findings.push(
          FindingSchema.parse({
            ruleId: SUPPRESSION_ADVISORY_ID,
            severity: "low",
            category: "hygiene",
            message: `finding ${draft.ruleId} suppressed via inline marker; verify the reason is still valid`,
            relativePath,
            line: suppression.line,
            column: 1,
            fingerprint: computeFingerprint({
              ruleId: SUPPRESSION_ADVISORY_ID,
              relativePath,
              line: suppression.line,
              column: 1,
              redactedEvidence: `suppressed:${draft.ruleId}`,
            }),
            evidence: `ackit-ignore:${draft.ruleId}`,
            remediation:
              "Remove the stale ackit-ignore marker once the underlying finding is resolved.",
            documentationKey: "rules/ACKIT099",
            suppressed: false,
            suppressionReason: null,
          }),
        );
      }
    }
  }
  return { findings, diagnostics };
}

function findSuppression(
  content: string,
  ruleId: string,
  lineNumber: number,
): { line: number } | null {
  if (ruleId === SUPPRESSION_ADVISORY_ID) return null;
  const map = collectSuppressions(content);
  const occurrences = map.get(ruleId.toUpperCase());
  if (occurrences === undefined) return null;
  for (const occurrence of occurrences) {
    if (occurrence.line === lineNumber || occurrence.line === lineNumber - 1) {
      return { line: occurrence.line };
    }
  }
  return null;
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
