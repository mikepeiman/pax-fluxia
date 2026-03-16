# Territory Constraint Architecture Analysis

**Date**: 2026-03-16  
**Status**: CORRECTED (incorporates Analytical Lane Split from NotebookLM + PRD from Perplexity)  
**Purpose**: Evaluate the historically named constraints (MSR, CX, DX) and lane-exclusivity (D-75). Determine what survives, what's superseded, and where improvements are possible.

---

## The Constraints — Final Verdict

### MSR — Minimum Star Radius ✅ KEEP + EXPAND

**What it does**: Guarantees every owned star has a minimum spatial presence — its frontier never presses closer than a configurable radius. Without it, a star with 200 ships next to a star with 2 gets "swallowed" visually.

**How it works in the metric**: Implemented as a **negative seed offset** in the Dijkstra. An owned star seeds at distance `−msrRadius` instead of `0`, pushing tie-points outward from the star center.

**Effect on lane splits**: MSR shifts the Dijkstra distances `d_p(u)` and `d_p(v)` that feed the analytical lane split formula `t = (d_V(v) − d_U(u) + w) / (2w)`. This naturally moves frontier positions on lanes to respect star margins. No separate mechanism needed.

**Verdict**: Foundational. Keep and expand (see proposals below).

---

### CX — Corridor Extension ❌ SUPERSEDED

**What it did**: Injected virtual corridor sites along lanes to force the Dijkstra distance field to extend ownership along lanes, preventing enemy stars from "pinching off" long allied corridors.

**Why it's superseded**: The **Analytical Lane Split** formula (from the NotebookLM implementation doc) computes lane frontier positions directly from Dijkstra endpoint distances:

```
t = (d_V(v) − d_U(u) + w) / (2w)
```

This evaluates graph-distance competition analytically along the lane parameter `t ∈ [0,1]`. The formula inherently respects graph-shortest-path ownership — if Player A owns both endpoints, `t` falls outside `(0,1)` and the lane is fully owned. If two different players own the endpoints, the formula finds the exact split point.

**No virtual corridor sites needed.** The lane split formula guarantees the PRD rule ("a lane is either single-owner or split once between exactly two owners") mathematically, without polluting the metric stage with synthetic sites.

The PRD confirms (line 41): *"This replaces virtual disconnect hacks as the primary lane-legibility rule."*

**Verdict**: Delete `computeCorridorVirtuals()`. The analytical lane split replaces CX entirely.

---

### DX — Disconnect Separation ⚠️ DEMOTE TO POST-PROCESS

**What it did**: Injected virtual enemy sites between disconnected same-owner stars, forcing an enemy-controlled gap in the distance field.

**Relationship to lane-exclusivity**: Lane-exclusivity constrains what happens *on* lanes. DX constrains what happens *between* unconnected same-owner stars (no lane between them). These are geometrically orthogonal.

**Analysis**: Lane-exclusivity produces a *partial* disconnect effect — intervening enemy-owned lanes create visual separation. But on sparse maps where two same-owner stars are Euclidean-close but graph-distant, the Dijkstra field might still merge them visually.

**Verdict**: Demote from metric-stage virtual-site injection to a simpler region-stage post-process: if two same-owner regions have no path shorter than N hops through owned territory, enforce a visual gap ≥ G pixels. Delete `computeDisconnectVirtuals()`.

The PRD's "Connectivity truthfulness" requirement (line 45–46) handles this: *"If the induced subgraph of Player P contains multiple disconnected components, the visual territory must preserve that separation."* — enforced at region derivation, not metric computation.

---

### Lane-Exclusivity (D-75) ✅ KEEP — NOW A CONCRETE ALGORITHM

**What it does**: Only 1 or 2 player territories may underlay any lane interior point. A lane is either fully single-owner or split once between exactly two owners.

**Implementation**: The Analytical Lane Split formula IS the implementation. It's not just a spec/assertion anymore — it's a concrete O(E) pass over all lanes that produces exact frontier positions.

**Validation**: After frontier extraction, assert that no lane has more than one split point.

---

## MSR Expansion Proposals

MSR is currently a single scalar value. These expansions improve visual quality and gameplay communication:

### 1. Per-Star Dynamic MSR (fleet strength scaling)
Scale MSR by the star's fleet size relative to its neighbors:
```
effectiveMSR(star) = baseMSR × (1 + log₂(star.ships / avgNeighborShips))
```
**Effect**: Stars with massive fleets dominate more visual space. A 200-ship star next to a 10-ship star gets a naturally larger territory bubble — matching player intuition about who "controls" the area.

### 2. MSR Gravity (minimum area enforcement)
If a territory region has area < `minAreaPx²`, expand MSR for that star until the threshold is met.

**Effect**: Eliminates visually insignificant micro-territory slivers — technically correct but visually noise.

### 3. MSR Breathing Room (icon clearance)
Separate constraint: the frontier line must be ≥ `breathingRoom` pixels from any star's icon edge. Different from MSR (which controls influence distance) — this controls visual clearance.

**Effect**: Clean separation between star icons and territory borders. Frontiers never visually clip star icons regardless of the ownership math.

### 4. Contested MSR (siege retreat)
When a star is under attack and losing ships, shrink its MSR proportionally:
```
effectiveMSR(star) = baseMSR × (star.ships / star.maxHistoricShips)
```
**Effect**: Territory visibly "retreats" from a star under siege, matching the gameplay reality of losing control.

---

## Summary Table

| Constraint | Status | Architectural Placement |
|-----------|--------|------------------------|
| **MSR** | ✅ KEEP + EXPAND | Metric stage seed offset. Flows into lane splits via `d_p(u)`, `d_p(v)` |
| **CX** | ❌ SUPERSEDED | Delete. Analytical lane split replaces corridor virtual sites entirely |
| **DX** | ⚠️ DEMOTE | Move from metric-stage to region-stage gap enforcement post-process |
| **Lane-exclusivity** | ✅ KEEP | Concrete algorithm: analytical lane split formula. Validate in frontier extraction |

---

## Architectural Placement

```
┌──────────────────────────────────────────────┐
│              METRIC STAGE                     │
│  Multi-source top-2 Dijkstra                  │
│                                               │
│  ┌─────────┐                                  │
│  │ MSR     │  ← Negative seed offset          │
│  │ (seed   │    in Dijkstra initialization     │
│  │  bias)  │                                   │
│  └─────────┘                                  │
│                                               │
│  ❌ No CX virtual sites (deleted)              │
│  ❌ No DX virtual sites (moved downstream)     │
│                                               │
│  Output: MetricState { distToPlayer[][], top2 }│
├───────────────────────────────────────────────┤
│         FRONTIER EXTRACTION                    │
│                                               │
│  ┌───────────────────────────┐                │
│  │ Analytical Lane Split     │ ← Replaces CX  │
│  │ t = (dV(v)−dU(u)+w)/(2w) │   completely    │
│  └───────────────────────────┘                │
│                                               │
│  VALIDATION: lane-exclusivity assertion        │
│  Assert: ≤1 split per lane, ≤2 owners         │
├───────────────────────────────────────────────┤
│              REGION STAGE                      │
│  FrontierGraph → TerritoryRegion[]             │
│                                               │
│  ┌────────────────────────┐                   │
│  │ Disconnect gap check   │ ← Replaces DX     │
│  │ (same-owner regions    │   virtual sites    │
│  │  with no graph path    │                    │
│  │  must show visual gap) │                    │
│  └────────────────────────┘                   │
└───────────────────────────────────────────────┘
```

---

## References

- [Analytical Lane Split Implementation](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/2026-03-16%20render%20architecture%20update/2026-03-16%20(NotebookLM)%20Analytical%20Lane%20Split%20Implementation%20Logic.md) — exact formula and implementation
- [Territory Geometry & Rendering PRD](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/2026-03-16%20render%20architecture%20update/2026-03-16%20(Perplexity)%20NEW%20MASTER%20ARCHITECTURE%20Territory%20Geometry%20%26%20Rendering%20PRD.md) — canonical architecture and acceptance criteria
- [Master Plan v3](file:///c:/Users/mikep/Desktop/WebDev/PRISM-Atlas-DART%20v1/.agent/WIP%20Work-In-Progress/permanent-references/territory/2026-03-15__1435%20territory_engine_master_plan_v3.md) — original constraint definitions (MSR L405, CX L406, DX L408)
