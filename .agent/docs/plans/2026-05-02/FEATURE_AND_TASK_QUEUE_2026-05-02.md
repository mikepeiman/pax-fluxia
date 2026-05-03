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
- Added a new top-level settings section:
  - `Frontier FX`
  - mounted from `GameSettingsPanel.svelte`
  - registered in `settingsRegistry.ts`
- Implemented three border-inward frontier surface VFX modes:
  - `soft_fade`
  - `stepped_moat`
  - `plasma_rim`
- Added shared frontier FX helpers:
  - `pax-fluxia/src/lib/territory/frontier/fx.ts`
  - `pax-fluxia/src/lib/territory/frontier/fx.test.ts`
- Wired those FX through the live fill loops in:
  - `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseEdgesFamily.ts`
  - `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridFamily.ts`
- Runtime contract for this step:
  - FX are fill-side only
  - fast sprite fill paths are disabled when FX are active for the frame
  - animated plasma uses the render clock via `nowMs`
- Added renderer-level regression coverage proving:
  - `soft_fade` changes the live Phase Edges fill render
  - `stepped_moat` changes the live Phase Edges fill render
  - `plasma_rim` animates over time on the live Phase Edges fill render

## Next

- Live user verification of the new `Frontier FX` section:
  - the section appears at top level
  - all three modes are visible and reactive
  - `soft_fade`, `stepped_moat`, and `plasma_rim` produce distinct looks
- Add the remaining queued moat/VFX ideas:
  - hot plasma ribbon / heat shimmer frontier as a separate mode from the current `plasma_rim`
  - particle drift / embers / ion sparks along the border
  - geometry-based crenellated or oscillating moat strip
- Keep the VFX split clean:
  - surface-track work can stay in the shared frontier/family layer
  - timed/emitted work should extend territory VFX contracts instead of living only inside the renderer
- Transition-end smoothness / end-of-transition jank:
  - inspect the final 1-3 transition frames vs the first steady-state frame
  - check continuity first, then timing/clock handoff, then easing
  - only add a terminal hold if the underlying handoff is already continuous

## Addendum - Phase Edges UI audit: missing cell size

- Audited the live `metaball_grid_phase_edges` tuning surface after the `Frontier FX` section landed.
- Found one real UI regression class:
  - `Cell Spacing`
  - `Grid Density`
- Cause:
  - both controls still lived in `MetaballGridTuning.svelte`
  - but they were incorrectly gated as if they only applied to the old `Frontier Technique = control` shared-edge path
  - in reality they are core lattice controls for the whole Metaball Grid / Phase Edges family
- Fix:
  - removed the bad applicability gates so both controls are always available again on the Grid module
- Audit result:
  - no other unconditional core Phase Edges controls were dropped in the same way
  - remaining disabled controls are mode-specific by design, such as jitter-only, triangle-only, shader-only, or shared-edge-only controls

## Addendum - Phase Edges 6px perf + memory stabilization slice 1

- Implemented the first structural stabilization pass on the live `metaball_grid_phase_edges` path without changing the accepted look.
- Completed in this slice:
  - gated transition diagnostic capture prep in `GameCanvas.svelte`
  - bounded localized geometry cache in `territoryPresentationSpace.ts`
  - added release-on-evict / release-on-clear to `TransitionSnapshotRecorder.ts`
  - replaced object-per-cell frontier FX arrays with typed sample fields in `frontier/fx.ts`
  - added reusable frontier distance-field buffers in `frontier/distance.ts`
  - reused effective owner index buffers and visible square-bound arrays in both Metaball Grid families
  - changed plan reuse in both families to key from semantic geometry versions instead of fresh localized object refs
- Validation:
  - `bun x vitest run src/lib/territory/frontier/fx.test.ts src/lib/territory/frontier/distance.test.ts src/lib/territory/families/metaballGrid/MetaballGridFamily.test.ts`
  - `bun x vite build`
- Remaining queue under the same perf/memory initiative:
  - re-profile the live 6px settings after this slice
  - inspect whether `buildPlanForCapturedSession(...)` still appears during stable active playback
  - reduce duplicated owner/pair/mirrored phase-layer allocation if the profile still points there
  - then move to the queued end-transition 1-3 frame pop audit

## Addendum - Phase Edges 6px perf + memory stabilization slice 2

- Added another heap-churn reduction in `MetaballGridPhaseEdgesFamily.ts`:
  - pooled per-owner scene occupancy grids
  - reused a stable active-owner occupancy view map
- Why:
  - after slice 1, owner occupancy was still allocating full-grid `Float32Array`s per owner per active frame
  - at 6px that remains expensive enough to matter for Chrome stability
- Revalidated with:
  - `bun .\node_modules\vitest\vitest.mjs run src\lib\territory\frontier\fx.test.ts src\lib\territory\frontier\distance.test.ts src\lib\territory\families\metaballGrid\MetaballGridFamily.test.ts`
  - `bun x vitest run tools/debug/benchmark-frontier-techniques.test.ts`
  - `bun x vite build`
- Remaining queue after slice 2:
  - live ordinary-play and heap re-profile at the exact 6px settings
  - confirm whether `buildPlanForCapturedSession(...)` is now absent or only rare during stable playback
  - if still hot, reduce duplicate pair-layer / mirrored-layer construction next
  - then proceed to the queued end-transition 1-3 frame pop audit
