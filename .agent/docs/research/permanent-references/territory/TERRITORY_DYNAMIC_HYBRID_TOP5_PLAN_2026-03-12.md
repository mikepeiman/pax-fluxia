# Dynamic Territory Hybrids - Top 5 Plans (2026-03-12)

## Objective
Define five hybrid runtime plans that preserve canonical frontier truth while handling continuous ownership changes, transitions, and gameplay animation constraints.

## Shared Runtime Contract
- Input: stars, connections, ownership snapshot, MSR/CX/DX parameters, previous frontier state.
- Output: canonical shared frontiers, owner loops, border mesh, fill polygons, transition state.
- Rule: fills and borders always regenerate from identical frontier geometry.

## HY1 - Static Backbone + Dynamic Refine
Static core: FG1 Adaptive Field
Dynamic layer: DY1 Span Graph Morph

Pipeline:
1. Build static backbone frontiers on topology change.
2. Track ownership deltas per lane/star.
3. Morph only affected frontier spans with constrained vertex correspondence.
4. Re-publish loops and fill polygons from updated spans.

Best for:
- Large maps where only local conflicts change each tick.

Risk:
- Span correspondence drift.
Mitigation:
- Keep persistent frontier node IDs and pairwise owner keys.

## HY2 - Seed Graph + Local Delta
Static core: FG2 Seed Graph
Dynamic layer: DY2 Local Delta Patch

Pipeline:
1. Build canonical seed graph.
2. Detect local change windows from conquest/order events.
3. Re-seed and reconnect only touched windows.
4. Stitch patched graph back into untouched frontier backbone.

Best for:
- Fast real-time updates with deterministic debugability.

Risk:
- Patch seam mismatch.
Mitigation:
- Window overlap and boundary lock rules for stitch zones.

## HY3 - Implicit Field + Transport
Static core: FG3 Implicit Trace
Dynamic layer: DY4 Optimal Transport

Pipeline:
1. Maintain implicit pairwise frontier state.
2. Solve transport map for ownership movement between ticks.
3. Advect frontier control points under transport constraints.
4. Correct with local implicit re-trace near high-error zones.

Best for:
- Smooth, physically coherent motion under heavy territory shifts.

Risk:
- Transport solve cost spikes.
Mitigation:
- Coarse-to-fine transport with capped iterations.

## HY4 - Pairwise Arrangement + Patch + Transport
Static core: FG4 Pairwise Arrangement
Dynamic layer: DY2 + DY4 blend

Pipeline:
1. Build exact arrangement baseline.
2. For local events, patch arrangement faces near conflict only.
3. Use transport bias to animate transitions without changing topology prematurely.
4. Commit topology changes when patch validation passes.

Best for:
- Exactness-critical modes with controlled animation.

Risk:
- Complexity overhead.
Mitigation:
- Restrict to high-fidelity mode and benchmark maps.

## HY5 - RT Publish + Corridor Events
Static core: FG5 RT-Assisted Publish
Dynamic layer: DY5 Corridor Event Decomposition

Pipeline:
1. Keep ownership RT live with event-driven dirty regions.
2. Decompose corridor events into micro-updates (enter, contest, isolate, reconnect).
3. Re-extract vectors only inside dirty regions.
4. Merge vectors into canonical frontier graph and rebuild affected loops.

Best for:
- High frame-rate gameplay with many simultaneous local changes.

Risk:
- Dirty-region undercoverage.
Mitigation:
- Conservative dirty expansion and periodic full sanity pass.

## Comparative Guidance
- Lowest engineering risk now: HY2.
- Highest visual smoothness potential: HY3.
- Highest exactness: HY4.
- Best throughput under load: HY5.
- Best balanced long-term platform default: HY2 -> HY5 fallback for stress.

## Implementation Milestones
1. Event delta substrate (topology + ownership diff graph).
2. Local recompute window manager.
3. Canonical stitch and validation subsystem.
4. Transition scheduler (geometry-only, no alpha cheats).
5. Bench suite (map sizes, conflict density, ownership churn).