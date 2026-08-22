import type { ScanCategory, Severity } from "../types.js";

export interface LineView {
  readonly lineNumber: number;
  readonly text: string;
}

export function* iterLines(content: string): Generator<LineView> {
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    yield { lineNumber: index + 1, text: lines[index] ?? "" };
  }
}

export function lineAt(content: string, lineNumber: number): string {
  const lines = content.split(/\r?\n/);
  return lines[lineNumber - 1] ?? "";
}

/**
 * Inline suppression contract (ADR-0009, MS§12.4): a comment containing
 * `ackit-ignore:ACKITnnn[,ACKITmmm]` on the finding's line or the line above
 * marks matching findings suppressed. Every applied suppression ALSO emits a
 * visible advisory (ACKIT099) so silent silencing is impossible; the
 * advisory itself cannot be suppressed.
 */
export const SUPPRESSION_PATTERN = /ackit-ignore:\s*([A-Z0-9][A-Z0-9,\s]*)/i;

export function collectSuppressions(
  content: string,
): Map<string, Set<{ line: number; raw: string }>> {
  const map = new Map<string, Set<{ line: number; raw: string }>>();
  const lines = [...iterLines(content)];
  const record = (ruleId: string, line: number, raw: string): void => {
    const upper = ruleId.toUpperCase();
    if (!/^ACKIT\d{3}$/.test(upper)) return;
    const set = map.get(upper) ?? new Set();
    set.add({ line, raw });
    map.set(upper, set);
  };
  for (const view of lines) {
    const match = SUPPRESSION_PATTERN.exec(view.text);
    if (match !== null && match[1] !== undefined) {
      for (const ruleId of match[1].split(/[\s,]+/)) {
        if (ruleId.length > 0) record(ruleId, view.lineNumber, view.text.trim());
      }
    }
  }
  // A marker on line N applies to findings reported on N and N+1.
  const expanded = new Map<string, Set<{ line: number; raw: string }>>();
  for (const [ruleId, occurrences] of map) {
    expanded.set(ruleId, new Set(occurrences));
  }
  for (const [ruleId, occurrences] of map) {
    for (const occurrence of [...occurrences]) {
      const set = expanded.get(ruleId) ?? new Set<{ line: number; raw: string }>();
      set.add({ line: occurrence.line + 1, raw: occurrence.raw });
      expanded.set(ruleId, set);
    }
  }
  return expanded;
}

export interface RuleMetadataInput {
  id: string;
  title: string;
  category: ScanCategory;
  severity: Severity;
  documentationKey: string;
}
