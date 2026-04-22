# Gameplay Performance Status And Next Steps - 2026-04-22

## Purpose

Summarize the current gameplay performance state after the recent `metaball_grid` merge chain, record what has already been tried, and define the next serious work items. The target is materially better late-game performance without changing gameplay truth or diluting the intended visual result.

## Current Verified State

- Gameplay performance is still unacceptable under real late-game pressure.
- Recent live traces show the dominant runtime cost is still:
  - `MetaballGridFamily.update`
  - `buildPlanForTransition`
  - `buildGridClassification`
  - `resolveOwnerAt`
  - `pointInPolygon`
- Earlier traces in the same period also showed meaningful ship-render cost, but the latest evidence indicates `metaball_grid` transition planning remains the primary frame killer.
- User observation is important here: some commits on the pre-merge worktree felt faster than the current merged state.

## What Has Already Been Done

### Landed earlier

- `543c16ca` `perf: reduce heavy-load ship and metaball-grid cost`
  - single-pass ship incoming prepass
  - owner-color and style hoisting
  - region-AABB and owned-star bucketing in `buildGridClassification`
  - timing split in `metaballGrid` stats
- `bc9d9812` `refactor: unwire metaball-grid alpha gain control`
  - cleanup only; not a meaningful perf change

### Attempted and then reverted

- `3bf6c5da` `perf: patch metaball-grid transition classification`
  - attempted owner-bounds patch classification
  - did not produce a reliable win
  - user-reported live performance felt worse and more jagged
- `8eca2e5a` `Revert "perf: patch metaball-grid transition classification"`
  - restored the prior baseline

## What The Latest Evidence Actually Says

- The expensive part is still transition-time world classification for `metaball_grid`.
- The hot path is not just generic update cost; it is specific geometric ownership resolution:
  - candidate owner resolution
  - region polygon inclusion checks
  - transition plan construction on top of that classification
- Another shallow micro-optimization pass is unlikely to produce the required improvement.
- A meaningful win probably requires either:
  - reducing the classified spatial scope much more aggressively and correctly, or
  - moving transition planning off the main thread after its input scope is correct.

## Proposed Next Steps

### 1. Identify the exact faster baseline

Before another large perf pass, identify the specific worktree commit range that felt faster to the user and compare it directly against current `master`.

Goal:
- determine whether the better feel came from:
  - lower classification scope
  - different invalidation frequency
  - less transition work
  - or simply fewer merged features active at runtime

### 2. Replace owner-wide patch scope with true changed-front scope

The reverted patch used owner-wide changed-region bounds. That is too coarse in real games.

Next version should:
- derive the actual conquest front / affected frontier envelope from transition data
- classify only cells intersecting that front plus a safety margin
- reuse prior steady-state classification outside that envelope

This is the most plausible exact-output path to a real win.

### 3. Persist steady-state grid ownership caches by snapshot identity

Build and retain snapshot-level classification keyed by:
- geometry identity
- grid-affecting tunables
- relevant ownership-resolution settings

Then use:
- cached PREV ownership directly
- only localized NEXT classification during transitions

### 4. Workerize transition planning after spatial scope is correct

Do not workerize the current oversized workload blindly. That would hide stalls, not remove them.

If changed-front scoping is correct and still too slow:
- move transition patch classification + wave planning into a worker
- keep the last valid scene rendered until the worker plan is ready

### 5. Split static native paint from dynamic transition paint

Once classification scope is reduced, separate:
- static/native cell paint
- dynamic changed / transitioning paint

Goal:
- avoid repainting the full grid every transition frame when most cells are unchanged

### 6. Revisit `computeGeometry0319` only after classification scope is solved

That cost still appears in traces, but it is not the dominant term right now. It should not be the first target while `buildGridClassification` still dominates.

## Valuable New Ideas

### Replayable transition perf harness

Record representative conquest transitions and replay them deterministically against:
- current `master`
- known-faster historical commits
- candidate perf branches

This would remove guesswork from subjective “felt faster” comparisons.

### Commit-lineage perf ledger

Maintain a dated perf ledger documenting:
- trace screenshots
- dominant stacks
- benchmark maps / seeds
- commit IDs that improved or regressed behavior

This would make future merge regressions easier to catch.

### Geometry raster index

Consider a rasterized or bucketed ownership-support index per snapshot for `metaball_grid`, so exact polygon checks are only used near ambiguous boundaries rather than across the entire field.

## Recommended Immediate Order

1. Compare current `master` against the exact worktree commit window that felt faster.
2. Add true changed-front spatial scoping for transition classification.
3. Rebuild transition planning around cached PREV + localized NEXT classification.
4. Workerize the reduced transition-plan build if still necessary.
5. Split static/native paint from dynamic transition paint.

## Open Risks

- The faster worktree state may have been faster for the wrong reason, such as stale cache reuse or under-invalidated plans.
- If invalidation is too eager in current `master`, caching alone will not help.
- If the transition system does not currently expose enough changed-front data, the best spatial-scope fix may require small contract work across transition plumbing.
