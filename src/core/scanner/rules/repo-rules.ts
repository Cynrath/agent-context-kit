import { estimateTokens } from "../../../shared/tokens.js";
import type { ScanRule } from "../types.js";
import { iterLines } from "./shared.js";

/** ACKIT010: absolute local path leakage in tracked text (REQ-GOV-004 family). */
export const ackit010AbsolutePathLeakage: ScanRule = {
  id: "ACKIT010",
  category: "absolute-path-leak",
  severity: "medium",
  documentationKey: "rules/ACKIT010",
  remediation: "Replace absolute local paths with repository-relative or portable references.",
  appliesTo: (relativePath) => /\.(md|txt|yml|yaml|json|ts|js|mjs|cjs)$/i.test(relativePath),
  evaluate({ content }) {
    const drafts = [];
    const patterns: readonly { pattern: RegExp; label: string }[] = [
      {
        pattern: /\b[A-Z]:\\(?:Users|Documents and Settings)\\[^\s"')]+/g,
        label: "Windows user profile path",
      },
      { pattern: /\/home\/[^\s/"')]+\/[^\s"')]+/g, label: "POSIX home path" },
      { pattern: /\/Users\/[^\s/"')]+\/[^\s"')]+/g, label: "macOS home path" },
    ];
    for (const view of iterLines(content)) {
      for (const entry of patterns) {
        const match = entry.pattern.exec(view.text);
        entry.pattern.lastIndex = 0;
        if (match !== null && match[0] !== undefined) {
          drafts.push({
            ruleId: this.id,
            severity: this.severity,
            category: this.category,
            message: `${entry.label} leaked into tracked content`,
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

/** ACKIT020: hygiene markers. */
export const ackit020TodoMarkers: ScanRule = {
  id: "ACKIT020",
  category: "hygiene",
  severity: "low",
  documentationKey: "rules/ACKIT020",
  remediation: "Resolve the marker or link it to a tracked task under docs/tasks/.",
  appliesTo: () => true,
  evaluate({ content }) {
    const drafts = [];
    const pattern = /\b(TODO|FIXME|HACK)\b[:\s]/;
    for (const view of iterLines(content)) {
      const match = pattern.exec(view.text);
      if (match !== null && match[0] !== undefined) {
        drafts.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: `unresolved ${match[1] ?? "work"} marker`,
          offset: offsetOfLine(content, view.lineNumber) + (match.index ?? 0),
          rawEvidence: view.text.trim().slice(0, 80),
          remediation: this.remediation,
          documentationKey: this.documentationKey,
        });
      }
    }
    return drafts;
  },
};

/** ACKIT040: oversized instruction/context markdown (REQ-CTX budget pressure). */
export const ackit040LargeContextFile: ScanRule = {
  id: "ACKIT040",
  category: "large-context-file",
  severity: "low",
  documentationKey: "rules/ACKIT040",
  remediation: "Split the document or move detail into referenced files loaded on demand.",
  appliesTo: (relativePath) =>
    /(^|\/)[^/]+\.md$/i.test(relativePath) && !relativePath.startsWith("docs/tasks/archive"),
  evaluate({ content }) {
    const tokens = estimateTokens(content);
    if (tokens <= 8000) return [];
    return [
      {
        ruleId: this.id,
        severity: this.severity,
        category: this.category,
        message: `context-heavy file (~${tokens} estimated tokens)`,
        offset: 0,
        rawEvidence: content.split(/\r?\n/, 1)[0]?.slice(0, 60) ?? "",
        remediation: this.remediation,
        documentationKey: this.documentationKey,
      },
    ];
  },
};

/** ACKIT050: config schema drift visible to scan (ackit.yml). */
export const ackit050ConfigSchemaProblem: ScanRule = {
  id: "ACKIT050",
  category: "config-problem",
  severity: "high",
  documentationKey: "rules/ACKIT050",
  remediation: "Set schemaVersion to the supported major and run `ackit config check`.",
  appliesTo: (relativePath) => relativePath === "ackit.yml",
  evaluate({ content }) {
    const versionLine = (() => {
      for (const view of iterLines(content)) {
        if (/^schemaVersion\s*:/.test(view.text)) return view;
      }
      return undefined;
    })();
    if (versionLine === undefined) {
      return [draft(this, 0, "ackit.yml missing schemaVersion", firstLine(content))];
    }
    const value = Number.parseInt(
      /^\s*schemaVersion\s*:\s*(\d+)/.exec(versionLine.text)?.[1] ?? "0",
      10,
    );
    if (value !== 1) {
      return [
        draft(
          this,
          offsetOfLine(content, versionLine.lineNumber),
          `unsupported schemaVersion ${value}`,
          versionLine.text.trim(),
        ),
      ];
    }
    return [];
    function firstLine(text: string): string {
      return text.split(/\r?\n/, 1)[0]?.slice(0, 60) ?? "";
    }
  },
};

/** ACKIT070: CI workflow actions not pinned to immutable SHAs (REQ-SEC-004 input). */
export const ackit070UnpinnedAction: ScanRule = {
  id: "ACKIT070",
  category: "ci-release-hygiene",
  severity: "medium",
  documentationKey: "rules/ACKIT070",
  remediation: "Pin third-party actions to full commit SHAs with a version comment.",
  appliesTo: (relativePath) =>
    relativePath.startsWith(".github/workflows/") && /\.ya?ml$/.test(relativePath),
  evaluate({ content }) {
    const drafts = [];
    const pattern = /^\s*-?\s*uses:\s*([^\s@]+)@([^\s]+)/;
    for (const view of iterLines(content)) {
      const match = pattern.exec(view.text);
      if (match !== null) {
        const ref = match[2] ?? "";
        if (!/^[0-9a-f]{40}$/.test(ref)) {
          drafts.push({
            ruleId: this.id,
            severity: this.severity,
            category: this.category,
            message: `action '${match[1] ?? ""}' pinned to mutable ref '${ref}'`,
            offset: offsetOfLine(content, view.lineNumber) + (match.index ?? 0),
            rawEvidence: view.text.trim(),
            remediation: this.remediation,
            documentationKey: this.documentationKey,
          });
        }
      }
    }
    return drafts;
  },
};

/** ACKIT080: floating dependency sources. */
export const ackit080FloatingDependency: ScanRule = {
  id: "ACKIT080",
  category: "dependency-advisory",
  severity: "medium",
  documentationKey: "rules/ACKIT080",
  remediation:
    "Use exact versions or caret ranges resolved by a committed lockfile; avoid git/tag floats.",
  appliesTo: (relativePath) => relativePath === "package.json",
  evaluate({ content }) {
    const drafts = [];
    let inDependencies = false;
    for (const view of iterLines(content)) {
      if (/"[^"]+":\s*\{/.test(view.text)) {
        inDependencies = true;
        continue;
      }
      if (inDependencies && /^\}/.test(view.text)) {
        inDependencies = false;
        continue;
      }
      void inDependencies;
      const depMatch = /"(?:dependencies|devDependencies)"\s*:/.exec(view.text);
      if (depMatch !== null) {
        continue;
      }
      const floatMatch = /"([^"]+)"\s*:\s*"(latest|github:[^"]+|[^"]*#[^"]*)"/.exec(view.text);
      if (floatMatch !== null && floatMatch[1] !== undefined && floatMatch[1] !== "") {
        drafts.push({
          ruleId: this.id,
          severity: this.severity,
          category: this.category,
          message: `floating dependency spec for '${floatMatch[1]}'`,
          offset: offsetOfLine(content, view.lineNumber) + (floatMatch.index ?? 0),
          rawEvidence: view.text.trim(),
          remediation: this.remediation,
          documentationKey: this.documentationKey,
        });
      }
    }
    return drafts;
  },
};

function draft(
  rule: Pick<ScanRule, "id" | "severity" | "category" | "remediation" | "documentationKey">,
  offset: number,
  message: string,
  evidence: string,
) {
  return {
    ruleId: rule.id,
    severity: rule.severity,
    category: rule.category,
    message,
    offset,
    rawEvidence: evidence,
    remediation: rule.remediation,
    documentationKey: rule.documentationKey,
  };
}

function offsetOfLine(content: string, lineNumber: number): number {
  let offset = 0;
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lineNumber - 1 && index < lines.length; index += 1) {
    offset += (lines[index]?.length ?? 0) + 1;
  }
  return offset;
}
