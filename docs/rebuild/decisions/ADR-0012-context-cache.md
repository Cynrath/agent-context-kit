# ADR-0012: Context budget/pack + cache/incremental model

Status: Proposed · Date: 2026-08-22

## Decision
`ackit pack` ranks candidates via transparent weighted signals (explicit include > changed > active-task refs > instruction scope > import proximity > README/architecture relevance > file type > user policy; size penalty), then fills the token budget with explained exclusions. Token counts use a provider-independent character-class estimator always labeled "estimate"; adapter seam reserved, no LLM SDK. Manifests are deterministic (hash+reason+relativePath). Cache keys = sha256(content) ⊕ ruleVersion ⊕ configDigest ⊕ policyDigest ⊕ engineVersion; mtime never trusted alone.

## Rationale
Determinism is a contract (REQ-TEST-006): identical inputs must produce byte-identical artifacts, which rules out embeddings/LLM ranking and mtime caching simultaneously.

## Consequences
Ranking weight changes are versioned config changes; cache invalidates correctly across rule/policy upgrades by construction.
