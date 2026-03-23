# Conquest Animation Specification

**Status:** CANONICAL  
**Ref:** D-86, TERRITORY_ARCHITECTURE.md §2

> [!CAUTION]
> Any agent implementing conquest animations MUST read this document first.

---

## What Happens

A conquest changes star ownership on a tick boundary. Territory borders morph smoothly to reflect the new ownership over `TERRITORY_TRANSITION_MS`, completing within the tick interval.

## Hard Constraints

1. **Fills derive from borders.** Fills are reconstructed from interpolated border vertices every frame. Never interpolated independently. (Root cause of previous transition failures.)

2. **Not DY4.** DY4 Optimal Transport (legacy) regressed and must be rethought from first principles per D-86. The new implementation is a clean replacement, not a wrapper.

3. **Unchanged borders must not jitter.** Borders unaffected by the conquest must remain perfectly static — no floating-point drift from unnecessary resampling or recomputation.

4. **Timing is tick-bound.** Transitions dispatch on tick boundaries and complete within one tick interval. Duration and tick rate are configurable, not constants.

## Design Intent

- Borders near the conquered star shift; the rest of the map stays still.
- The visual effect should feel like borders *pulling* or *stretching* toward the new ownership shape — rope-like, organic, not rigid or mechanical.
- The approach should be minimal: only move what needs to move.
- Implementation approach is open — per-vertex lerp, minimal transport, rope-like interpolation, or other methods are all acceptable as long as the hard constraints above are met.

## Implementation Files

| File | Role |
|------|------|
| `layers/transition/interpolatePolylines.ts` | Polyline matching and interpolation utilities |
| `layers/transition/modes/OptimalTransportBorderMode.ts` | Border transition sampling |
| `layers/transition/modes/FrontierMorphFillMode.ts` | Fill derivation from interpolated borders |
