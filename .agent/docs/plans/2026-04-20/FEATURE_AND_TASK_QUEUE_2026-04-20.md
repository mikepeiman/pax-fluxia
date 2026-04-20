# Feature And Task Queue - 2026-04-20

- Make the bottom-right diagnostics panel follow normal overlay dismissal UX: toggle closed from the same icon, close on outside click, and close on `Escape`.
- Fix the in-game `End Game` action so surrender reliably surfaces the results overlay.
- Add a direct `Load Map` action to the main menu command band with a saved-map picker.
- Add a direct `Load Map` action to the in-game settings panel so maps can be restarted from settings.
- Verify whether a real custom map editor exists on this branch before wiring any main-menu entry; do not add a dead button.

## Completed Today

- Wrote a merge handoff document for the custom map editor work so another agent can port the authored-map/editor changes onto another branch with less ambiguity.

## Artifacts

- `.agent/docs/plans/2026-04-20/MAP_EDITOR_MERGE_HANDOFF_2026-04-20.md`

## Additional Historical Branch Thread

### Lane Diagnostics And Reactive Diagnostics-Panel Planning

Source branch: `claude/goofy-raman`.

Completed in that branch thread:

- Lane direction write-side fix (`c5118a30`) to canonicalize waypoint direction at cache storage boundary, with regression coverage.
- Three-stage lane diagnostics (`7cc1fb8a`, `ad780bdf`, `f9ea277c`, `033fd738`) covering write/read/assign stages through the telemetry logger.
- Post-mortem:
  - `.agent/docs/project/post-mortems/POST_MORTEM_2026-04-20_LANE_DIRECTION_WRITE_SIDE.md`

Branch-authored plans from that thread:

- `RENAME_PLAN_LANE_WAYPOINTS_TO_VERTICES_2026-04-20.md`
- `DIAGNOSTICS_PANEL_MODE_REACTIVE_2026-04-20.md`

Historical follow-ups captured there:

- Audit other caches keyed by canonical id for directional data.
- Decide removal timing for the one-shot lane-direction runtime diagnostics.
- Consider numeric-aware id comparison or zero-padded star ids as a structural fix for `star-10 < star-2`.

Historical diagnostics inventory captured there:

- Metaball-grid currently wired stats readouts for painted/emittable/total cells, requested/effective spacing, frame time EMA, and frame/skip counts.
- Metaball-grid did not yet have a PIXI debug overlay or family-specific log tags in that thread.
- Metaball-perimeter-field candidates for port were listed as geometry-loop overlay, vstar markers, and replay/scrub capture.
