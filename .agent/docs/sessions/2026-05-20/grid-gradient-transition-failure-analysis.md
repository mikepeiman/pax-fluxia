# 2026-05-20 - Grid Gradient Transition Failure Analysis

## User Feedback

User verified that Grid Gradient fill transitions still show no visible interpolation. Territory fill appears to snap from PRE to POST.

## What Was Actually Implemented

- `GridGradientFamily.paintGraphicsFill()` scales non-native grid marks by emitted scene alpha.
- `gridGradientShaderFieldShaders.ts` composites old-owner and new-owner `shadeCellSide()` passes for non-native shader-field cells.
- `GridGradientShaderFieldRenderer.ts` wires `uFlipWindow` from `METABALL_GRID_FLIP_WINDOW`.

Those changes only work if the live plan contains non-native grid cells and receives intermediate progress.

## Why Prior Confidence Was Wrong

The validation checked helper math, shader source text, packing tests, and build success. It did not prove that the live Grid Gradient runtime saw:

- `activeTransitionEvents > 0`
- `activeTransitionCells > 0`
- `progress` between 0 and 1 for multiple rendered frames
- pointillist fill instead of solid fill
- shader-field or graphics fill drawing the transition plan rather than steady POST geometry

## Current Suspects

1. Grid Gradient may be getting POST geometry for both PREV and NEXT. If so, `buildGridClassification()` marks all cells `native`, and no transition renderer can show motion.
2. `syncLiveRenderFamilyStableFrame()` is not frozen for Grid Gradient during active transitions, unlike `metaball_grid_phase_edges` and `metaball_grid_ember_lattice`. That can let the previous-frame cache become POST during the transition path.
3. If `Fill Style` is `Solid Fill`, the current solid verifier path draws POST geometry directly and has no transition implementation.

## Next Required Proof

Before claiming the transition works, capture or assert the live Grid Gradient diagnostics during conquest:

- `transitionEventCount`
- `activeTransitionCells`
- `clockSource`
- `progress`
- `drawBackend`
- `fillStyle`

If `activeTransitionCells` is `0`, fix PREV/NEXT capture first. If it is nonzero and progress advances, inspect the shader/graphics rendering path.
