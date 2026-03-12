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
