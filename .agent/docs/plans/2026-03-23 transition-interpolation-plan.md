# Real Transition Interpolation — Implementation Plan

**Date:** 2026-03-23
**Ref:** Blueprint Phase 2C — completing the vertical slice
**Status:** APPROVED — implementing

## Goal

Replace snap-to-target with smooth animated transitions that maintain fill-border alignment at every intermediate frame.

## Key Architectural Constraint

From TERRITORY_ARCHITECTURE.md §2:

> Fill + border on the SAME points. Every draw call that renders a territory should draw fill AND stroke from the SAME point array.

Fills MUST be derived from borders — not interpolated independently. The compiler already does this: `constructFillsFromFrontierChain` builds fill rings from the exact same smoothed polyline vertices used for borders.

## Design: Borders Lead, Fills Follow

```
Previous Borders ──┐
                    ├─ Match by ownerPairKey → Lerp vertices → Interpolated Borders
Next Borders ──────┘                                                      │
                                                                          ↓
                                                              Re-chain into Fill Rings
                                                                          │
                                                                          ↓
                                                        FillFrame + BorderFrame (same points)
```

### Steps

1. **Match polylines**: Previous and next `frontierPolylines` share `ownerPairKey`. Match them.
   - **Persisting**: same key in both → lerp
   - **Spawned**: only in next → fade in (from midpoint)
   - **Vanished**: only in previous → fade out (to midpoint)

2. **Resample to equal vertex count**: Arc-length parameterization → same N for both.

3. **Lerp vertices**: `point[i] = (1-t) * prev[i] + t * next[i]`

4. **Re-chain fills**: Use interpolated borders + world borders → `executeChainWalk` → fill rings.

5. **Return unified frame**: Both fill and border derive from same interpolated geometry.

## Files

| Action | File | Purpose |
|--------|------|---------|
| NEW | `layers/transition/interpolatePolylines.ts` | matchByKey, resample, lerp, interpolate |
| MODIFY | `modes/FrontierMorphFillMode.ts` | Store prev+next polylines, derive fills from interpolated borders |
| MODIFY | `modes/OptimalTransportBorderMode.ts` | Store prev+next polylines, interpolate in sample() |
| MODIFY | `contracts/GeometryContracts.ts` | Add worldBorderPolylines to GeometrySnapshot |

## Verification

- `npx vite build` passes
- User observes smooth border morphing during conquests
- Fills track borders exactly at every frame
- Unchanged territories remain perfectly static
