# Master Program Plan - 2026-04-13

## Current focus

- Eliminate lane truth divergence before merging the parallel branches.
- Keep the geometry/UI/rendering split clean: geometry owns lane truth, rendering consumes it, UI only tunes and exposes it.
- Avoid carrying forward any SP-only lane hacks that would reintroduce SP/MP drift.

## This round

- Traced the reported lane disappearance at high `Lane Margin` from `/common` outward instead of treating it as a purely visual problem.
- Confirmed the shared architecture already supports authoritative lane-path truth:
  - `common/src/types.ts`
  - `common/src/schema/GameState.ts`
  - `pax-server/src/rooms/GameRoom.ts`
- Found the real SP divergence:
  - generated/rebuilt lane polylines were being written into the lane cache
  - but not written back onto authoritative `state.connections`
  - the renderer then applied its own star-gap logic on top of that, creating a second visual-only interpretation layer
- Corrected the ownership split:
  - SP authoritative connections now carry `laneWaypoints` and `lanePathKind`
  - saved map export preserves lane truth
  - saved map load reuses saved lane truth when present
  - lane-cache rebuild now returns lane-aware connections so cache truth and state truth stay synchronized
- Corrected the rendering side:
  - lane rendering now draws persisted connection truth plus endpoint trimming
  - removed renderer-inferred intervening-star gap carving as a separate visibility heuristic
- Validation run by me:
  - `bunx tsc -p pax-fluxia/tsconfig.json --noEmit --pretty false`
  - `bunx tsc -p common/tsconfig.json --noEmit --pretty false`
  - direct runtime probe across lane margins `25, 60, 90, 120`
    - every generated connection had lane truth
    - none of the endpoint-trimmed visible paths collapsed

## Next likely moves

- Verify in-app that high-margin lanes no longer disappear visually while mechanics still allow movement/attacks.
- Verify the same lane-path truth presentation in SP and MP.
- Continue lane-geometry tuning, but keep all future changes anchored to authoritative connection truth first.
