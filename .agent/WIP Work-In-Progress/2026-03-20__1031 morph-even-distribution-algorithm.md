# 2026-03-20 Morph Algorithm: Even-Distribution Vertex Matching

## Problem
Territory fill morph transitions move ALL vertices because resampled polygons have no spatial correspondence. Three approaches failed:
1. **Resample + Rotate** — treats all vertices equally, no pinning
2. **Project onto perimeter** — correct idea, but vertices cluster at anchor points
3. **Hybrid projection-resample** — equivalent to #1, no improvement

## Root Cause (user-diagnosed)
Vertices cluster at anchor points because each `from` vertex independently projects to the nearest point on `to`. Multiple vertices pile up at corners/edges.

## Algorithm: Pinned-Anchor Even-Distribution

### Rules
1. **Pinned vertices do not move.** `to` = `from`. Full stop.
2. **Morphing vertices distribute evenly** along the new frontier section, **in original sequence order**.
3. Different morphing vertices travel different distances → different visual speeds. This is desired.

### Steps
1. **Resample** `from` polygon to N evenly-spaced points
2. **For each `from[i]`**, project onto `to`'s perimeter (nearest point on boundary)
3. **Classify**: displacement < pin threshold → **pinned**; else → **morphing**
4. **Pinned** vertices: `toPoints[i] = fromPoints[i]` — they are immovable anchors
5. **Morphing runs**: morphing vertices form contiguous sequences between pinned anchors
6. **For each morphing run** (e.g. vertices 12–20 are morphing, bounded by pinned 11 and 21):
   - Project pinned anchor 11 and pinned anchor 21 onto `to`'s perimeter → get arc-length positions `s_start` and `s_end`
   - Compute the arc-length of `to`'s boundary between `s_start` and `s_end`
   - Distribute the 9 morphing vertices **evenly** along that arc section
   - Maintain original index order (12 first, 20 last)
7. **Per frame**: lerp each vertex from `from` to `to`. Pinned vertices already at target. Morphing vertices slide at varying speeds.

### Constraints
- **Monotonic ordering**: vertex positions on `to` never go backwards
- **Even spacing**: morphing vertices are equidistant along their frontier section
- **No spatial locality heuristic**: even spacing dictates position, not nearest-point

## Files Modified
- `borderTransition.ts` — replace `projectOntoPerimeter` with even-distribution algorithm in `matchFillPolygons`
