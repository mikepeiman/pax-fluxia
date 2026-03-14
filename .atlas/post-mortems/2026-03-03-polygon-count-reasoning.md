# Post-Mortem: 2026-03-03 — Faulty Polygon Count Assumption

## What Happened
- **Expected:** "21 polygons should be ~5" — I assumed 5 players → ~5 merged territory blocks
- **Actual:** 21 polygons from ~42 owned stars is correct. Random maps scatter same-owner stars among enemies.
- **Discovery:** User corrected: "Each player's stars are mostly separated and intermixed, due to this being a RANDOM map. You are SO WRONG to assume numplayers = numpolygons."

## Root Cause
- [x] Incorrect mental model
- [ ] Other: Substituted domain-specific reasoning (game design) with naive mathematical reasoning

### Deep Analysis: Why This Reasoning Failed

**The flawed chain of thought:**
1. "5 players exist"
2. "Merging combines same-owner cells"
3. "Therefore ~5 merged polygons should result"

**What was missing from this reasoning:**
1. **Game state awareness** — In a random map with conquest mechanics, star ownership is spatially scattered, not clustered by player. Each player starts with a random subset of stars spread across the entire map.
2. **Graph connectivity requirement** — Merging only works between ADJACENT same-owner cells. Two same-owner stars on opposite sides of the map cannot merge. The merge operation is LOCAL, not GLOBAL.
3. **Domain simulation** — I failed to mentally simulate the actual game state: 42 stars, 5 players, ~8 stars each, randomly distributed. Most of a player's 8 stars will be surrounded by the other 34 stars belonging to other players. Adjacent same-owner pairs are RARE in early/mid game.

**The cognitive error:**
This is a case of **abstraction leakage** — I reasoned about the algorithm's OUTPUT using its INPUT PARAMETERS (5 players) without considering the INTERMEDIATE STATE (spatial distribution of ownership on a random map). The algorithm processes geometry, not player identity.

**Analogy that would have prevented this:**
"If 5 people each own random houses on a street, painting adjacent same-owner houses the same color doesn't produce 5 color blocks — it produces roughly as many blocks as there are houses, minus the few cases where same-owner houses happen to be adjacent."

## Impact
- Wasted investigation time adding diagnostic logging to track a non-problem
- User had to correct agent's misunderstanding of its own algorithm
- Trust erosion: agent debugged a "bug" that was correct behavior

## What I Should Have Known Beforehand
1. Territory merging reduces polygon count by the number of INTERNAL EDGES REMOVED, not by the number of unique owners
2. In a random spatial distribution, adjacency between same-owner cells is the EXCEPTION, not the rule
3. The correct mental model: `numPolygons ≈ numOwnedStars - numInternalEdgesRemoved`

## Prevention Checklist
- [ ] Before declaring output "wrong," mentally simulate the algorithm with a small example
- [ ] Ask: "What does the input data actually look like?" before reasoning about expected output
- [ ] For spatial algorithms: consider the spatial distribution, not just the counts
- [ ] When game state matters: ask "what does the map look like right now?" — not "what COULD it look like?"

## Heuristic
> "An algorithm's output depends on its input DATA, not its input PARAMETERS. Before judging output correctness, mentally simulate the actual data through the algorithm."

## Meta-Analysis: What Prompt/Rule Structure Would Prevent This?

### The failure mode: **Parameter → Output shortcut**
The agent sees high-level parameters (5 players) and deduces expected output (5 polygons) without tracing the actual data flow through the algorithm. This is reasoning by analogy instead of reasoning by simulation.

### Required rule structure:

```
When evaluating algorithm output:
1. DO NOT reason from high-level parameters (player count, config values) to expected output
2. DO trace the actual data through each algorithm step with concrete examples
3. ASK: "What does the input data look like spatially/structurally at this moment?"
4. VERIFY: Run a mental simulation of 3-5 data points through the algorithm before declaring output "wrong"
5. CONSIDER: game state dynamics — random maps produce scattered distributions, not clustered ones
```

### Exact prompt addition:
```
When debugging algorithm output:
- Never assume output bounds from input parameter counts alone
- Always consider the spatial/structural distribution of the ACTUAL DATA
- Before declaring output quantity "wrong," trace the algorithm with real data:
  "If I have 42 owned stars scattered randomly among 5 players, how many merged polygons
   should my edge-removal algorithm produce? Answer: numStars minus same-owner adjacencies,
   which on a random map is close to numStars."
```
