# Feature And Task Queue - 2026-05-02

## Active
- Harden territory `MSR` as a consistent local frontier-clearance operator.
- Improve frontier splice quality so `MSR` cutouts read as organic local boundary adjustments instead of stamped semicircles.
- Phase Edges fill/border divergence:
  - keep `Centered-blended borders` border-only
  - keep the non-blended fill path as the canonical fill path
  - move boundary fill ownership from transition scene roles to ownership-frontier classification
  - move centered-blended border geometry onto the same visible fill boundary instead of the abstract grid edge
  - verify `Inward Offset` and `Flush Boundary Fill` change fill coverage in both centered-blended states
- Preserve outer-perimeter behavior after the visible-boundary geometry change.
- Keep the merge-back handoff current so this worktree can be rolled into `master` without losing the renderer contract.

## Completed Today
- Removed the active directional square fill branch from both Metaball Grid families.
- Added a shared ownership-boundary classification helper for fill/border ownership.
- Added renderer-level regression tests comparing centered-blended on/off fill coverage.
- Updated style help text so `Centered-blended borders` is explicitly described as border-only.
- Rebuilt centered-blended border segments in both Metaball Grid families from visible square cell bounds instead of abstract lattice vertices.
- Routed outer perimeter interval collection through those same visible square cell bounds.
- Audited the live settings path and confirmed the running mode was `marching_triangles_gradient`, not the shared-edge control path.
- Corrected the contour-technique surface contract so `Centered-blended borders` no longer grants phase-fill ownership to contour techniques.
- Split pair-layer border generation from fill-layer generation in Phase Edges so pairwise blended contour borders do not silently swap fill geometry.
- Audited repo VFX architecture references and documented the current alignment/gap with the frontier FX plan under `.agent/docs/sessions/2026-05-02/`.
- Incorporated the VFX architecture split into the active frontier FX plan:
  - `surface track` stays in the shared frontier/family layer
  - `timed VFX track` must extend territory VFX contracts or family `events[]`
- Implemented the first surface-track step:
  - new shared frontier-distance utility at `pax-fluxia/src/lib/territory/frontier/distance.ts`
  - new tests at `pax-fluxia/src/lib/territory/frontier/distance.test.ts`
  - both `MetaballGridPhaseEdgesFamily.ts` and `MetaballGridFamily.ts` now consume frontier-distance-derived visible square bounds instead of the old single-ring boundary inset owner
- Split the old boundary inset contract in `edgeShaping.ts` so `computeBoundaryInset(...)` remains the clamped legacy helper while `computeBoundaryOffsetTargetPx(...)` exposes the true unbounded target width for distance-band ownership.
- Refined clean-offset behavior so whole inner bands suppress once the requested offset reaches the band centerline, removing the persistent remnant/dot row and the old `24px` snap condition.
- Widened the visible `Inward Offset` slider range in `TerritorySurfaceStyleTuning.svelte` from `24px` to `60px`.
- Fixed the active overwrite bug in both Metaball Grid families where offset-removed cells were falling through to the legacy `drawFilledGridCell(...)` path and being repainted anyway.
- Added a renderer-level regression for the live failure shape around `spacing = 12`, `territory_edge`, `borderBlend = true`, and offset `23px` vs `24px`.
- Added a new top-level settings section `Frontier FX`, mounted from `GameSettingsPanel.svelte` and registered in `settingsRegistry.ts`.
- Implemented three border-inward frontier surface VFX modes: `soft_fade`, `stepped_moat`, and `plasma_rim`.
- Added shared frontier FX helpers in `pax-fluxia/src/lib/territory/frontier/fx.ts` and `fx.test.ts`.
- Wired those FX through the live fill loops in `MetaballGridPhaseEdgesFamily.ts` and `MetaballGridFamily.ts`.
- Locked the runtime contract for this step:
  - FX are fill-side only
  - fast sprite fill paths are disabled when FX are active for the frame
  - animated plasma uses the render clock via `nowMs`
- Added renderer-level regression coverage proving `soft_fade` and `stepped_moat` change the live Phase Edges fill render and `plasma_rim` animates over time.
- Audited the live `metaball_grid_phase_edges` tuning surface after `Frontier FX` landed and restored the always-applicable `Cell Spacing` and `Grid Density` controls to the Grid module.
- Implemented the first structural 6px perf/memory stabilization pass:
  - gated transition diagnostic capture prep in `GameCanvas.svelte`
  - bounded localized geometry cache in `territoryPresentationSpace.ts`
  - added release-on-evict / release-on-clear to `TransitionSnapshotRecorder.ts`
  - replaced object-per-cell frontier FX arrays with typed sample fields in `frontier/fx.ts`
  - added reusable frontier distance-field buffers in `frontier/distance.ts`
  - reused effective owner index buffers and visible square-bound arrays in both Metaball Grid families
  - changed plan reuse in both families to key from semantic geometry versions instead of fresh localized object refs
- Implemented a second heap-churn reduction in `MetaballGridPhaseEdgesFamily.ts` by pooling per-owner scene occupancy grids and reusing a stable active-owner occupancy view map.
- Revalidated the 6px stabilization slices with focused Vitest runs and `vite build`.
- Carried forward the local `MSR` hardening track:
  - interval-cap + blended-splice pass
  - follow-up verification targets for no-anchor stars (`star-25`, `star-56`)
  - possible Diagnostics UI surfacing for requested-vs-effective local `MSR`

## Next
- Verify live render quality on the user's bad-star cases after the interval-cap + blended-splice pass.
- Inspect remaining no-anchor stars (`star-25`, `star-56`) and confirm whether they are valid exclusions or need anchor-assignment refinement.
- If needed, surface requested-vs-effective local `MSR` in Diagnostics UI.
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
- Re-profile the live 6px settings after the stabilization slices.
- Confirm whether `buildPlanForCapturedSession(...)` is now absent or only rare during stable playback.
- If still hot, reduce duplicate pair-layer / mirrored-layer construction next.
- Then proceed to the queued end-transition 1-3 frame pop audit.

## Addenda
### Phase Edges UI audit: missing cell size
- The real UI regression class was that `Cell Spacing` and `Grid Density` still lived in `MetaballGridTuning.svelte` but were incorrectly gated as if they only applied to the old shared-edge control path.
- Audit result: no other unconditional core Phase Edges controls were dropped the same way; remaining disabled controls were mode-specific by design.

### Phase Edges 6px perf + memory stabilization
- Slice 1 focused on cache/lifecycle churn, plan-key stability, reusable typed buffers, and diagnostics gating.
- Slice 2 focused on pooled per-owner occupancy grids and a stable active-owner occupancy view map.
- Remaining queue: live profiling, confirmation that `buildPlanForCapturedSession(...)` is no longer a steady-play hotspot, possible pair-layer/mirrored-layer reductions, and then the transition-end pop audit.
