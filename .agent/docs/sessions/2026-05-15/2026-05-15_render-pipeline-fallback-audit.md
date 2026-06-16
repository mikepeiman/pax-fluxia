# Render Pipeline Fallback Audit

Date: 2026-05-15

Raw exhaustive search artifact:
`.agent/docs/sessions/2026-05-15/2026-05-15_render-pipeline-fallback-rg-raw.txt`

Search scope:

- `pax-fluxia/src/lib/territory`
- `pax-fluxia/src/lib/renderers`
- `pax-fluxia/src/lib/components/game`
- `common/src/mapgen`
- `common/src/maps`

Search terms:

- `fallback`
- `Fallback`
- `FALLBACK`

Raw match count: 406.

## Behavioral Fallbacks That Can Affect Territory Or Render Output

1. `GameCanvas.svelte`
   - Bridge/runtime fallback logging and fallback to legacy path on pipeline error.
   - Perimeter-field diagnostic fallback markers.

2. `TransitionLayerCoordinator.ts`
   - `LEGACY INDEPENDENT PATH (fallback)`.
   - Meaning: transition pipeline can choose an older path when the current staged path cannot run.

3. `ActiveFrontTransition.ts`
   - `planRegionLevelActiveFrontFallbacks`.
   - Meaning: when a POST active front has no direct PRE anchor-pair match, code tries to find a nearby PRE source path and animate between them.
   - Risk: this is the most relevant dangerous fallback for current PVV4 active-front work. It can hide a planning defect by manufacturing a correspondence.

4. `ActiveFrontFillMode.ts`
   - Static section points fallback.
   - `t=0` / `t=1` fallback paths.
   - Meaning: if active geometry is unavailable for an endpoint frame, use static section geometry.

5. `classifyRingTransitionKind.ts`, `createCanonicalTransitionPlan.ts`, `createTerritoryTransitionPlan.ts`, `sampleTransitionFrame.ts`, `types.ts`
   - `fallback-snap`.
   - Meaning: legacy ring transition path classifies degenerate or invalid transition cases as snap/fallback paths.
   - Risk: this language is incompatible with the PVV4 goal when used to normalize snapping instead of exposing defects.

6. `PowerVoronoiRenderer.ts`
   - Legacy fallback for non-splice transition modes.
   - Legacy segment morpher fallback for borders.
   - Static fill fallback when no transition handler is configured.

7. `DistanceFieldTerritoryRenderer.ts`
   - Boundary-distance texture stroke fallback.
   - Curved/segmented border family fallback warnings.
   - Published-frontier/canonical fallback warning.
   - Morph fallback for border pairs missing a morph source.
   - Local border visibility fallback while geometry chunk build is in flight.

8. `buildFamilyGeometry.ts`
   - Geometry 0319 fallback to compiler.
   - Perimeter-field geometry fallback compilation path.

9. `compiler` files
   - `TerritoryCompiler.ts`: fitter recovery uses unfitted frontiers as fallback polylines.
   - `frontierStage.ts`: midpoint fallback when tie point falls outside valid interval.
   - `buildFrontierTopology.ts`: endpoint classified as `world_intersection` fallback.
   - `planarWalk.ts`: fallback when exact reverse arc was filtered out.
   - `compiler_UnifiedVectorGeometry.ts`: empty snapshot error fallback.
   - `metricStage.ts` and `types.ts`: comments state some compiler paths must never emit fallback geometry.

10. `fg2SeedGraph.ts`
    - Previous/current geometry source fallback.
    - Fallback pairs when graph ordering cannot provide normal pairs.
    - Fallback shell points.
    - Fallback owner shell artifacts.
    - Previous/current fallback owner shell counts.

11. `MetaballGridFamily.ts`, `MetaballGridPhaseEdgesFamily.ts`, `MetaballGridPhaseFieldFamily.ts`, `metaballGridStats.ts`, `metaballGridTypes.ts`, `buildGridClassification.ts`
    - Fallback plan states.
    - Fallback reasons.
    - Nearest-owned-star fallback for grid cells missed by polygon coverage.
    - Render-texture fallback to vector overlay.

12. `perimeterField` files
    - `buildPerimeterFieldScene.ts`: start/end fallback markers and default-value readers.
    - `perimeterFieldDiagnostics.ts`: draw fallback X markers.
    - `perimeterFieldPlanEngine.ts`: fallback point inside polygon.
    - `PerimeterFieldFamily.ts`: tunable default fallbacks.

13. `buildDisconnectVirtualSites.ts`
    - Weight default fallback.
    - Best fallback enemy star when no side-specific enemy star is selected.

14. `buildCorridorVirtualSites.ts`
    - Weight default fallback.

15. `lanePolylines.ts`
    - Fallback bridge candidates and timing.
    - Meaning: map-generation lane routing can use fallback bridge edges.

16. `LaneRenderer.ts`
    - Straight lane fallback when authored/curved lane geometry cannot produce a trimmed lane.

17. `buildBorderMeshCache.ts`
    - Build border mesh cache directly from raw `FrontierGraph`.

18. `PixiFillPresenter.ts`, `PixiBorderPresenter.ts`, `colorUtils.ts`
    - Owner and owner-pair color fallbacks.

19. `StarRenderer.ts`
    - Circle fallback.

20. `ShipRenderer.ts`
    - Incoming ship stats and visual-cap fallback plan.

21. `territoryUtils.ts`
    - Per-player grouping fallback.

22. `buildInsetTerritoryRegions.ts`
    - Fallback label point inside polygon.

23. `disconnectZones.ts`
    - Fallback width factor.

24. `buildSnapshotsFromTMAP.ts`
    - Fallback to legacy transition path if no TMAP exists.

25. Legacy renderer files
    - `PVV3Renderer.ts`: if no enemy exists, use source owner.
    - `PowerVoronoiRenderer_DY4.ts`: if no enemy exists, use source owner.

## Default-Value Fallbacks

These do not by themselves select alternate geometry, but they still matter because they can hide missing settings:

- `TerritorySettingsBridge.ts`
- `geometryTuning.ts`
- `overlayConfig.ts`
- `metaballSceneBase.ts`
- `metaballConquestTransitions.ts`
- `MetaballGridFamily.ts`
- `MetaballGridPhaseEdgesFamily.ts`
- `MetaballGridPhaseFieldFamily.ts`
- `buildPerimeterFieldScene.ts`
- `PerimeterFieldFamily.ts`
- `common/src/maps/metadata.ts`

## Constructive Intent

Fallbacks are usually added to keep the game rendering, preserve visibility, and prevent one broken subsystem from blanking the screen. In early development this can be useful: a fallback gives a visible approximation while the real path is incomplete.

## Pitfalls Affecting This Work

1. A fallback can convert a real geometry defect into a plausible-looking but wrong transition.
2. A fallback can make diagnostics less honest by replacing "this case is unsupported" with fabricated motion.
3. A fallback can let me misread the system, because the screen still shows something and I may mistake that for the designed path.
4. A fallback can conflict with the PVV4 rule that unclassified or unsupported active-front cases are defects, not alternate rendering choices.
5. The word "fallback" has let me soften language. In several responses I described an active bug as a fallback behavior instead of calling it a defect or wrong correspondence.

## Rule For Current PVV4 Work

For active-front conquest transitions, "fallback" must not mean "invent a frontier correspondence." If PRE and POST cannot be matched by the defined algorithm, the system should classify the exact defect and expose it in diagnostics.

Allowed uses:

- Default-value fallback for missing UI/settings input.
- Visual diagnostic fallback that marks missing data without changing territory geometry.
- Compatibility fallback outside PVV4 mode.

Disallowed in PVV4 active-front matching:

- Borrowing unrelated region borders.
- Snapping while calling it a fallback.
- Whole-region or whole-border redraws caused by a coarse repair path.
- Any hidden alternate path that avoids producing a clear defect classification.
