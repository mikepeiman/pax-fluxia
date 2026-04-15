# Common Lane Parity And Fixture Foundation - 2026-04-11

## Purpose

Eliminate the SP/MP divergence around curved lane-path data by carrying shared lane truth end-to-end through `/common`, the Colyseus schema, the server room state, and the multiplayer client. Establish the smallest solid fixture-map foundation in `/common` without pretending the full fixture pipeline is finished.

## What changed

### Shared connection contract

- `common/src/types.ts`
  - shared `Connection` now carries optional:
    - `laneWaypoints`
    - `lanePathKind`

### Shared schema contract

- `common/src/schema/GameState.ts`
  - `ConnectionSchema` now includes:
    - `lanePathKind`
    - `laneWaypoints`
  - `PointSchema` now sits before `ConnectionSchema` so it can be reused there

### Server truth preservation

- `pax-server/src/rooms/GameRoom.ts`
  - standard random maps now copy shared lane data into schema connections
  - debug maps now use the shared lane-path solver from `@pax/common/mapgen` to enrich manual connections instead of leaving MP clients to infer chords
  - lane-generation config is derived in one place through `getLaneGenerationOptions()`

### Client normalization and cache seeding

- `pax-fluxia/src/lib/lanes/laneConnectionSync.ts`
  - new normalization bridge for schema-style lane points and path kinds
  - seeds the runtime lane cache from connection data
- `pax-fluxia/src/lib/stores/multiplayerStore.svelte.ts`
  - multiplayer connections now preserve lane data from server truth
  - multiplayer lane cache is seeded from synced connections
  - lane cache is cleared on leave/disconnect
- `pax-fluxia/src/lib/stores/gameStore.svelte.ts`
  - local schema-to-snapshot conversion now preserves lane data too

### Focused test

- `pax-fluxia/src/lib/lanes/laneConnectionSync.test.ts`
  - verifies:
    - waypoint normalization
    - path-kind normalization
    - lane-cache seeding from normalized connection data

### Fixture-map foundation

- `common/src/fixtureMaps.ts`
  - new shared fixture registry
  - phase-1 metadata only
  - points at curated existing saved-map JSON assets already in repo
- `common/src/index.ts`
  - re-exports the fixture registry

## Validation

### Passed

- `bunx tsc -p common/tsconfig.json --noEmit --pretty false`
- `bunx tsc -p pax-server/tsconfig.json --noEmit --pretty false`
- runtime schema probe:
  - `ConnectionSchema` accepts `lanePathKind` and `laneWaypoints`
- runtime cache probe:
  - normalized multiplayer-style connection data seeds the lane cache correctly

### Partial / constrained

- client TypeScript compile still has pre-existing unrelated territory-type errors outside this slice
- `vitest` and Vite-powered validation still hit Windows `spawn EPERM` in this Codex runner context, so the new test file could not be executed here even though the supporting runtime probes passed

## Architectural effect

This slice restores the correct ownership boundary:

- `/common`
  - authoritative lane-path data contract
  - lane-path generation logic
  - fixture registry metadata
- `pax-server`
  - preserves and transmits shared lane truth
- `pax-fluxia`
  - consumes shared lane truth and seeds presentation/runtime caches from it

## What is still next

1. Use the new fixture registry as the canonical place to grow deterministic visual/parity cases.
2. Add actual loading/validation helpers around fixture assets.
3. Expand fixture coverage toward:
   - lane clearance
   - cross-owner corridor behavior
   - world-edge frontier cases
   - conquest-transition stress cases
4. Run an actual MP visual verification pass to confirm the curved-lane path is now identical in SP and MP behavior.
