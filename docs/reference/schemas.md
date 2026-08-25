# Schemas

Machine-readable schemas are generated from the same zod sources of truth
that validate at runtime (single identity sourced from package.json).
Regenerate with `pnpm gen:schemas`; contract tests fail if a committed file
drifts.

| File | Validates | Source |
|---|---|---|
| `schemas/ackit.schema.json` | `ackit.yml` config documents | `src/core/config/schema.ts` |
| `schemas/task.schema.json` | vNext task frontmatter (schemaVersion 2) | `src/core/tasks/types.ts` |
| `schemas/policy.schema.json` | policy documents (schemaVersion 1) | `src/core/policy/types.ts` |

Stable wire contracts also covered by tests (not schema files):

- Scan JSON report: `ackit.scan.v0`
- Findings array: strict zod `FindingSchema`
- SARIF output: SARIF 2.1.0 structure
- Pack JSON: `ackit.pack.v0` manifest
- MCP tool/resource payloads: reuse the engine JSON shapes above
- Instruction graph JSON: `ackit.instructions.v0`

Editor usage example:

```json
{
  "yaml.schemas": {
    "./node_modules/@cynrath/agent-context-kit/schemas/ackit.schema.json": ["ackit.yml"]
  }
}
```
