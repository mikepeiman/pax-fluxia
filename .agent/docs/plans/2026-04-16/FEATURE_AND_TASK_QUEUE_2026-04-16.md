# Feature And Task Queue - 2026-04-16

## Purpose

Diagnose why imported and saved themes were not activating the expected territory render modes, correct the live apply path, and record the regression/process failure honestly.

## Completed This Slice

- [x] Accept the user report as ground truth that the imported theme audit was wrong in live app behavior.
- [x] Trace the real theme apply path through `pax-fluxia/src/lib/stores/themeStore.svelte.ts`, `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`, `pax-fluxia/src/lib/components/ui/settingsState.ts`, and `pax-fluxia/src/lib/components/game/GameCanvas.svelte`.
- [x] Prove the actual regression cause: themes that omit `TERRITORY_RENDER_MODE` inherit the currently active renderer instead of reaching legacy boolean fallback.
- [x] Normalize legacy theme values to an explicit `TERRITORY_RENDER_MODE` in `pax-fluxia/src/lib/config/themeRouting.ts`.
- [x] Apply normalization to built-in theme loading in `pax-fluxia/src/lib/config/builtinThemes.ts`.
- [x] Apply normalization to user theme import/load paths in `pax-fluxia/src/lib/stores/themeStore.svelte.ts`.
- [x] Route canvas-side active territory-mode resolution through the same helper in `pax-fluxia/src/lib/components/game/GameCanvas.svelte`.
- [x] Add focused verification coverage in `pax-fluxia/src/lib/config/themeRouting.test.ts`.
- [x] Clean up imported and user-theme names so they resolve to a semantic label plus date, using source filenames when available and generated render-family names as fallback.
- [x] Add naming coverage in `pax-fluxia/src/lib/config/themeNames.test.ts`.
- [x] Write the required post-mortem at `.agent/docs/project/post-mortems/2026-04-16-theme-import-regression.md`.
- [x] Trace the branch screenshot mismatch far enough to prove the attached images are not the same runtime state: different theme selection, different theme counts, different tick values, different commander totals, and different map topology.
- [x] Verify that `pax-theme-apr_16_metaball_tweak-2026-04-16T18-11-44.json` matches the `codex/perimeter-field-audit-20260414` worktree live settings exactly, while `master` differs only on `CONQUEST_TRAVEL_SPEED`.
- [x] Prove the `MetaballRenderer` perf rewrite is not the primary semantic break by reproducing old/new owner-grid equivalence on synthetic scenes.
- [x] Fix a real shared-renderer cache bug: scene-driven `influenceRadiusPx` / `ownershipMarginPx` were omitted from the metaball/perimeter cache fingerprint, allowing stale field reuse across theme changes inside the same render family.
- [x] Add focused regression coverage in `pax-fluxia/src/lib/renderers/MetaballRenderer.test.ts`.
- [x] Definitively identify the live theme-apply wiring gap: `themeStore.applyTheme()` fell back to a raw `applyThemeToConfig()` path whenever `GameSettingsPanel` was unmounted, so sidebar theme selection skipped the panel/runtime synchronization path entirely.
- [x] Identify the specific background mismatch bug inside the mounted apply path: `applyConfigPatch()` wrote `GAME_CONFIG.BG_IMAGE_URL` before visual sync, suppressing the `pax-bg-change` event and allowing the previous background sprite to persist.
- [x] Compare the user-provided `current-settings 1420 master thread.json` and `current-settings 1422 rendering branch.json` files and verify that the imported theme did not diverge on any actual perimeter-field geometry/constraint tunables.
- [x] Prove the remaining live-setting deltas are runtime-only fields: `_MAP_HEX_RADIUS`, `_MAP_WIDTH`, `_MAP_HEIGHT`, `_MAP_PADDING_X`, `_MAP_PADDING_Y`, and `__TERRITORY_VISUAL_EPOCH`.
- [x] Trace perimeter-field geometry inputs to confirm `_MAP_*` values are only used for the debug hex overlay, while perimeter-field geometry itself is built from `star.ownerId`, star positions, lane endpoints, and the geometry tunables in `buildPerimeterFieldRenderFamilyGeometry()`.
- [x] Identify and fix a separate theme hygiene bug: exported/imported themes were still carrying `__TERRITORY_VISUAL_EPOCH`, a runtime cache-invalidation counter that should never serialize.
- [x] Add focused coverage in `pax-fluxia/src/lib/config/themes.test.ts` so theme snapshot/apply paths ignore internal runtime keys.
- [x] Diff `master` against `codex/perimeter-field-audit-20260414` and identify the concrete branch wiring gap: the rendering branch still lacks the `applyConfigPatch()` side effects that dispatch background events and bump territory visual invalidation after theme import/apply.
- [x] Prove the remaining geometry divergence path is stale paused-render state, not different owner assignment: `GameCanvas.svelte` was using a hand-built `territoryConfigFp` that omitted geometry-driving keys like `FRONTIER_RESOLUTION`, `CHAIKIN_BOUNDARY_PAD`, `CHAIKIN_BOUNDARY_EPS`, `PERIMETER_FIELD_GEOMETRY_SOURCE`, `TERRITORY_FILL_MODE`, `TERRITORY_FILL_TRANSITION_MODE`, `TERRITORY_BORDER_TRANSITION_MODE`, and `TERRITORY_STYLE_MODE`.
- [x] Replace the narrow paused-render fingerprint with `pax-fluxia/src/lib/territory/buildTerritoryConfigFingerprint.ts` and add focused coverage in `pax-fluxia/src/lib/territory/buildTerritoryConfigFingerprint.test.ts`.
- [x] Write a separate post-mortem for the conversational/diagnostic failure: repeatedly contradicting controlled user feedback, reusing dead hypotheses, and continuing to misframe the defect after explicit correction.
- [x] Trace the cyan perimeter debug chords in metaball perimeter-field mode back to the actual geometry source and confirm they are upstream of metaball sampling, not a downstream field-only artifact.
- [x] Identify the structural geometry bug in `constructFillsFromFrontierChain()`: partial-open chain-walk output was still being promoted into `MergedTerritory` fill polygons and then implicitly closed later, creating bogus long closure chords.
- [x] Patch `constructFillsFromFrontierChain()` to drop clearly open loops and only repair small near-closure gaps within the existing tolerance, then add focused regression coverage in `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.test.ts`.
- [x] Correct the adapted power-voronoi diagnostics in `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts` so `closureReliable` reflects actual loop closure instead of always claiming success.
- [x] Accept the user report that the prior open-loop fix was insufficient because the same erroneous disconnected geometry persisted on the same topology.
- [x] Prove the live `power_voronoi_0319` path still uses corridor and disconnect virtual stars with aggressive settings (`MODIFIED_VORONOI_CORRIDOR_ENABLED=true`, `TERRITORY_CX_COUNT=12`, `TERRITORY_CX_WEIGHT=1.25`, `MODIFIED_VORONOI_DISCONNECT_ENABLED=true`, `TERRITORY_DX_WEIGHT=0.95`), making high-degree junctions plausible on long lanes.
- [x] Build a synthetic repro showing that `chainSharedEdgesIntoPolylines()` is order-dependent at a branched junction: the same edge graph produces a spur-crossing chain when the spur edge is inserted earlier.
- [x] Build a second synthetic repro showing that `constructFillsFromFrontierChain()` can emit a bogus disconnected owner fill at a junction by taking the first available spur instead of the clockwise-adjacent boundary continuation.
- [x] Replace the greedy `first unused edge` junction traversal in `chainSharedEdgesIntoPolylines()`, `mergeSameOwnerCells()`, and `executeChainWalk()` with clockwise-adjacent angular traversal via `pax-fluxia/src/lib/territory/compiler/planarWalk.ts`.
- [x] Add focused regression coverage proving the patched walkers keep the intended loop intact at branched junctions instead of crossing into the first spur by insertion order.
- [x] Stop further root-cause claims after the user verified the live geometry remained unchanged and instead add a deterministic perimeter-field artifact export path that captures the exact on-screen debug snapshot, current generator inputs, virtual-site inputs, and a same-settings `power_voronoi_0319` recomputation for side-by-side provenance tracing.
- [x] Add an explicit `Export Geometry Artifact` control to `pax-fluxia/src/lib/components/ui/settings/PerimeterFieldTuning.svelte` and wire it through `pax-fluxia/src/lib/components/game/GameCanvas.svelte` to `pax-fluxia/src/lib/territory/devtools/perimeterFieldGeometryArtifact.ts`.
- [x] Refactor the `power_voronoi_0319` settings builder in `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts` into an exported helper so the live renderer path and the artifact recomputation path use the same generator settings.
- [x] Use the exported artifact `pax-perimeter-field-geometry-artifact-2026-04-16T22-43-57-191Z.json` to prove that the missing perimeter vstars were not a sampler omission: `power_voronoi_0319` emitted 64 `ai-1` cells but zero merged territories and zero `ai-1|world` border polylines, so the owner disappeared before perimeter-field sample generation.
- [x] Identify the concrete cause in `mergeSameOwnerCells()`: near-closed owner shells were still being dropped unless the final vertex matched the start vertex exactly, even though later chain-walk fill reconstruction already accepted the same loop under the existing `6px` closure tolerance.
- [x] Patch `mergeSameOwnerCells()` to repair near-closed shells by explicitly closing them within tolerance, then add focused regression coverage in `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.test.ts`.
- [x] Verify the artifact repro after the patch: recomputed `Geometry_0319` now restores `ai-1` merged territories and emits `ai-1|world` border polylines, unblocking perimeter-field sample generation for those previously missing regions.
- [x] Add replay/scrub conquest highlighting in `pax-fluxia/src/lib/components/game/GameCanvas.svelte` so explicit perimeter-field preview frames illustrate attacker stars, target stars, and conquest vectors on top of the selected replay frame.
- [x] Identify the replay scrub `0 frames` defect in this branch: perimeter-field diagnostic capture was silently gated behind the separate global `transitionSnapshotRecorder` toggle in `ControlsSection-Debug.svelte`, so enabling perimeter-field preview alone still hard-reset the replay store to empty.
- [x] Decouple perimeter-field scrub capture from the global recorder by letting `syncPerimeterFieldDiagnosticCapture()` run when either perimeter-field preview or the global snapshot recorder is enabled.

## In Progress

- [ ] User verification that older legacy themes now switch into their expected render families in the live app.
- [ ] User verification that explicit-mode themes like `pax-theme-apr_15_metaball-2026-04-16T16-40-14.json` still reproduce as expected.
- [ ] User verification of the renderer-cache fix using perimeter-field themes that differ mainly by influence radius / ownership-margin-adjacent behavior.
- [ ] User verification that sidebar theme selection now fully refreshes background, alpha, and territory visuals even with the settings panel closed.

## Notes

- The imported pack from `C:\Users\mikep\Downloads\Pax Themes` was not actually committed into `pax-fluxia/src/lib/config/builtin-themes/`; the live bug here is theme application semantics, not missing JSON files in the repo.
- The fix is intentionally small: make legacy themes self-contained at load/import/apply time instead of depending on ambient `GAME_CONFIG` state.
- The decisive bug was architectural, not in `MetaballRenderer` winner resolution: theme application had two runtime paths. `GameSettingsPanel` registered the canonical apply callback only while mounted, but the always-visible sidebar selector still called `themeStore.applyTheme()`. With the panel closed, that path wrote config values without the visual/runtime sync side effects.
- The two user-provided live settings files differ only on runtime map metadata and a visual-epoch counter. The theme file `pax-theme-apr_16_metaball_tweak-2026-04-16T18-11-44.json` does not contain `_MAP_*` fields at all, so those values cannot be reconciled through theme import/export.
- Earlier queue notes incorrectly blamed commander/ownership drift for the geometry mismatch. The user was right to reject that. The confirmed geometry divergence is stale render state: the rendering branch can update `GAME_CONFIG` and visible controls while a paused perimeter-field frame still reuses old geometry because the invalidation fingerprint missed several geometry-driving keys.
- The cross-branch visual mismatch is the combination of two issues: the rendering branch is missing the theme-apply side effects now present on `master`, and the paused `GameCanvas` invalidation path was too narrow to force a re-render when imported themes changed omitted geometry keys.
- The screenshot-annotated cyan lines were a real geometry defect. In metaball perimeter-field mode, the cyan overlay comes from `debugSnapshot.displayGeometry`, which is the canonical geometry fed into perimeter-field sampling. The metaball field did not invent those chords; it inherited them from permissive fill reconstruction upstream.
- The root cause was in `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`: `constructFillsFromFrontierChain()` flattened chain-walk output into fill polygons even when `loop.closed === false`. Those partial-open chains then got implicitly closed later by polygon consumers/debug drawing, producing the erroneous long straight segments visible in the screenshot.
- That open-loop bug was real but not sufficient. The persistent live defect was order-dependent junction walking in the `Geometry_0319` / power-voronoi path: `mergeSameOwnerCells()`, `chainSharedEdgesIntoPolylines()`, and `executeChainWalk()` all selected the first unused touching edge/polyline instead of the clockwise-adjacent continuation around the incoming edge.
- Corridor and disconnect virtual stars were a trigger, not the ownership/topology bug itself. They increase the number of intermediate cells and 3+-way junctions along long lanes, which makes the greedy walker far more likely to stitch the wrong branch into a visually disconnected boundary.
- A separate process failure also occurred in-thread: after the user controlled for storage, theme, topology, ownership, and timing, I still reused earlier screenshot-origin arguments and territory-render-mode framing. That is now documented in `.agent/docs/project/post-mortems/2026-04-16-user-feedback-contradiction-and-misframing.md`.
- The angle-aware walker patch was not accepted as the live fix; the user verified that the exact erroneous disconnected geometry remained unchanged on the same topology. The correct next step is artifact-level provenance tracing from the live `displayGeometry` back through the `power_voronoi_0319` inputs and recomputation, not another verbal root-cause claim.
- The new artifact export path is intentionally diagnostic, not corrective. It captures the exact perimeter-field debug snapshot being drawn on screen, the displayed stars/lanes, the virtual stars derived from current settings, and a same-settings recomputation so the first point of divergence can be identified from data instead of screenshots.
- The exported artifact identified a separate deterministic failure mode: `power_voronoi_0319` had already lost `ai-1` before perimeter-field sampling. `recomputed0319.cells` contained 64 `ai-1` cells, but `mergedTerritories` contained no `ai-1` regions at all and `worldBorderPolylines` had no `ai-1|world` entries. That made missing perimeter samples inevitable for those regions.
- The concrete bug was in `mergeSameOwnerCells()`, not the perimeter-field sampler. That merge pass still required exact first-point/last-point equality, so owner shells with sub-pixel closure drift were silently dropped before world-border extraction. The artifact repro produced `ai-1` loops with endpoint deltas on the order of `0.0018px`, well within the existing `LOOP_CLOSURE_TOLERANCE_PX = 6` used later in `constructFillsFromFrontierChain()`.
- After applying the same near-closure repair rule in `mergeSameOwnerCells()`, replaying the artifact inputs through `computeGeometry0319()` restored `ai-1` merged territories and `ai-1|world` world-border polylines. That is the specific upstream input the perimeter-field sampler needed in order to generate vstars for those previously missing regions.
- Replay preview now carries conquest metadata all the way to the debug overlay, and the overlay draws attacker rings, target crosshairs, and conquest vectors for the currently selected live/replay scrub frame. This is diagnostic UI only; it does not alter transition or geometry state.
- The perimeter-field replay scrub path had a hidden dependency on the separate global snapshot recorder. `syncPerimeterFieldDiagnosticCapture()` immediately reset `liveFrameCount`, `replayFrameCounts`, and replay history unless `transitionSnapshotRecorder.isEnabled()` was true, even if `PERIMETER_FIELD_DEBUG_SCRUB_ENABLED` was already on. That is why the slider stayed at `No frames`.
- The fix is to treat perimeter-field preview as its own capture trigger. The capture/reset gate now checks `PERIMETER_FIELD_DEBUG_SCRUB_ENABLED || transitionSnapshotRecorder.isEnabled()`, so the scrub UI no longer requires the unrelated Debug-panel recorder toggle.
- Verification runs completed:
  - `bun x vitest run src/lib/config/themeRouting.test.ts src/lib/components/ui/settingsDefs.test.ts`
  - `bun x vitest run src/lib/renderers/MetaballRenderer.test.ts src/lib/config/themeRouting.test.ts src/lib/components/ui/settingsDefs.test.ts`
  - `bun x vitest run src/lib/config/themes.test.ts src/lib/config/themeRouting.test.ts src/lib/config/themeNames.test.ts`
  - `bun x tsc --noEmit`
  - `bun x vitest run src/lib/territory/buildTerritoryConfigFingerprint.test.ts src/lib/config/themes.test.ts src/lib/config/themeRouting.test.ts`
  - `bun x vitest run src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.test.ts src/lib/territory/buildTerritoryConfigFingerprint.test.ts src/lib/config/themes.test.ts src/lib/config/themeRouting.test.ts`
  - `bun x vitest run src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.test.ts` (from `pax-fluxia/`)
  - `bun x tsc --noEmit -p tsconfig.json` (from `pax-fluxia/`)
  - `bun x tsc --noEmit -p tsconfig.json` after wiring the perimeter-field geometry artifact exporter (from `pax-fluxia/`)
  - `bun x vitest run src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.test.ts` after patching `mergeSameOwnerCells()` near-closure handling (from `pax-fluxia/`)
  - `bun x tsc --noEmit -p tsconfig.json` after adding replay conquest highlights (from `pax-fluxia/`)
  - Artifact-based repro verification: replaying `C:\Users\mikep\Downloads\pax-perimeter-field-geometry-artifact-2026-04-16T22-43-57-191Z.json` through `computeGeometry0319()` now yields merged territory owner counts including `ai-1: 2` and world-border keys including `ai-1|world`
  - `bun x tsc --noEmit -p tsconfig.json` after decoupling perimeter-field scrub capture from the global snapshot recorder (from `pax-fluxia/`)

## Lossless User Instruction Log

1. "No, this is terrible. Not a single one presents a useable theme; previous themes have disappeared. You broke it."
2. "Dig deep and diagnose what you did wrong."
3. "The themes are not activating different render modes correctly."
4. "The most recent theme downloaded, \"pax-theme-apr_15_metaball-2026-04-16T16-40-14\", when I import it, it does switch modes and provide the appearance I expect, more or less. None of the others do."
5. "Excuse me, why no commit? Follow the rules [AGENT.md](.agent/AGENT.md)"
