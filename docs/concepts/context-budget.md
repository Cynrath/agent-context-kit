# Context Budget

`ackit pack` builds a deterministic, budgeted context pack.

## Ranking signals (transparent weights)

```
explicit include glob      +100
git-changed file           +60
active-task reference      +50
instruction scope path     +40
import/reference proximity +30
README/architecture/docs   +20
type base                  md 10 · code 8 · config 6 · other 2
size penalty               −5 per 4KB, capped −40
```

Ties break by ascending repo-relative path. No embeddings, no LLM ranking.

## Budget

Greedy fill over the ranked list; a candidate that does not fit is excluded
with `budget exhausted (needs X, remaining Y)`. Every manifest entry records
`{relativePath, action: included|excluded|scrubbed, reason, estimatedTokens,
sha256, bytes}`.

## Safety gates (before scoring)

1. Secret-shaped content → excluded outright (`ACKIT001/003` shapes).
2. Duplicate content-hash → excluded as duplicate of the higher-ranked twin.
3. Machine-local absolute paths scrubbed to `<local-path>`.

Token counts are character-class **estimates** (~4 chars/token, CJK-corrected)
and are labeled as such in every artifact; a tokenizer adapter seam exists but
no model access ever happens.
