# Territory Engine FG2 Epic - Step 1 (2026-03-12)

## Branch
- `codex/territory-engine-epic-fg2-canonical`

## Scope Delivered
- Added native FG2 stage module:
  - `pax-fluxia/src/lib/territory-engine/methods/fg2SeedGraph.ts`
- FG2 now executes native logic for:
  - metric
  - seed
  - topology
  - geometry
  - loop
  - animation
  - render
- Engine stage executor now delegates FG2 stages before generic fallback.
- Registry updated so FG2 is marked implemented across all pipeline stages.

## Native FG2 Behavior (current)
- Seeds are generated on contested lanes (owner mismatch) at unbiased tie point (`t=0.5`).
- Seeds are grouped per owner pair into topology buckets.
- Geometry polylines are produced by nearest-neighbor chaining per owner pair.
- Render stage draws canonical FG2 frontier lines directly in Pixi via dedicated graphics node.
- Trace mode adds white seed markers for visual debugging.

## Known Limitations
- Tie point is currently unbiased (MSR/CX/DX integration pending).
- Polyline chaining is geometric nearest-neighbor, not graph-optimal path extraction.
- Loop stage currently emits owner loop hints, not final closed loop templates.

## Next Step (FG2 Epic)
1. Replace lane midpoint tie with biased equal-distance solve.
2. Add junction synthesis and branch-aware chain assembly.
3. Emit canonical owner loops and shared edges for fill reconstruction.
<<<<<<< HEAD
4. Add deterministic frontier IDs for delta-patch compatibility.
## Step 1.1 Enhancement (same day)
- Replaced fixed midpoint seed placement with a biased lane tie solve:
  - `dA(t)=biasA+t*L`
  - `dB(t)=biasB+(1-t)*L`
  - solved tie parameter `t`, clamped to `[0.1, 0.9]`.
- Bias components currently include:
  - active/damaged ship influence,
  - star radius influence,
  - order-direction pressure (`targetId` lane alignment),
  - global margin/corridor feature factors.
- This is still a bootstrap approximation for MSR/CX/DX integration, but it moves FG2 from static midpoint behavior toward force-aware frontier seeds.

## Step 1.2 Enhancement (same day)
- Added deterministic FG2 seed identity and lane metadata:
  - `seedId`
  - `laneId`
  - per-endpoint lane angles
- Replaced owner-pair nearest-neighbor chaining with a pair-topology graph:
  - star-incidence buckets per owner pair
  - angular neighbor links around each shared star
  - per-pair adjacency graph
  - edge-disjoint chain/cycle extraction into frontier polylines
- Geometry stage now emits richer summaries:
  - frontier count
  - frontier point count
  - open frontier count
  - closed frontier count
- Trace mode now visualizes local topology links in addition to seed markers.

## Remaining Limitations After Step 1.2
- Local angular adjacency is still a heuristic scaffold, not yet a true half-edge frontier traversal.
- World-edge closure and outer-boundary handling are still pending.
- Canonical shared-edge and owner-loop emitters for fill reconstruction remain pending.
- MSR/CX/DX are still represented by a bootstrap bias model rather than a full modified-distance solver.
=======
4. Add deterministic frontier IDs for delta-patch compatibility.
>>>>>>> 5af4393 (fix(PVV3): snapshot prev state after rebuild + gate diagnostic logs behind __PVV3_DIAG)
