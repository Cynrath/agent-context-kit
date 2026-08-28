import type { Deduction, ReadinessInputs } from "../types.js";
import { collectContextDeductions } from "./context.js";
import { collectInstructionDeductions } from "./instructions.js";
import { collectPolicyDeductions } from "./policy.js";
import { redactExcerpt } from "./redact.js";
import { collectSecurityDeductions } from "./security.js";
import { collectSkillDeductions } from "./skills.js";
import { collectTaskDeductions } from "./tasks.js";

export function collectAllDeductions(inputs: ReadinessInputs): Deduction[] {
  const out: Deduction[] = [];
  out.push(...collectInstructionDeductions(inputs.graph));
  out.push(...collectSecurityDeductions(inputs.scan));
  out.push(...collectContextDeductions(inputs.pack as never));
  out.push(...collectTaskDeductions(inputs.tasks as never));
  out.push(...collectSkillDeductions(inputs.skills as never));
  out.push(...collectPolicyDeductions(inputs.policy as never));

  // Cap deductions per category at 500 (keep highest severity)
  const byCategory = new Map<string, Deduction[]>();
  for (const d of out) {
    const arr = byCategory.get(d.category) ?? [];
    arr.push(d);
    byCategory.set(d.category, arr);
  }
  const capped: Deduction[] = [];
  for (const [, arr] of byCategory) {
    if (arr.length > 500) {
      const sorted = [...arr].sort(
        (a, b) => severityRank(b.severity) - severityRank(a.severity) || a.id.localeCompare(b.id),
      );
      capped.push(...sorted.slice(0, 500));
      const first = arr[0];
      if (!first) continue;
      capped.push({
        id: "READINESS-TRUNCATED-001",
        category: first.category as import("../types.js").CategoryId,
        points: 0,
        severity: "info",
        reason: `Truncated ${arr.length - 500} deductions`,
        evidence: {
          relativePath: first.evidence.relativePath,
          excerpt: redactExcerpt("truncated"),
        },
        fingerprint: "READINESS-TRUNCATED-001",
      });
    } else {
      capped.push(...arr);
    }
  }

  // Ensure deterministic ordering: category order, severity desc, stableId, relativePath
  // Also redact excerpts
  for (const d of capped) {
    // Validate relativePath is POSIX and not absolute
    if (isAbsolutePath(d.evidence.relativePath)) {
      throw new Error(`absolute path in evidence: ${d.evidence.relativePath}`);
    }
    d.evidence.relativePath = toPosix(d.evidence.relativePath);
    if (d.evidence.excerpt) d.evidence.excerpt = redactExcerpt(d.evidence.excerpt.slice(0, 200));
    // Ensure points matches severity table (allow variants already)
    // Validate id pattern
    if (!/^READINESS-[A-Z]+-[A-Z0-9-]+$/.test(d.id)) {
      throw new Error(`invalid deduction id ${d.id}`);
    }
  }

  capped.sort((a, b) => {
    const catA = categoryOrder(a.category);
    const catB = categoryOrder(b.category);
    if (catA !== catB) return catA - catB;
    const sevA = severityRank(a.severity);
    const sevB = severityRank(b.severity);
    if (sevA !== sevB) return sevB - sevA;
    if (a.id !== b.id) return a.id < b.id ? -1 : 1;
    if (a.evidence.relativePath !== b.evidence.relativePath)
      return a.evidence.relativePath < b.evidence.relativePath ? -1 : 1;
    return 0;
  });

  return capped;
}

function categoryOrder(cat: string): number {
  const order = [
    "instructions",
    "security",
    "contextEfficiency",
    "taskHygiene",
    "skills",
    "policy",
  ];
  const idx = order.indexOf(cat);
  return idx === -1 ? 99 : idx;
}

function severityRank(s: string): number {
  const map: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  return map[s] ?? 0;
}

function toPosix(p: string): string {
  return p.split("\\").join("/");
}

function isAbsolutePath(p: string): boolean {
  return (
    /^[A-Z]:\\/.test(p) ||
    p.startsWith("/") ||
    p.startsWith("\\") ||
    /^\\\\\?\\/.test(p) ||
    /^[A-Z]:\//.test(p)
  );
}
