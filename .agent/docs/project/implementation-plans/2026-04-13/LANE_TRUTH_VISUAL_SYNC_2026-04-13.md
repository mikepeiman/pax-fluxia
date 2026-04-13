# Lane Truth Visual Sync - 2026-04-13

## Purpose

Make visible lanes derive only from authoritative map truth so lane mechanics and lane visuals cannot diverge.

## Findings

The bug was not a single renderer defect. It was an ownership defect across three layers:

1. `/common` already produced and carried lane-path truth.
2. MP preserved that truth through schema and room state.
3. SP was rebuilding lane-path truth into the cache without writing it back onto authoritative `state.connections`.
4. `LaneRenderer` then added a second visual-only layer by carving straight lanes around intervening stars.

That meant:

- mechanics could keep a connection
- cache could hold a path
- renderer could still decide to hide or fragment that edge independently

## Corrections

### Authoritative SP connection truth

Updated `pax-fluxia/src/lib/stores/gameStore.svelte.ts` so these paths now write lane truth onto authoritative connections:

- standard random map generation
- debug-map rebuilds
- lane-polyline refresh from config
- connection rebuild from lane clearance
- saved map import

### Cache synchronization

Updated `pax-fluxia/src/lib/lanes/lanePolylineCache.ts` so `rebuildLanePolylineCache()` returns lane-aware connections instead of only mutating the cache.

That lets the store synchronize:

- authoritative connection truth
- cache truth

from the same rebuilt source.

### Rendering contract

Updated `pax-fluxia/src/lib/renderers/LaneRenderer.ts` so lane rendering now uses:

- persisted `connection.laneWaypoints` when present
- endpoint trimming
- straight fallback only when the persisted path is absent or trims away

Removed the extra intervening-star gap-carving logic, because that was a separate visual interpretation layer rather than authoritative map truth.

## Validation

Run by me:

- `bunx tsc -p pax-fluxia/tsconfig.json --noEmit --pretty false`
- `bunx tsc -p common/tsconfig.json --noEmit --pretty false`

Direct runtime probe across lane margins `25, 60, 90, 120`:

```json
{"margin":25,"connections":97,"curved":0,"missingTruth":0,"collapsedVisible":0}
{"margin":60,"connections":97,"curved":1,"missingTruth":0,"collapsedVisible":0}
{"margin":90,"connections":98,"curved":4,"missingTruth":0,"collapsedVisible":0}
{"margin":120,"connections":99,"curved":5,"missingTruth":0,"collapsedVisible":0}
```

Interpretation:

- `missingTruth: 0` means every generated mechanical connection carried lane-path truth.
- `collapsedVisible: 0` means the endpoint-trimmed visible path remained drawable for every connection in the probe.

## Remaining Verification

Still needs explicit in-app verification by the user:

- high-margin SP maps
- high-margin MP maps
- same-seed or same-topology visual parity between SP and MP
