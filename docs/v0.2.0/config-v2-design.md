# ackit.yml schemaVersion 2 — Additive Design Sketch (v0.2.0)

Planning-only design for the v0.2.0 config surface. No schema is changed in TASK-0007; this documents the additive contract the next tasks implement.

## Additive fragment (JSON Schema sketch)

```json
{
  "type": "object",
  "properties": {
    "schemaVersion": { "const": 2 },
    "scan": { "...existing...": "..." },
    "readiness": {
      "type": "object",
      "properties": {
        "weights": {
          "type": "object",
          "properties": {
            "instructions": { "type": "number", "minimum": 0 },
            "security": { "type": "number", "minimum": 0 },
            "contextEfficiency": { "type": "number", "minimum": 0 },
            "taskHygiene": { "type": "number", "minimum": 0 },
            "skills": { "type": "number", "minimum": 0 },
            "policy": { "type": "number", "minimum": 0 }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "profile": {
      "type": "string",
      "enum": ["codex", "claude", "copilot", "gemini", "generic"]
    },
    "policy": {
      "type": "object",
      "properties": {
        "rulePacks": {
          "type": "array",
          "items": { "type": "string" },
          "maxItems": 50
        }
      }
    },
    "diagnostics": {
      "type": "object",
      "properties": {},
      "additionalProperties": false
    }
  }
}
```

## Compatibility

- `schemaVersion: 1` files remain valid (defaults applied).
- `schemaVersion: 2` adds optional `readiness`, `profile`, `policy.rulePacks`.
- Unknown keys under `readiness` are rejected (strict `additionalProperties: false`).
- `ackit.yml` `profile` selection order: CLI `--profile` > `ackit.yml` `profile` > auto-detect.
- `policy.rulePacks` entries are repo-relative paths, validated via canonical-root containment.

## Next step

Implemented in:

- TASK-0007 → docs only
- TASK-0008 → `readiness.weights`
- TASK-0010 → `profile`
- TASK-0012 → `policy.rulePacks`
- TASK-0017 → diagnostics plumbing (no config shape required beyond redaction)
