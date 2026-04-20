# Feature & Task Queue — 2026-04-20

## Completed

- **Lane direction write-side fix** (`c5118a30`) — canonicalize waypoint
  direction at cache storage boundary. Regression test locked in. User
  verified: attacks work; `[lane-cache-fix]` engagement log fires.
- **Three-stage lane diagnostics** (`ad780bdf`, `f9ea277c`, `7cc1fb8a`) —
  write/read/assign coverage for the backward-polyline class. All three
  use the telemetry logger per AGENT.md §4.2 (`033fd738`).
- **Post-mortem** —
  `.agent/docs/project/post-mortems/POST_MORTEM_2026-04-20_LANE_DIRECTION_WRITE_SIDE.md`.
  Root cause: April-12 read-side fix introduced a directional invariant
  without enforcing it on the write side; bug latent until a map with 10+
  stars hit the `'star-10' < 'star-2'` lexicographic cliff.

## Proposed (plans written, awaiting user approval)

- **Rename `laneWaypoints` → `laneVertices`** —
  `RENAME_PLAN_LANE_WAYPOINTS_TO_VERTICES_2026-04-20.md`. 90 hits across
  23 files. Recommend staged approach (backward-compat alias in schema,
  then swap). Crosses Colyseus wire boundary — needs coordination.
- **Mode-reactive diagnostics panel + grid-mode geometry overlay** —
  `DIAGNOSTICS_PANEL_MODE_REACTIVE_2026-04-20.md`. Introduces a
  `FamilyDiagnosticsContract`. Moves perimeter-field's toggles into the
  contract; adds grid-mode overlays (role-colored vstar markers, ownership
  boundary, wave direction).

## Follow-Ups (tracked from today's work)

- Audit other caches keyed by canonical-id for directional data —
  `mapThumbnail`, `LaneRenderer` potential caches. See post-mortem
  corrective actions.
- Decide timeline for removing the three lane-direction runtime
  diagnostics — all are one-shot / capped, so cost is negligible; leaving
  them ~1 week then removing is defensible.
- Consider numeric-aware id compare (or zero-padded `star-NNN` ids) as
  a structural fix for the `star-10 < star-2` class.

## Diagnostics Inventory (reference)

### Metaball-grid — currently wired
- Stats readouts (`metaballGridStats` store): painted/emittable/total
  cells, requested/effective spacing, frame time EMA, frame/skip counts.
- No PIXI debug overlay.
- No family-specific log tags.

### Metaball-perimeter-field — wired, candidates for port
- Geometry loops overlay (cyan) — `PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY`.
- Vstar markers overlay — `PERIMETER_FIELD_DEBUG_SHOW_VSTARS`.
- Trajectory lines + sample labels (conquest-local override visualization).
- Transition scrub with 3-slot replay capture.

Port candidates: geometry overlay, vstar markers, scrub/replay frame
capture. See the diagnostics panel plan for details.
