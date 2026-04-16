# Perimeter Field Mode Specification

**Status:** ACTIVE experimental mode spec  
**Date:** 2026-04-14  
**Scope:** `perimeter_field` only

> [!CAUTION]
> This document is the source of truth for `perimeter_field`.
> If the current implementation contradicts this document, the implementation is wrong.
> Do not reinterpret implementation drift as intended design.

---

## Purpose

`perimeter_field` is an experimental territory render family whose displayed ownership is driven by **perimeter vstars**, not by direct star-centered field influence.

The mode exists to test a boundary-driven territory model with two properties:

- static territory should remain faithful to a tuned source geometry layer
- conquest transitions should be expressible as correspondence and motion between `PREV` and `NEXT` perimeter-vstar states

---

## Source of Truth

The mode design comes from the user's stated requirements in this thread. Those requirements override accidental implementation behavior.

The authoritative design is:

1. Generate ownership regions from actual star ownership using a selectable geometry source.
2. Place perimeter vstars around the resulting perimeter.
3. Zero out real star ownership influence for displayed territory after base geometry derivation.
4. Render the displayed territory from the perimeter-vstar field.
5. On conquest start, capture both real `PREV` and real `NEXT` geometry truth and perimeter-vstar truth.
6. Determine changed vstars from ownership-change identity plus changed fronts / contested topology, then move them from real `PREV` to real `NEXT`.

---

## Non-Negotiable Invariants

### 1. Base Geometry

- Base geometry comes from actual ownership, using a selectable, tuned geometry source.
- The source tuning surface must remain available and meaningful for this mode.
- The geometry source must support the named constraints the user is tuning, including:
  - MSR
  - CX
  - lane pairs
  - DX

### 2. Ownership Primitive

- Perimeter vstars are the ownership/render primitive for this mode.
- Real star ownership influence is zeroed out for **display** after base geometry derivation.
- The perimeter field is therefore a **derived display model** built from base geometry, not a second ownership truth.

### 3. Perimeter Sampling

- Perimeter vstars are sampled from the real perimeter of the selected source geometry.
- They are offset inward from the boundary by a tunable value.
- DX specifically uses midpoint-based vstars between disconnected same-owner stars.

### 4. Transition Model

- `PREV` and `NEXT` each have their own real perimeter-vstar state.
- Both truth snapshots are known at conquest start. `NEXT` is not a later "settled" truth.
- Transition is the correspondence and motion between those real states.
- Change vstars are determined from changed active fronts / contested topology, not from star-center heuristics.
- Some moving samples may require non-linear paths, including arcs, when straight-line motion would cross unrelated frontiers.
- Unchanged fronts remain static.
- Classifying unmatched changed V's as pure `appearing` / `disappearing` is only a provisional implementation device unless proven correct. The final model may need 100% changed-`PREV`/`NEXT` matching.

### 5. Diagnostics Truth

- `PREV`, `NEXT`, and all scrub frames must be exact live gameplay truth.
- Scrub frame `0` must equal true gameplay `PREV`.
- Diagnostics must be sourced from the real gameplay family path.
- Diagnostics are read-only. They must never silently alter gameplay render behavior.

---

## What Counts as a Violation

The following are violations of this mode:

- treating conquest-only temporary samples as a substitute for real perimeter-vstar `PREV` / `NEXT` states
- selecting moving samples by angle around the conquered star instead of changed-front identity
- replacing an entire local region when only a changed frontier section should move
- using polluted virtual-site identity as if it were gameplay star identity
- exporting or scrubbing synthesized states while calling them `PREV` or `NEXT`
- allowing diagnostics to change gameplay rendering without an explicit, isolated preview mode
- baking debug geometry overlays into artifacts that are supposed to represent the clean gameplay render

---

## Implementation Implications

- The mode may reuse an existing geometry source such as `power_voronoi_0319` or another supported source.
- It may reuse the existing metaball-style field rasterizer as a presentation backend.
- It may not replace changed-front / topology-driven correspondence with star-centered sampling heuristics.
- Stable identity must be preserved from geometry source to perimeter sampling.
- Diagnostics and export tooling must consume live family output, not synthetic reconstruction.

---

## Relationship to Global Territory Docs

- [TERRITORY_ARCHITECTURE.md](./TERRITORY_ARCHITECTURE.md) is the global architecture reference.
- [CONQUEST_ANIMATION_SPEC.md](./CONQUEST_ANIMATION_SPEC.md) defines general conquest-transition constraints.
- [TRANSITION_SNAPSHOT_RECORDER_SPEC.md](./TRANSITION_SNAPSHOT_RECORDER_SPEC.md) defines recorder constraints.

If any of those documents are ambiguous for `perimeter_field`, this document wins for this mode.
