# Feature And Task Queue - 2026-05-01

## Active
- Verify the new `Live Settings Dump` controls in Diagnostics and confirm the landing-page reload loop is fully gone in the live UI.
- Verify the new desktop HUD top bar in the live app, especially mode shortcut placement, topbar spacing, and the theme shortcut flow.
- Reconcile any stale review findings against the actual current code and UI before treating them as still-open defects.
- Verify the live `Frontier Topology` UI against the normalized shared constraint contract and ensure the surfaced maxima/ranges match the actual applied values.
- Verify the Diagnostics `Show Underlying Geometry` control against active territory modes and confirm it is drawing shared territory geometry truth rather than perimeter-field-only local artifacts.
- Verify the deterministic `MSR` rewrite on the user-reported star-cutting cases, especially the prior bad values around `75px` and above.
- Verify the newly implemented local-interval `MSR` contract in the live UI, including anchors, interval counts, accepted repairs, and the remaining rejected interval on `arena-further`.
- Verify the recalibrated `Star Bias` surface in the live UI and confirm the reduced/normalized control contract behaves as intended.
- Live-verify the restored ownership invariant on `arena-further`, including agreement with `Show Underlying Geometry`.
- Reduce the remaining `MSR` interval failures that still report `Intrusion reached interval start/end` or residual-clearance failure after the local-interval hardening pass.
- Decide whether to retire or normalize the hidden legacy `ModifiedVoronoiRenderer.ts` DX buffer path if that mode is ever reactivated.
- Decide when to remove the legacy `TERRITORY_MSR_STAR_POWER_*` compatibility reader after saved settings/themes have migrated.
- Harden or redesign `Star Bias` so stronger values cannot destabilize ownership through the weighted solve.
- Complete a full `metaball_grid_phase_edges` value/control contract audit, including hidden affecting keys and duplicated UI surfaces.
- Live user verification that the preferred Phase Edges mode remains centered by the star-fit rect.
- Live user verification that `Outer perimeter border` produces a real owner-vs-world perimeter pass in the preferred rounded path.
- Live user verification that `Border Mode = off` leaves no surviving underlying border draw in Phase Edges.
- Live user verification that `Border Mode = territory_edge` no longer stacks a second border path under the intended blended shared-edge border.
- Continue Phase Edges acceptance work after the viewport/world-rect correction and confirm there is no structural fill/border divergence or steady-state/transition border divergence.
- Queue the next Phase Edges acceptance pass after centering/perimeter verification and inspect end-of-transition jank or skipped final frames.

## Completed
### Master-side
- Started today's required dated docs under `.agent/docs/sessions/2026-05-01/` and `.agent/docs/plans/2026-05-01/`.
- Carried forward the key settings-surface context from 2026-04-30 into today's docs set.
- Removed the territory mode strip from `GameSettingsPanel.svelte`.
- Added a dedicated desktop game HUD top bar for FPS/ships, theme shortcuts, quick actions, and territory mode shortcuts.
- Hid the non-active territory modes from active selection and rebuilt the remaining shortcuts as smaller visually distinct buttons.
- Wrote `.agent/docs/project/post-mortems/2026-05-01_settings-global-mode-shortcuts-wrong-surface.md`.
- Documented the territory-shaping constraints audit and correction matrix under `.agent/docs/sessions/2026-05-01/`.
- Separated LP spacing from `MSR` by adding `TERRITORY_CX_CONTEST_PAIR_SPACING`, wiring it through the geometry/render paths, and surfacing it in `Frontier Topology`.
- Normalized the active territory-shaping contract so `MSR`, `CX`, `LP`, and `DX` use one shared limits/defaults contract across `geometryTuning.ts`, `TerritorySettingsBridge.ts`, `GameCanvas.svelte`, and the active Power Voronoi / PVV3 / Metaball / engine consumers.
- Extended the normalized-constraint verification with focused passing tests across bridge, debug, renderer, family-geometry, and architecture-router surfaces.
- Moved `Show Underlying Geometry` into Diagnostics `Mode Diagnostics`, removed the duplicate perimeter-field-only toggle, and rewired the overlay to draw active shared territory render-family geometry truth in `GameCanvas.svelte`.
- Replaced the old force-like `MSR` model with a deterministic explicit frontier-exclusion stage applied in both `Geometry_0319.ts` and `powerVoronoiTerritoryGeometryGenerator.ts`, then rebuilt fill regions from the corrected frontier network.
- Implemented the staged `MSR as star power` redesign, including solve-stage real-star power controls, solve-stage same-owner support-site rings, ray-gated residual repair, config/theme/debug/test wiring, and a corrected default path with support-ring shaping opt-in.
- Implemented the local-interval `MSR` hardening pass with owner-side frontier anchors, midpoint-bounded influence intervals, interval-local subcurve repair, validator-backed connectivity/count guards, and diagnostics summaries threaded to the Diagnostics panel.
- Extended `minStarMargin.test.ts` with locality, midpoint, and `arena-further` preservation tests and verified the hardening path with a focused passing suite.
- Recalibrated solve-time star resistance into one normalized surfaced `Star Bias` control while keeping the old star-power keys as compatibility-only readers.
- Fixed two geometry invariant root causes on `arena-further`: virtual corridor/disconnect sites can no longer beat a real star at its own point, and zero/negative corridor/disconnect multipliers remain zero instead of snapping back to fallback weights.
- Tightened the `MSR` repair validator so repairs are rejected if they eject any owned star from all owner-matching regions.
- Re-verified the active geometry path on `arena-further` from `9` bad owned stars outside owner-matching regions down to `0`.

### Phase Edges branch-side
- Audited the map/viewport defect as a world-rect ownership bug, not a CSS-only issue.
- Added authoritative map-rect helpers in `worldRect.ts`, localized presentation-space helpers in `territoryPresentationSpace.ts`, and associated tests.
- Rewired `GameCanvas.svelte` to correctly separate star-fit camera rect, stable authored/display map rect, and territory presentation frame, then corrected the first false-start theory and restored star-fit centering while keeping map ownership coherent.
- Added fallback protection so stale configured map extents cannot clip a live star field, and seeded debug/saved-map metadata in `gameStore.svelte.ts` for non-standard flows.
- Added a first-class `TERRITORY_FRONTIER_OUTER_BORDER_ENABLED` toggle and surfaced it in `Territory Styles > Border` as `Outer perimeter border`.
- Corrected the Phase Edges centered-blended edge path so owner-vs-world perimeter edges are drawn by an explicit perimeter pass rather than leaking from owner-owner adjacency.
- Preserved global grid phase through the viewport-local presentation frame and added regression coverage for localized frame phase preservation.
- Corrected Phase Edges border-layer ownership so stale contour/shader paths do not survive under shared-edge control, `Border Mode = off` truly clears border output, and shared-edge `territory_edge` borders remain on the intended base layer only.
- Completed a first-pass Phase Edges contract audit, including hidden/unreachable affecting values such as `CHAIKIN_BOUNDARY_PAD`, `CHAIKIN_BOUNDARY_EPS`, `TERRITORY_CLUSTER_SPLIT`, `VORONOI_BORDER_SMOOTH`, and the misleading placement of `FRONTIER_RESOLUTION`.
- Improved the Phase Edges style-surface UX by exposing unmet gating reasons for `Junction Render`, `Shared Edge Smoothing`, and `Junction Gap Trim`.
- Added `computeBoundaryInset(...)`, surfaced `METABALL_GRID_BOUNDARY_FILL_FLUSH` as `Flush Boundary Fill`, and rewired both Metaball Grid families so boundary fill no longer secretly inherits `Cell Inset` and `Junction Gap Trim` when flush mode is enabled.
- Rewired the Phase Edges outer perimeter pass so it derives from occupied territory bounds rather than fullscreen/local presentation-frame dimensions.
- Added `computeSquareCellEdgeInsets(...)` and switched both Metaball Grid families from uniform square-cell shrink to per-edge inset ownership so fill behavior can follow real shared/world edges.
- Corrected `frontier/surface.ts` so the shared-edge recipe uses `fillSource = scene_cells` and `usesPhaseFill = false`, and updated `MetaballGridPhaseEdgesFamily.ts` so centered-blended shared-edge borders no longer build/render the phase fill overlay path.
- Added `METABALL_GRID_BOUNDARY_FILL_FLUSH` into both family paint signatures so toggling the boundary-fill mode cannot be skipped by the dirty-frame gate.

## Next
- Re-verify the live UI before calling the territory mode shortcut relocation complete.
- Keep today's queue updated as soon as a new concrete task or verified defect is identified.
- The shared active-mode territory constraint contract is now normalized. The next territory follow-through is live UI verification, then hidden legacy-path cleanup only if those paths are intended to remain revivable.
- Live-verify the current `arena-further` fixes in the app with `Show Underlying Geometry`.
- Inspect the remaining localized `MSR=75` interval-start / interval-end diagnostics, especially around `star-17`.
- Decide whether the remaining unresolved intervals need a smarter splice rule or only a better local radius cap.
- Deliver the user-facing contract audit report for `metaball_grid_phase_edges`, including every affecting value, UI location if present, duplicate/misleading placement if applicable, and hidden/non-UI affecting values.
- If the right-side fill margin remains after the border-layer ownership fix, inspect whether any fill suppression/occupancy layer is still dropping the last visible owner column rather than a border-path problem.
- If the outer perimeter still fails live after the branch-ownership correction, inspect whether the clipped-frame interval collector is not covering the contour-matched rounded path rather than a state propagation problem.
- After those live checks pass, start the queued transition end-jank investigation.

## Addenda
### Boundary-fill ownership and fullscreen perimeter correction
- Keep outer perimeter visible in fullscreen by deriving it from occupied map coverage, not the resized fullscreen frame.
- Keep fills flush to the border by default.
- Make `Inward Offset` the explicit frontier pullback control.
- Expose a direct `Flush Boundary Fill` control instead of silently inheriting pullback from other knobs.

### Directional boundary fill for shared-edge borders
- The key comparison remained:
  - `Centered-blended borders = Off` => fills look correct.
  - `Centered-blended borders = On` => fills are inset.
- The corrective direction was to move fill ownership from uniform four-sided inset to per-edge ownership aligned to true shared/world edges.

### Centered-blended shared-edge fill ownership correction
- The shared-edge recipe must remain border-only.
- The canonical fill path must remain the non-phase-fill `scene_cells` path.
- `Centered-blended borders = On` must not silently switch fill geometry ownership.
