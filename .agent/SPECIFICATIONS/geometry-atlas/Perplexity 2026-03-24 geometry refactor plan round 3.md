<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Yes, I think something more imperative as you describe could work better

Yes — here is a more imperative, implementation-directed prompt.

***

You are performing a **contract-first refactor** of the territory system. Do not explore broadly. Do not redesign the whole game. Execute the architecture below with minimal ambiguity.

The current codebase already contains:

- a geometry snapshot contract with `territoryRegions`, `frontierPolylines`, `worldBorderPolylines`, and `sharedFrontierMap`.[^1]
- a three-concern render architecture where styles render canonical data and transitions transform canonical data.[^2]
- two fundamental computation families: vector-native polygon geometry and raster/field ownership sampling.[^3]
- raster implementations that currently mix ownership, geometry extraction, transition behavior, and final rendering, especially Contour and DistanceField.[^4][^5]

Your job is to **separate concerns cleanly without losing capabilities**.

## Mission

Refactor the territory pipeline so that it has four explicit layers:

1. **Ownership**
2. **Geometry**
3. **Transitions**
4. **Render styles / appearance**

Do **not** leave renderer files responsible for multiple architecture layers unless they are temporary adapters during migration.

## Non-negotiable rules

- Preserve all existing raster capabilities.
- Do not delete raster modes simply because they are raster.
- Do not collapse ownership, geometry, transitions, and appearance back into a single renderer abstraction.
- If a raster path emits geometry, normalize it into the same top-level geometry contract used by vector-native geometry wherever practical.[^1][^2]
- Do not pretend raster-derived geometry is identical in authority to vector-native geometry; attach provenance and reliability metadata.
- Prefer incremental migration over big-bang replacement.
- Remove `legacyGeometryBridge` dependence rather than extending it.[^1]


## Working definitions

Use these meanings exactly.

### Ownership-field engine

A subsystem that computes **who owns each sampled location in space**. Its output is a field/grid/texture/sample-domain ownership result. It is not final appearance, and it is not automatically canonical geometry.

### Emit derived contours in addition to textures

After computing an ownership field, run a geometry extraction step that emits vector-like structures such as:

- polygons,
- shells,
- shell loops,
- frontier polylines,
- world-border polylines.

Contour already does this in practice through marching-squares polygon extraction.[^5]

### Raster family

Pixel, Graph, Lane, Contour, and DistanceField belong to the raster/field family because they compute sampled ownership rather than direct polygonal territory geometry.[^3]

### Vector family

The Voronoi / polygon pipeline belongs to the vector-native family because it computes territory geometry directly.[^3]

## Required architectural outcome

Implement the system so that raster and vector families both fit this shape:

- ownership is computed first,
- geometry is computed or derived second,
- transitions transform ownership and/or geometry data,
- styles draw the final state.

The V3.1 architecture already states that transitions transform canonical data and styles render canonical data. Honor that direction.[^2]

## Required deliverables

You must produce these concrete outputs.

### 1. New ownership contract

Create a first-class contract named `OwnershipFieldSnapshot`.

It must represent sampled ownership independently of geometry extraction and final rendering.

At minimum it must include:

- `version`
- `ownershipVersion`
- `family`
- `strategy`
- sample/world bounds
- grid/sample dimensions
- owner ids / owner-index mapping
- owner-index grid

It should also support optional fields for richer raster modes, including:

- confidence values
- nearest-boundary distance field
- second-best / ambiguity metric
- barrier metadata
- lane metadata
- virtual site metadata
- provenance and diagnostics

Use the DistanceField ownership/border field concepts as guidance for what metadata matters.[^4]

### 2. New unified geometry contract

Create a richer geometry contract, either replacing or superseding `GeometrySnapshot`.

It must be compatible with the existing geometry outputs and the canonical shell/loop model.[^2][^1]

It must include, at minimum:

- `territoryRegions`
- `frontierPolylines`
- `worldBorderPolylines`
- `sharedFrontierMap`
- `shells`
- `shellLoops`

It must also include:

- geometry family: `'vector-native' | 'raster-derived'`
- source method / provenance
- confidence values
- topology / identity / closure reliability flags
- extraction metadata where relevant

The resulting contract must let downstream code consume vector-native and raster-derived geometry through the same high-level API.

### 3. Raster geometry extraction contract

Create a dedicated contract for converting `OwnershipFieldSnapshot` into canonical geometry.

Support methods such as:

- `marching_squares`
- `owner_boundary_trace`
- `centerline_frontier`
- `none`

Contour is the clearest precedent for this behavior. DistanceField’s owner-grid and vector border extraction logic should also be treated as relevant prior art.[^5][^4]

### 4. Mode interfaces

Define or revise interfaces so the codebase clearly distinguishes:

- ownership producers,
- geometry producers,
- raster-derived geometry producers,
- styles,
- fill transitions,
- border transitions.

Do not force every producer into the same shape if the distinction becomes muddy. It is acceptable to have separate interfaces like:

- `OwnershipMode`
- `GeometryMode`
- `RasterDerivedGeometryMode`

so long as the architecture remains explicit and clean.

### 5. Migration plan

Provide a low-risk migration sequence that preserves runtime behavior during refactor.

Sequence requirements:

1. Add new contracts first.
2. Wrap existing raster implementations behind ownership-field outputs.
3. Add raster-to-geometry extraction as a separate stage.
4. Move transition logic out of renderer-centric code.
5. Move style logic to consume canonical outputs rather than hidden renderer-local state.
6. Retire obsolete bridges, duplicate modes, and mixed-concern entry points.

## Required mapping of existing systems

You must map each current territory implementation into the new architecture.

For each of these:

- Pixel
- Graph
- Lane
- Contour
- DistanceField
- vector-native geometry pipeline(s)

state clearly:

- which layer(s) it currently spans,
- which layer it should belong to after refactor,
- what code should stay,
- what code should move,
- what code should be deleted or deprecated,
- whether it is preserved as an ownership engine, geometry extractor, style, transition component, or hybrid adapter.

Honor the current reality:

- Contour extracts ownership boundaries via marching squares and returns polygon arrays.[^5]
- DistanceField includes ownership textures, border-distance textures, temporal blending, and vector border extraction concepts.[^4]
- GeometrySnapshot already models frontiers and world borders.[^1]
- CanonicalTerritoryData already models shells and shell loops consumed by styles and transitions.[^2]


## Compatibility rules you must enforce

When raster-derived geometry is emitted:

- use the same owner-id semantics as vector geometry,
- use the same world-boundary semantics,
- use the same shell / loop / frontier vocabulary,
- use the same top-level geometry object shape where possible,
- include explicit provenance,
- include explicit reliability flags,
- avoid promising stable identity unless confidence justifies it.

Raster-derived geometry should be **maximally compatible**, not **falsely equivalent**.

## Required guardrails

Do not make these mistakes:

- Do not treat sampled contours as authoritative topology without reliability flags.
- Do not bury transition behavior back inside renderers.
- Do not create a giant “unified renderer” that recombines all layers.
- Do not require every style to understand every raster engine’s internal representation.
- Do not keep duplicated parallel geometry representations if one canonical output can serve both.
- Do not throw away field-level transitions where they are the correct substrate, especially for DistanceField temporal behavior.[^4]


## Expected recommendations

Your proposal should converge toward this architectural shape:

- `computeVectorGeometry(...)` for vector-native canonical geometry.[^3]
- `computeRasterOwnership(...)` for raster ownership fields.[^3]
- `extractGeometryFromOwnershipField(...)` for optional raster-derived geometry.[^5][^4]
- `FillTransition` and `BorderTransition` operating above the data layer, not inside renderers.[^2]
- `TerritoryStyle.draw(...)` as the final appearance layer consuming canonical data or approved field inputs, depending on style family.[^2]


## Output format

Return the result in this exact structure:

1. `Recommended contracts`
2. `Existing system mapping`
3. `Migration sequence`
4. `File/module changes`
5. `Deletion/deprecation list`
6. `Risks and guardrails`

Include TypeScript interface definitions in the first section.

Be decisive. Prefer implementation-ready recommendations over discussion.

***

If useful, I can also turn this into an even sharper version aimed at a code-writing agent, with wording like “create file X, move logic Y, delete class Z.”

<div align="center">⁂</div>

[^1]: contract_GeometryContracts.txt

[^2]: orchestrator_renderMode.txt

[^3]: GEOMETRY_CONSOLIDATION_ANALYSIS.md

[^4]: renderer_DistanceFieldTerritoryRenderer.txt

[^5]: renderer_ContourTerritoryRenderer.txt

