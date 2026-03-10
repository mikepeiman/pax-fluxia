# Red Team: Conquest-Star Cell Matching

User proposed: "The conquered star determines the post-conquest frontier. Its Voronoi cell boundary (+ Chaikin + arcs) IS the new frontier."

## ✅ What's Correct

- The conquered star's cell boundary defines the new frontier topology
- Pre-conquest: #42's cell has external edges against blue, green, etc.
- Post-conquest: #42's cell has DIFFERENT external edges (blue neighbors become internal)
- This gives **identity-based matching** — we know exactly which edges moved

## 🔴 Challenges

### 1. Multiple simultaneous conquests
Two stars conquered in the same tick. Each modifies frontiers near its cell. If neighbors, the changes overlap. System must compose multiple events into one transition.

### 2. Disappearing vs appearing frontiers
When #42 joins Blue, the edge between #42 and #23 (attacker) was a frontier → now internal. It **disappears**. Meanwhile #42's edges against other owners become new blue frontiers → they **appear**. One cell creates BOTH disappearing AND appearing frontiers.

### 3. Territory splitting
If #42 was the bridge between two red regions, conquering it splits red into disconnected territories. New frontier edges appear that don't correspond to any previous frontier position.

### 4. Event detection
Current code doesn't know WHICH star was conquered. It sees state changes via fingerprints. Need to detect changed-owner cells by comparing `prevCells[i].ownerId !== targetCells[i].ownerId`. Feasible since both cell sets exist.

## 🟡 Assessment

The approach is the **correct architecture** for proper frontier identity tracking. Edge cases (simultaneous conquests, splits, disappearing-vs-appearing) decompose cleanly per-cell. Current geography-first matching is an interim that handles most cases. This proper approach should replace it later.
