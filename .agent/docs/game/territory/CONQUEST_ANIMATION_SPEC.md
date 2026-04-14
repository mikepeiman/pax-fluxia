# Conquest Animation Specification

**Status:** REFERENCE (update alongside `TERRITORY_ARCHITECTURE.md` and `PERIMETER_FIELD_MODE_SPEC.md`)
**Ref:** D-86, `TERRITORY_ARCHITECTURE.md`

> [!CAUTION]
> Any agent implementing conquest animations MUST read this document first.

---

## What Happens

A conquest changes star ownership on a tick boundary. Territory **frontiers** morph smoothly to reflect the new ownership over `TERRITORY_TRANSITION_MS`, completing within the tick interval.

Fills and strokes must follow one coordinated transition when using the reference territory path.

---

## Hard Constraints

1. **Fills derive from frontier/border truth.** Fills are reconstructed from the same frontier geometry the border path uses each frame. Separate fill interpolation that can drift from borders is not acceptable on the reference path.

2. **Legacy DY4 OT path is not the reference path.** Historical optimal-transport border animation in PVV2 has had regressions. New work should be framed against the layered transition pipeline unless a legacy comparison is explicitly requested.

3. **Unchanged borders must not jitter.** Borders unaffected by the conquest must remain static.

4. **Timing is tick-bound.** Transitions dispatch on tick boundaries and complete within one tick interval. Duration and tick rate are configurable.

5. **Mode-specific specs still apply.** Experimental families may impose stricter mode-level constraints. `perimeter_field` is governed by [PERIMETER_FIELD_MODE_SPEC.md](./PERIMETER_FIELD_MODE_SPEC.md).

---

## Design Intent

- Borders near the conquered star shift while the rest of the map stays still.
- The effect should feel like borders pulling or stretching toward the new ownership shape.
- The approach should be minimal: only move what needs to move.
- The exact interpolation method is open as long as the hard constraints are satisfied.

---

## Implementation Files

| File | Role |
|------|------|
| `layers/transition/interpolatePolylines.ts` | Polyline matching and interpolation utilities |
| `layers/transition/modes/OptimalTransportBorderMode.ts` | Border transition sampling |
| `layers/transition/modes/ActiveFrontFillMode.ts` | Primary fill path: active-front planning + sampling |
| `layers/transition/modes/FrontierMorphFillMode.ts` | Legacy / comparison path; do not treat as the shipped reference path |

---

## Experimental Family Note: `perimeter_field`

`perimeter_field` has a stricter mode-level contract than the generic conquest-animation rules above.

Additional hard requirements for `perimeter_field`:

- `PREV`, `NEXT`, and scrubbed interim frames must be exact live gameplay truth.
- Scrub frame `0` must equal true gameplay `PREV`.
- Change selection must come from changed fronts / contested topology, not star-center heuristics.
- Moving samples must correspond between real `PREV` and `NEXT` perimeter-vstar states.
- Diagnostics must observe the live family path and must not synthesize substitute conquest states and call them `PREV` or `NEXT`.
