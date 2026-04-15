# Mapgen Runtime Regression Analysis - 2026-04-12

## Purpose

Capture the concrete findings from the board-fill / curved-lane regression investigation so future work does not repeat the same “swap old and new code blindly” failure mode.

## Commits examined

- `87714db4` `fix: restore lane and board runtime behavior`
- `460c0f93` `feat: refine palette, lane, and public room flows`
- `6ccfdf48` `feat: advance menu, corridor, and metaball groundwork`
- `af0e2d87` `fix(mapgen): restore curved lanes + MSR-only edge prune; fix lane mode UI`
- `9b14357a` `mapgen: curve lanes only when needed; MSR obstacle clearance; straight/curve toggle UI`

## Ground truth findings

### 1. The app is using live `/common`, not a stale package copy

- `pax-fluxia/node_modules/@pax/common` is a symlink to the workspace `common/`
- `pax-server/node_modules/@pax/common` is also a symlink to the workspace `common/`

Conclusion:
- runtime mapgen issues were real code/behavior problems, not package-staleness confusion

### 2. `87714db4` did partially reintroduce older semantics too naively

What changed there:

- `lanePolylines.ts` was pushed back toward straight-first behavior
- `placement.ts` switched to exact corner seeds and skipped `applyBoardFit()` at full fill

Why this was not sufficient:

- the board-fill fix still left the padded play area in charge, so 100% fill was not truly “full board”
- the lane fix addressed only the lane-solver stage, while the real behavior now also depends on `connections.ts` topology pruning/reconnect behavior

### 3. `460c0f93` was also not the right answer

What it introduced:

- aesthetic-preference curving in `lanePolylines.ts`
- corner seeding in `placement.ts`, but still within padded/nearest-hex logic and still post-fit scaled

Observed problem:

- this could make low lane-margin maps over-curve
- it did not actually guarantee true full-board corner occupancy at `Board Fill = 100%`

### 4. The real semantic shift happened earlier in `connections.ts`

Between `af0e2d87` and later work, `connections.ts` gained:

- `laneCurveVsPruneBias`
- pass-through prune clearance scaled by `(1 - bias)`
- connectivity restoration that re-adds shortest Delaunay edges

This matters because:

- lane visibility is no longer determined only by `lanePolylines.ts`
- topology and solver behavior are now coupled
- a revert of only the lane solver cannot restore intended behavior by itself

### 5. “No curves” had two different causes

Confirmed contributing causes:

- persisted/active lane settings had drifted toward `MAPGEN_LANE_MODE = straight` in the dumped live settings artifact
- medium-density maps with the post-`connections.ts` topology often produced very few genuinely obstructed edges
- the reverted straight-first solver did not create any soft “near blocker” curvature, so many maps still appeared almost entirely straight

## Direct runtime probes

### Board fill

Before the latest correction, direct generation at `boardFit = 1` still produced padded-edge extrema such as:

- `minX ≈ 175`
- `maxX gap ≈ 175`

After the correction:

- maps now hit exact corner-anchor extrema:
  - `x = 25`
  - `x = 1575`
  - `y = 25`
  - `y = 875`

### Curved-lane counts

Direct probe results after the latest correction:

- `laneMargin = 0`, `bias = 0`, `mode = curved`
  - essentially straight, as desired
- `laneMargin = 75`, `bias = 0.55`, `mode = curved`
  - strong visible curve presence again
- `laneMargin = 180`, `bias = 1`, `mode = curved`
  - still too few curves relative to expectation

Interpretation:

- the low-margin over-curving problem is fixed
- medium settings now generate meaningful curves
- the high-margin + max-bias case still needs more design tuning

## Corrections made in this slice

### Board fill

`common/src/mapgen/placement.ts`

- `Board Fill = 100%` now uses zero map padding
- corner seeds are anchored against the actual full board, not the old padded interior
- sub-100% behavior keeps the older placement flow

### Curved lanes

`common/src/mapgen/lanePolylines.ts`

- restored straight-first behavior for true zero/low-clearance cases
- added nearest-blocker-aware soft curvature for near-clear chords
- bend direction now prefers only the side away from the nearest blocker instead of trying the inward side second

### Why this new lane behavior is different from both older versions

- unlike `460c0f93`, it does **not** curve everything cosmetically at low margin
- unlike `87714db4`, it does **not** stay overly literal/straight when lane margin is high enough that a soft outward bend is clearly the intended read

## Remaining open issue

High lane margin with `curveVsPruneBias = 1` still under-produces curves.

Most likely reason:

- topology keeps many edges that are only barely or not meaningfully curvable under the full hard-clearance rule

Next tuning candidates:

1. adjust the phase-4 prune scaling so `bias = 1` does not fully collapse pass-through pruning to zero
2. improve multi-obstacle detour solving beyond the current quadratic + single-kink fallback
3. review whether the UI/defaults are pushing users into a max-bias regime that does not match the intended visual result

## Practical conclusion

The correct fix path is not “old code” or “new code.”

It is:

- keep the post-`connections.ts` topology model
- keep true full-board corner anchoring at `Board Fill = 100%`
- keep low-margin lanes mostly straight
- add blocker-aware soft curvature where the visual intent clearly calls for it
- continue tuning the high-margin + max-bias corner case instead of pretending it is solved
