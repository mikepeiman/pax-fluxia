# F-165: Virtual Star Position-Lerp Transition

**Status:** Proposed  
**Date:** 2026-03-20  
**Origin:** User idea during ghost-site weight interpolation work

## Concept

On conquest, instead of ghost sites fading at the conquered position:

1. **Spawn** a virtual star at the **attacker's position** (attack origin star) with the new owner
2. **Lerp its position** frame-by-frame from attacker → conquered star
3. When it **arrives** at the conquered star, the real star gains full weight and the virtual disappears

## Visual Effect

The territory visually **reaches out** from the attacker toward the conquered star — directional, intuitive, and smooth. The boundary moves continuously as the virtual star slides across the map.

## Comparison with Current Ghost Approach

| Aspect | Ghost (current) | Virtual Star Lerp (proposed) |
|--------|-----------------|------------------------------|
| Visual direction | Local boundary shift | Directional expansion from attacker |
| Geometry | Two sites at same position (degenerate risk) | Sites always at different positions |
| Intuition | "Old territory fades" | "New territory reaches out" |
| Frame cost | Same — recompute Voronoi per frame | Same |

## Performance: Web Worker

The per-frame `computeGeometry0319` call is pure computation (no DOM, no PIXI). It could run in a Web Worker:
- Input: stars[], connections[], config, weights Map → all serializable
- Output: cells[], mergedTerritories[], sharedPolylines[] → all serializable
- Bottleneck is weighted Voronoi (d3-delaunay) — offloading frees main thread
- Challenge: async latency (frame may lag 1-2 frames behind input)
- Could use double-buffering: compute frame N+1 while rendering frame N

## Open Questions

1. What weight does the virtual star get during transit? Full weight immediately, or ramp up?
2. Should the old conquered star lose ownership instantly or fade?
3. Multiple simultaneous conquests: one virtual star per conquest?
