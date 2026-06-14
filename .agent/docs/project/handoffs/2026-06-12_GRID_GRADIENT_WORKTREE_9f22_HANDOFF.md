# Handoff: Grid Gradient Worktree 9f22

**Date:** 2026-06-12
**Worktree:** `C:\Users\mikep\.codex\worktrees\9f22\pax-fluxia`
**Branch:** `codex/grid-gradient-territory-mode`
**Status:** Active production-candidate mode, performance-gated.

This is the current handoff for Grid Gradient work in worktree `9f22`. The older May handoff only covers the initial mode implementation and is superseded by this file.

## Mode Summary

Grid Gradient is a territory render-family mode. It uses existing PV geometry and ownership data, then renders fills as a fine invisible grid of marks. Marks are larger in region interiors and shrink toward borders. Geometry and ownership remain outside the renderer; Grid Gradient owns presentation, shader-field packing, dot sizing, border-dot presentation, diagnostics, and transition rendering.

Runtime shape:

- Render-family mode id: `grid_gradient`.
- Not a direct legacy renderer.
- Not a separate pipeline runtime.
- Active backend should remain an implementation detail; do not expose duplicate player-facing backend choices unless the user explicitly asks for that product surface.

Boundary map:

- Ownership: authoritative star/player state and conquest events from game state.
- Geometry: PV/frontier geometry, especially `power_voronoi_0319`.
- Transition: render-family conquest lifecycle and Grid Gradient PRE/POST dot-grid blend.
- Presentation: shader-field dots, CPU fallback, vector borders, optional dotted borders, diagnostics, and UI controls.

## Current User-Visible State

Preserve these behaviors:

- Grid Gradient fills and borders are visible again.
- Vector border positioning was corrected.
- Pure fill and point-fill coordinate alignment was corrected.
- Fill conquest transitions are visible.
- Star ownership ring/glow transitions blend instead of snapping.
- Fill transition terminal frame now matches the settled next state visually.

Still not acceptable:

- Performance jank remains too high.
- Latest Chrome traces show both selected-frame geometry spikes and whole-record steady-state frame pressure.
- User requirement: major performance improvements only, with no visual quality compromise.

## Recent Commit Trail

- `15aab8d03 Make Grid Gradient fill transitions visible`
- `9fb54969d Smooth Grid Gradient conquest transitions`
- `629a16ee9 Align Grid Gradient transition endpoints`
- `0004c8720 Document Grid Gradient performance plan`
- `2e7d7304f Optimize Grid Gradient plan builds`
- `fd5bdbf19 Document next Grid Gradient perf plan`
- `034640134 Clarify Grid Gradient frame envelope costs`
- `07f03d8e5 Document deeper Grid Gradient perf targets`

## Key Source Files

Grid Gradient mode:

- `pax-fluxia/src/lib/territory/families/gridGradient/GridGradientFamily.ts`
- `pax-fluxia/src/lib/territory/families/gridGradient/gridGradientPlan.worker.ts`
- `pax-fluxia/src/lib/territory/families/gridGradient/gridGradientPlanWorkerTypes.ts`
- `pax-fluxia/src/lib/territory/families/gridGradient/typedClassification.ts`
- `pax-fluxia/src/lib/territory/families/gridGradient/shaderField/GridGradientShaderFieldRenderer.ts`
- `pax-fluxia/src/lib/territory/families/gridGradient/shaderField/gridGradientShaderFieldPacking.ts`
- `pax-fluxia/src/lib/territory/families/gridGradient/shaderField/gridGradientShaderFieldShaders.ts`

Runtime dispatch and settings:

- `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- `pax-fluxia/src/lib/territory/ui/territoryRenderModeCatalog.ts`
- `pax-fluxia/src/lib/territory/integration/TerritoryArchitectureRouter.ts`
- `pax-fluxia/src/lib/components/ui/settings/GridGradientTuning.svelte`
- `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
- `pax-fluxia/src/lib/config/game.config.ts`

Geometry and frontier hot paths:

- `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts`
- `pax-fluxia/src/lib/territory/geometry/minStarMargin.ts`
- `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`
- `pax-fluxia/src/lib/territory/geometry/resolveConstraintAlignedTerritoryGeometry.ts`
- `pax-fluxia/src/lib/territory/compiler/chainWalkCore.ts`

Steady-state frame hot paths exposed by latest trace:

- `pax-fluxia/src/lib/renderers/ShipRenderer.ts`
- `pax-fluxia/src/lib/utils/render.utils.ts`
- `pax-fluxia/src/lib/perf/perfProbe.ts`

## Current Performance Evidence

Latest plan:

- `.agent/docs/plans/2026-06-12/GRID_GRADIENT_PERFORMANCE_GEOMETRY_TOP10_PLAN_2026-06-12.md`

Earlier major fix plan:

- `.agent/docs/plans/2026-06-12/GRID_GRADIENT_PERFORMANCE_MAJOR_FIX_PLAN_2026-06-12.md`

Selected red-frame top costs from latest screenshots:

- `computeGeometry0319`: about `82.9 ms`.
- `applyIntervalRepairs`: about `60.5 ms`.
- `constructFillsFromFrontierChain`: about `43.8 ms` total, `37.8 ms` self.
- `buildDirectedSegmentKeys`: about `21.6 ms` total, `21.1 ms` self.

Whole-record top costs from latest screenshots:

- `measurePerf`: about `11929.6 ms` total, `2997.0 ms` self.
- `presentShipsFrame` / `renderShips`: about `8.6 s` total.
- `getOrbitSlot`: about `1702.7 ms` total, `1667.8 ms` self.
- Pixi `set tint`: about `1259.8 ms` total, `975.5 ms` self.
- `ParticleBuffer.update`: about `1320.3 ms` total.
- `GridGradientFamily.worker.onmessage`: about `712.8 ms` total, `681.2 ms` self.
- `getRenderFamilyModeConfigSource`: about `622.1 ms` total, `602.3 ms` self.
- `countRoles`: about `284.2 ms` total, `277.0 ms` self.

## Next Work Order

1. Add frame-budget instrumentation that separates ship render, ship particle upload, territory queue, territory present, geometry compile, Grid Gradient worker commit, Pixi render, and diagnostics UI.
2. Memoize `getRenderFamilyModeConfigSource()` by mode plus settings/config epoch.
3. Reduce Grid Gradient worker commit and diagnostics cost:
   - transfer typed arrays rather than cloning rich plan objects
   - precompute stable role counts in the worker
   - avoid full-grid `countRoles()` scans on every update
   - throttle diagnostics-store updates
4. Optimize ship steady-state rendering:
   - precompute per-star orbit slot tables
   - skip unchanged particle tint writes
   - hide only particle-pool deltas when active particle count shrinks
   - reduce particle buffer dirty work without dropping glow, outline, fill, damage, or travel visuals
5. Move `power_voronoi_0319` render-family geometry compilation off the animation frame.
6. Share `constructFillsFromFrontierChain()` / `executeChainWalk()` outputs inside `computeGeometry0319()`.
7. Replace repeated string segment-key work in `ringContainsPolyline()` / `buildDirectedSegmentKeys()` with numeric point/segment ids.
8. Optimize `applyIntervalRepairs()` ref lookup, metrics caching, and materialization.

## Validation State

Latest code-validation state before the doc-only performance handoff updates:

- Focused Grid Gradient/transition/star tests passed after transition endpoint work.
- `bun run build` in `pax-fluxia/` passed after transition endpoint work.
- Focused Grid Gradient typed classification, shader packing, scene, shader, trace logger, and related Metaball Grid tests passed after worker/raster optimization.
- `bun run build` in `pax-fluxia/` passed after worker/raster optimization.

Latest commits `034640134` and `07f03d8e5` were documentation-only; no Bun tests/build were run for those doc-only commits.

## External Agent Notes

- Use Bun only.
- Preserve the render-family runtime shape.
- Do not duplicate ownership truth or fabricate geometry inside Grid Gradient.
- Do not add a direct renderer path from `GameCanvas.svelte`.
- Do not remove, hide, or disable visible controls without tracing the control and documenting why.
- Every active visible Grid Gradient control must either affect the active runtime/backend or be clearly scoped/disabled.
- Performance fixes must preserve visual quality and the current accepted transition endpoint behavior.
- If a raw Chrome trace is requested, use DevTools Performance recording and export/save the profile JSON, plus provide bottom-up screenshots sorted by total time and self time for both the whole record and selected red sections.
