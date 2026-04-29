# Takeaways - 2026-04-29

- The retained active-frontier optimization introduced a real transition-lifecycle regression.
- The bug was not in the wave math itself; it was in the handoff from active conquest to steady state.
- Any retained transition layer now needs explicit cleanup-boundary coverage before a paint-skip optimization is considered safe.
- The broader “everything becomes conquest” symptom had a second root cause upstream: PREV-frame capture based on idle-only caching is not safe once conquests chain back-to-back.
- Synthetic/default transition buckets must exist only for diagnostics/classification bookkeeping; they must never enter the animated conquest path.
- Active render-family conquest state cannot safely merge overlapping conquest batches under one shared progress scalar; newest-batch selection is required until the system supports true per-event concurrent progress.
