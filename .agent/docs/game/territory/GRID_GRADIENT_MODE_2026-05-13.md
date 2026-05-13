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

## Constraints

- Do not move this mode to a direct legacy renderer path unless a future architecture note explains why.
- Do not duplicate ownership truth inside the family.
- Do not fabricate region geometry inside the family. Sampling is a presentation decision over resolved input geometry.
- Keep vector borders as the default readability path.
- Keep border dots optional until user verification proves them readable.

## Validation Recorded

2026-05-13:

- Focused Vitest coverage passes for `gridGradientScene.test.ts` and `TerritoryArchitectureRouter.test.ts`.
- `bun run build` passes in `pax-fluxia/`.
- `bun run check` is not clean in this worktree because of existing repo-wide diagnostics outside the Grid Gradient files.
- Browser verification was not performed because the project rule requires explicit browser permission.
