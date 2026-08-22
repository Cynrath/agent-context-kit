/**
 * Deterministic, provider-independent token estimator (REQ-CTX-002).
 * Labeled an estimate everywhere it is surfaced; a tokenizer adapter seam
 * may replace the implementation later without changing call sites.
 *
 * Formula: ~4 characters per token, with CJK-heavy text corrected upward
 * (~1.5 characters per token). No network, no model access.
 */
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0;
  let cjk = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xac00 && code <= 0xd7af) ||
      (code >= 0x3000 && code <= 0x303f)
    ) {
      cjk += 1;
    }
  }
  const latinChars = text.length - cjk;
  return Math.ceil(latinChars / 4 + cjk / 1.5);
}
