# Territory Recovery Phase 1 Note (2026-03-08)

## Purpose
Restore a stable playable territory render immediately while preserving the new canonical frontier code in-repo for later completion.

## What Changed
- Mesh border runtime now publishes and consumes the legacy vector border path first.
- Canonical frontier runtime routing is present but explicitly disabled behind an internal recovery gate.
- Owner-grid data is now published only after the legacy chunked build fully completes.
- Mesh runtime no longer reads the in-progress `cachedVectorBuildJob.ownerGrid` as Stage 2B field-frontier input.
- A published owner-grid snapshot cache was added so future canonical field-frontier work can consume only complete ownership data.
- Stale/reset paths now clear the published owner-grid snapshot as well as the in-progress build job.

## Why This Diverges Temporarily
This is an intentional short-term divergence from the canonical execution order in `IMPLEMENTATION_DIRECTIVE_v1.md`.

The directive calls for continuing canonical frontier integration. The current committed state had a broken partial integration where:
- Stage 2B read an unpublished / partially-filled owner grid,
- default zero-filled cells were interpreted as valid ownership,
- canonical polylines could become visible while legacy was still warming,
- broken field-frontier grouping produced invalid border chains.

Until Stage 2B uses contour-local connectivity and only published ownership snapshots, canonical runtime output is not safe to expose.

## Explicit Temporary Rule
- `DF_CANONICAL_FRONTIER_RUNTIME_MODE = 'disabled'`
- Canonical frontier code remains in the renderer and frontier modules.
- Canonical runtime output is not allowed to surface visually until readiness checks are satisfied.

## Readiness Criteria To Re-enable Canonical Runtime
1. Field frontier extraction consumes only fully-published owner-grid snapshots.
2. Field frontier grouping is contour-local, not pair-global.
3. Canonical polyline validity checks pass for the active ownership snapshot.
4. Canonical output is selected only in diagnostic or production mode, never as an implicit fallback during legacy warmup.

## Net Effect
- Restores stable runtime behavior quickly.
- Preserves all canonical frontier work for Phase 3 continuation.
- Prevents the top-of-map / first-frame corruption path from surfacing to users.
