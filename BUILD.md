# BUILD — Suspicious Login Detector (KDG) — Entry Point

Single entry point for the coding agent. The real content lives in the 5 docs below — read them in this order, don't skip any, don't add scope beyond what they say.

1. **`prd.md`** — what we're building and why. Locked in-scope / out-of-scope list + the demo script that defines "done." Read this first.
2. **`tech.md`** — exact stack, install commands, file layout, and the API contract (`/analyze`, `/sample`) that the other docs depend on.
3. **`logic.md`** — the rule checks + risk-scoring formula (the actual detection logic inside the backend).
4. **`frontend.md`** — the single-page dashboard spec, matched to `tech.md`'s JSON shape.
5. **`workflow.md`** — the 90-minute, task-by-task build order with checkpoints and a cut-scope fallback list. This is the plan to actually execute.

## Rule for the agent
Every file cross-references the others (e.g. `tech.md` → `logic.md` §3, `frontend.md` → `tech.md`'s contract). Treat mismatches as bugs to flag, not license to freelance — if something's ambiguous, ask rather than invent new scope.

## Execution
Follow `workflow.md` task-by-task, in order, checking off each checkpoint before moving to the next task. If behind schedule, use `workflow.md`'s cut-order — never `prd.md`'s out-of-scope list.
