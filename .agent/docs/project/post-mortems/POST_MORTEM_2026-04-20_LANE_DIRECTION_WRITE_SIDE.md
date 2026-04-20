# Post-Mortem: 2026-04-20 — Lane Direction Bug Recurrence (Write-Side)

## What Happened

Ships and star-attack surges rendered backwards on the lane: arc in the
correct direction, then travel phase back toward source. Tally was correct —
only the visual geometry was reversed. User reported twice; first fix attempt
("storage canonicalization") landed and unit tests passed, but the first
in-game transfer appeared to still show the bug. Diagnostics were layered;
the user's actual console output later showed `[lane-cache-fix]` engaged, and
attacks behaved correctly after reload. The initial "fix didn't work" reading
was a stale-build artifact, not a second bug.

## Root Cause

The lane polyline cache had an **implicit** invariant: polylines stored at
`edgeKey(min, max)` must be in canonical (smaller-id → larger-id) order, so
that `getDirectedLanePolyline` could cheaply reverse when the caller asked
for the non-canonical direction.

- **April 10** (`9bddee78`, `c9fc848e`) — curved lane polylines + cache added.
  `buildLaneAwareConnections` in `common/src/mapgen/lanePolylines.ts`
  iterates `nodes[i] nodes[j]` with `i < j`, producing
  `{ sourceId: nodes[i].id, targetId: nodes[j].id }`. For node ids of the
  form `star-N`, **string comparison breaks at two digits**:
  `'star-10' < 'star-2'` lexicographically. So for any map with ≥10 stars,
  some emitted connections have `sourceId > targetId` — non-canonical.
- **April 12** (`4b5772cd`, post-mortem
  `POST_MORTEM_2026-04-12_DIRECTED_LANE_PATH_REGRESSION.md`) — READ side
  fixed. `getDirectedLanePolyline` was introduced and all readers migrated
  to it. The directional invariant was documented on the read side only.
  Writers were never updated to enforce canonical storage; the READ fix
  *assumed* storage was canonical, which only held by coincidence on
  single-digit-star maps.
- **April 20** — User played a map with ≥10 stars. Non-canonical connections
  were written to the cache in non-canonical polyline order. Every reader
  downstream (ship transfer, star attack surge, lane overlay) got reversed
  geometry on the affected edges.
- **Fix** (`c5118a30`) — `seedLanePolylineCacheFromMapGen` and
  `rebuildLanePolylineCache` now reverse waypoints whenever
  `c.sourceId > c.targetId` before `cache.set`, enforcing the canonical
  storage contract at both write points. Regression test
  `normalizes non-canonical seed input so directed reads match source->target`
  locks it in.

## Impact

- Visual-only regression for users on maps with 10+ stars from
  commit `9bddee78` (Apr 10) through `c5118a30` (Apr 20). Ten days in the
  wild, on generated maps only — the `initDebugMap` path fed canonical input
  via `canonicalUniConnections`, so the 4–6-star debug maps coincidentally
  avoided the bug.
- Ship tallies, combat, and conquest logic were always correct because they
  use `starId` references, not the rendered geometry.
- Diagnostics chased the wrong culprit first: the user's second "still
  broken" report was stale bytecode, not a second bug.

## Mistaken Reasoning

1. **Invariant owned at the wrong boundary.** April 12 fixed the reader but
   never wrote a test that FED non-canonical input to the writer and asserted
   canonical storage. The post-mortem documented the read-side fix without
   enumerating "who is responsible for keeping storage canonical."
2. **`'star-10' < 'star-2'` lexicographic cliff** is not obvious from reading
   `buildLaneAwareConnections`, which looks canonical because it uses
   `i < j` — numeric index correlates with canonical id ordering only for
   single-digit maps. The assumption "nodes sorted by index = nodes sorted by
   id" fails silently at the 10th star.
3. **Diagnostic tunnel vision.** When the user reported "still broken" after
   the first fix, I layered three diagnostics instead of asking the user to
   hard-refresh. Stale Vite builds are a common class; the diagnostic work
   was right but the order-of-operations should have been "hard refresh,
   then diagnose."

## Diagnostic Method

Three staged diagnostics were added, together covering the full
write → read → assign lifecycle:

- `[lane-cache-fix]` (`log.sys('LaneCache', ...)` — once per process/clear):
  proves the storage-canonicalization fix is loaded and reports whether the
  first write was canonical or reversed.
- `[lane-dir-diag]` (`log.error('LaneCache', ...)` — once per bad edge, cap
  5): fires in `transferHandler` when the cache returns a polyline whose
  endpoints don't match the requested source/target.
- `[ship-geom-diag]` (`log.error('ShipLane', ...)` — once per bad edge, cap
  5): fires after `assignShipLaneGeometry` when the ship's `laneStart/End`
  or `lanePolyline` orientation is backward.

All three use the telemetry logger per AGENT.md §4.2 — no raw `console.*`.

## Derived Rules

1. **Cache storage contracts must be enforced at the writer, not the
   reader.** Any directional/canonicalization invariant on a keyed cache
   must be written and tested on the `cache.set` boundary. A reader that
   "just reverses when the key is non-canonical" is a latent bug waiting for
   a non-canonical write.
2. **`star-N` ids must sort numerically in any code that compares them.**
   Either pad to fixed width (`star-001`) or compare by parsed index. Raw
   string compare on `star-N` names silently breaks at ten stars.
3. **Paired-invariant test discipline.** When a write-side and read-side
   share an invariant, every test that exercises one must also exercise the
   opposite case on the other. The April 12 fix's test suite only fed
   canonical input to the writer; it could not have caught this.
4. **Post-mortem follow-ups must enumerate open-edge cases.** When closing a
   partial fix, the post-mortem's "Corrective Actions" section must list the
   untested adjacent surfaces. April 12's post-mortem should have flagged
   "writer never reverses non-canonical input; no test feeds non-canonical
   connections" as an explicit open item.
5. **Stale-build triage before deep diagnostics.** When a fix unit-passes
   and the user reports "still broken," the first instruction is a hard
   refresh / dev-server restart. Only after that should diagnostics ladder
   up.

## Corrective Actions

- [x] Canonicalize storage in `seedLanePolylineCacheFromMapGen` and
  `rebuildLanePolylineCache` (`c5118a30`).
- [x] Regression test: non-canonical seed input + bidirectional directed
  reads (`laneConnectionSync.test.ts`).
- [x] Three-stage runtime diagnostics via telemetry logger (`ad780bdf`,
  `f9ea277c`, `7cc1fb8a`, logger migration this commit).
- [ ] **Follow-up:** audit any other cache that keys by canonical-id and
  stores directional data (e.g. `mapThumbnail`, `LaneRenderer` caches if
  any). Task to be filed in the current day's queue.
- [ ] **Follow-up:** decide whether to remove the three runtime diagnostics
  after a week in the wild (all three are one-shot / capped so the cost is
  negligible; leaving them is defensible).
- [ ] **Follow-up:** consider numeric-aware id compare across mapgen, or
  zero-padded star ids, to eliminate this class of bug at its structural
  root.
