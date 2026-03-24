<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Ok. Good feedback. I like it. Let's get crispy and produce a plan now. Here is the AST data ou asked for.

Yes — now we can get **crispy**.

You already have more transition infrastructure than I expected: a canonical planner, splice-window logic, patch morph plans, virtual stars, frontier-map diffs, and a clean transition contract surface are all already present. That means the plan should **not** propose a greenfield rewrite. It should define a targeted implementation program that preserves your good existing work, adds an RT/field transition prototype track, and uses clear success gates.[^1][^2][^3]

## Plan shape

I recommend a **two-track implementation plan**:


| Track | Purpose | Keep/Replace |
| :-- | :-- | :-- |
| Track A: Frontier-authority stabilization | Ensure pre/post geometry snapshots are trustworthy and shared by fills + borders | **Keep** and strengthen existing frontier-map / Geometry0319 path.[^4][^1] |
| Track B: Transition prototype bakeoff | Evaluate visual interpolation methods between already-correct snapshots | **Add** new transition modes beside existing splice/patch logic.[^1][^2] |

This matches your current architecture better than a full conceptual reset because the runtime already has proper layer seams for geometry, transition, and presentation, and both fill and border transitions are intended to be swappable modes.[^2]

## What to keep

These pieces are already useful and should stay:

- `createCanonicalTransitionPlan` as the main border/fill transition planning entry point.[^1]
- `sampleTransitionFrame` and `drawTerritoryFrame` as the per-frame transition sampling/render bridge.[^1]
- `computeTerritoryDeltaContext`, `diffFrontierMaps`, and the `TerritoryFrontierMap` canonical identity structure.[^1]
- `buildPatchMorphPlan` and `resamplePolylineByArcLength` as reusable local-curve morph utilities.[^1]
- `OwnershipSnapshot.conquestEvents` and especially `virtualStars`, because they are already a natural hook for local change orchestration.[^1]
- `canonicalTraceStore` and ring diagnostics, because they give you validation visibility you will absolutely need.[^1]

In short: the codebase already contains a decent **planner spine**. The plan should evolve it, not discard it.

## The key architectural decision

Treat transition as a **visual transport problem between two authoritative frontier snapshots**, not as a requirement that intermediate frames remain gameplay-valid. Your runtime already supports this separation conceptually through `GeometrySnapshot` versus `TransitionSnapshot`, and the transition layer exists precisely so fill/border animation can be independent while still sampled from one shared envelope.[^2][^1]

That means:

- pre and post snapshots must be correct,
- intermediate frames only need to look right,
- fills and borders must still come from the same frame-time frontier truth.

That last requirement remains non-negotiable and is already reflected in your existing renderer/transition guidance.[^3][^4]

## The implementation objective

Build a new transition-mode experiment program with **three candidate border-transition modes**:

1. **Existing splice/patch morph mode** — your current baseline.
2. **Frontier RT / optical-flow mode** — first new prototype.
3. **Field/SDF warp mode** — second new prototype.

Do **not** replace the baseline immediately. Add the new modes behind the transition registry so you can compare them directly under identical conquest events and geometry snapshots.[^2][^1]

## Track A: Frontier authority stabilization

Before transition experimentation, tighten the geometry truth that all transition modes will consume.

### A1. Standardize on one authoritative frontier source

Use `TerritoryFrontierMap` plus frontier polylines from Geometry0319 / canonical geometry as the only authoritative frontier source for transition planning.[^4][^1]

Implementation actions:

- Ensure `frontierMap` is always present on `TerritoryGeometryData` for the geometry modes used in transition experiments.[^1]
- Eliminate any path where border transitions use one source and fills use another.[^3][^4]
- Preserve `SharedPolyline.ownerPairKey`, canonical edge ids, and vertex identities; these remain useful even if the winning transition mode is RT/field-based.[^1]


### A2. Tighten frontier identity

Your current identity system relies heavily on `ptKey`/`edgeKey` with 2-decimal snapping, which is workable but fragile.[^4][^1]

Implementation actions:

- Keep the current keys for now.
- Add **diagnostic counters** for:
    - unmatched canonical vertices,
    - edge merges caused only by rounding,
    - world-boundary ambiguity,
    - junction degree anomalies.
- Add a trace view for “frontier-map diff before transition plan” so you can see whether change detection is lying before you blame the morph.


### A3. Add one explicit transition-ready frontier export

Add a lightweight derived export from geometry:

- ownerPairKey
- polyline points
- canonical edge ids touched
- ring ids touched
- whether it is world-boundary
- optional dominant star ids if available later

This does **not** need to be the whole new semantic frontier schema yet. It is just the minimal enriched frontier snapshot the new transition modes should consume.

## Track B: Transition bakeoff

### Candidate 1: Existing splice/patch morph baseline

You already have:

- `findRingSpliceWindow`
- `classifyRingTransitionKind`
- `buildPatchMorphPlan`
- `sampleTransitionFrame`.[^1]

This becomes the **control**. Do not throw it away. Add stronger diagnostics and use it as the benchmark every new mode must beat in:

- visual smoothness,
- topology handling,
- engineering complexity,
- performance.


### Candidate 2: Frontier RT + local optical flow

This is the first serious new mode because it is likely the fastest to prototype and easiest to debug visually.

#### B2.1. What to build

Add a new border transition mode, tentatively:

- `FrontierOpticalFlowBorderMode`

Its plan stage should:

1. Take prev and next authoritative frontier snapshots.
2. Rasterize them to a **machine-readable frontier RT** on CPU first if needed, then GPU later.
3. Compute changed frontier zones.
4. Build a local working band around those zones.
5. Compute or estimate per-pixel motion in that band.
6. Store a per-patch displacement plan.

Its sample stage should:

1. Sample the displacement plan at progress `t`.
2. Advect frontier pixels or derived polyline samples.
3. Convert the deformed result into frame frontiers.
4. Hand that frontier frame to fill + border presentation.

#### B2.2. First implementation should be CPU/simple, not shader-first

Because you currently have **no RT ownership pipeline at all** and ownership is CPU-only, the first experiment should not start with complex shader infrastructure.[^1]

Instead:

- rasterize prev/next frontiers into offscreen CPU grids,
- encode owner-pair IDs as integers,
- thicken frontiers deliberately,
- trace changed frontier bands,
- prototype optical-flow-like displacement or simpler local correspondence in JS.

Only once it proves visually promising should you move it to GPU/PIXI.

#### B2.3. Working data format

Since there is no existing RT pipeline, define a transition-only raster artifact:

- `FrontierRasterSnapshot`
    - width, height
    - ownerPairGrid
    - frontierMask
    - anchorMask
    - optional directional channels
    - optional distance band

This artifact belongs to the **transition layer only**, not geometry.

#### B2.4. How to scope the solve

Use the whole prev/next snapshots for change detection, but compute motion only inside:

- the union of changed frontier pixels,
- dilated by a configurable radius,
- optionally intersected with conquest-neighborhood hints from `changedSiteIds`, `affectedTerritoryIds`, and `virtualStars`.[^1]

This lets you preserve the “whole picture” while keeping computation local.

#### B2.5. Why this fits your codebase

It plugs in well because:

- conquest events already exist,
- delta context already exists,
- frame sampling already exists,
- debug tracing already exists.[^1]

You are adding a new planner/sampler, not inventing an entire runtime.

### Candidate 3: Field / SDF warp mode

This is the second new prototype because it may yield the most fluid visual result even if it is heavier.

#### B3.1. What to build

Add a new border transition mode, tentatively:

- `FieldWarpBorderMode`

Its plan stage should:

1. Rasterize prev and next frontier-related fields.
2. Build one of these representations:
    - binary frontier occupancy,
    - thick frontier density,
    - signed/unsigned distance field around frontiers,
    - per-owner soft field if needed.
3. Store prev/next fields and patch bounds.

Its sample stage should:

1. Interpolate or warp fields over time.
2. Extract the current frontier contour from the field.
3. Convert that contour to frame frontiers.
4. Hand the frame frontier to both border and fill builders.

#### B3.2. First bakeoff inside this mode

Do **not** jump directly to optimal transport.

Implement in this order:

1. direct field interpolation,
2. distance-field interpolation,
3. local displacement interpolation if needed,
4. OT-inspired warp only if the earlier ones fail visually.

This is important because the simplest thing may already be good enough.

#### B3.3. Extraction strategy

At sample time, reconstruct the visible frontier from the field by:

- threshold / zero-crossing extraction,
- contour tracing,
- optional smoothing,
- then converting to presentation-friendly polyline arrays.

This is transition-layer ephemera, not new canonical geometry.

## Fill transition strategy

Do not separately invent fill animation logic for each candidate.

Instead, keep one rule:

- **frame-time fills are derived from frame-time frontiers**.

For the experimental modes, that means:

1. sample the current frame frontier,
2. rebuild owner loops / fill regions from that frontier,
3. draw fills from those rebuilt regions.[^3][^4]

This preserves the one-geometry-truth-per-frame requirement even if the transition mode is fully raster/field-driven internally.

## Where virtual stars fit

Your AST inventory shows `virtualStars` already exist in `OwnershipSnapshot`, and `VirtualStarOwnershipMode` is a placeholder.[^1]

That is a major opportunity.

Use virtual stars as **transition-locality hints**, not necessarily as the main animation mechanism:

- seed changed frontier neighborhood detection,
- weight patch bounds,
- bias local field generation,
- optionally create directional cues in the frontier raster.

This gives you a strong bridge between conquest events and transition computation without forcing a full parametric CSG system immediately.

## Concrete file plan

### Add

- `transitions/modes/FrontierOpticalFlowBorderMode.ts`
- `transitions/modes/FieldWarpBorderMode.ts`
- `transitions/raster/buildFrontierRasterSnapshot.ts`
- `transitions/raster/diffFrontierRasters.ts`
- `transitions/raster/extractFrontierContours.ts`
- `transitions/raster/buildDistanceField.ts`
- `transitions/raster/sampleFieldWarpFrame.ts`


### Reuse / extend

- `transitions/createCanonicalTransitionPlan.ts` → keep as baseline plan builder and/or registry entry adapter.[^1]
- `transitions/sampleTransitionFrame.ts` → keep as shared frame sampler shape, possibly dispatch by mode.[^1]
- `transitions/buildPatchMorphPlan.ts` → keep for baseline mode and possibly reuse for post-raster contour segment interpolation.[^1]
- `geometry/morphUtils.ts` → reuse resampling helpers immediately.[^1]
- `devtools/TerritoryTraceStore.ts` → add raster snapshots / contour overlays in diagnostics.[^1]


### Do not touch yet

- `renderers/PowerVoronoiRenderer.ts` giant legacy state machine, except to bridge or isolate experimentation if necessary.[^1]
- `OptimalTransportBorderTransition.ts`, except as a reference baseline.[^1]


## Decision gates

The plan should explicitly require a bakeoff with a fixed conquest test set.

### Gate 1: correctness of static snapshots

Before evaluating transitions:

- prev and next frontiers must already be right,
- fills must close from frontiers,
- no transition mode gets blamed for geometry bugs.[^4]


### Gate 2: visual success

For each candidate mode:

- no visible popping at conquest start,
- no fill/border divergence,
- no obvious ghosting or double borders,
- visually sensible movement around star flips.


### Gate 3: implementation sanity

Prefer the mode that:

- uses existing seams cleanly,
- is debuggable in traces,
- does not create another 1000-line renderer-internal state machine.


### Gate 4: performance

Measure:

- plan-build time at conquest,
- per-frame sample time,
- contour extraction cost,
- any raster readback costs.


## Immediate next implementation order

1. **Stabilize frontier authority** on the geometry path you will use for testing.[^4][^1]
2. **Instrument diagnostics** around frontier diffs and ring plans.[^1]
3. **Build transition-only raster snapshot generation** from prev/next frontier data.
4. **Implement Candidate 2A:** thick frontier raster + changed-zone detection + very simple anchored contour interpolation.
5. **Implement Candidate 3A:** distance-field interpolation prototype.
6. Compare both against the current splice/patch baseline on the same conquest traces.
7. Only then decide whether optical flow or OT-like field warping is worth deeper investment.

## The handoff message to your agent

You can hand off this core directive:

- Keep current geometry authority and current canonical transition baseline.
- Add new experimental border-transition modes rather than replacing the planner wholesale.
- Prototype transition-layer raster/field approaches between already-correct frontier snapshots.
- Always derive fills and borders from the same frame-time frontier output.
- Use existing conquest events, virtual stars, frontier-map diffs, and trace tooling to localize and debug the solve.[^2][^1]


## My strongest recommendation

Do **not** make the next step “pick the final algorithm.”
Make the next step:

> **Build a controlled transition bakeoff inside the existing transition-layer architecture.**

That is now the clearest and safest plan given your actual codebase.

<div align="center">⁂</div>

[^1]: TERRITORY_TRANSITION_INVENTORY.md

[^2]: TERRITORY_CLEAN_ARCHITECTURE_BLUEPRINT.md

[^3]: 2026-03-16-NotebookLM-Blueprint-for-60fps-Territory-Morphing-Integration-3.md

[^4]: GEOMETRY_0319_AGENT_PROMPT.md

