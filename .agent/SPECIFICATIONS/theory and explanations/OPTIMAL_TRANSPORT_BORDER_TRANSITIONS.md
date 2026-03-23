# Optimal Transport Border Transitions — Theory & Design

**Date:** 2026-03-23
**Context:** Territory conquest border animation (DY4-derived, D-81, D-86)
**Layer:** Transition (Border axis)

---

## 1. The Problem

When a star is conquered, its territory changes owner. The border between two territories — the **front** — must move smoothly from its old position to its new position. This is the **border transition**.

### What it looks like

Imagine two territories, Red and Blue, with a border between them. Red conquers one of Blue's stars near the border. After the conquest:

- **Old border position:** a polyline separating Red and Blue territories before the conquest
- **New border position:** a polyline separating Red and Blue territories after the conquest (shifted toward Blue because Red expanded)

The border must **drift smoothly** from old position to new position over the transition duration (e.g., 400ms). No popping, no teleporting, no flickering.

### Why this is hard

Simple linear interpolation (lerp between old and new vertex positions) produces terrible results when:
- The old and new polylines have different numbers of vertices
- The topology changes (one border splits into two, or two borders merge)
- The old and new borders don't correspond point-for-point (new vertices appear, old vertices vanish)

This is where optimal transport theory becomes useful.

---

## 2. The Theory: Optimal Transport

### 2.1 What is Optimal Transport?

Optimal transport (OT) is a mathematical framework for finding the most efficient way to move a **distribution of mass** from one shape to another. Originally formulated by Gaspard Monge in 1781 for moving piles of earth:

> Given a pile of sand (source distribution) and a hole to fill (target distribution), what is the cheapest way to move the sand into the hole?

The "cost" is typically proportional to **distance × mass moved**. The optimal solution minimizes total cost.

### 2.2 Why It Applies to Borders

A border polyline can be thought of as a **1D distribution of mass** along its length. Each segment has a "mass" proportional to its length. The transition problem becomes:

> Given the old border (source mass distribution) and the new border (target mass distribution), find the cheapest way to move the old border's mass to the new border's positions.

This approach has important properties:

1. **Mass preservation:** Every point on the old border maps to some point on the new border. Nothing appears from nowhere; nothing disappears into nothing. The border *flows* continuously.

2. **Monotonicity:** Points that are "left of" other points on the old border remain "left of" them on the new border. The border doesn't cross itself during the transition. (This is the 1D optimal transport guarantee — the optimal map is always monotone.)

3. **Smooth drift:** Because the mapping minimizes total displacement, the border moves the minimum distance possible. Nearby points move to nearby points. The visual result is a natural, smooth drift rather than chaotic vertex shuffling.

### 2.3 The 1D OT Algorithm

For 1D distributions (which border polylines are, parameterized by arc length), optimal transport has a closed-form solution:

1. **Parameterize both borders** by arc length: old border has total length `L_old`, new border has total length `L_new`. Normalize to `[0, 1]`.

2. **Build cumulative distribution functions (CDFs):**
   - `F_old(t)` = fraction of old border's length up to parameter `t`
   - `F_new(t)` = fraction of new border's length up to parameter `t`

3. **The optimal map** from old to new is the inverse CDF composition:
   - For a point at parameter `t` on the old border: its optimal destination is `F_new⁻¹(F_old(t))` on the new border.

4. **At transition progress `p` (0→1):** each point's position is:
   ```
   position(t, p) = (1 - p) × old_border(t) + p × new_border(F_new⁻¹(F_old(t)))
   ```

### 2.4 Handling Topology Changes

When a conquest causes borders to split or merge:

- **Split (1 old → 2 new):** The old border's mass is distributed to two new borders. Each new border receives proportional mass. The OT map splits the old parameterization into two segments, each mapping to one new border. Visually: the border pinches and separates.

- **Merge (2 old → 1 new):** Two old borders' mass flows into one new border. The OT map concatenates two source distributions. Visually: two borders flow together and join.

- **Spawn (0 → 1):** A new border appears where none existed. No source mass. The new border grows from a collapsed point (a seed location, typically the conquered star's position). This is a degenerate transport from a point mass.

- **Vanish (1 → 0):** An old border disappears. It collapses toward a vanishing point (again, near the conquered star). Degenerate transport to a point mass.

---

## 3. Envisioned Visual Result

### 3.1 Steady-State Conquest

Red conquers Blue's star S. Over 400ms:

1. **Frame 0 (p=0):** Border is at its old position. Fills and borders are in pre-conquest state.
2. **Frame 50% (p=0.5):** Border has drifted halfway between old and new positions. The Red fill has expanded to cover the area behind the drifting border. The Blue fill has retreated in front of it. The border itself maintains roughly the same visual weight and smoothness throughout — it doesn't thin out, stretch, or wobble.
3. **Frame 100% (p=1):** Border arrives at its new position. Fills snap exactly to the boundary defined by the new geometry. Transition complete.

### 3.2 Key Visual Properties

- **Even-speed drift:** The border moves at roughly constant apparent speed. Not ease-in-ease-out that makes the start and end feel sluggish.
- **Preserved width:** The border stroke width stays constant throughout the transition.
- **No crossing:** Two parts of the same border never cross each other during the morph.
- **Fill follows border:** At every frame, the fill boundary exactly matches the current border position. This is guaranteed by construction — both fill and border transitions consume the same `TransitionEnvelope.progress` value.

### 3.3 Multi-Front Scenarios

When Red conquers a star that borders Blue AND Green:
- The Red-Blue front drifts away from Red (Red expands)
- The Red-Green front also drifts (if the conquest changes that border's position)
- Blue-Green fronts are unaffected (no ownership change along them)
- Each front transitions independently but on the same clock

---

## 4. Implementation Outline

### 4.1 Data Flow

```
GeometrySnapshot(old) + GeometrySnapshot(new) + conquestEvents
  → BorderTransitionPlan
    → sample(plan, progress) → BorderTransitionFrame
```

### 4.2 Planning Phase (once per conquest)

When a conquest triggers a transition:

1. **Extract affected frontiers:** Find all `frontierPolylines` whose `ownerPairKey` involves the conquered star's old or new owner.
2. **Build correspondence:** For each affected frontier, pair the old and new polyline using parameterized arc-length matching.
3. **Classify topology:**
   - `persist` → old and new polylines exist (drift)
   - `split` → one old → two new polylines (pinch)
   - `merge` → two old → one new polyline (join)
   - `spawn` → no old, new appears (grow from point)
   - `vanish` → old exists, no new (collapse to point)
4. **Build OT maps:** For each correspondence, compute the 1D optimal transport mapping (CDF parameterization).
5. **Store as `BorderTransitionPlan`** — immutable, created once, sampled many times.

### 4.3 Sampling Phase (60× per second)

Given `progress ∈ [0, 1]`:

1. For each correspondence in the plan:
   - If `persist`: interpolate `position(t, progress)` using the OT map
   - If `split`: at `progress < 0.3`, deform old polyline toward pinch point; at `progress > 0.3`, split into two and drift to targets
   - If `spawn`: grow new polyline from seed point, scaling by `progress`
   - If `vanish`: collapse old polyline toward seed point, scaling by `(1 - progress)`
2. Resample the interpolated polyline to maintain even vertex spacing
3. Return as `BorderTransitionFrame`

### 4.4 Complexity

- Planning: O(n) per frontier (arc-length parameterization is linear in vertex count)
- Sampling: O(n) per frame per frontier (linear interpolation)
- Total per frame: typically 5-20 frontiers × 20-60 vertices each = negligible (\<0.5ms)

---

## 5. Relationship to the Fill Transition

The fill transition and border transition are independent modes on the same clock. But they must produce visually coherent results:

- At `progress = p`, the border is at position `B(p)`
- At `progress = p`, the fill must cover exactly the area bounded by `B(p)`
- This means the fill transition must also know about the interpolated border positions

The `FrontierMorphFillMode` achieves this by building fill polygons from the same interpolated frontier points that the border transition produces. Both modes share the `TransitionEnvelope` and the same `GeometrySnapshot` pair — they just produce different draw commands (filled polygons vs stroked polylines).

---

## 6. What Went Wrong With DY4

The original DY4 implementation (D-77, D-81) had these problems:

1. **Hardcoded inside the renderer:** OT logic was embedded in `PowerVoronoiRenderer.ts`, mixing geometry computation with PIXI drawing. This made it impossible to test independently.
2. **Independent parameterization per side:** Instead of parameterizing the full frontier polyline, it parameterized each Voronoi cell side independently. This caused discontinuities at cell boundaries.
3. **No topology handling:** Splits, merges, spawns, and vanishes were not handled — the transition just snapped when topology changed.
4. **Module-level mutable state:** Transition data was stored in module globals, causing stale state across game resets and pause/resume cycles.
5. **Accumulated regressions:** Multiple refactors modified the renderer without verifying DY4 still worked, leading to gradual quality loss (D-81).

The re-implementation addresses all of these by: placing the algorithm in a standalone mode (testable), using full-polyline parameterization (continuous), handling topology changes explicitly, storing state only in typed plan/sample data (no globals), and following the contract-first architecture (no PIXI).
