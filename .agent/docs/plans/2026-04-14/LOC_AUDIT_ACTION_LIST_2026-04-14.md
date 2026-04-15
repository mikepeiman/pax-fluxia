# LOC Audit Action List - 2026-04-14

## Purpose

Turn the comprehensive LOC audit into a ranked execution list.

This is not a second audit report. It is the action layer that follows from the full-file inventory and the first synthesis.

## Audit Base

- Inventory source: `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_FILE_INVENTORY_2026-04-14.csv`
- Synthesis source: `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_REPORT_2026-04-14.md`
- Coverage base:
  - `375` live files
  - `95,401` counted lines
  - `44` files at `500+` LOC
  - `17` files at `<=3` LOC

## Ranking Rules

Rank actions by a simple blend of:

1. code mass
2. truth ownership
3. iteration drag
4. user-facing trust risk
5. architectural honesty
6. feature unlock potential

## Ranked Actions

### 1. Territory Surface Honesty Pass

- Priority: `P1`
- Why first:
  - `client/territory` is the largest subsystem at `21,991` LOC across `153` files.
  - The audit found active-looking one-line alias files that make the system look broader and more modular than it really is.
- Primary targets:
  - `pax-fluxia/src/lib/territory/adapters/legacy/PowerVoronoiAdapter.ts`
  - `pax-fluxia/src/lib/territory/adapters/legacy/SeedGraphAdapter.ts`
  - `pax-fluxia/src/lib/territory/integration/GameCanvasBridge.ts`
  - `pax-fluxia/src/lib/territory/layers/geometry/modes/BoundaryAwareFrontierMode.ts`
  - `pax-fluxia/src/lib/territory/layers/geometry/modes/BoundaryConstrainedFrontierGeometryMode.ts`
  - `pax-fluxia/src/lib/territory/layers/geometry/modes/SeedGraphClusterSplitGeometryMode.ts`
  - `pax-fluxia/src/lib/territory/layers/geometry/modes/WeightedPowerVoronoiGeometryMode.ts`
  - `pax-fluxia/src/lib/territory/layers/ownership/modes/VirtualStarOwnershipMode.ts`
  - `pax-fluxia/src/lib/territory/layers/presentation/modes/CanonicalVectorStyle.ts`
  - `pax-fluxia/src/lib/territory/layers/presentation/modes/PixelQuantizedMeshStyle.ts`
  - `pax-fluxia/src/lib/territory/layers/presentation/modes/SignedDistanceFieldMeshStyle.ts`
  - `pax-fluxia/src/lib/territory/layers/presentation/modes/VectorPolygonMeshStyle.ts`
  - `pax-fluxia/src/lib/territory/layers/transition/modes/AlphaCrossfadeFillMode.ts`
  - `pax-fluxia/src/lib/territory/layers/transition/modes/FrontierTopologyMorphFillMode.ts`
  - `pax-fluxia/src/lib/territory/layers/transition/modes/OptimalTransportCorrespondenceBorderMode.ts`
  - `pax-fluxia/src/lib/territory/layers/transition/modes/RopeInterpolatedBorderMode.ts`
- Action:
  - Collapse alias-only files where compatibility is no longer needed.
  - Rename or annotate compatibility shims where the name is still useful.
  - Produce one explicit territory ownership index: real implementations vs compatibility names.
- Expected win:
  - More honest architecture.
  - Lower cognitive load before any deeper territory refactor.

### 2. Break the Settings Truth Surface Into Domain Slices

- Priority: `P1`
- Why second:
  - The current settings path is canonical but too expensive to change safely.
  - This is directly on the trust boundary between surfaced controls and runtime effect.
- Primary targets:
  - `pax-fluxia/src/lib/config/game.config.ts` (`1568` LOC)
  - `pax-fluxia/src/lib/components/ui/settingsDefs.ts` (`688` LOC)
  - `pax-fluxia/src/lib/components/ui/panelSync.ts` (`310` LOC)
  - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte` (`2141` LOC)
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Territory.svelte` (`2262` LOC)
  - `pax-fluxia/src/lib/components/ui/settings/ControlsSection-Ships.svelte` (`1759` LOC)
- Action:
  - Keep one config owner.
  - Split panel definitions and sync mapping by domain:
    - travel
    - territory
    - ships
    - conquest
    - audio
    - debug
    - visuals
  - Generate one combined export instead of one giant hand-maintained map.
  - Move `GameSettingsPanel.svelte` toward composition over central sprawl.
- Expected win:
  - Safer settings work.
  - Easier UI/runtime audits.
  - Better feature-surface clarity for existing controls.

### 3. Carve the Core Gameplay UI Monoliths

- Priority: `P1`
- Why third:
  - These files sit directly on the hot gameplay path.
  - They are absorbing both feature work and regression risk.
- Primary targets:
  - `pax-fluxia/src/lib/components/game/GameCanvas.svelte` (`3074` LOC)
  - `pax-fluxia/src/lib/components/game/GameContainer.svelte` (`1934` LOC)
  - `pax-fluxia/src/lib/components/ui/MainMenu.svelte` (`1312` LOC)
  - `pax-fluxia/src/lib/components/ui/ResultsModal.svelte` (`1227` LOC)
- Action:
  - Split by runtime responsibility, not by arbitrary component count.
  - Good seams:
    - render orchestration
    - input handling
    - debug overlays
    - multiplayer/session glue
    - menu shell vs menu panels
    - results presentation vs results data shaping
- Expected win:
  - Faster feature iteration.
  - Lower regression coupling.
  - Clearer ownership between runtime, UI, and diagnostics.

### 4. Territory/Renderer Consolidation Pass

- Priority: `P1`
- Why fourth:
  - `client/renderers` is `20,872` LOC across `40` files.
  - Territory and renderers together are the dominant code mass in the repo.
  - The current family looks powerful, but also fragmented and partly experimental.
- Primary targets:
  - `pax-fluxia/src/lib/renderers/DistanceFieldTerritoryRenderer.ts` (`4580` LOC)
  - `pax-fluxia/src/lib/renderers/PowerVoronoiRenderer.ts` (`1640` LOC)
  - `pax-fluxia/src/lib/renderers/PowerVoronoiRenderer_DY4.ts` (`1377` LOC)
  - `pax-fluxia/src/lib/renderers/frontierGraph.ts` (`1239` LOC)
  - `pax-fluxia/src/lib/renderers/MetaballRenderer.ts` (`1099` LOC)
  - `pax-fluxia/src/lib/renderers/ModifiedVoronoiRenderer.ts` (`944` LOC)
  - `pax-fluxia/src/lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts` (`906` LOC)
  - `pax-fluxia/src/lib/territory/orchestrator/methods/fg2SeedGraph.ts` (`4911` LOC)
- Action:
  - Identify the current favored render path and demote the rest to explicit experimental or legacy status.
  - Remove naming that implies equal production status when that is not true.
  - Split giant algorithm files by phase or data transformation, not by arbitrary helper count.
- Expected win:
  - Cleaner experimentation.
  - Easier render-family decision making.
  - Less accidental support burden for old paths.

### 5. Generate a Persistent LOC Dashboard

- Priority: `P1`
- Why fifth:
  - The audit already has complete coverage.
  - The next leverage move is turning that one-time inventory into an ongoing anti-drift tool.
- Inputs:
  - `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_FILE_INVENTORY_2026-04-14.csv`
- Action:
  - Generate a small dashboard that tracks:
    - largest files
    - subsystem totals
    - alias/stub files
    - archived-but-still-live-looking files
    - top growth risks
- Expected win:
  - Future architecture discussions can point to stable evidence instead of folklore.

### 6. Make the Territory Diagnostics Surface Real

- Priority: `P2`
- Why:
  - The audit found that the diagnostics capability is stronger than its current product surface.
- Primary targets:
  - `pax-fluxia/src/lib/territory/devtools/rulerTool.ts`
  - related territory debug and transition snapshot tooling
- Action:
  - Promote the ruler tool into a first-class spatial truth inspector.
  - Surface lane margin, corridor state, ownership state, and measurement persistence through a reusable workflow instead of a niche dev helper.
- Expected win:
  - Better debugging.
  - Better tuning.
  - A stronger internal tool built from code that already exists.

### 7. Lock In Directed Lane Truth

- Priority: `P2`
- Why:
  - This is one of the strongest technical repairs the audit found.
  - It should become a hard rule, not a recent improvement that slowly erodes.
- Primary targets:
  - `pax-fluxia/src/lib/lanes/lanePolylineCache.ts`
  - `pax-fluxia/src/lib/lanes/applyLaneTravelPath.ts`
  - `pax-fluxia/src/lib/renderers/LaneRenderer.ts`
  - any remaining direction-sensitive consumers found in follow-up grep passes
- Action:
  - Audit remaining directional consumers and force them through the directed adapter.
  - Remove or annotate any path logic that still encourages undirected fallback use in direction-sensitive flows.
- Expected win:
  - Preserves a real architecture gain.
  - Reduces path-truth regressions.

### 8. Clarify Player-Color Authority Across Client and Server

- Priority: `P2`
- Why:
  - The server is correctly authoritative, but the palette story is still split enough to be confusing.
- Primary targets:
  - `pax-server/src/rooms/GameRoom.ts`
  - client palette and room-option surfaces that shape or display the same concept
- Action:
  - Make policy explicit:
    - client chooses preferred palette intent
    - server enforces final fallback and validity policy
  - Name the fallback path so it no longer reads like hidden duplicate truth.
- Expected win:
  - Cleaner MP reasoning.
  - Less ambiguity around room bootstrap and color assignment.

### 9. Reclassify Archived and Experimental UI

- Priority: `P2`
- Why:
  - Some `_archived` and prototype surfaces are still large enough to distort the repo unless their status is explicit.
- Primary targets:
  - `pax-fluxia/src/lib/components/ui/_archived/CombatLogPanel.svelte` (`768` LOC)
  - `pax-fluxia/src/lib/components/ui/_archived/MultiplayerLobby.svelte` (`586` LOC)
  - `pax-fluxia/src/lib/prototypes/ship-orbit-demo.html` (`829` LOC)
- Action:
  - Confirm whether each is:
    - dead
    - reference-only
    - still active through imports
  - If dead, move or document accordingly.
  - If reference-only, label it clearly.
- Expected win:
  - Less false architecture weight.
  - Cleaner auditability.

### 10. Run One More Deep Audit Pass Only on Territory and Renderers

- Priority: `P2`
- Why:
  - These two subsystems alone account for the biggest share of client code mass and most of the hidden feature potential.
- Action:
  - Use the full inventory as the index.
  - Classify every territory and renderer file as:
    - canonical
    - favored experimental
    - compatibility
    - legacy
    - dead/suspect
  - End with a decision table for what to keep, merge, demote, or delete.
- Expected win:
  - Converts the broad audit signal into an actual subsystem simplification plan.

## Fastest Wins

- Collapse or relabel the one-line territory alias files.
- Split `settingsDefs.ts` by domain while keeping one combined export.
- Add a generated subsystem-size dashboard from the existing CSV.
- Reclassify `_archived` and prototype files that still look operational.

## Biggest Risk Reducers

- Split the settings truth surface without creating a second config authority.
- Carve `GameCanvas.svelte` and `GameContainer.svelte` by runtime responsibility.
- Demote renderer families that are no longer true production paths.

## Best Feature-Surface Bets

- Productize the territory ruler into a spatial truth inspector.
- Build a render or territory diagnostics lab from the existing mode surface.
- Preserve the shared deterministic mapgen seam for future authored-map or replay tooling.

## Default Execution Order

1. Territory surface honesty pass
2. Settings truth surface split
3. Core gameplay UI monolith split
4. Territory and renderer consolidation
5. LOC dashboard generation
6. Diagnostics surface promotion
7. Directed lane truth cleanup
8. Player-color authority clarification
9. Archived and experimental reclassification
10. Deep territory/renderers decision pass
