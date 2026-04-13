# Master Program Plan - 2026-04-13

## Current focus

- Eliminate lane truth divergence before merging the parallel branches.
- Keep the geometry/UI/rendering split clean: geometry owns lane truth, rendering consumes it, UI only tunes and exposes it.
- Avoid carrying forward any SP-only lane hacks that would reintroduce SP/MP drift.

## This round

- Replaced the separate hidden debug modal path with the normal Debug section plus a bottom-right ruler toggle:
  - removed the separate diagnostics surface
  - added a direct ruler entrypoint that opens Settings focused on Debug
- Rebuilt the ruler tool around actual diagnostic workflow:
  - transient vs persistent measurement modes
  - per-measure capture log
  - snapped stars / lane labels
  - current Lane Margin capture
  - actual lane-state classification from authoritative connection truth
  - user-overridable lane-state tag for screenshots / issue review
- Folded the modal-only debug controls into the unified diagnostics surface:
  - ruler
  - live overlay toggles
  - snapshot recorder actions
- Corrected the viewport/camera mismatch introduced by diagnostics UI:
  - fit/center/clamp math now reserves bottom inset correctly
  - opening diagnostics triggers a real refit instead of just covering the board
- Corrected the spec interpretation:
  - straight first
  - curve only when needed to satisfy Lane Margin
  - prune that lane if no satisfying path exists
  - preserve traversal by selecting other valid edges, not by forcing invalid fallback lanes
- Removed the two geometry compromises that were undermining that spec:
  - reduced-clearance solving below the requested Lane Margin
  - unsafe straight fallback when no satisfying path existed
- Removed the last shared-entrypoint rewrite:
  - `generateMap(...)` now returns the final lane-aware connection graph once
  - no post-build `attachLaneWaypointsToConnections(...)` pass remains
- Corrected live-runtime propagation:
  - Main Menu generation, in-game lane rebuilds, and config imports now all route through the same strict shared geometry builder
- Corrected the render boundary:
  - connection lanes are no longer shortened/mutated in the renderer
  - drawn lane paths now come directly from authoritative connection truth
- Corrected the duplicate odd-lane failure mode:
  - connection lanes are now canonicalized before drawing
  - the same bidirectional lane is not rendered twice with diverging display geometry
- Added explicit lane result classes:
  - `straight`
  - `angular`
  - `curved`
- Added shared geometry support for choosing how remapped lanes are represented:
  - `angular`
  - `curved`
- Added repeatable diagnostics so hidden/mechanical-only lanes are machine-checkable:
  - `bun run debug:lane-geometry`
  - SVG snapshot + markdown summary + JSON report
- Updated the lane-margin sweep so it distinguishes `angular` vs `curved` outcomes
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
  - direct shared-mapgen probe across lane margins `0, 35, 40, 45, 60, 80, 90, 120, 140, 160, 175, 230, 300`
    - every tested map stayed `components: 1`
    - every generated connection had lane truth: `missingTruth: 0`

## Fixed-map lane audit

- Added a deterministic frozen-map audit:
  - `bun run debug:lane-audit -- --saved-map common/resources/saved-maps/inner_circle_apr_13.json`
- The audit now records:
  - chord minimum clearance
  - final minimum clearance
  - closest blocking star
  - closest point on final lane
  - strict / adjusted / connectivity-override decision reason
- The audit proved two separate facts:
  - false-positive curves were real and are now removed on the frozen map
  - at `Lane Margin 175+`, the strict all-pairs straight-only feasible graph on that frozen map is disconnected
- That means the remaining behavior at high LM is no longer a hidden bug. It is an explicit hierarchy choice.
- Encoded hierarchy:
  1. keep a straight lane if the chord satisfies LM
  2. if the chord fails and remap is enabled, try adjusted paths that satisfy LM
  3. if the strict feasible graph is still disconnected, preserve traversal with an explicit best-clearance straight connectivity override
  4. lane-count targets stay weaker than connectivity
- Frozen-map audit sweep after the change:
  - `LM 60` -> `components 1`, `override 0`
  - `LM 90` -> `components 1`, `override 0`
  - `LM 100` -> `components 1`, `override 0`
  - `LM 145` -> `components 1`, `override 0`
  - `LM 175` -> `components 1`, `override 10`
  - `LM 230` -> `components 1`, `override 19`
  - `LM 245` -> `components 1`, `override 23`

## Next likely moves

- Verify in-app that high-margin lanes no longer disappear visually while mechanics still allow movement/attacks.
- Decide whether connectivity-override edges need a distinct diagnostic or visual treatment.
- Verify the same lane-path truth presentation in SP and MP.
- Continue lane-geometry tuning, but keep all future changes anchored to authoritative connection truth first.
- Hand the new adjusted-path-style tunable to the UI owner for surfacing once the panel refactor is ready.
