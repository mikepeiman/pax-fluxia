# Feature And Task Queue - 2026-05-02

## Active

- Phase Edges fill/border divergence:
  - make `Centered-blended borders` border-only
  - keep the non-blended fill path as the canonical fill path
  - move boundary fill ownership from transition scene roles to ownership-frontier classification
  - move centered-blended border geometry onto the same visible fill boundary instead of the abstract grid edge
  - verify `Inward Offset` and `Flush Boundary Fill` change fill coverage in both centered-blended states
- Preserve outer-perimeter behavior after the visible-boundary geometry change
- Keep the merge-back handoff current so this worktree can be rolled into `master` without losing the renderer contract

## Completed Today

- Removed the active directional square fill branch from both Metaball Grid families
- Added shared ownership-boundary classification helper for fill/border ownership
- Added renderer-level regression tests comparing centered-blended on/off fill coverage
- Updated style help text so `Centered-blended borders` is explicitly described as border-only
- Rebuilt centered-blended border segments in both Metaball Grid families from visible square cell bounds instead of abstract lattice vertices
- Routed outer perimeter interval collection through those same visible square cell bounds
- Audited the live settings path and confirmed the running mode was `marching_triangles_gradient`, not the shared-edge control path
- Corrected the contour-technique surface contract so `Centered-blended borders` no longer grants phase-fill ownership to contour techniques
- Split pair-layer border generation from fill-layer generation in Phase Edges so pairwise blended contour borders do not silently swap fill geometry
- Audited repo VFX architecture references and documented the current alignment/gap with the frontier FX plan in:
  - `.agent/docs/sessions/2026-05-02/2026-05-02_vfx-architecture-alignment-audit.md`
- Incorporated the VFX architecture split into the active frontier FX plan:
  - `surface track` stays in the shared frontier/family layer
  - `timed VFX track` must extend territory VFX contracts or family `events[]`
- Implemented the first surface-track step:
  - new shared frontier-distance utility at `pax-fluxia/src/lib/territory/frontier/distance.ts`
  - new tests at `pax-fluxia/src/lib/territory/frontier/distance.test.ts`
  - both `MetaballGridPhaseEdgesFamily.ts` and `MetaballGridFamily.ts` now consume frontier-distance-derived visible square bounds instead of the old single-ring boundary inset owner
- Split the old boundary inset contract in `edgeShaping.ts`:
  - `computeBoundaryInset(...)` remains the clamped legacy helper
  - `computeBoundaryOffsetTargetPx(...)` now exposes the true unbounded target width for distance-band ownership
- Refined the clean-offset behavior:
  - whole inner bands now suppress once the requested offset reaches the band centerline
  - this removes the persistent remnant/dot row at higher offsets
  - it also removes the special `24px` snap condition that came from the next band reappearing at the old slider cap
- Widened the visible `Inward Offset` slider range in `TerritorySurfaceStyleTuning.svelte` from `24px` to `60px`
- Fixed the active overwrite bug in both Metaball Grid families:
  - fully suppressed square bands from the new frontier-distance offset path were falling through to the legacy `drawFilledGridCell(...)` path
  - that meant offset-removed cells were being repainted anyway
  - the square fill loops now skip those cells instead of repainting them
- Added a renderer-level regression for the live failure shape:
  - `spacing = 12`
  - `territory_edge`
  - `borderBlend = true`
  - compare offset `23px` vs `24px`
  - assert the `24px` result does not grow back through repaint fallback

## Next

- User verification in the live app:
  - does the missing-margin / inset gap finally disappear when `Centered-blended borders` is on?
  - do `Inward Offset` and `Flush Boundary Fill` now visibly affect the fill?
  - does the centered-blended outer perimeter still behave correctly after the visible-boundary geometry change?
- Specific inward-offset verification:
  - no remnant row of tiny squares should persist at high offsets unless there is still a live path not yet covered by the new skip logic
  - no special snap should occur at `24px`
  - the slider should now run to `60px`
- If live verification still shows repaint/glitch behavior, trace whether a second fill layer or mesh pass is still drawing suppressed cells after the square-loop skip fix
- If live verification still shows a one-ring effect without repaint, trace whether the remaining clamp is now only at the final visible-bounds mapping stage instead of the old frontier-owner stage
- Rework `Inward Offset` to match the actual requirement:
  - not a one-ring per-cell shrink on the frontier-adjacent squares
  - a global, variable-width clean offset measured from the frontier itself
  - alternate stepped fallback: pixellated distance bands where outermost cells shrink most and deeper rows shrink less
- Add a new top-level settings section:
  - `Frontier FX`
  - own all offset / moat / border-adjacent VFX tuning there
- Keep `Frontier FX` split conceptually into:
  - surface shaping / style that can live in the family
  - timed/emitted VFX that should extend territory VFX contracts instead of being hidden inside the renderer
- VFX ideation queue for border moats / gradients:
  - stepped square moat bands
  - hot plasma ribbon / heat shimmer frontier
  - particle drift / embers / ion sparks along the border
  - geometry-based crenellated or oscillating moat strip
- Transition-end smoothness / end-of-transition jank:
  - inspect final 1-3 transition frames vs first steady-state frame
  - prefer continuity/timing fix before adding terminal hold frames
