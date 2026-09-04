# Ranking signals

Precedence: explicit include > changed files > active-task references >
instruction scope > import proximity > README/architecture relevance >
file type, with a size penalty. Deterministic; no embeddings.

Weights: explicit include `+100`, git-changed `+60`, active-task reference
`+50`, instruction scope `+40`, import proximity `+30`,
README/architecture/docs `+20`, type base (md `10`, code `8`, config `6`,
other `2`), size penalty `-5` per 4KB capped `-40`. Ties break by ascending
repo-relative path.

Budget: greedy fill over the ranked list; over-budget candidates are excluded
with `budget exhausted`. Every manifest entry records `relativePath`,
`action` (`included`/`excluded`/`scrubbed`), `reason`, `estimatedTokens`,
`sha256`, `bytes`. Safety gates run before scoring: secret-shaped content
excluded, duplicate content-hash deduped, machine-local paths scrubbed.
`--task` boosts declared scope/refs/changed files; `--resume` embeds the
latest checkpoint resume section.
