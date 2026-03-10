# Conquest-Star Frontier Matching — Analysis & User Corrections

## Core Insight (User)

> "The conquered star determines the post-conquest frontier. Its Voronoi cell boundary (+ Chaikin + arcs = full pipeline) IS the new frontier."

The frontier is NOT just the raw Voronoi cell boundary — it is the complete pipeline output: Voronoi edges → Chaikin smoothing → arc geometry = the canonical cell boundary = the frontier.

When a conquest happens, we already have the current frontiers. All we need is the next frontier, matched. The conquered star IS what determines the post-conquest frontier.

## Annotated Example: Red #23 Conquers Yellow #42

From screenshots (conquest2 sequence):

1. **Before**: Red #23 is isolated, surrounded by its own frontier. Yellow #42 is adjacent.
2. **Conquest happens**: Red #23 takes Yellow #42.
3. **What must update**: The entire frontier around the (now expanded) red territory needs to update — not just the border between #23 and #42. The straight border between them does the most morphing/translation, but the flanking sides need subtle updates too.

## What Must Happen

- **Detect changed-owner cells** by comparing `prevCells[i].ownerId !== targetCells[i].ownerId`
- **All frontiers touching the conquered cell update** — not just the winner-loser border
- **Fills are secondary to the unified coherent frontier** — fills fill behind the frontier position, not independently

## Challenges

### 1. Multiple simultaneous conquests
Two stars conquered in the same tick. Each modifies frontiers near its cell. System must compose multiple events into one transition.

### 2. Disappearing vs appearing edges
When #42 joins Red, the edge between #42 and #23 was a frontier → now internal (disappears). Meanwhile #42's edges against other owners become new red frontiers (appear). One conquest creates BOTH disappearing AND appearing frontier edges.

### 3. Event detection
Current code sees state changes via fingerprints but doesn't know WHICH star changed. Must compare prev vs target cell ownership to identify changed cells. Feasible — both cell sets exist.

## Key Corrections (User Review)

- ❌ Agent originally wrote "Blue" conquering — **WRONG**. It is Red #23 conquering Yellow #42 per the screenshots.
- ❌ Agent fabricated a "territory splitting" example — **Not observed** in any screenshot. Analysis must use actual annotated examples only.
- ❌ Agent fabricated regression symptoms instead of investigating user's report — fills take two ticks, that's what was observed. Agent should not speculate beyond what user reports.
- ✅ Geography-based matching is a hack. Proper solution: ownership-guided cell identity matching.
