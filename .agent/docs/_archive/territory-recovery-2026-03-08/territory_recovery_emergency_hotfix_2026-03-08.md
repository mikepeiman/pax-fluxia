# Territory Recovery Emergency Hotfix Note (2026-03-08)

## Trigger
- Runtime crash reported by user:
  - `Cannot read properties of undefined (reading 'minX')`
  - at `assertMeshCenterStrokeAlignment(...)` in `DistanceFieldTerritoryRenderer.ts`.
- Separate UI corruption report: territory panel labels showing `??`/garbled symbols from prior encoding drift.

## Fixes Applied
1. **Frame-loop crash guard**
- Hardened `assertMeshCenterStrokeAlignment(...)` to handle missing/invalid alignment contract bounds safely.
- Guard conditions now return early if:
  - contract is null/undefined,
  - content bounds missing,
  - any bound coordinate is non-finite.
- This prevents one bad diagnostic alignment state from breaking the entire render loop.

2. **Territory panel text restoration**
- Restored `ControlsSection-Territory.svelte` from pre-corruption baseline and re-applied the intended panel-driven toggle fixes for modified/power Voronoi corridor/disconnect controls.
- Normalized edited files to UTF-8 to avoid future unicode mangling.

## Expected Outcome
- Visual loop should no longer freeze from alignment assertion path.
- Territory control labels should render normally (no `??` corruption).
- Modified/power Voronoi corridor/disconnect controls remain panel-first for reactivity correctness.
