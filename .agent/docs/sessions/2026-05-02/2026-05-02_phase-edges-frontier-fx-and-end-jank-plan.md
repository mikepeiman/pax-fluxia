# Phase Edges Frontier FX And End-Jank Plan - 2026-05-02

## Purpose

Implement frontier-offset and moat-style effects in a way that is:

- architecturally reusable
- visually controllable from one top-level UI section
- consistent across steady-state and transitions
- compatible with the preferred Phase Edges look

Also remove the small end-of-transition pop between the last transition frame and the next steady-state frame.

## Current Status

- `Centered-blended borders` are now accepted as visually correct.
- `Inward Offset` is still off-spec.
- Current wrong behavior: it acts like a local shrink on the first frontier-adjacent row of squares.
- Required behavior: a global, variable-width clean offset from the frontier itself.
- Transition end still has a small 1-3 frame disjoint / pop.

## Invariants

- Fill and border must continue to derive from one coherent frontier truth.
- Offset must work the same in steady-state and transition.
- Border-style toggles must not silently own fill.
- New VFX must layer on the current accepted surface, not replace it by accident.

## Architecture

Build one reusable `frontier distance` source for the active presented surface.

Use that one source for:

- clean inward offset
- stepped square moat bands
- plasma ribbon mask
- particle emission mask
- geometry moat strip placement

This keeps all frontier FX driven by one owner instead of separate one-off hacks.

## Implementation

### 1. Frontier Distance Core

- Add a shared frontier-distance utility under `src/lib/territory/frontier/`.
- For the active Phase Edges surface, compute distance-from-frontier in presentation space.
- Expose both:
  - continuous distance
  - quantized band index

### 2. Inward Offset

- Re-implement `Inward Offset` against frontier distance, not frontier-adjacent cells.
- `0px` means no pullback.
- Positive width pulls the whole filled region back cleanly from the frontier.

### 3. Moat / Gradient Modes

Implement these as selectable modes, all driven by the same frontier-distance source:

- `clean_offset`
  - plain clean pullback
- `stepped_square`
  - outer band shrinks most, deeper bands shrink less
  - deliberate pixellated moat
- `hot_plasma`
  - animated emissive ribbon, heat shimmer, flare pulses
- `ion_drift`
  - particles/embers/ion sparks emitted along the frontier tangent
- `geometry_strip`
  - procedural moat strip / crenellated band with pulse or oscillation

### 4. Top-Level UI Section

Add a new top-level settings section:

- `Frontier FX`

It should own all offset / moat / border-adjacent VFX tuning, instead of burying them inside `Territory Styles`.

Initial controls:

- `Mode`
- `Width`
- `Strength`
- `Steps` for stepped mode
- `Softness`
- `Glow / Emissive`
- `Particle Density`
- `Pulse Speed`
- `Apply In Steady State`
- `Apply During Transition`

### 5. End-Transition Jank

Investigate the last 1-3 frames specifically.

Check three causes in this order:

1. final transition frame and first steady frame are not geometrically identical
2. timing/clock discontinuity at handoff
3. curve problem near transition completion

Preferred fix order:

1. continuity bug fix if final transition and first steady frame differ
2. easing adjustment near completion if geometry is already continuous
3. only then add a short terminal hold / extra finishing frames

## Verification

- compare steady-state vs transition on the same frontier with each FX mode
- verify fill/border alignment stays intact
- verify `Inward Offset` affects more than the first frontier row
- verify `0px` is truly neutral
- verify end-of-transition no longer pops into the next steady-state tick

## Risks

- distance sampling could accidentally diverge from the accepted fill/border surface if sourced from the wrong layer
- particle/geometry modes could create performance spikes if not gated to frontier-local regions
- easing-only changes could hide a geometry mismatch instead of fixing it

## Recommended Order

1. frontier distance core
2. clean global `Inward Offset`
3. end-transition jank fix
4. stepped square mode
5. plasma / particle / geometry moat modes
