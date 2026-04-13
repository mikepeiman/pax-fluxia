# Feature And Task Queue - 2026-04-13

## Purpose

Keep the active 2026-04-13 execution queue in one dated place.

## Completed This Slice

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

- [ ] Verify in-app that lanes no longer disappear visually at higher lane margins while mechanics remain connected.
- [ ] Verify in-app that SP and MP now both present the same visible lane truth on the same map/settings.
- [ ] Continue lane geometry hardening so short direct lanes stay straight more often while curved detours remain outward and readable.
- [ ] Diagnose and redesign DX distance/weight semantics after refreshing the exact intended constraint.
- [ ] Queue contested-lane midpoint tunables for the UI owner after the control-panel refactor settles.

## Notes

- This slice was a truth-ownership correction, not just a renderer tweak.
- The target invariant is now explicit: visual lanes must be derived from authoritative map truth, not a separate visibility heuristic.
