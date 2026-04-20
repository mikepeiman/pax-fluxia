# Rename Plan: `laneWaypoints` → `laneVertices`

## Purpose

User's own words: *"`attachLaneWaypointsToConnections` is named wrong.
Semantic code smell... Waypoints are related to travel and navigation. We do
not have them. Vertices are related to geometry, corners and arcs. That is
what we do with complex lanes."*

Rename the `Waypoint` terminology across the monorepo to `Vertex` /
`Vertices` so the shape-describing polyline uses the correct geometric
vocabulary.

## Scope

90 hits across 23 files — inventory produced 2026-04-20:

| Category | Count | Risk |
|---|---|---|
| Type/interface fields (schema/wire) | 6 | **CRITICAL** |
| Function names | 7 | High |
| Variable/parameter names | 54 | Medium |
| String literals (tests/comments) | 16 | Low |
| Test fixtures (JSON) | 5 | Low |
| Docs / markdown | 2 | Cosmetic |

### Critical (schema/wire-crossing)

1. `common/src/schema/GameState.ts:80` — Colyseus schema field
   `laneWaypoints: { array: PointSchema }`. **Wire field.**
2. `common/src/types.ts:76` — `Connection.laneWaypoints` (client-shared
   type).
3. `common/src/mapgen/types.ts:38,40` — `MapConnection.laneWaypoints`.
4. Five saved-map JSON fixtures in `common/resources/saved-maps/` —
   serialized data on disk; need a backward-compat loader.

### Function renames

- `computeLaneWaypoints` → `computeLaneVertices`
- `attachLaneWaypointsToConnections` → `attachLaneVerticesToConnections`
- `normalizeLaneWaypoints` → `normalizeLaneVertices`
- `buildQuadraticWaypointsViaControl` → `buildQuadraticVerticesViaControl`
- `solveAdaptiveWaypoints` → `solveAdaptiveVertices`

### Top files by hit count

1. `common/src/mapgen/lanePolylines.ts` — 19 (origin module)
2. `tools/debug/audit-lane-constraints.ts` — 12
3. `pax-fluxia/src/lib/lanes/lanePolylineCache.ts` — 7
4. `pax-server/src/rooms/GameRoom.ts` — 6
5. `pax-fluxia/src/lib/lanes/laneConnectionSync.test.ts` — 6
6. `pax-fluxia/src/lib/lanes/laneConnectionSync.ts` — 3
7. `pax-fluxia/src/lib/renderers/LaneRenderer.ts` — 2
8. `pax-fluxia/src/lib/utils/mapThumbnail.ts` — 2
9. `tools/debug/inspect-lane-geometry.ts` — 2
10. `pax-fluxia/src/lib/stores/gameStore.svelte.ts` — 1

### Adjacent terminology — keep as-is

`lanePathKind` enum (`'straight'` / `'angular'` / `'curved'`) describes the
shape class, not the vertices. No rename.

## Strategy

### Option A — Full rename, single commit (coordinated deploy)

Pros: one reviewable change; no dual-naming intermediate state.
Cons: breaks the wire protocol; requires server and client deploy in
lockstep; saved-maps need a migration/loader.

### Option B — Staged with backward-compat alias (recommended)

**Stage 1 (server-compat add):** Extend the Colyseus schema to **emit both**
`laneWaypoints` and `laneVertices` fields temporarily (read-path only adds
the new name). Client readers prefer `laneVertices`, fall back to
`laneWaypoints`. Client writers (maps saved locally) start writing
`laneVertices`. Saved-map loader accepts both.

**Stage 2 (callsite rename):** Rename every function name, variable, and
test-name. No schema change.

**Stage 3 (server-only swap):** Remove `laneWaypoints` emission; schema has
`laneVertices` only. Bump a protocol minor version.

**Stage 4 (cleanup):** Remove the backward-compat fallback in the
saved-map loader once all saved maps are re-emitted. Document end-of-life in
`DECISIONS.md`.

### Option C — Internal-only rename (defer wire)

Rename everything **except** the schema/wire field. Keep
`Connection.laneWaypoints` and `MapConnection.laneWaypoints` as the only
remaining `Waypoint` names, documented as "deprecated wire-format name; use
vertices internally." Accept the inconsistency until a future protocol bump
is needed for another reason.

Pros: zero wire risk, zero coordination cost.
Cons: inconsistent terminology at the boundary — exactly the smell the user
flagged.

## Verification

- `bun test` must stay green after every stage.
- Atlas-harness `code_references` audit before the commit removes
  `Waypoint` — zero hits in client, server, and common src/ (excluding
  backward-compat alias in stage 2).
- Grep for `waypoint` / `Waypoint` / `WAYPOINT` (case-insensitive) across
  non-docs sources returns zero hits at end of stage 4.
- Saved-map round-trip: load every map in `common/resources/saved-maps/`,
  confirm the lane geometry renders identically before and after.

## Open Questions

1. **Which option?** Recommendation: B (staged). User should confirm before
   execution.
2. **Does `WAYPOINT` appear in any config key?** (None found in the
   inventory, but worth a final audit pass — sliders reading
   `GAME_CONFIG.MAPGEN_LANE_WAYPOINT_*` would require config-key rename +
   settings-live migration.)
3. **Docs under `.agent/`**: rename inline in old docs, or leave historical
   references alone? Recommendation: leave historical plan/post-mortem docs
   unchanged (they describe the past accurately); update only
   live-reference docs (terminology glossary, architecture).

## Non-Goals

- Not touching `Seg` / `polylineToSegments` — segments are a different
  concept (pair of vertices forming a line segment for collision).
- Not touching `pointAtArcFraction` / `trimLanePolylineToStarRims` — these
  already use "polyline," not "waypoints," and are correctly named.
