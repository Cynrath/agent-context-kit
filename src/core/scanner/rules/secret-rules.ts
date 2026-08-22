import type { ScanRule } from "../types.js";
import { iterLines } from "./shared.js";

/**
 * Secret detection family (REQ-SCAN-005). Confidence tiers keep the
 * false-positive budget sane: exact token shapes are critical, generic
 * assignments high, entropy-assisted advisory-medium. Evidence is always
 * redacted downstream by the pipeline before any reporter sees it.
 */

const HIGH_CONFIDENCE_TOKENS: readonly { pattern: RegExp; label: string }[] = [
  { pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/, label: "AWS access key id" },
  { pattern: /\bghp_[A-Za-z0-9]{36}\b/, label: "GitHub personal access token" },
  { pattern: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/, label: "GitHub fine-grained token" },
  { pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/, label: "secret-style API key (sk-…)" },
  { pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, label: "Slack token" },
  { pattern: /\bglpat-[A-Za-z0-9_-]{20,}\b/, label: "GitLab personal access token" },
  { pattern: /\bAIza[0-9A-Za-z_-]{35}\b/, label: "Google API key" },
];

export const ackit001TokenFormats: ScanRule = {
  id: "ACKIT001",
  category: "secrets",
  severity: "critical",
  documentationKey: "rules/ACKIT001",
  remediation:
    "Revoke and rotate the credential, then move it to a secret manager or environment injection. Purge history if it was committed.",
  appliesTo: () => true,
  evaluate({ content }) {
    const drafts = [];
    for (const view of iterLines(content)) {
      for (const token of HIGH_CONFIDENCE_TOKENS) {
        const match = token.pattern.exec(view.text);
        if (match !== null && match[0] !== undefined) {
          drafts.push({
            ruleId: this.id,
            severity: this.severity,
            category: this.category,
            message: `possible ${token.label} detected`,
            offset: offsetOfLine(content, view.lineNumber) + (match.index ?? 0),
            rawEvidence: match[0],
            remediation: this.remediation,
            documentationKey: this.documentationKey,
          });
        }
      }
    }
    return drafts;
  },
};

const PRIVATE_KEY_PATTERN =
  /-----BEGIN [A-Z ]*PRIVATE KEY( BLOCK)?-----[\s\S]{0,400}?-----END [A-Z ]*PRIVATE KEY( BLOCK)?-----/;

export const ackit002PrivateKeyBlock: ScanRule = {
  id: "ACKIT002",
  category: "secrets",
  severity: "critical",
  documentationKey: "rules/ACKIT002",
  remediation:
    "Remove the embedded private key, rotate the key pair, and store the new key outside the repository.",
  appliesTo: () => true,
  evaluate({ content, relativePath }) {
    const match = PRIVATE_KEY_PATTERN.exec(content);
    if (match === null || match[0] === undefined) return [];
    return [
      {
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: "private key block embedded in file",
        offset: match.index ?? 0,
        rawEvidence: firstLine(match[0]),
        remediation: this.remediation,
        documentationKey: this.documentationKey,
      },
    ];
    function firstLine(block: string): string {
      void relativePath;
      return block.split(/\r?\n/)[0] ?? block;
    }
  },
};

export const GENERIC_ASSIGNMENT =
  /\b(pass(word|wd)?|secret|api[-_]?key|auth[-_]?token|client[-_]?secret|access[-_]?key)\b\s*[:=]\s*(?:"([^"\s]{6,})"|'([^'\s]{6,})'|([^\s"'#]{6,}))/i;

export const ackit003GenericCredentialAssignment: ScanRule = {
  id: "ACKIT003",
  category: "secrets",
  severity: "high",
  documentationKey: "rules/ACKIT003",
  remediation:
    "Replace literal credentials with environment variables or a secret manager; add the value to .gitignore-backed storage.",
  appliesTo: () => true,
  evaluate({ content }) {
    const drafts = [];
    for (const view of iterLines(content)) {
      const match = GENERIC_ASSIGNMENT.exec(view.text);
      if (match !== null) {
        const valueGroup = match[3] ?? match[4] ?? match[5] ?? "";
        drafts.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: "credential-like assignment with literal value",
          offset: offsetOfLine(content, view.lineNumber) + (match.index ?? 0),
          rawEvidence:
            valueGroup.length >= 6 ? `${match[1] ?? "key"}=${valueGroup}` : view.text.trim(),
          remediation: this.remediation,
          documentationKey: this.documentationKey,
        });
      }
    }
    return drafts;
  },
};

const CONNECTION_STRING =
  /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/"']+:[^\s@/"']+@[^\s"']+/i;

export const ackit004ConnectionString: ScanRule = {
  id: "ACKIT004",
  category: "secrets",
  severity: "high",
  documentationKey: "rules/ACKIT004",
  remediation:
    "Move connection strings with inline credentials to configuration injected at deploy time; rotate the exposed password.",
  appliesTo: () => true,
  evaluate({ content }) {
    const drafts = [];
    for (const view of iterLines(content)) {
      const match = CONNECTION_STRING.exec(view.text);
      if (match !== null && match[0] !== undefined) {
        drafts.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: "connection string with embedded credentials",
          offset: offsetOfLine(content, view.lineNumber) + (match.index ?? 0),
          rawEvidence: match[0],
          remediation: this.remediation,
          documentationKey: this.documentationKey,
        });
      }
    }
    return drafts;
  },
};

const ENTROPY_VALUE = /(["']?)([A-Za-z0-9+/=_-]{32,})(\1)\s*;/;

export const ackit005EntropyAssisted: ScanRule = {
  id: "ACKIT005",
  category: "secrets",
  severity: "medium",
  documentationKey: "rules/ACKIT005",
  remediation:
    "Confirm whether the long random-looking literal is a secret; if yes treat like ACKIT003, otherwise restructure for clarity.",
  appliesTo: () => true,
  evaluate({ content }) {
    const drafts = [];
    for (const view of iterLines(content)) {
      const match = ENTROPY_VALUE.exec(view.text);
      if (match !== null && match[2] !== undefined && looksHighEntropy(match[2])) {
        drafts.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: "high-entropy quoted literal may be a secret (advisory confidence)",
          offset: offsetOfLine(content, view.lineNumber) + (match.index ?? 0),
          rawEvidence: match[2],
          remediation: this.remediation,
          documentationKey: this.documentationKey,
        });
      }
    }
    return drafts;
  },
};

function looksHighEntropy(value: string): boolean {
  const unique = new Set(value.toLowerCase()).size;
  const hasDigit = /[0-9]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasLower = /[a-z]/.test(value);
  return unique >= 16 && (hasDigit ? 1 : 0) + (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) >= 2;
}

function offsetOfLine(content: string, lineNumber: number): number {
  let offset = 0;
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lineNumber - 1 && index < lines.length; index += 1) {
    offset += (lines[index]?.length ?? 0) + 1;
  }
  return offset;
}
