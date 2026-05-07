# Feature And Task Queue - 2026-05-05

## Active

- Branch:
  - `codex/render-infra/pvv4-transition-bets`
- Worktree:
  - `C:\Users\mikep\.codex\worktrees\dcc7\pax-fluxia`
- Canonical tracked handoff:
  - `.agent/docs/project/process/worktree-handoffs/2026-05-03_pvv4-transition-bets_handoff.md`
- Active goal:
  - document the architecture/data-shape dialogue losslessly
  - convert the dialogue into durable decisions and corrected definitions
  - identify the root semantic failures currently undermining PVV4 continuity and diagnostics
  - replace the ad hoc branch-bet framing with a versioned territory-runtime recovery plan

## Today

- Created dated session docs:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_Chat.md`
  - `.agent/docs/sessions/2026-05-05/2026-05-05_Session.md`
  - `.agent/docs/sessions/2026-05-05/2026-05-05_Takeaways.md`
  - `.agent/docs/sessions/2026-05-05/2026-05-05_Decisions-and-Definitions.md`
- Created versioned plan doc:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-runtime-recovery-plan_v1.md`
- Created revised versioned plan doc:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-runtime-recovery-plan_v2.md`
- Created clarified versioned plan doc:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-runtime-recovery-plan_v3.md`
- Session docs are now intended to be tracked directly in `.agent/docs/sessions/`.
- Scope of the logged dialogue:
  - ownership -> geometry -> topology -> transition data-shape trace
  - PVV4 vs phase/perimeter family architecture
  - exported diagnostic artifact semantics
  - region-ID / topology-ID / stale-version naming failures
- Confirmed by code trace:
  - vector geometry region IDs are still centroid-derived:
    - `region:${ownerId}:${roundedCentroid}`
    - file:
      - `pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts`
  - geometry/topology versions still carry stale `pvv2:` fingerprint residue:
    - files:
      - `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`
      - `pax-fluxia/src/lib/territory/layers/geometry/planners/GeometryFingerprint.ts`
      - `pax-fluxia/src/lib/territory/compiler/buildFrontierTopology.ts`
  - topology identity is still coordinate-composite:
    - vertex IDs are coordinate strings
    - section IDs are coordinate-composite strings
  - transition recorder/export begins after raw gameplay graph normalization:
    - files:
      - `pax-fluxia/src/lib/territory/devtools/TransitionSnapshotRecorder.ts`
      - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
  - field families still bypass shared truth:
    - `GameCanvas` builds a thin ownership snapshot
    - `contestedLaneIds` is hard-coded to `[]`
    - family-local PREV reconstruction remains in the phase-field path
  - live PVV4 still treats `fillFrame` as the real moving payload while leaving `borderFrame` empty

## Current Best Read

- The live region-ID scheme is structurally wrong for continuity:
  - centroid-based identity guarantees churn during ordinary conquest geometry changes
- The live version/fingerprint naming still carries obsolete `pvv2:` residue:
  - semantically wrong
  - misleading in diagnostics
- Export artifacts are not yet sufficient to explain one conquest from raw source frame to rendered transition:
  - raw `stars[]`
  - raw `lanes[]`
  - raw frame input
  - full ownership snapshots
  - full transition snapshot
  are missing from the exported package
- `virtualStars` are not a valid shared PV transition primitive and should be removed from the shared transition contract
- whole-region birth is invalid, and region collapse is only legitimate when the final star set of a region disappears on that tick
- existing topology sections between 3-way/world-edge junctions are likely the correct coarse structural unit for transition planning
- DX should likely evolve from midpoint-oriented virtual-site nudging into an explicit disconnect-zone construct
- the recovery plan needed stronger implementation gating and clearer shared-truth definitions, so `v3` now adds:
  - locked conquest casebook before motion work
  - precise foundational-section definition
  - first deterministic eligible-frontier-envelope rule
  - explicit DX zone descriptor

## Next Most Useful Steps

1. Sweep semantic debt on active paths:
   - centroid region IDs
   - `pvv2:` residue
   - misleading tuning names
   - misleading diagnostics names
2. Expand the diagnostic export pipeline to include:
   - raw frame input
   - normalized ownership snapshots
   - full transition runtime snapshot
3. Move field families onto the shared ownership/geometry/transition truth pipeline.
4. Rebuild PV transition logic around explicit stable anchors, explicit change anchors, explicit split planning, and truthful `borderFrame`.
5. Separate semantic IDs from coordinates for topology vertices and sections.
6. Add real per-section/per-point star influence attribution so conquest-local active-front bounds can be selected deterministically.
7. Replace heuristic-only DX with an explicit disconnect-zone model after shared truth is unified.
8. Do not begin runtime motion changes until the conquest casebook and end-to-end truth exports are in place.
9. Normalize geometry constraints and tuning before more PV transition tuning:
   - separate `starWeight` from `MSR`
   - separate `LP` from `CX`
   - move `DX` to explicit zone truth
10. Add diagnostics freeze-on-unclassified mode so classification holes stop silently degrading into snap.

## Latest Update

- Created:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-runtime-recovery-plan_v4.md`
- `v4` adds:
  - explicit shared definitions for:
    - `starWeight`
    - `MSR`
    - `CX`
    - `LP`
    - `DX`
  - a diagnostics mode that freezes on unclassified foundational sections
- Latest code-trace confirmation:
  - `MSR` is still only partially represented as a site-weight proxy
  - `starWeight` and `MSR` are still semantically conflated
  - contested-lane pair logic is still mixed under `CX` naming
  - `DX` is still only a virtual-site heuristic
  - PV transition still lacks a freeze-on-unclassified diagnostics trap

## Latest Correction

- Created:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-runtime-recovery-plan_v5.md`
- User correction to `v4`:
  - snap is not a valid target classification or fallback
  - the current `starMargin` control is not to be discarded; its utility remains as the live base site-weight control
  - `MSR` required a plainer and more direct definition
- `v5` now corrects those points and should be treated as the current plan

## Latest Communication / Definition Update

- Created:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-runtime-recovery-plan_v6.md`
- Added to `.agent/AGENT.md`:
  - communication-fit rule for this dialogue style
- `v6` improvements:
  - plain power-Voronoi is explicitly named as the baseline geometry
  - constraints are explicitly framed as local adjustments and edge-case guards
  - `MSR` is restated as a protected region around a star for territory painting, with lane-margin as a secondary use
  - wording is rewritten in simpler game terms
  - stale abstract wording like `descriptor` is reduced further in the active plan text

## Latest Implementation Checkpoint

- Confirmed current working plan baseline:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-runtime-recovery-plan_v7.md`
- Completed Sprint 0 semantic-cleanup checkpoint on the active geometry path:
  - added shared region-identity helper:
    - `pax-fluxia/src/lib/territory/geometry/regionIdentity.ts`
  - removed centroid-derived region identity from the live vector compiler:
    - `pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts`
  - canonical geometry regions now carry:
    - `starIds`
    - `anchorStarIds`
    - `contributingSiteIds`
  - unified render-family region identity on the same helper:
    - `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts`
  - removed stale `pvv2:` fingerprint residue from the active geometry fingerprint builder:
    - `pax-fluxia/src/lib/territory/compiler/territoryGeometryFingerprint.ts`
    - `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`
- Validation:
  - `bunx vitest run pax-fluxia/src/lib/territory/geometry/regionIdentity.test.ts pax-fluxia/src/lib/territory/compiler/territoryGeometryFingerprint.test.ts`
  - `bun run build`
- Result:
  - region identity on the active vector path now follows deterministic star membership instead of centroid drift
  - geometry/topology version strings no longer advertise stale `pvv2:` lineage on the active fingerprint path

## Latest Implementation Checkpoint 2

- Locked conquest casebook:
  - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-transition-casebook_v1.md`
- Expanded truth export from the recorder source instead of only at compact package time:
  - `pax-fluxia/src/lib/territory/devtools/TransitionSnapshotRecorder.ts`
  - `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`
  - `pax-fluxia/src/lib/territory/devtools/snapshotExport.ts`
  - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
- Added deterministic export-serialization test coverage:
  - `pax-fluxia/src/lib/territory/devtools/snapshotExport.test.ts`
- New package contents now include:
  - `01_frame_input.json`
  - `02_ownership_prev.json`
  - `02_ownership_next.json`
  - `03_geometry_prev_full.json`
  - `03_geometry_next_full.json`
  - `04_topology_prev_full.json`
  - `04_topology_next_full.json`
  - `05_transition_snapshot.json`
  - `05_transition_truth.json`
  - `05_active_front_plan.json`
  - preserved compact files:
    - `compact_diag.json`
    - `compact_topology.json`
    - `compact_geometry.json`
- Purpose:
  - make one package sufficient to explain one conquest from frame input through rendered result
  - keep the compact exports as secondary quick-review artifacts

## Latest Implementation Checkpoint 3

- Completed Sprint 4 shared-geometry constraint normalization on the active generator path:
  - internal geometry settings now use explicit normalized names:
    - `starWeight`
    - `msrPx`
    - `cxEnabled`
    - `cxSpacingPx`
    - `cxPointCount`
    - `cxWeight`
    - `lpMidpointPairEnabled`
    - `lpPairCount`
    - `lpPairSpacingPx`
    - `lpPairWeight`
    - `dxEnabled`
    - `dxMaxDistancePx`
    - `dxWeight`
  - touched files:
    - `pax-fluxia/src/lib/territory/geometry/geometryTuning.ts`
    - `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`
    - `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts`
    - `pax-fluxia/src/lib/territory/compiler/territoryGeometryFingerprint.ts`
    - `pax-fluxia/src/lib/config/geometry0319Debug.ts`
    - `pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts`
    - `pax-fluxia/src/lib/territory/devtools/perimeterFieldGeometryArtifact.ts`

## Latest Diagnostic Export Checkpoint

- Added session note:
  - `.agent/docs/sessions/2026-05-07/2026-05-07_territory-transition-diagnosis_v19.md`
- Package renders for `active_front_live_capture` now include:
  - legend HUD on every exported transition frame
  - dedicated `render/front_reference.png`
- `front_reference.png` is intended to make snap cases diagnosable in one image by showing:
  - `PRE` front path
  - `POST` front path
  - active front span
  - change anchors
  - defect anchors
  - monotonic change-vertex correspondence lines
- Exporter wiring updated in:
  - `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.ts`
  - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
- README generation now lists the supplemental render explicitly.
- `communication.md` now includes an ambiguity-prevention rule before replying.
- Validation:
  - `bun vitest run src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts src/lib/territory/devtools/TransitionBundleSerializer.test.ts`
  - `bun run build`

## Latest Process Checkpoint

- Added standing thinking rules for work surface maps:
  - `.agent/docs/project/process/thinking.md`
- Added process/system doc:
  - `.agent/docs/project/process/work_surface_maps.md`
- Added first live work surface map:
  - `.agent/docs/project/process/work-surfaces/active-front-export-overlay.md`
- Added session note:
  - `.agent/docs/sessions/2026-05-07/2026-05-07_work-surface-maps_v1.md`
- Purpose:
  - stop re-finding critical seams like the bundle generator
  - capture current-area file / function / line references in one reusable map
- Kept the public tuning surface stable for now:
  - `starMargin` still feeds the live base site-weight control
  - `msrStarBias` is retained only as a legacy no-op surface to avoid breaking the current panel/config path
- Renamed compact diagnostics exports away from the invalid `90_*` prefix:
  - `debug/compact_diag.json`
  - `debug/compact_topology.json`
  - `debug/compact_geometry.json`
  - touched files:
    - `pax-fluxia/src/lib/territory/devtools/TransitionSnapshotRecorder.ts`
    - `pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.ts`
- Validation:
  - `bunx vitest run src/lib/territory/devtools/TransitionBundleSerializer.test.ts src/lib/territory/compiler/territoryGeometryFingerprint.test.ts src/lib/config/geometry0319Debug.test.ts src/lib/territory/families/buildFamilyGeometry.test.ts`
  - `bun run build` in `pax-fluxia/`
- Important validation note:
  - the app package build passes
  - the repo-root wrapper build still fails because the sibling `pax-server` workspace is missing `@colyseus/core`

## Latest Implementation Checkpoint 4

- Completed Sprint 5 explicit `CX` / `LP` solve-shaping split:
  - the mixed lane-shaping path is now separated into:
    - `buildCxVirtualSites(...)`
    - `buildLpVirtualSites(...)`
    - `computeCxVirtuals(...)`
    - `computeLpVirtuals(...)`
  - the legacy combined wrappers remain in place only as compatibility shells:
    - `buildCorridorVirtualSites(...)`
    - `computeCorridorVirtuals(...)`
- Active geometry-path call sites now consume `CX` and `LP` separately:
  - `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`
  - `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts`
  - `pax-fluxia/src/lib/territory/devtools/perimeterFieldGeometryArtifact.ts`
- Lane virtual sites now carry explicit rule identity:
  - `laneRule: 'cx' | 'lp'`
- Validation:
  - `bunx vitest run src/lib/territory/corridor/buildCorridorVirtualSites.test.ts src/lib/territory/devtools/TransitionBundleSerializer.test.ts src/lib/territory/compiler/territoryGeometryFingerprint.test.ts src/lib/config/geometry0319Debug.test.ts src/lib/territory/families/buildFamilyGeometry.test.ts`
  - `bun run build` in `pax-fluxia/`

## Latest Implementation Checkpoint 5

- Completed Sprint 6 explicit `DX` / `MSR` geometry correction on the active shared generators:
  - added explicit disconnect-zone truth and application:
    - `pax-fluxia/src/lib/territory/geometry/disconnectZones.ts`
    - `pax-fluxia/src/lib/territory/geometry/disconnectZones.test.ts`
  - cut the active shared generators over from DX fake-owner sites to post-solve explicit disconnect-zone application:
    - `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`
    - `pax-fluxia/src/lib/territory/compiler/Geometry_0319.ts`
  - rewrote `MSR` from per-vertex radial pushing to intrusive-run rewrite with circle entry/exit intersections and sampled repair arcs:
    - `pax-fluxia/src/lib/territory/geometry/minStarMargin.ts`
    - `pax-fluxia/src/lib/territory/geometry/minStarMargin.test.ts`
- Purpose:
  - make `DX` an explicit geometry correction instead of an ownership-faking solve trick on the active shared path
  - make `MSR` repair one coherent bad border run rather than shoving individual points outward
- Current active-path behavior:
  - `DX` now carves same-owner midpoint corridors only when the midpoint is actually owned by that player
  - `MSR` now identifies intrusive runs, finds circle crossings, and replaces the intrusive subpath with a sampled arc around the protected star range
- Validation:
  - `bunx vitest run src/lib/territory/geometry/disconnectZones.test.ts src/lib/territory/geometry/minStarMargin.test.ts src/lib/territory/devtools/TransitionBundleSerializer.test.ts src/lib/territory/compiler/territoryGeometryFingerprint.test.ts`
  - `bun run build` in `pax-fluxia/`
- Important note:
  - legacy renderers still retain their old DX helper path for now
  - the active shared generators are the path moved onto explicit post-solve `DX`
  - `laneRule: 'cx' | 'lp'`
- Added focused regression coverage:
  - `pax-fluxia/src/lib/territory/corridor/buildCorridorVirtualSites.test.ts`
- Validation:
  - `bunx vitest run src/lib/territory/corridor/buildCorridorVirtualSites.test.ts src/lib/territory/devtools/TransitionBundleSerializer.test.ts src/lib/territory/compiler/territoryGeometryFingerprint.test.ts src/lib/config/geometry0319Debug.test.ts src/lib/territory/families/buildFamilyGeometry.test.ts`
  - `bun run build` in `pax-fluxia/`
- Result:
  - `CX` and `LP` are now distinct implementation paths instead of one mixed “corridor” routine
  - legacy renderers can continue to use the compatibility wrappers while the shared geometry layer keeps moving toward explicit semantics

## Latest Implementation Checkpoint 6

- Fixed a real active-path regression that blanked PVV4 territory rendering and the underlying-geometry diagnostics overlay:
  - root cause was stale `DISCONNECT_OWNER_ID` logic still executing inside shared geometry helpers after the DX cutover
  - affected file:
    - `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts`
- Exact fix:
  - removed the stale disconnect-owner check from:
    - `extractSharedEdges(...)`
  - removed the stale disconnect-owner skip from:
    - `mergeSameOwnerCells(...)`
- Added integration coverage at the real geometry entrypoint:
  - `pax-fluxia/src/lib/territory/compiler/Geometry_0319.test.ts`
  - verifies `computeGeometry0319(...)` succeeds with `dxEnabled: true`
- Validation:
  - `bunx vitest run src/lib/territory/compiler/Geometry_0319.test.ts src/lib/territory/geometry/disconnectZones.test.ts src/lib/territory/geometry/minStarMargin.test.ts`
  - `bun run build` in `pax-fluxia/`
- Result:
  - PVV4 shared geometry returns merged territories again
  - the diagnostics geometry overlay can render again because the geometry path no longer throws before output

## Latest Implementation Checkpoint 7

- Completed the shared section-influence attribution sprint:
  - added a shared helper:
    - `pax-fluxia/src/lib/territory/geometry/sectionInfluence.ts`
  - added focused tests:
    - `pax-fluxia/src/lib/territory/geometry/sectionInfluence.test.ts`
    - updated `pax-fluxia/src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts`
- Active-path topology builders now stop faking per-section star attribution:
  - shared compiler path:
    - `pax-fluxia/src/lib/territory/compiler/buildFrontierTopology.ts`
    - `pax-fluxia/src/lib/territory/layers/geometry/compiler_UnifiedVectorGeometry.ts`
  - field-family topology helper:
    - `pax-fluxia/src/lib/territory/families/buildPowerVoronoiFrontierTopology.ts`
    - `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts`
- Exact behavior:
  - for each section side, sample the section midpoint by arc length
  - rank owned stars by distance to that midpoint
  - record primary and secondary star attribution with normalized scores
  - keep `world` sections explicitly unattributed on the world side
- Purpose:
  - give the shared geometry and topology layer real section-to-star attribution before the PV transition rebuild
  - remove another source of fake diagnostics truth from both the active shared path and the family-side helper path
- Validation:
  - `bunx vitest run pax-fluxia/src/lib/territory/geometry/sectionInfluence.test.ts pax-fluxia/src/lib/territory/families/buildPowerVoronoiFrontierTopology.test.ts`
  - `bun run build` in `pax-fluxia/`

## Latest Implementation Checkpoint 8

- Completed the freeze-on-unclassified diagnostics trap plus the first bounded active-front sampler rebuild:
  - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
  - `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts`
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
  - `pax-fluxia/src/lib/stores/territoryRenderStatusStore.ts`
  - `pax-fluxia/src/lib/territory/devtools/overlayConfig.ts`
- Added focused regression coverage:
  - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
  - `pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts`
- Exact behavior:
  - topology gaps, unsupported split paths, and no-span pairs are now classified as boundary-classification defects instead of soft “skip” counts
  - the diagnostics panel and export adapter now surface defect pairs and defect sections directly
  - the diagnostics toggle can freeze the game the moment PVV4 hits an unclassified boundary defect
  - `borderFrame` is now populated from the same sampled frontier geometry used for fill reconstruction
  - simple `1:1` fronts now patch only the local moving interval inside an affected foundational section, leaving unchanged tails static
- Purpose:
  - turn hidden transition-classification holes into explicit defects
  - make moving-border truth first-class instead of leaving `borderFrame` empty
  - re-ground the active-front sampler on local section intervals before tackling explicit split handling
- Validation:
  - `bunx vitest run pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts pax-fluxia/src/lib/territory/devtools/snapshotExport.test.ts pax-fluxia/src/lib/territory/devtools/TransitionBundleSerializer.test.ts`
  - `bun run build` in `pax-fluxia/`
- Remaining major work after this checkpoint:
  - explicit `1:2` / `2:1` split planning instead of defect classification
  - shared truth migration for field families so `GameCanvas` no longer manufactures thin ownership/transition state

## Latest Implementation Checkpoint 9

- Completed bounded split-front support on the active PVV4 path:
  - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
  - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- Exact behavior:
  - `1:2` and `2:1` fronts bounded by the same stable anchor pair are no longer auto-classified as split defects
  - those next-side split sections are activated directly and driven by the existing split interpolation path
- Result:
  - locally bounded split fronts can animate on PVV4 instead of freezing as unsupported by definition
  - remaining major work is now:
    - shared truth migration for field families
    - performance hardening
- Validation:
  - `bunx vitest run pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts pax-fluxia/src/lib/territory/devtools/TransitionDiagnosticsAdapters.test.ts`
  - `bun run build` in `pax-fluxia/`

## Latest Implementation Checkpoint 10

- Completed the first shared-truth migration step for render families:
  - `pax-fluxia/src/lib/territory/layers/ownership/ownershipSnapshotUtils.ts`
  - `pax-fluxia/src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.ts`
  - `pax-fluxia/src/lib/territory/families/buildFamilyGeometry.ts`
  - `pax-fluxia/src/lib/territory/families/metaballGrid/MetaballGridPhaseFieldFamily.ts`
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
- Exact behavior:
  - shared ownership derivation for `starOwners`, `contestedLaneIds`, and deterministic ownership version now lives in one helper
  - the active ownership layer uses that helper
  - the render-family path now uses the same helper instead of fabricating `render-family-live` ownership snapshots with empty contested lanes
  - the phase-field PREV-geometry fallback now also uses the same shared ownership derivation when it has to rebuild from reverted stars
- Result:
  - field families no longer stub `contestedLaneIds`
  - render-family ownership snapshots now carry deterministic ownership versions instead of `render-family-live`
  - remaining major work is performance hardening and deeper cleanup of remaining family-local PREV reconstruction paths
- Validation:
  - `bunx vitest run pax-fluxia/src/lib/territory/layers/ownership/ownershipSnapshotUtils.test.ts pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
  - `bun run build` in `pax-fluxia/`

## Latest Implementation Checkpoint 12

- Added a systematic PVV4 playtest harness:
  - transition-package summarizer:
    - `pax-fluxia/tools/debug/summarize-transition-package.mjs`
  - package script:
    - `pax-fluxia/package.json`
  - playtest protocol:
    - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-transition-playtest-protocol_v1.md`
  - initial findings:
    - `.agent/docs/sessions/2026-05-05/2026-05-05_territory-transition-playtest-findings_v1.md`
- Exact behavior:
  - the summarizer supports both the staged export layout and the older legacy package layouts already sitting in `Downloads/`
  - it reports conquest events, geometry counts, topology counts, active-front coverage counts, and casebook hints in one command
- Current result:
  - the first two real packages still support the user's visible judgment:
    - planned active fronts remain too sparse relative to pair-key count
    - gameplay-visible improvement is still not clear
- Validation:
  - `bun run territory:package:summary -- "C:\Users\mikep\Downloads\19-07-58---665"`
  - `bun run territory:package:summary -- "C:\Users\mikep\Downloads\15-27-15---056_transition-diagnostic-package"`

## Diagnostic Checkpoint 13

- Added a formal diagnosis document:
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v1.md`
- Diagnosis result:
  - the planner is still global when it should be conquest-local
  - many unsupported split counts are just forward/reverse duplicates of one foundational section
  - visible improvement remains weak because active-front coverage is too sparse
- Small tooling fix:
  - the package summarizer now recognizes short-name zip exports:
    - `_diag.json`
    - `_geo.json`
    - `_topo.json`
- Next implementation target is now clearer:
  - conquest-local frontier gating
  - directional deduplication before split classification

## Diagnostic Checkpoint 14

- Added a follow-up diagnosis/result document:
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v2.md`
- Implemented the two immediate planner fixes from `diagnosis_v1`:
  - conquest-local anchor-pair gating in:
    - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
  - geometry-identical forward/reverse chain deduplication before split classification in:
    - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
- Added focused regression coverage in:
  - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- Test evidence now proves:
  - unrelated unchanged border pairs can be excluded from conquest-local planning
  - forward/reverse duplicates no longer inflate fake split counts
- Immediate next evidence needed:
  - a fresh PVV4 playtest package exported after this checkpoint
  - old packages cannot prove the visible effect because they predate the planner change

## Latest Implementation Checkpoint 11

- Completed the `v7` performance-hardening sprint on the active render-family path:
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - `pax-fluxia/src/lib/territory/layers/ownership/ownershipSnapshotUtils.ts`
  - `pax-fluxia/src/lib/territory/layers/ownership/ownershipSnapshotUtils.test.ts`
- Exact behavior:
  - `GameCanvas` now caches one shared base ownership snapshot per live star/lane state instead of rebuilding ownership truth at each hot-path consumer
  - active transition ownership snapshots now reuse that base truth and apply only the conquest-event overlay
  - the render-family geometry cache, stable-frame sync, and previous-frame diagnostics fallback now all consume that same cached ownership truth
- Result:
  - the active render-family path stops rebuilding identical ownership maps and contested-lane lists multiple times per frame
  - `v7` is now implementation-complete; remaining work is broader merge cleanup, not an unfinished sprint
- Validation:
  - `bunx vitest run pax-fluxia/src/lib/territory/layers/ownership/ownershipSnapshotUtils.test.ts pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
  - `bun run build` in `pax-fluxia/`

## Diagnostic Checkpoint 15

- Added the island-conquest disappearance audit:
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v3.md`
- Implemented the direct fix for the long-running shrinking-duplicate-region bug on the active PVV4 path:
  - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
  - `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts`
  - `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`
  - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
- Exact behavior:
  - unmatched `PREV` loops are no longer collapsed globally
  - a `PREV` loop is now collapse-eligible only if every star contributing to that loop was conquered away on that tick
  - single-star disappearing loops now collapse to the actual captured star center from live star positions
- Exact bug removed:
  - when an island conquest happened, a persistent mainland loop could be mis-matched and then wrongly added to `collapseTargets`
  - the sampler would draw both:
    - the real `NEXT` mainland
    - a collapsing `PREV` duplicate of that same mainland
  - this checkpoint removes that false-collapse path
- Remaining structural debt surfaced by the audit:
  - `buildFrontierTopology.ts` still hardcodes same-owner `componentId` to `${ownerId}:0`
  - `buildFrontierMap.ts` still uses enumeration-based loop IDs
- Validation:
  - `bun vitest run src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
  - `bun run build` in `pax-fluxia/`

## Diagnostic Checkpoint 16

- Added the PVV4 / `virtualStars` separation audit:
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v4.md`
- Exact architectural conclusion:
  - `virtualStars` are not part of the intended PVV4 conquest mechanism
  - they are ownership/VFX/helper residue that drifted into the disappearance path
- Exact real-file post-mortem:
  - `StarOwnershipSnapshotMode.ts` only spawns current-turn `virtualStars` for `event.newOwner`
  - older `ActiveFrontTransition.ts` collapse-center lookup still asked for a `virtualStar` for `event.previousOwner`
  - that was a category error: VFX/helper data was being consulted for a PVV4 frontier-motion decision
- Direct follow-up now required:
  - remove remaining PVV4 dependence on `virtualStars`
  - stop including `virtualStarCount` in active-path ownership identity
  - build a live classification overlay that shows every vertex, section, and active sub-section at conquest start

## Implementation Checkpoint 17

- Completed the active ownership-path `virtualStars` removal:
  - `pax-fluxia/src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.ts`
  - `pax-fluxia/src/lib/territory/layers/ownership/ownershipSnapshotUtils.ts`
  - `pax-fluxia/src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.test.ts`
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v5.md`
- Exact behavior:
  - `StarOwnershipSnapshotMode` no longer carries or spawns `virtualStars`
  - active ownership snapshots now emit `virtualStars: []`
  - ownership identity no longer changes with `virtualStarCount`
- Result:
  - `virtualStars` are no longer part of active PVV4 ownership truth
  - the remaining task is the live classification overlay, not more virtual-star cleanup inside PVV4 conquest
- Validation:
  - `bun vitest run src/lib/territory/layers/ownership/ownershipSnapshotUtils.test.ts src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.test.ts src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
  - `bun run build` in `pax-fluxia/`

## Diagnostic Checkpoint 18

- Added the ownership/conquest-source audit:
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v6.md`
- Exact conclusion:
  - `StarOwnershipSnapshotMode` does not decide who owns a star
  - it reads already-mutated `star.ownerId` from the current simulation frame
  - the real ownership mutation happens in `common/src/conquest.ts` inside `applyConquest(...)`
  - the shared engine already emits authoritative `TickEvents.conquests`
  - the territory runtime only re-derives conquest events because `TerritoryFrameInput` does not carry that authoritative conquest batch
- Architectural consequence:
  - ownership snapshotting and conquest-event sourcing are currently split
  - ownership truth is authoritative
  - conquest event truth is still territory-local diff output
- Direct follow-up:
  - thread authoritative engine conquest events into `TerritoryFrameInput`
  - let territory prefer authoritative conquest batches over owner-diff reconstruction

## Implementation Checkpoint 19

- Implemented authoritative conquest-event threading for the canonical territory runtime:
  - `pax-fluxia/src/lib/territory/contracts/OwnershipContracts.ts`
  - `pax-fluxia/src/lib/territory/contracts/TerritoryFrameInput.ts`
  - `pax-fluxia/src/lib/territory/runtime/TerritoryRuntimeCoordinator.ts`
  - `pax-fluxia/src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.ts`
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - `pax-fluxia/src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.test.ts`
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v7.md`
- Exact behavior:
  - `TerritoryFrameInput` now optionally carries authoritative engine `conquests`
  - `GameCanvas` now passes `peekTickEvents().conquests` into the canonical territory runtime before later event consumption
  - `StarOwnershipSnapshotMode` now prefers authoritative engine conquest events over owner-diff reconstruction
  - the ownership layer still supplements those authoritative events with uncovered owner-diff events, so additional ownership flips from conquest side effects remain visible to territory
- Result:
  - territory conquest truth is no longer purely reconstructed from star-owner diffs
  - canonical PVV4 now receives richer conquest truth from the engine on the same frame
  - attacker/tick/conquest-type data is preserved on the territory-side conquest event path
- Validation:
  - `bun vitest run src/lib/territory/layers/ownership/modes/StarOwnershipSnapshotMode.test.ts src/lib/territory/layers/ownership/ownershipSnapshotUtils.test.ts src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
  - `bun run build` in `pax-fluxia/`

## Implementation Checkpoint 20

- Fixed the active PVV4 island-collapse regression:
  - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
  - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v8.md`
- Exact root cause:
  - collapse planning still derived loop star membership from both `primaryStarId` and `secondaryStarId`
  - a true single-star island could therefore pick up same-owner mainland as incidental secondary influence
  - that mislabeled the island as a multi-star collapse candidate and blocked collapse eligibility
- Exact behavior now:
  - collapse planning now uses dominant loop stars:
    - prefer same-owner `primaryStarId`
    - only fall back to `secondaryStarId` if no primary IDs exist at all
  - true single-star islands remain collapse-eligible even when same-owner mainland appears only as secondary influence on the island boundary
  - collapse center still resolves to the captured island star center
- Validation:
  - `bun vitest run src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
  - `bun run build` in `pax-fluxia/`

## Process Checkpoint 21

- Added the required post-mortem and standing communication rules:
  - `.agent/docs/project/process/POST_MORTEM_2026-05-06_REGION_DISAPPEARANCE_CATEGORY_ERROR.md`
  - `.agent/docs/project/process/communication.md`
- Exact characterization:
  - the disappearance debugging failure was category-error-driven, indirect, pseudo-analytical, architecture-blind, and trust-damaging
  - the core mistake was trying to infer region disappearance from boundary-local data instead of region star membership
- Standing correction:
  - disappearance logic must start from authoritative region membership
  - communication must follow the requested response shape, avoid overclaiming, and stop substituting explanation for characterization

## Implementation Checkpoint 22

- Replaced section-influence-based island collapse planning with region-membership-based planning:
  - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.ts`
  - `pax-fluxia/src/lib/territory/layers/transition/TransitionLayerCoordinator.ts`
  - `pax-fluxia/src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v9.md`
- Exact behavior:
  - `TransitionLayerCoordinator` now passes `previousGeometry.territoryRegions` and `geometry.territoryRegions` into active-front planning
  - island collapse eligibility now comes only from `previousRegions[].anchorStarIds`
  - a region collapses on this path only if it is a one-star previous region and that exact star was conquered on this tick
  - boundary-local `primaryStarId` / `secondaryStarId` are no longer used to infer island membership for collapse
- Result:
  - the active PVV4 island-collapse decision is now made at the correct architectural layer
  - the old category error is removed from the island path
- Validation:
  - `bun vitest run src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
  - `bun run build` in `pax-fluxia/`

## Implementation Checkpoint 23

- Added the live PVV4 boundary-and-vertices classification overlay:
  - `pax-fluxia/src/lib/territory/devtools/activeFrontClassificationOverlay.ts`
  - `pax-fluxia/src/lib/territory/adapters/pixi/PixiTerritoryDebugOverlay.ts`
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - `pax-fluxia/src/lib/territory/devtools/overlayConfig.ts`
  - `pax-fluxia/src/lib/territory/devtools/activeFrontClassificationOverlay.test.ts`
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v10.md`
- Exact behavior:
  - overlay now classifies every visible section and structural vertex on the active PVV4 path
  - active sections show their local active sub-section span
  - diagnostics now include a conquest-start pause toggle in addition to defect freeze
- Two-star targeted fix:
  - conquest-local anchor-pair gating now includes both stars from a 2-star previous region when one of those stars is conquered
  - this directly targets the observed 2->1 region snap case
- Validation:
  - `bun vitest run src/lib/territory/devtools/activeFrontClassificationOverlay.test.ts src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
  - `bun run build` in `pax-fluxia/`
## Implementation Checkpoint 24
- Diagnosed package `12-52-27---742_cq_s27_a4-a3_tdp` as a false classification freeze, not a 2-star snap case.
- Reclassified `no_change_span` from defect to normal no-motion diagnostic outcome.
- Active-front summary now separates `no-motion pairs` from real defects.
- Freeze-on-unclassified now remains reserved for actual unresolved states.
## Implementation Checkpoint 25
- Strengthened the live PVV4 classification overlay to render both `PRE` and `NEXT` topology layers.
- `PRE` source-path sections now render as dashed overlays instead of being effectively hidden.
- `no_change_span` local pairs remain classified and visible as `no-motion` instead of being folded into generic unchanged display.
- Runtime output now exposes `transitionPrevTopology` so the overlay can draw the source path at conquest pause.
## Implementation Checkpoint 26
- Moved the active-front diagnostics overlay onto the same `GameCanvas` `debugGraphics` / `debugTextContainer` path as the working geometry overlay.
- Removed the separate bridge-local Pixi diagnostics overlay update from the active path.
- Expected visible result:
  - diagnostics toggles now change the live map in steady-state and during transition pause
  - `PRE` and `NEXT` classified sections, vertices, labels, and sample dots now share the same known-good render surface as geometry diagnostics

## Implementation Checkpoint 27
- Fixed live browser crash on the new diagnostics path:
  - `renderActiveFrontDebugOverlay(...)` had been reading `canonicalRuntimeOutput` from the wrong scope inside `pax-fluxia/src/lib/components/game/GameCanvas.svelte`
  - the helper now takes runtime output explicitly from the live frame path through `renderPerimeterFieldDebugOverlay(...)`
- Fixed diagnostics-toggle persistence:
  - added persisted overlay panel keys and panel->overlay hydration in:
    - `pax-fluxia/src/lib/territory/devtools/overlayConfig.ts`
    - `pax-fluxia/src/lib/components/ui/panelSync.ts`
    - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Diagnostics.svelte`
- Created:
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v14.md`
- Validation:
  - `bun vitest run src/lib/territory/devtools/activeFrontClassificationOverlay.test.ts src/lib/territory/layers/transition/ActiveFrontTransition.test.ts`
  - `bun run build` in `pax-fluxia/`

## Implementation Checkpoint 28
- Fixed the remaining `canonicalRuntimeOutput is not defined` scope leak in `pax-fluxia/src/lib/components/game/GameCanvas.svelte`.
- Root cause:
  - `renderPerimeterFieldDebugOverlay(...)` was still being called outside the inner block that declared `canonicalRuntimeOutput`.
- Exact change:
  - hoisted `canonicalRuntimeOutput` to the enclosing territory-frame scope
  - removed the inner shadow declaration
- Created:
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v15.md`
- Validation:
  - `bun run build` in `pax-fluxia/`

## Implementation Checkpoint 29
- Corrected the outer diagnostics overlay path to use component-level debug state instead of any callback-local `canonicalRuntimeOutput`.
- Exact change:
  - added `canonicalDebugRuntimeOutput` beside `canonicalDebugGeometrySnapshot`
  - canonical bridge updates now refresh that component-level runtime snapshot
  - queued territory render start clears it
  - `renderPerimeterFieldDebugOverlay(...)` now reads `canonicalDebugRuntimeOutput`
- Created:
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v16.md`
- Validation:
  - `bun run build` in `pax-fluxia/`

## Implementation Checkpoint 30
- Added a real top-left HUD legend for the active-front diagnostics overlay.
- `GameCanvas.svelte` now draws a compact boxed `AF Diagnostics` key with:
  - summary counts
  - `PRE source`
  - `NEXT active`
  - `Active subspan`
  - `No-motion`
  - `Stable anchor`
  - `Front anchor`
  - `Defect`
  - `Sample points`
- Hardened runtime-output scope again:
  - `canonicalRuntimeOutput` is now component-scoped
  - queued territory render start clears it explicitly
  - the overlay path no longer depends on a callback-local declaration
- Created:
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v17.md`
- Validation:
  - `bun run build` in `pax-fluxia/`

## Implementation Checkpoint 31
- Replaced the AF legend’s Pixi/world-space drawing with a normal HTML HUD overlay.
- `GameCanvas.svelte` now uses a named grid HUD layer:
  - `canvas-hud`
  - `grid-template-areas`
  - legend anchored at `top-left`
- `canonicalDebugRuntimeOutput` was also made reactive with `$state(...)` because the HUD now binds to it directly in markup.
- Created:
  - `.agent/docs/sessions/2026-05-06/2026-05-06_territory-transition-diagnosis_v18.md`
- Validation:
  - `bun run build` in `pax-fluxia/`
