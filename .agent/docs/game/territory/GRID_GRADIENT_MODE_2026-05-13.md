# Grid Gradient Territory Mode

**Date:** 2026-05-13
**Status:** Experimental render-family mode
**Mode id:** `grid_gradient`

## Runtime Decision

1. Runtime shape: `grid_gradient` uses the render-family runtime.
2. Why this is correct: the mode is meant to be a serious shipped candidate, but its special behavior is presentation-focused. The family path lets it reuse the existing ownership and PV-derived geometry inputs without adding another direct renderer branch.
3. Closest reference: `metaball_grid` is the closest runtime reference because it already builds grid classifications, distance fields, and a family scene from shared geometry. `DistanceFieldTerritoryRenderer` remains useful as a direct renderer example only.
4. Layer ownership:
   - Ownership: unchanged; the family reads `OwnershipSnapshot` from `RenderFamilyInput`.
   - Geometry: unchanged; the family consumes resolved regions, frontiers, and world borders from the shared family geometry path.
   - Transition: family-local; the mode uses `buildRenderFamilyInput()` transition data and previous-frame geometry when available.
   - Presentation: owned by `GridGradientFamily`; grid samples become circles, squares, or deterministic noise polygons, and borders can be vector strokes or optional dots.
5. Release state: experimental. It is selectable and built, but needs user visual verification before it should be treated as production.

## Visual Contract

`Grid Gradient` renders fills by sampling a fine invisible grid over the existing territory geometry. The largest marks appear near region centers. Marks shrink smoothly toward frontiers and world borders. The renderer does not create new ownership, mutate PV geometry, or replace the game rules model.

Vector borders are enabled by default because they preserve gameplay readability. Border dots are a distinct presentation option:

- `blended`: one border dot line using the opposing owners' blended colors.
- `butted`: two offset dot lines, one per side.

## User Controls

The tuning surface lives in the existing Territory settings UI and uses the shared panel settings system.

Primary keys:

- `GRID_GRADIENT_SPACING_PX`
- `GRID_GRADIENT_MAX_CELLS`
- `GRID_GRADIENT_CELL_SHAPE`
- `GRID_GRADIENT_CENTER_SIZE_PX`
- `GRID_GRADIENT_EDGE_SIZE_PX`
- `GRID_GRADIENT_CURVE_POWER`
- `GRID_GRADIENT_BORDER_OFFSET_PX`
- `GRID_GRADIENT_POSITION_JITTER`
- `GRID_GRADIENT_VECTOR_BORDERS_ENABLED`
- `GRID_GRADIENT_BORDER_DOTS_ENABLED`
- `GRID_GRADIENT_BORDER_DOT_SIZE_PX`
- `GRID_GRADIENT_BORDER_DOT_STYLE`

## Dispatch Path

Selection flow:

1. `territoryRenderModeCatalog.ts` exposes `grid_gradient` with label `Grid Gradient`.
2. `territoryModeShortcuts.ts` exposes the top-bar shortcut.
3. `TerritoryArchitectureRouter.ts` classifies `grid_gradient` as `render_family_renderer`.
4. `GameCanvas.svelte` registers `GridGradientFamily`, builds `RenderFamilyInput`, and calls `GridGradientFamily.update()`.
5. The family exports diagnostics through `gridGradientStats` and the family debug snapshot.

## Plan And Performance Path

Grid Gradient keeps one render-family runtime path. The family builds a mode-local plan, then uses shader-field or graphics presentation over that plan.

Current plan path:

1. `GridGradientFamily.resolvePlan()` builds a plan key from world, geometry versions, grid settings, and active conquest transition state.
2. If the requested plan is cached, the family renders it immediately.
3. If a cached plan exists but the requested plan changed, `GridGradientFamily` queues `gridGradientPlan.worker.ts` and keeps rendering the cached plan while the worker builds.
4. Worker results are committed on the main thread after they are safe to display. A steady post-transition plan is not committed over an active visual transition early.
5. Transition worker commits use the original conquest `startedAtMs` and `durationMs`, so fill timing stays aligned with the rest of conquest presentation.
6. Synchronous `buildGridGradientPlan()` remains only for first-plan/no-Worker fallback.

Current classifier path:

- `typedClassification.ts` builds typed owner/role arrays for Grid Gradient.
- Square and hex-offset layouts use a scanline raster classifier.
- Jittered layouts use the existing point classifier path because random offsets make row-span raster filling a different sampling problem.
- Steady PREV/NEXT owner grids are cached by geometry, grid settings, owner ids, and owned-star signature.
- The object-shaped `GridClassification` is still materialized for graphics fallback, border dots, wave planning, diagnostics, and compatibility.

Current shader packing path:

- `gridGradientShaderFieldPacking.ts` packs owner, role, flip-time, distance, and palette textures from typed arrays when available.
- The object-cell fallback remains for compatibility and tests.

Diagnostics:

- The existing diagnostics panel shows `Plan Worker`, `Classifier`, `Build Split`, `Plan Cache`, and `Transition` rows for this mode.
- These rows are the expected way to verify worker use, classifier path, owner-grid cache hits, and plan-pending state.

## Constraints

- Do not move this mode to a direct legacy renderer path unless a future architecture note explains why.
- Do not duplicate ownership truth inside the family.
- Do not fabricate region geometry inside the family. Sampling is a presentation decision over resolved input geometry.
- Keep vector borders as the default readability path.
- Keep border dots optional until user verification proves them readable.
- Do not reduce spacing, cell count, shader quality, or border quality as a performance fix unless the user explicitly accepts that visual tradeoff.
- Keep jittered-grid behavior on the point classifier path unless parity is proven for an alternate algorithm.

## Validation Recorded

2026-05-13:

- Focused Vitest coverage passes for `gridGradientScene.test.ts` and `TerritoryArchitectureRouter.test.ts`.
- `bun run build` passes in `pax-fluxia/`.
- `bun run check` is not clean in this worktree because of existing repo-wide diagnostics outside the Grid Gradient files.
- Browser verification was not performed because the project rule requires explicit browser permission.

2026-06-12:

- Added targeted typed-classification parity tests and shader typed-packing tests.
- `bun test ./src/lib/territory/families/gridGradient/typedClassification.test.ts ./src/lib/territory/families/gridGradient/gridGradientShaderFieldPacking.test.ts ./src/lib/territory/families/gridGradient/GridGradientFamily.test.ts ./src/lib/territory/families/gridGradient/gridGradientScene.test.ts ./src/lib/territory/families/gridGradient/gridGradientShaderFieldShaders.test.ts ./src/lib/territory/families/gridGradient/transitionTraceLogger.test.ts ./src/lib/territory/families/metaballGrid/buildGridClassification.test.ts ./src/lib/territory/families/metaballGrid/planGridWave.test.ts` passed.
- `bun run build` passes in `pax-fluxia/`.
- User should still verify live Chrome Performance behavior during conquest: plan/classification work should no longer dominate main-thread animation frames after the first plan is cached.
