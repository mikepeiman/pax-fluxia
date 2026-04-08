# Conquest Animation Specification

**Status:** REFERENCE (update alongside `TERRITORY_ARCHITECTURE.md` and `2026-04-04 Perplexity GPT-5.4 design plan for territory render.md`)  
**Ref:** D-86, TERRITORY_ARCHITECTURE.md §2

> [!CAUTION]
> Any agent implementing conquest animations MUST read this document first.

---

## What Happens

A conquest changes star ownership on a tick boundary. Territory **frontiers** morph smoothly to reflect the new ownership over `TERRITORY_TRANSITION_MS`, completing within the tick interval. **Fills and strokes follow one coordinated transition** (same clock, same plan) — see architecture reference §1.

## Hard Constraints

1. **Fills derive from frontier/border truth.** Fills are reconstructed from the **same** frontier geometry the border path uses each frame — not a separate polygon morph that can drift. (Root cause of previous transition failures was independent fill interpolation.)

2. **Legacy DY4 OT path.** Historical optimal-transport border animation in PVV2 has had regressions; new work uses the **layered** transition pipeline (`TransitionLayerCoordinator`, active-front / frontier-topology planners). Treat DY4-in-PVV2 as legacy unless explicitly selected for comparison.

3. **Unchanged borders must not jitter.** Borders unaffected by the conquest must remain static — no floating-point drift from unnecessary resampling or recomputation.

4. **Timing is tick-bound.** Transitions dispatch on tick boundaries and complete within one tick interval. Duration and tick rate are configurable, not constants.

## Design Intent

- Borders near the conquered star shift; the rest of the map stays still.
- The visual effect should feel like borders *pulling* or *stretching* toward the new ownership shape — rope-like, organic, not rigid or mechanical.
- The approach should be minimal: only move what needs to move (**active fronts** — see 2026-04-04 design-review doc).
- Implementation approach is open — per-vertex lerp, minimal transport, rope-like interpolation, or other methods are all acceptable as long as the hard constraints above are met.

## Implementation Files

| File | Role |
|------|------|
| `layers/transition/interpolatePolylines.ts` | Polyline matching and interpolation utilities |
| `layers/transition/modes/OptimalTransportBorderMode.ts` | Border transition sampling |
| `layers/transition/modes/ActiveFrontFillMode.ts` | **Primary** fill path: active-front planning + sampling (replaces polygon-only `FrontierMorphFillMode` for the unified pipeline — see `doc-review-architecture-docs.md` 2026-04-04) |
| `layers/transition/modes/FrontierMorphFillMode.ts` | Legacy / comparison; known-broken intermediate frames for OT-style polygon morph — do not treat as the shipped unified path |
