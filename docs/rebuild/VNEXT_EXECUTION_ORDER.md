# AgentContextKit vNext — Execution Order

Dependency-aware waves for Goal 2. `parallel-safe = yes` means the task can run concurrently with other same-wave tasks on separate worktree-free checkouts of the same branch state (no overlapping files). Master epic TASK-0264 spans all waves.

## Deterministic next-task selection rule (binding for Goal 2)

Pick the first task matching ALL of:
1. status ≠ completed,
2. all dependencies completed,
3. lowest wave number,
4. within a wave: lowest task ID.

Tie-break never needed beyond this; the rule is total.

## Waves

### Wave 0 — Preflight
| Task | Depends on | Unlocks | Parallel-safe | Reason |
|---|---|---|---|---|
| TASK-0265 | — | 0266 | yes | Verify starting reality before any change |

### Wave 1 — Architecture freeze
| Task | Depends on | Unlocks | Parallel-safe | Reason |
|---|---|---|---|---|
| TASK-0266 | 0265 | 0267 | no | ADR/dependency/package-name facts gate all code |

### Wave 2 — Skeleton
| Task | Depends on | Unlocks | Parallel-safe | Reason |
|---|---|---|---|---|
| TASK-0267 | 0266 | 0268, 0269 | no | Tree reset; everything lands on it |

### Wave 3 — Foundation engines
| Task | Depends on | Unlocks | Parallel-safe | Reason |
|---|---|---|---|---|
| TASK-0268 | 0267 | 0270, 0272, 0274, 0277 | yes | fs engine is security bedrock |
| TASK-0269 | 0267 | 0270, 0281, 0282 | yes | config feeds every command |

### Wave 4 — Core capabilities
| Task | Depends on | Unlocks | Parallel-safe | Reason |
|---|---|---|---|---|
| TASK-0270 | 0268, 0269 | 0271, 0279, 0282, 0283, 0284 | no | scan pipeline is central bus |
| TASK-0272 | 0268 | 0273, 0276, 0277, 0280 | yes | graph independent of scan rules |
| TASK-0274 | 0268 | 0275, 0277 | yes | parser precedes install/builtins |

### Wave 5 — Feature layer
| Task | Depends on | Unlocks | Parallel-safe | Reason |
|---|---|---|---|---|
| TASK-0271 | 0270 | 0282, 0288 | yes | rule catalog over pipeline |
| TASK-0273 | 0272 | 0278 | yes | analysis over graph |
| TASK-0275 | 0274 | 0276 | yes | builtins+ownership before init |
| TASK-0281 | 0269 | 0283 | yes | task system standalone |

### Wave 6 — Composition
| Task | Depends on | Unlocks | Parallel-safe | Reason |
|---|---|---|---|---|
| TASK-0276 | 0272, 0275 | 0285 | yes | init needs graph + skills |
| TASK-0277 | 0272, 0274, 0268 | 0278, 0283 | yes | pack consumes graph+skills |
| TASK-0279 | 0270 | 0284, 0288 | yes | incremental/cache under scan |
| TASK-0282 | 0269, 0270 | 0283 | yes | policy over scan registry |
| TASK-0280 | 0272 | 0288 | yes | workspace model over graph |

### Wave 7 — Integration surfaces
| Task | Depends on | Unlocks | Parallel-safe | Reason |
|---|---|---|---|---|
| TASK-0278 | 0277, 0273 | — | no | optimize composes context+analysis |
| TASK-0283 | 0270, 0277, 0281, 0282 | 0289 | no | MCP exposes multiple engines |
| TASK-0284 | 0270, 0279 | 0289 | no | reporting/watch over scan+cache |

### Wave 8 — Productization
| Task | Depends on | Unlocks | Parallel-safe | Reason |
|---|---|---|---|---|
| TASK-0285 | 0276, 0277, 0283, 0284 | 0286, 0288 | no | package/API after feature freeze |
| TASK-0287 | 0285, 0286 | 0289 | no | docs describe verified behavior |

### Wave 9 — Hardening evidence
| Task | Depends on | Unlocks | Parallel-safe | Reason |
|---|---|---|---|---|
| TASK-0286 | 0285 | 0287, 0289 | no | CI proves cross-platform claims |
| TASK-0288 | 0279, 0280, 0285 | 0289 | yes | benchmarks need stable engine |

### Wave 10 — Final gate
| Task | Depends on | Unlocks | Parallel-safe | Reason |
|---|---|---|---|---|
| TASK-0289 | ALL (0265..0288) | GOAL 2 completion | no | single authoritative closeout |

## Cycle proof

Edges point strictly from lower/equal wave to higher wave (dependency ⇒ strictly greater wave except equal-wave independent pairs which have no edges between them). A cycle would require an edge back to a lower wave; none exists by construction. Verified by the selection rule terminating: wave numbers strictly increase along dependency chains, max chain length 10 < task count.
