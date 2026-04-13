# Lane Geometry Strict Solver - 2026-04-13

## Scope

Eliminate remaining "ghost lane" divergence by enforcing lane feasibility at the shared geometry layer, not in renderer/cache-only follow-up passes.

## Rules enforced in this slice

- Start from straight lane candidates.
- Keep a lane straight when the straight chord satisfies Lane Margin.
- Curve only when needed to satisfy Lane Margin.
- If no satisfactory path satisfies Lane Margin, reject that specific lane.
- Preserve traversal connectivity by selecting other valid edges, not by forcing an invalid fallback lane.
- Render connection lanes directly from authoritative connection truth, without renderer-side shortening/mutation.

## Code changes

- `common/src/mapgen/lanePolylines.ts`
  - removed reduced-clearance relaxation below requested Lane Margin
  - removed unsafe straight fallback
  - changed lane-aware connection selection to:
    - accept preferred satisfiable edges first
    - then bridge disconnected components with other satisfiable Delaunay edges
    - never keep an unsatisfied edge as mechanical truth
- `common/src/mapgen/index.ts`
  - removed the final post-build `attachLaneWaypointsToConnections(...)` rewrite
  - `generateMap(...)` now returns the final lane-aware connection truth once
- `pax-fluxia/src/lib/stores/gameStore.svelte.ts`
  - in-game lane rebuild paths now use the same shared strict geometry builder
  - live refresh calls now pass real edge distances into the lane-aware selector
- `pax-fluxia/src/lib/components/ui/GameSettingsPanel.svelte`
  - bulk config imports/presets now trigger lane geometry rebuilds when lane keys change
- `pax-fluxia/src/lib/renderers/LaneRenderer.ts`
  - connection lanes now draw directly from authoritative connection truth
  - removed renderer-side connection-lane shortening

## Validation run by me

- `bunx tsc -p common/tsconfig.json --noEmit --pretty false`
- `bunx tsc -p pax-fluxia/tsconfig.json --noEmit --pretty false`

Direct shared-mapgen probe using the current live settings file across:

- `0, 35, 40, 45, 60, 80, 90, 120, 140, 160, 175, 230, 300`

Results:

- every tested map stayed `components: 1`
- every surviving connection had lane truth: `missingTruth: 0`
- curved lanes appeared in the expected mid/high-margin bands instead of collapsing into a mechanics/render split

Representative output:

- `margin 60 -> connections 96, curved 14, components 1, missingTruth 0`
- `margin 90 -> connections 102, curved 35, components 1, missingTruth 0`
- `margin 175 -> connections 91, curved 23, components 1, missingTruth 0`
- `margin 230 -> connections 90, curved 20, components 1, missingTruth 0`

## Remaining requirement

This is a shared-geometry correction, not a visual sign-off. The remaining required check is in-app verification that no mechanically-usable lane is absent from view after live Lane Margin changes.
