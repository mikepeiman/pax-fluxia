<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Yes, thank yo. Very good work. Let's start with \#2 document please.

Absolutely — here is a **design-review version** with sharper terminology, less implementation detail, and a clearer statement of intent, while still preserving the existing four-stage runtime architecture and the transition redesign direction we established.[^1][^2]

## Design-review document

# Graph-Native Territory Transition System

**Design Review Draft**

### 1. Intent

The territory system must animate ownership changes as a **continuous deformation of the planar partition**, not as independent polygon morphs. At every frame, the rendered territories must remain gap-free, overlap-free, and border-aligned, because fills and borders are expressions of the same underlying frontier geometry.[^2][^1]

The existing runtime architecture remains sound: **Ownership → Geometry → Transition → Presentation**. The redesign is focused on the Transition layer, replacing the current polygon-based fill interpolation approach that has been producing corrupt intermediate frames.[^1][^2]

### 2. Core position

A conquest transition is not a transformation of owner polygons; it is a transformation of the **shared frontier graph**. Only the frontier spans that truly change should move, while unchanged frontier spans remain fixed.[^1]

Region loops are therefore not the primary animated object. They are rebuilt from interpolated frontier geometry each frame, which is what preserves the planar-partition invariant across the transition.[^1]

### 3. Canonical geometry

Each ownership state must compile to an immutable canonical topology containing frontier vertices, frontier sections, and region loops. That topology is the authoritative geometric snapshot for transition, regardless of any additional render conveniences the geometry layer may also provide.[^2][^1]

A hard requirement of the system is **deterministic equal-density sampling** for unchanged geometry. If two ownership states produce an unchanged frontier span, the corresponding point arrays must match identically within tolerance, so stability can be recognized directly rather than guessed heuristically.[^1]

### 4. Canonical comparison model

Transition comparison operates on **canonical ordered frontier chains**, not on owner polygons and not primarily on section IDs. These chains are the ordered pointwise representation of the frontier that makes prev/next comparison meaningful even when section decomposition is not the conceptual center of the transition model.[^1]

Each comparable chain must have stable direction, stable endpoint semantics, and stable ordering across prev and next states. If a true stable anchor lies in the middle of a stored section, the transition representation may introduce a **synthetic anchor** so the active span is bounded by the right geometric facts rather than by arbitrary storage boundaries.[^1]

### 5. Active fronts

An **active front** is the maximal frontier span whose geometry differs between prev and next, bounded by stable anchors. Active fronts are detected by pointwise comparison along canonical frontier chains, walking inward from both ends until stable geometry gives way to divergence and then returns to stability.[^1]

There is no separate step-size walk in this design. The comparison walks adjacent canonical points directly, which is why deterministic equal-density compiler output is a prerequisite rather than a convenience.[^1]

### 6. Interpolation model

Once an active front has been identified, its prev and next spans are resampled to a common arc-length parameterization and interpolated pointwise over time. This keeps the endpoints fixed at the stable anchors while allowing the changed span to move smoothly from previous geometry to next geometry.[^1]

The system does **not** invent visual birth effects for newly appearing boundaries. The only allowed degenerate transition is **death**: when a territory component truly disappears, its final loop collapses to the center of the lost star.[^1]

### 7. Loop reconstruction

Per-frame output is built from the next-state structural truth plus interpolated active-front geometry. Stable frontier spans are reused unchanged, active spans are replaced by their interpolated geometry, and affected region loops are rebuilt from section references rather than morphed as standalone polygons.[^2][^1]

This means the visual frame is always assembled from one coherent frontier model. That is the reason fills and borders stay aligned and adjacent owners continue to share exactly the same boundary at every moment of the transition.[^2][^1]

### 8. Dirty scope

Not every loop needs rebuilding on every frame. The transition plan should identify which frontier spans are active, which loops reference those spans, and which connected components are therefore dirty.[^1]

Dirty-loop resolution is part of the transition contract, not an optimization detail to be guessed later. Stable loops may be reused, but every loop touched by active-front geometry or synthetic anchor insertion must be rebuilt from the current frame geometry.[^1]

### 9. Rendering contract

Presentation should remain downstream of transition and consume only emitted frame geometry. The fill path triangulates region loops, and the border path strokes the same emitted frontier sections, so alignment is guaranteed by shared input rather than by visual coincidence.[^2][^1]

This keeps rendering simple and honest. The presentation layer should not repair topology, infer missing boundaries, or synthesize alternate geometry during animation.[^2][^1]

### 10. Architectural consequence

The practical architectural change is straightforward: the current `FrontierMorphFillMode` is replaced by an `ActiveFrontFillMode` that plans active fronts once and samples interpolated frontier geometry over time. The existing `TransitionLayerCoordinator` remains the orchestrator, and the downstream presentation builders and PIXI presenter can remain conceptually unchanged as consumers of `FillTransitionFrame` output.[^2][^1]

In other words, the redesign changes **what transition means**, not the overall runtime layering. Geometry still compiles snapshots, Transition still owns time, and Presentation still draws the resulting frame.[^2][^1]

## Editorial notes

This version intentionally presents the system as a **design position** rather than a coding recipe. It emphasizes invariants, responsibilities, and boundaries between stages, which makes it better suited for architecture review, team alignment, or implementation planning.[^2][^1]

The next document should be the architectural bridge: a practical mapping from this design-review language onto your current coordinators, contracts, and file structure, especially the replacement of `FrontierMorphFillMode` inside the existing Transition layer.[^2][^1]

<div align="center">⁂</div>

[^1]: active_front_interpolation_design.md

[^2]: territory_architecture_outline.md

