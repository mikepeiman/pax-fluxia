# Territory Conquest Transition — WIP Implementation Notes

**Date:** 2026-04-07  
**Session:** Afternoon, post-diagnosis of broken `unified_topology` mode  
**Purpose:** Capture corrected understanding for fresh-context agents

---

## Critical Architectural Corrections

### 1. A conquest produces ONE ACTIVE FRONT only

A conquest changes one star's ownership. This produces ONE contiguous region of frontier change — not multiple independent changes. The frontier graph is always a complete planar partition; it does not gain or lose frontiers. It *moves* in one place.

**WRONG model (used by all existing transition code):**
- Match entities (sections/chains) between prev and next topologies
- Classify as static / drifted / born / dying
- Handle each case independently
- "Born" sections expand from midpoint; "dying" collapse

**CORRECT model (from spec):**
- Walk the frontier graph, comparing prev and next point-by-point
- Find where geometry diverges beyond threshold — insert CHANGE ANCHOR
- Find where it reconverges — insert another CHANGE ANCHOR
- The span between two CHANGE ANCHORS = the ONE active front
- Everything else passes through unchanged, bit-identical

### 2. No birth effects. No death effects for individual sections.

Per spec section 6: "The system does NOT invent visual birth effects for newly appearing boundaries."

- Frontiers don't "appear from nowhere" — the frontier graph shifts as one connected structure
- Frontiers don't "vanish into nothing" individually — they shift
- The ONLY allowed degenerate transition: when a territory COMPONENT truly disappears (entire region dies), its final loop collapses to the center of the lost star
- ALL existing code has birth/death logic for individual sections or chains — this is wrong

### 3. Front identification is walk-and-compare, not match-and-classify

The correct algorithm:
1. Start from **stable anchors** — key vertices that exist in both prev and next at the same position (map edges, 3-way junctions)
2. Walk the frontier from each stable anchor, comparing prev and next points
3. Where divergence exceeds threshold (~2px) → insert **CHANGE ANCHOR** (synthetic vertex)
4. Continue walking until reconvergence → insert another CHANGE ANCHOR
5. Active front = the span between two change anchors

Per spec section 4: "If a true stable anchor lies in the middle of a stored section, the transition representation may introduce a synthetic anchor so the active span is bounded by the right geometric facts rather than by arbitrary storage boundaries."

Per spec section 5: "Active fronts are detected by pointwise comparison along canonical frontier chains, walking inward from both ends until stable geometry gives way to divergence and then returns to stability."

### 4. Centroid matching is wrong

`ActiveFrontFillMode.ts` matches front chains by centroid proximity. This is a geometric heuristic that ignores the causal information already available from the conquest event (which star, prev/next owner). Front identification should be driven by:
1. The conquest event itself — which star, from which owner to which owner
2. The ownership topology — which ownerPairKey frontiers are structurally affected
3. Walk-and-compare to find the precise change span

### 5. Do not trust existing code as "the answer"

Existing implementations are LEGACY. They may contain useful patterns and utilities, but must NOT be adopted wholesale. Each piece must pass strict audit against spec before reuse.

**Wrong approach:** "The correct code already exists, just rewire to it."  
**Right approach:** Derive from spec. Write fresh. Extract from existing only after audit.

---

## Spec Sources (priority order)

1. `.agent/docs/game/territory/2026-04-04 Perplexity GPT-5.4 design plan for territory render.md` — Most recent design-review doc
2. `.agent/docs/game/territory/CONQUEST_ANIMATION_SPEC.md` — Hard constraints
3. `.agent/docs/game/territory/TERRITORY_ARCHITECTURE.md` — Pipeline reference (needs updates)
4. User statements in conversation (override any doc if conflicting)

---

## Key Spec Rules (quick reference)

- Conquest transition = transformation of the SHARED FRONTIER GRAPH, not polygon morphs
- Region loops are NOT the primary animated object — rebuilt from interpolated frontier geometry each frame
- Fills and borders derive from the SAME frontier geometry (alignment by construction)
- Active front = the ONE span of frontier that changed, bounded by change anchors
- Deterministic equal-density sampling required for exact pointwise comparison
- No birth effects for "new" boundaries (they don't exist as a concept)
- Only death for territory components (entire region collapses to lost star center)
- Unchanged borders pass through bit-identical — zero jitter
- One frontier, one movement — both sides of a conflict see the same frontier move

---

## Existing Code — Audit Status

| File | Status | Notes |
|------|--------|-------|
| `ActiveFrontFillMode.ts` | REJECTED as-is | Has chain building (usable pattern), but uses centroid matching and birth effects. Reference only. |
| `FrontierTopologyPlanner.ts` | REJECTED | Wrong mental model (section-level matching, born/dying) |
| `TopologyFrameSampler.ts` | REJECTED | Depends on rejected planner |
| `interpolatePolylines.ts` | UNAUDITED | `buildArcLengthCDF` and `evaluateAtArcFraction` may be extractable utilities |
| `FrontierTopologyContracts.ts` | LIKELY REUSABLE | Type definitions for topology structures (vertices, sections, loops) |
| `TransitionContracts.ts` | LIKELY REUSABLE | `FillTransitionFrame`, `BorderTransitionFrame`, `TransitionEnvelope` types |
| `TransitionLayerCoordinator.ts` | NEEDS REWRITE | Currently routes to broken code; will orchestrate new implementation |
| `buildFrontierTopology.ts` | UNAUDITED | Compiles topology from geometry — upstream of transition |
| `SharedTransitionClock.ts` | LIKELY REUSABLE | Timing envelope management |

---

## Correct Implementation Flow (from-scratch)

### Planning phase (runs once per conquest)

```
ConquestEvent fires (star S, owner A → owner B)
  → Receive prev and next FrontierTopology
  → Identify stable anchors (vertices matching exactly between prev/next)
  → Walk frontier chains from stable anchors
  → Compare prev/next points along each chain
  → Where divergence > threshold → insert CHANGE ANCHOR
  → Where reconvergence → insert CHANGE ANCHOR
  → Active front = span between change anchors
  → Store: active front prev-points, next-points, change anchor positions
  → Store: all static sections (pass-through, no interpolation)
```

### Sampling phase (runs every frame)

```
progress t ∈ [0, 1]
  → For the active front: arc-length parameterize both prev and next spans
  → For each parameterized point: lerp(prev, next, t)
  → Endpoints (change anchors) stay pinned
  → Static sections: pass through unchanged
  → Rebuild affected region loops from next topology + interpolated geometry
  → Emit FillTransitionFrame (borders are fill polygon strokes)
```

---

## What "planner" and "sampler" mean (non-technical)

- **Planner:** Runs ONCE when conquest fires. Examines the "before" and "after" map, walks the frontiers, finds the change anchors, records the animation blueprint. Like planning a camera move before filming.

- **Sampler:** Runs EVERY FRAME (60x/sec) during the animation. Takes the blueprint + a progress percentage, produces the exact geometry to draw at that instant. Like the camera actually moving along the planned path.

Both will live in one module since they're tightly coupled.

---

## Conversation references

- Previous session: [territory-pipeline-diagnosis](75b7f546-92b0-4e88-9e92-3b0bd60056c8)
- Key user correction: "A conquest produces ONE ACTIVE FRONT ONLY. It is definitionally THE EXTENT OF FRONTIER BETWEEN TWO CHANGE ANCHORS."
- Key user correction: "sections are NOT the active concept for conquest transition; it is FRONTS, where are special sections pinned between special vertex anchors"
- Key user correction: existing code should be treated as LEGACY reference only, not adopted as-is
