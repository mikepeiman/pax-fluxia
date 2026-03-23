# Conquest Animation Specification — Minimal Transport Border Morph

**Date:** 2026-03-23  
**Status:** CANONICAL — Single source of truth for default conquest animation behavior.  
**Ref:** D-86, D-89, TERRITORY_ARCHITECTURE.md §2

> [!CAUTION]
> Any AI agent implementing or modifying conquest animations MUST read this document.
> If your implementation contradicts anything here, STOP and ask the user.

---

## 1. What Happens During a Conquest

A conquest is a tick event: star X changes owner from A to B.

**Visual result:** The territory borders near star X shift to reflect the new ownership. The rest of the map does NOT change. The shift is a smooth morph over `TERRITORY_TRANSITION_MS` (default: 2000ms, completing within one tick of 2050ms).

**NOT:** full-territory re-morphs, whole-map redraws, rigid-body motion, rope physics, catenary curves, or anything involving physics simulation.

---

## 2. Constraints (Non-Negotiable)

### 2.1 Only affected borders move

A conquest at star X affects ONLY the frontier polylines whose `ownerPairKey` includes owner A or owner B in the immediate neighborhood of X. All other borders remain PERFECTLY STATIC — zero jitter, zero resampling, zero floating-point drift.

**Implementation:** Compare previous and next polylines by `ownerPairKey`. If points arrays are identical (within ε), classify as `static` and pass through unchanged. Only `drifted`, `spawned`, or `vanished` polylines get interpolated.

### 2.2 Fills follow borders — single source of truth

Fills are DERIVED from borders. Never interpolated independently. At every frame during transition:
1. Interpolate border polylines (drifted only)
2. Re-chain interpolated polylines into closed fill rings using `executeChainWalk`
3. Both fill and border frames come from the same point arrays

**Why:** Independent fill+border interpolation guarantees divergence. This was the root cause of the previous transition failure (see `transition_diagnosis.md`).

### 2.3 No rigid bodies

Border segments are polylines of vertices. The interpolation is per-vertex linear lerp between arc-length-resampled source and target. There is no concept of:
- Rigid segment translation
- Rope/catenary physics
- Spring simulation
- Segment-preserving motion

Each vertex moves independently along a straight line from its source position to its target position.

### 2.4 Timing

- Transitions are dispatched on tick boundaries
- Duration = `TERRITORY_TRANSITION_MS` (2000ms default)
- Must complete within one tick interval (`BASE_TICK_MS` = 2050ms)
- Progress is linear 0→1 within the duration
- At progress=0: previous geometry
- At progress=1: next geometry (exact match — no accumulated error)

### 2.5 Edge cases

| Case | Behavior |
|------|----------|
| First conquest (no previous geometry) | Snap to target — no interpolation |
| Spawned polyline (new border that didn't exist before) | Fade in from midpoint |
| Vanished polyline (border that no longer exists) | Fade out to midpoint |
| Multiple simultaneous conquests in one tick | All handled in one transition plan |

---

## 3. Algorithm Summary

```
On conquest tick:
  prev = previous GeometrySnapshot.frontierPolylines
  next = current GeometrySnapshot.frontierPolylines
  
  For each polyline, match by ownerPairKey:
    STATIC:   same key, same points → pass through unchanged
    DRIFTED:  same key, different points → resample both to max(len) → lerp at t
    SPAWNED:  only in next → lerp from midpoint to target at t
    VANISHED: only in prev → lerp from prev to midpoint at t

  Fills = executeChainWalk(interpolatedBorders, worldBorders) → flattenLoopPoints
  
  At t=0: output = prev
  At t=1: output = next (exact)
```

---

## 4. What This Is NOT

- NOT DY4 Optimal Transport (the legacy system that regressed)
- NOT rope/catenary interpolation
- NOT physics-based segment motion
- NOT a full-territory morph (only affected borders move)
- NOT independent fill interpolation

This is the simplest correct animation: per-vertex linear interpolation of only the changed borders, with fills derived from those borders.

---

## 5. Files That Implement This

| File | Role |
|------|------|
| `layers/transition/interpolatePolylines.ts` | match, classify, resample, lerp |
| `layers/transition/modes/OptimalTransportBorderMode.ts` | Border sample: interpolate drifted frontiers |
| `layers/transition/modes/FrontierMorphFillMode.ts` | Fill sample: derive from interpolated borders via chainWalk |
| `layers/transition/TransitionLayerCoordinator.ts` | Orchestrate plan/sample lifecycle |
