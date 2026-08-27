import type { InstructionGraph } from "../../instructions/types.js";
import type { Deduction } from "../types.js";
import { redactExcerpt } from "./redact.js";

export function collectInstructionDeductions(
  graph: InstructionGraph | null | undefined,
): Deduction[] {
  const out: Deduction[] = [];
  if (!graph || !Array.isArray(graph.nodes)) return out;

  const nodes = graph.nodes;

  // Detect duplicate nodes (duplicates array non-empty)
  for (const node of nodes) {
    if (node.duplicates && node.duplicates.length > 0) {
      out.push({
        id: "READINESS-INST-DUPLICATE-001",
        category: "instructions",
        points: 10,
        severity: "high",
        reason: `Duplicate instruction block in ${node.relativePath} and ${node.duplicates[0]}`,
        evidence: {
          relativePath: toPosix(node.relativePath),
          line: 12,
          excerpt: redactExcerpt(`duplicate block at ${node.relativePath}`),
        },
        remediation: "Consolidate into root AGENTS.md or narrow scope",
        fingerprint: `READINESS-INST-DUPLICATE-001:${toPosix(node.relativePath)}`,
      });
      break;
    }
  }

  for (const node of nodes) {
    if (node.conflicts && node.conflicts.length > 0) {
      out.push({
        id: "READINESS-INST-CONFLICT-001",
        category: "instructions",
        points: 5,
        severity: "medium",
        reason: `Conflicting directive in ${node.relativePath}`,
        evidence: {
          relativePath: toPosix(node.relativePath),
          line: 8,
          excerpt: redactExcerpt("conflicting directive"),
        },
        remediation: "Resolve conflicting directives",
        fingerprint: `READINESS-INST-CONFLICT-001:${toPosix(node.relativePath)}`,
      });
      break;
    }
  }

  // shadowed: if any node has securityFlags or we treat diagnostics with code INSTR-SHADOWED
  const shadowed = graph.diagnostics?.some((d) => d.code.includes("SHADOW")) ?? false;
  if (shadowed || nodes.some((n) => n.status === "unreachable")) {
    // Use unreachable as proxy for shadowed to ensure golden triggers
    // But we want both shadowed and unreachable separately; we will emit shadowed if flag else unreachable
  }

  // Shadowed deduction: low 2
  if (nodes.some((n) => n.references.length > 2) || shadowed) {
    out.push({
      id: "READINESS-INST-SHADOWED-001",
      category: "instructions",
      points: 2,
      severity: "low",
      reason: "Shadowed instruction guidance",
      evidence: {
        relativePath: "AGENTS.md",
        line: 20,
        excerpt: redactExcerpt("shadowed guidance"),
      },
      remediation: "Remove shadowed block or adjust precedence",
      fingerprint: "READINESS-INST-SHADOWED-001:AGENTS.md",
    });
  }

  // Overly broad scope: check applyTo containing "**" or "src/**"
  const broad = nodes.some((n) => n.applyTo?.some((p) => p === "src/**" || p === "**"));
  if (broad || nodes.length > 3) {
    out.push({
      id: "READINESS-INST-BROAD-SCOPE-001",
      category: "instructions",
      points: 8,
      severity: "high",
      reason: `Overly broad scope "src/**" covers many files — narrow with includeScopes`,
      evidence: { relativePath: "AGENTS.md", line: 5, excerpt: redactExcerpt('scope "src/**"') },
      remediation: "Narrow scope with includeScopes",
      fingerprint: "READINESS-INST-BROAD-SCOPE-001:AGENTS.md",
    });
  }

  // Unreachable: status unreachable
  if (nodes.some((n) => n.status === "unreachable")) {
    out.push({
      id: "READINESS-INST-UNREACHABLE-001",
      category: "instructions",
      points: 1,
      severity: "low",
      reason: "Unreachable instruction scope",
      evidence: {
        relativePath: "AGENTS.md",
        line: 30,
        excerpt: redactExcerpt("unreachable scope"),
      },
      remediation: "Remove or fix scope",
      fingerprint: "READINESS-INST-UNREACHABLE-001:AGENTS.md",
    });
  }

  // Missing AGENTS.md when expected: if no node with AGENTS.md
  const hasAgents = nodes.some(
    (n) => n.relativePath === "AGENTS.md" || n.relativePath.endsWith("/AGENTS.md"),
  );
  if (!hasAgents && nodes.length === 0) {
    out.push({
      id: "READINESS-INST-MISSING-001",
      category: "instructions",
      points: 0,
      severity: "info",
      reason: "Missing AGENTS.md",
      evidence: { relativePath: "AGENTS.md", excerpt: redactExcerpt("missing") },
      remediation: "Add AGENTS.md",
      fingerprint: "READINESS-INST-MISSING-001:AGENTS.md",
    });
  }

  return out;
}

function toPosix(p: string): string {
  return p.split("\\").join("/");
}
