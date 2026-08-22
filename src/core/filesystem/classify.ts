/**
 * Content-based text/binary classification (REQ-FS-004).
 *
 * File extensions are deliberately NOT consulted here: known extensions are
 * at most a hint in the product, and unknown-extension files must never be
 * excluded from scanning. Classification is therefore always content-based:
 *
 * - UTF-8/16/32 BOMs classify as text.
 * - A NUL byte classifies as binary.
 * - Otherwise the ratio of suspicious control bytes (C0 controls except
 *   TAB/LF/CR, plus DEL) over the sampled header decides; bytes >= 0x80 count
 *   as printable so valid UTF-8/UTF-16 text is not misclassified.
 */
export const CLASSIFICATION_HEADER_BYTES = 8192;

const TEXT_BOMS: readonly number[][] = [
  [0xef, 0xbb, 0xbf],
  [0xff, 0xfe, 0x00, 0x00],
  [0x00, 0x00, 0xfe, 0xff],
  [0xff, 0xfe],
  [0xfe, 0xff],
];

export type ContentKind = "text" | "binary";

const SUSPICIOUS_RATIO_THRESHOLD = 0.06;

export function classifyContent(header: Buffer): ContentKind {
  if (header.length === 0) {
    return "text";
  }
  for (const bom of TEXT_BOMS) {
    if (header.length >= bom.length && bom.every((byte, index) => header[index] === byte)) {
      return "text";
    }
  }
  let suspicious = 0;
  for (const byte of header) {
    if (byte === 0) {
      return "binary";
    }
    const isControl = byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d;
    if (isControl || byte === 0x7f) {
      suspicious += 1;
    }
  }
  return suspicious / header.length > SUSPICIOUS_RATIO_THRESHOLD ? "binary" : "text";
}
