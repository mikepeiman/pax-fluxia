# Feature And Task Queue - 2026-04-13

## Purpose

Keep the active 2026-04-13 execution queue in one dated place.

## Completed This Slice

- [x] Eliminate the separate modal debug surface as the primary ruler entrypoint.
- [x] Remove the later separate Diagnostics Bar experiment from the active game UI.
- [x] Move ruler workflow into the regular right-hand Debug section instead of a second diagnostics surface.
- [x] Add persistent vs transient ruler measurement modes.
- [x] Add measurement logging with:
  - snapped stars / lane labels
  - distance in px
  - current Lane Margin at capture time
  - actual lane-state classification from authoritative map truth
  - user-overridable lane-state tag (`straight`, `bent`, `curved`, `missing`)
- [x] Add regular diagnostics-panel controls for:
  - ruler
  - live canvas overlay
  - transition snapshot recorder
- [x] Add a dedicated bottom-right ruler icon that toggles ruler mode and opens the Debug section.
- [x] Keep the diagnostics-related viewport/pan corrections so the board remains navigable when overlays are present.
- [x] Relax vertical pan clamping so the board is less vertically constrained, especially while diagnostics are open.
- [x] Move lane feasibility fully into shared geometry instead of allowing a post-connectivity lane rewrite.
- [x] Remove reduced-clearance lane solving and invalid straight fallback from shared lane geometry.
- [x] Split lane result classes into `straight`, `angular`, and `curved`.
- [x] Add adjusted-path style support at shared mapgen level so remapped lanes can remain angular or be converted into sampled curve geometry.
- [x] Make `generateMap(...)` return the final lane-aware connection truth once, with no downstream `attachLaneWaypoints...` rewrite.
- [x] Make live in-game lane adjustments use the same strict shared geometry builder as Main Menu generation.
- [x] Make config imports/presets rebuild real lane geometry when lane keys change.
- [x] Remove renderer-side connection-lane shortening so drawn lane paths come directly from authoritative connection truth.
- [x] Fix duplicate/offset lane rendering by canonicalizing bidirectional lane drawing and rendering the exact authoritative polyline instead of smoothing a second display path.
- [x] Add authoritative lane audit/snapshot tooling:
  - `bun run debug:lane-geometry`
  - SVG snapshot + markdown + JSON outputs
- [x] Update `debug:lane-margin` sweep output to distinguish `angular` vs `curved`.
- [x] Validate the full failing range at shared mapgen level:
  - margins `0, 35, 40, 45, 60, 80, 90, 120, 140, 160, 175, 230, 300`
  - `components: 1` across the sweep
  - `missingTruth: 0` across the sweep
- [x] Add a fixed-map lane audit:
  - `bun run debug:lane-audit`
  - frozen-map JSON + SVG + markdown outputs
  - exact per-lane chord clearance, final clearance, closest blocking star, closest point on lane, and decision reason
- [x] Remove false-positive curves on the frozen map by making the straight chord the hard first decision.
- [x] Prove the high-`Lane Margin` hard limit on the frozen map:
  - at `LM 175+`, the strict all-pairs straight-only feasible graph is disconnected
- [x] Encode the explicit hierarchy in shared geometry:
  - full traversal connectivity is the winning constraint
  - keep straight when chord satisfies LM
  - if chord fails: remap tries satisfying adjusted paths, prune mode rejects that lane and seeks replacement elsewhere
  - explicit graph-level connectivity restoration only when the strict feasible graph is disconnected
- [x] Add connectivity-override reporting to the lane audit so high-LM behavior is machine-checkable rather than guessed.
- [x] Replace the generic remap seed with a deterministic blocking-star vertex rule:
  - exact nearest blocking star-to-lane witness
  - vertex inserted on that shortest path
  - vertex pushed to the requested Lane Margin and not beyond it
  - repeated deterministically if another blocker still violates the constraint
- [x] Trace the lane-visibility divergence from authoritative map truth through schema/state/cache/rendering instead of patching the renderer blindly.
- [x] Confirm the shared layer already carries lane-path truth (`laneWaypoints`, `lanePathKind`) in `/common` types and Colyseus schema.
- [x] Identify the SP architecture gap: generated/rebuilt lane truth was being seeded into the cache without being written back onto authoritative `state.connections`.
- [x] Fix SP connection creation so authoritative connection objects now carry lane-path truth when maps are generated or rebuilt.
- [x] Fix saved-map export so map truth preserves `laneWaypoints` and `lanePathKind`.
- [x] Fix saved-map load so existing saved lane truth is scaled and reused rather than silently regenerated.
- [x] Update lane rendering so visible lane manifestation is drawn from persisted connection truth plus endpoint trimming, not from renderer-inferred star-gap carving.
- [x] Update lane-cache rebuild helper to return lane-aware connections so cache truth and state truth stay synchronized.
- [x] Reconcile pre-existing arrow-config type drift in `game.config.ts` so client type-checking can complete again.
- [x] Validate with:
  - `bunx tsc -p pax-fluxia/tsconfig.json --noEmit --pretty false`
  - `bunx tsc -p common/tsconfig.json --noEmit --pretty false`
  - direct runtime probe across lane margins `25, 60, 90, 120` showing:
    - `missingTruth: 0`
    - `collapsedVisible: 0`

## Top Queue

- [ ] Verify in-app that explicit connectivity-restoration edges are visually honest in both SP and MP.
- [ ] Decide whether connectivity-restoration edges need a distinct visual/diagnostic treatment when they violate requested Lane Margin.
- [ ] Add lane-key copy/export actions from the ruler measurement log if the diagnostic workflow needs faster issue filing.
- [ ] Verify in-app that SP and MP now both present the same visible lane truth on the same map/settings.
- [ ] Continue lane geometry hardening so short direct lanes stay straight and adjusted detours remain outward and readable.
- [ ] Surface the new adjusted-path style control in the UI once the UI branch is ready for tunables again.
- [ ] Diagnose and redesign DX distance/weight semantics after refreshing the exact intended constraint.
- [ ] Queue contested-lane midpoint tunables for the UI owner after the control-panel refactor settles.

## Notes

- This slice is now a strict shared-geometry correction, not a renderer interpretation tweak.
- The target invariant is explicit:
  - connectivity is defined only by lane-aware map truth
  - visible lanes are drawn directly from that same truth
- Current hard fact from the fixed-map audit:
  - above roughly `LM 175` on the frozen test map, the strict feasible graph is disconnected
  - any fully connected result there requires either adjusted satisfying paths or explicit graph-level connectivity restoration
