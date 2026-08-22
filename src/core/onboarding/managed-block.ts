export interface ManagedBlockResult {
  output: string;
  action: "created" | "updated" | "unchanged" | "repaired";
}

function blockStart(provider: string): string {
  return `<!-- ackit:managed:start (${provider}) -->`;
}

function blockEnd(provider: string): string {
  return `<!-- ackit:managed:end (${provider}) -->`;
}

/**
 * Managed-block engine (REQ-INSTR-008): ACKit owns ONLY the text between its
 * start/end markers; everything else is preserved byte-for-byte. Idempotent,
 * repairs duplicate legacy blocks to a single canonical block, and appends
 * rather than overwrites.
 */
export function ensureManagedBlock(
  existing: string | null,
  provider: string,
  innerContent: string,
): ManagedBlockResult {
  const start = blockStart(provider);
  const end = blockEnd(provider);
  const canonicalBlock = `${start}\n${innerContent.trim()}\n${end}`;

  if (existing === null || existing.trim().length === 0) {
    return { output: `${canonicalBlock}\n`, action: "created" };
  }

  // Find every complete pair for this provider.
  const spans: Array<{ from: number; to: number }> = [];
  let searchFrom = 0;
  while (true) {
    const from = existing.indexOf(start, searchFrom);
    if (from === -1) break;
    const toCandidate = existing.indexOf(end, from);
    if (toCandidate === -1) break;
    const to = toCandidate + end.length;
    spans.push({ from, to });
    searchFrom = to;
  }

  if (spans.length === 0) {
    return {
      output: `${existing.replace(/\s+$/, "")}\n\n${canonicalBlock}\n`,
      action: "updated",
    };
  }

  // Canonical replacement for the LAST span; earlier spans are removed.
  const last = spans[spans.length - 1];
  if (last === undefined) {
    return { output: `${existing.replace(/\s+$/, "")}\n\n${canonicalBlock}\n`, action: "updated" };
  }
  const currentInner = existing.slice(last.from + start.length, last.to - end.length).trim();
  let output = "";
  let cursor = 0;
  for (const span of spans.slice(0, -1)) {
    output += existing.slice(cursor, span.from);
    cursor = span.to;
  }
  output += existing.slice(cursor, last.from);
  output += canonicalBlock;
  output += existing.slice(last.to);

  const normalizedOutput = normalizeTrailingNewlines(output);
  if (spans.length > 1) {
    return { output: normalizedOutput, action: "repaired" };
  }
  const changed = currentInner !== innerContent.trim();
  return {
    output: normalizedOutput,
    action: changed ? "updated" : "unchanged",
  };
}

/** True when the file contains a complete managed block for the provider. */
export function hasManagedBlock(content: string, provider: string): boolean {
  return content.includes(blockStart(provider)) && content.includes(blockEnd(provider));
}

function normalizeTrailingNewlines(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}
