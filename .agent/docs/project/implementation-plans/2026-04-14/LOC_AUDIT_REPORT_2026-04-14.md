# LOC Audit Report - 2026-04-14

## Purpose

Run a comprehensive LOC audit of the live Pax Fluxia codebase with full file coverage, while keeping the output focused on technical leverage rather than mechanical summary.

## Coverage

- Scope audited:
  - `common/src`
  - `pax-fluxia/src`
  - `pax-server/src`
- Full inventory written to:
  - `.agent/docs/project/implementation-plans/2026-04-14/LOC_AUDIT_FILE_INVENTORY_2026-04-14.csv`
- Coverage totals from the inventory:
  - `375` live files
  - `95,401` counted lines
  - `44` files at `500+` LOC
  - `17` files at `<=3` LOC

## Canonical Core

- Shared gameplay truth is still correctly anchored in `common/src`.
  - `common/src/engine/GameEngine.ts` is the live rules owner for ticking, order validation, combat orchestration, and win resolution.
  - `common/src/config.ts` is the MP/SP shared engine-config contract.
  - `common/src/mapgen/connections.ts` and `common/src/mapgen/lanePolylines.ts` are the canonical connectivity and lane-geometry builders.
- Multiplayer state truth is cleaner than it was.
  - `pax-fluxia/src/lib/stores/multiplayerStore.svelte.ts` now separates lobby connection state from joined-room state with distinct `isLobbyConnected` and `isConnected` fields.
  - `pax-server/src/transport/PatchedBunWebSockets.ts` is the real owner of the Bun transport fix for room-id parsing.
- Lane direction truth is now structurally explicit.
  - `pax-fluxia/src/lib/lanes/lanePolylineCache.ts` stores undirected canonical paths and exposes `getDirectedLanePolyline(...)` as the directed adapter.
  - `pax-fluxia/src/lib/lanes/applyLaneTravelPath.ts` and `pax-fluxia/src/lib/renderers/LaneRenderer.ts` both consume that directed adapter.

## Best Technical Findings

- `P1` Territory architecture surface area is larger than the real implementation.
  - Evidence:
    - `pax-fluxia/src/lib/territory/orchestrator/methods/fg2SeedGraph.ts` is `4911` LOC.
    - `pax-fluxia/src/lib/territory/orchestrator/engine.ts` is `603` LOC.
    - `17` files in the full inventory are `<=3` LOC, including active-looking aliases such as:
      - `pax-fluxia/src/lib/territory/layers/geometry/modes/BoundaryConstrainedFrontierGeometryMode.ts:1`
      - `pax-fluxia/src/lib/territory/layers/geometry/modes/WeightedPowerVoronoiGeometryMode.ts:1`
  - Why it matters:
    - The territory system presents a broad “clean architecture” surface, but a meaningful slice of that surface is alias/stub indirection rather than distinct implementation. That makes the system look more modular and complete than it really is.
  - Recommendation:
    - Collapse alias-only layer files where possible, or clearly reclassify them as compatibility names rather than active implementations.

- `P1` Settings/config truth is centralized, but overloaded enough to be a drag on trust and iteration.
  - Evidence:
    - `pax-fluxia/src/lib/config/game.config.ts` is `1568` LOC and owns both client runtime config and client-side engine-config projection via `buildEngineConfig()` at line `13`, the raw config blob at line `707`, and the mutable `GAME_CONFIG` proxy at line `1644`.
    - `pax-fluxia/src/lib/components/ui/settingsDefs.ts` is `688` LOC and carries the giant `PANEL_CONFIG_MAP` beginning at line `175`.
    - `pax-fluxia/src/lib/components/ui/panelSync.ts` owns `applyPanelToConfig()` at line `182` and `syncPanelFromConfig()` at line `198`.
    - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte` is `2141` LOC.
  - Why it matters:
    - The repo does have a canonical settings path, but it is spread across one huge config object, one huge mapping table, one sync bridge, and one giant UI shell. That is canonical-but-expensive, not cleanly modular.
  - Recommendation:
    - Keep the single source of truth, but split the control-surface definition by subsystem and make the mapping table easier to audit against actual UI sections.

- `P1` UI composition still leans on very large monoliths in core play surfaces.
  - Evidence from the full inventory:
    - `pax-fluxia/src/lib/components/game/GameCanvas.svelte` `3074` LOC
    - `pax-fluxia/src/lib/components/game/GameContainer.svelte` `1934` LOC
    - `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte` `2141` LOC
    - `pax-fluxia/src/lib/components/ui/MainMenu.svelte` `1312` LOC
  - Why it matters:
    - These are not cosmetic outliers. They sit on the most active gameplay and UX paths, so every feature pass pays extra coordination and regression cost.
  - Recommendation:
    - Treat file-size reduction here as architectural cleanup, not style polish.

- `P2` Shared path truth looks materially cleaner than earlier regression notes implied.
  - Evidence:
    - `pax-fluxia/src/lib/lanes/lanePolylineCache.ts:74` exposes `getDirectedLanePolyline(...)`.
    - `pax-fluxia/src/lib/lanes/applyLaneTravelPath.ts:16` reads the directed polyline before trimming.
    - `pax-fluxia/src/lib/renderers/LaneRenderer.ts:171-183` uses lane-following arrow paths with trimmed fallback.
  - Why it matters:
    - This is a real architectural repair, not just a local patch. Direction-sensitive consumers now have an explicit path to directional truth.
  - Recommendation:
    - Preserve this pattern and continue deleting any holdout undirected consumers.

- `P2` Multiplayer room-state truth also looks materially improved.
  - Evidence:
    - `pax-fluxia/src/lib/stores/multiplayerStore.svelte.ts:46` defines `isConnected`.
    - `pax-fluxia/src/lib/stores/multiplayerStore.svelte.ts:74` defines `isLobbyConnected`.
    - `pax-fluxia/src/lib/stores/multiplayerStore.svelte.ts:325` joins the lobby separately.
    - `pax-fluxia/src/lib/stores/multiplayerStore.svelte.ts:802` exports `isLobbyConnected` separately from joined-room state.
    - `pax-server/src/transport/PatchedBunWebSockets.ts:210-214` parses `pathname` and `searchParams` separately before extracting the room id.
  - Why it matters:
    - The room browser and the actual game-room session are no longer obviously conflated in the store structure, and the Bun transport fix is now explicit and local.
  - Recommendation:
    - Keep this split sacred. Any future lobby UI should read lobby state and room state separately by default.

- `P2` Server-side palette and room-bootstrap logic still duplicates some client-facing concept ownership.
  - Evidence:
    - `pax-server/src/rooms/GameRoom.ts:21` defines a local `PLAYER_COLORS` palette.
    - `pax-server/src/rooms/GameRoom.ts:363` implements local hue-separation logic.
    - `pax-server/src/rooms/GameRoom.ts:379` adds `getConfiguredPlayerColor(...)`.
  - Why it matters:
    - Some duplication is justified because the server must remain authoritative. But this also means “player color truth” is split between client palette UX, room options, and server fallback logic.
  - Recommendation:
    - Make the split explicit: server fallback palette policy vs client-selected palette truth.

## Most Interesting Opportunities

- The ruler tool is stronger than a normal debug helper and could become a real diagnostic surface.
  - Evidence:
    - `pax-fluxia/src/lib/territory/devtools/rulerTool.ts` stores measured geometry, lane margin, and both actual and user-assigned lane-state labels.
    - It already records `laneMarginPx`, `actualLaneState`, `userLaneState`, and persistent measurements.
  - Opportunity:
    - Productize it as a reusable “spatial truth inspector” for lane, corridor, and territory debugging instead of leaving it as a narrow one-off tool.

- The repo contains more rendering and territory experimentation than the current UI likely surfaces well.
  - Evidence:
    - Large active families in `territory`, `renderers`, and `config/game.config.ts`.
    - Many toggles and mode selectors exist across territory geometry, transitions, styles, and debug diagnostics.
  - Opportunity:
    - A better surfaced “render lab” or “territory diagnostics” mode could unlock value from work that is already present but hard to reason about.

- The client/server/shared mapgen relationship is strategically strong.
  - Evidence:
    - `common/src/mapgen/*` owns generation and lane geometry.
    - `pax-server/src/rooms/GameRoom.ts` consumes shared mapgen rather than inventing server-only path logic.
    - `pax-fluxia/src/lib/lanes/*` consumes persisted lane truth rather than recomputing it locally.
  - Opportunity:
    - This is a real platform seam for future authored-map tooling, replay tooling, and deterministic diagnostics.

## Best Cleanup Moves

- Reduce territory alias noise first.
  - Start with the one-line layer-mode aliases and re-export shims that make the territory surface look larger than the real implementation.

- Split the settings truth surface by subsystem without introducing a second config pattern.
  - Keep one config owner, but separate panel definitions and sync rules for travel, territory, combat, audio, and UI.

- Target monolith reduction where game iteration actually happens.
  - `GameCanvas.svelte`
  - `GameSettingsPanel.svelte`
  - `GameContainer.svelte`
  - `MainMenu.svelte`

- Add a repo-generated ownership index from the inventory.
  - The CSV already gives full file coverage. The next leverage step is a generated ownership/size view by subsystem so drift is easier to see before it becomes architectural folklore.

## Top 10 Next Moves

1. Collapse or relabel the territory one-line alias files so the architecture surface becomes more honest.
2. Break `GameSettingsPanel.svelte` into subsystem-owned shells while preserving the single `GAME_CONFIG` truth path.
3. Split `settingsDefs.ts` into smaller domain slices with one generated combined export.
4. Carve `GameCanvas.svelte` into real runtime-owned modules around rendering, input, diagnostics, and MP synchronization.
5. Add a small generated dashboard from `LOC_AUDIT_FILE_INVENTORY_2026-04-14.csv` to track the largest files and smallest alias files over time.
6. Promote `rulerTool.ts` into a first-class diagnostic workflow for lane and territory truth.
7. Make server palette fallback policy explicit so it stops feeling like a shadow source of player-color truth.
8. Continue deleting or consolidating direction-sensitive holdouts so all motion consumers go through the directed lane adapter.
9. Audit the territory mode and render-family UI surfaces for controls that exist in config but are still poorly surfaced.
10. Run a second comprehensive pass focused only on the `territory` and `renderers` subtree, since that is where most architecture surface area and most hidden feature potential currently sit.
