import { createHash } from "node:crypto";

const MARKDOWN_LINK_PATTERN = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export interface ReferenceScan {
  references: string[];
  securityFlags: string[];
}

const HIDDEN_CHARACTERS = /[\u200B-\u200F\u2060-\u2064\uFEFF]/;

/**
 * Extracts markdown-style link targets and classifies security-relevant
 * content (REQ-SCAN-006 inputs for TASK-0273): external links, hidden
 * unicode, and repository-root escapes.
 */
export function scanReferences(input: {
  relativePath: string;
  content: string;
  isInsideRoot(target: string): boolean;
}): ReferenceScan {
  const references = new Set<string>();
  const securityFlags = new Set<string>();
  for (const match of input.content.matchAll(MARKDOWN_LINK_PATTERN)) {
    const target = match[1];
    if (target === undefined) continue;
    references.add(target);
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(target)) {
      securityFlags.add("external-link");
      continue;
    }
    const resolved = resolvePosix(input.relativePath, target);
    if (resolved.escapedRoot || (resolved.value !== null && !input.isInsideRoot(resolved.value))) {
      securityFlags.add("root-escape-reference");
    }
  }
  if (HIDDEN_CHARACTERS.test(input.content)) {
    securityFlags.add("hidden-unicode");
  }
  return { references: [...references].sort(), securityFlags: [...securityFlags].sort() };
}

/** Resolves a relative markdown target against its containing file. */
function resolvePosix(
  fromRelativePath: string,
  target: string,
): { value: string | null; escapedRoot: boolean } {
  if (target.startsWith("/")) return { value: null, escapedRoot: false };
  const segments: string[] = [];
  let escapedRoot = false;
  const baseParts = fromRelativePath.split("/").slice(0, -1);
  for (const part of [...baseParts, ...target.split("/")]) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (segments.length === 0) {
        escapedRoot = true;
        continue;
      }
      segments.pop();
      continue;
    }
    segments.push(part);
  }
  return { value: segments.join("/"), escapedRoot };
}

export function checksumContent(content: Buffer | string): string {
  return createHash("sha256").update(content).digest("hex");
}
