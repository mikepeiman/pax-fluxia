<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# Ok, can you make it a clear and comprehensive prompt for my in-project agent?

Yes — here is a clear prompt you can hand to your in-project agent.

It is framed to preserve the current raster capabilities while refactoring them into the architecture you want: ownership, geometry, transitions, and styles separated by contract, with raster-derived geometry made maximally compatible with vector geometry where possible.[^1][^2][^3]

***

## Prompt for in-project agent

You are refactoring the territory system toward a strict multi-layer architecture. The current codebase contains both vector/polygon pipelines and raster/field-based renderers. The raster family currently mixes ownership computation, geometry extraction, transition behavior, and final rendering inside renderer files. We need to preserve all current capabilities, but reorganize them so they cleanly fit the architecture and contracts below.[^4][^2][^5][^1]

### Architectural intent

We want a clean four-layer model:

1. **Ownership**
2. **Geometry**
3. **Transitions**
4. **Render styles / appearance**

The current V3.1 architecture already formalizes the idea that styles render canonical data, while fill and border transitions transform canonical data. The current geometry contracts also already define snapshot-style geometry outputs like territory regions, frontier polylines, world-border polylines, and a shared frontier map.[^3][^1]

The main refactor goal is:

- Preserve what raster modes currently provide.
- Separate their concerns into the correct architecture layers.
- If a raster mode emits geometry, normalize that geometry so it is maximally compatible with vector geometry output.
- Keep provenance and reliability explicit, so raster-derived geometry is not falsely treated as identical to vector-native geometry.
- Enable future interchangeability or hybrid rendering paths between vector-native and raster-derived outputs.[^2][^1][^3]

***

### Key conceptual definitions

Use these terms consistently in code comments, type names, and design decisions.

#### Ownership-field engine

An ownership-field engine computes **who owns each sampled location in space** over the map. It does not directly define final appearance, and it does not necessarily produce polygons. Its primary output is an ownership field over a grid/texture/sample domain.

Examples already present in the codebase:

- Pixel renderer computes per-pixel ownership from distance plus corridor/lane effects.[^6]
- Graph renderer computes ownership with barrier-aware logic.[^7]
- Lane renderer computes lane-influenced ownership.[^8]
- DistanceField renderer computes a deterministic ownership render texture and related distance/border fields.[^4]


#### Emit derived contours in addition to textures

This means: after computing a sampled ownership field, add an explicit geometry extraction step that traces boundaries and emits vector-style outputs such as:

- polygons,
- shells,
- shell loops,
- frontier polylines,
- world-border polylines.

Contour already demonstrates this pattern by extracting marching-squares polygons from sampled ownership data and drawing them as vector graphics.[^5]

#### Raster mode distinction

A raster mode can do one or more of the following, but these are distinct concerns and must not stay conflated:

- compute ownership,
- extract geometry from sampled ownership,
- perform transition/morph logic,
- render final appearance.

DistanceField currently spans several of these concerns at once, including ownership textures, boundary-distance fields, temporal blending, and vector border extraction paths. Contour computes sampled ownership and extracts geometry. Pixel/Graph/Lane mostly compute sampled ownership and render textures directly.[^5][^6][^7][^8][^4]

***

### Core design decision

Treat the codebase as having **two fundamentally different territory computation families**:

1. **Vector-native geometry family**
    - Produces canonical geometry directly.
    - Includes shells, loops, frontiers, world borders, shared frontier structure, etc.[^2][^3]
2. **Raster/field ownership family**
    - Produces sampled ownership fields.
    - May optionally derive canonical geometry from those fields.
    - May render directly from the field as a style path.[^4][^2][^5]

We are **not** deleting raster methods simply because they are raster. We are preserving them, but putting them in the correct layer and contract.

***

### Refactor target

Implement or prepare for these first-class contracts.

#### 1. OwnershipFieldSnapshot

Create a contract for sampled ownership output. This should be a first-class product of raster ownership engines.

It must include at minimum:

- version
- ownershipVersion
- family = `'raster'`
- strategy = `'distance' | 'graph' | 'lane' | 'contour' | 'sdf'`
- world/sample bounds
- grid/sample metadata
- owner ids and owner-index mapping
- owner-index grid

It should optionally include:

- confidence grid
- nearest-boundary distance field
- second-best delta or similar ambiguity metric
- barrier/lane metadata
- virtual site count
- diagnostics/fingerprints/provenance

Use the existing DistanceField concepts like ownership snapshot id, owner grid, geometry/topology/visual fingerprints, and owner-grid metadata as guidance for what provenance/diagnostics matter.[^4]

#### 2. CanonicalGeometrySnapshot

Replace or enrich the current `GeometrySnapshot` so that it can serve both vector-native and raster-derived geometry in one normalized form.[^3]

This output must support, at minimum:

- territory regions
- frontier polylines
- world-border polylines
- shared frontier map
- shells
- shell loops

It must also include:

- geometry family: `'vector-native' | 'raster-derived'`
- source method / provenance
- confidence values
- topology/identity/closure reliability flags
- optional extraction metadata (sample grid, simplify tolerance, smoothing passes, etc.)

Use the existing geometry contracts and canonical shell/loop ideas as the basis.[^1][^3]

#### 3. Raster geometry extraction stage

Create a clean stage that converts an `OwnershipFieldSnapshot` into a `CanonicalGeometrySnapshot`.

This should support methods like:

- marching squares
- owner-boundary tracing
- centerline/frontier tracing
- none

Contour’s marching-squares polygon extraction is the clearest existing precedent. DistanceField’s vector border extraction and owner-grid-to-frontier work also indicate useful extraction paths.[^5][^4]

#### 4. Transition separation

Move transition behavior out of renderer-centric implementations and into explicit transition-layer contracts.

The architecture already defines:

- `TerritoryStyle`
- `FillTransition`
- `BorderTransition`

and makes clear that transitions transform data while styles render it.[^1]

Preserve raster transition capabilities, but split them into:

- **field-level transitions**, for cases where the raster field itself is the most natural substrate;
- **geometry-level transitions**, only when derived geometry is reliable enough.

DistanceField temporal blending is a field-level transition example that should be preserved conceptually, but relocated to the transition layer rather than remaining coupled to final rendering.[^4]

***

### Compatibility rules

When raster-derived geometry is produced, make it **maximally compatible** with vector geometry output, but not dishonestly “equivalent.”

Adopt these rules:

- Same owner-id semantics everywhere.
- Same world-boundary semantics everywhere (for example `__world__` or an equivalent explicit convention).
- Same shell / loop / frontier vocabulary across both families.
- Same top-level geometry object shape for vector-native and raster-derived outputs.
- Explicit provenance on every geometry snapshot.
- Explicit reliability/quality flags on topology, closure, and identity.
- Stable ids only when justified by confidence/reliability; otherwise ids may be snapshot-local.

The goal is compatibility of contracts and downstream consumers, not pretending sampled contours are identical in fidelity to vector-native geometry.

***

### What must be preserved

Do **not** accidentally simplify away valuable behavior.

Preserve these capabilities from raster modes:

- Pixel-family ownership style and feel.[^6]
- Graph barrier semantics.[^7]
- Lane influence semantics.[^8]
- Contour boundary extraction and vector-contour look.[^5]
- DistanceField fill/border appearance, ownership RT logic, boundary-distance field logic, and its ability to derive or overlay vector borders.[^4]

Preserve these architectural strengths from the existing non-raster side:

- territory regions,
- frontier polylines,
- world-border polylines,
- shared-frontier map,
- shells and shell loops,
- canonical-data-first rendering and transitions.[^2][^3][^1]

***

### Deliverables

Please produce the following, in order.

#### A. Contract proposal

Write a precise proposal for:

- `OwnershipFieldSnapshot`
- `CanonicalGeometrySnapshot`
- `RasterGeometryExtractionInput`
- `RasterGeometryExtractor`
- any revised `GeometryMode` / `OwnershipMode` / `RasterDerivedGeometryMode` interfaces

Use TypeScript interfaces and unions. Keep naming coherent with the existing codebase.

#### B. Mapping table

Provide a mapping from each existing renderer/mode into the new architecture:

- what layer(s) it currently spans,
- what it should become after refactor,
- what code can remain,
- what code should move,
- what code should be deleted or deprecated.

Include at least:

- Pixel
- Graph
- Lane
- Contour
- DistanceField
- existing vector geometry path(s)


#### C. Refactor plan

Provide a staged migration plan with low-risk sequencing. It should include:

1. Introduce new contracts without breaking current runtime.
2. Wrap existing raster implementations behind ownership-field outputs.
3. Add raster-to-geometry extraction path.
4. Update styles and transitions to consume the new canonical products.
5. Remove obsolete bridges and renderer-layer coupling.

#### D. Concrete file recommendations

Recommend likely file/module boundaries, including what new files should exist and what old files should be split or reduced.

#### E. Risk notes

Call out the main risks, especially:

- over-coupling raster-derived geometry to assumptions that only hold for vector-native geometry,
- unstable ids,
- topology ambiguity at low grid resolution,
- transition mismatch between field-level and geometry-level representations,
- unnecessary duplication between vector and raster code paths.

***

### Constraints

- Do not propose a vague rewrite. Be concrete.
- Do not collapse ownership, geometry, transitions, and appearance back into renderer classes.
- Do not remove raster modes simply because they are raster.
- Do not treat raster-derived geometry as authoritative without provenance and reliability flags.
- Prefer contract-first refactoring that allows incremental migration.
- Preserve future support for interchangeable or hybrid rendering methods.

***

### Existing codebase facts to honor

- `GeometrySnapshot` already includes territory regions, frontier polylines, world-border polylines, and shared frontier map.[^3]
- `CanonicalTerritoryData` already centers shells and shell loops as the data consumed by styles and transitions.[^1]
- Contour extracts polygons from ownership boundaries using marching squares and renders them as vector graphics.[^5]
- DistanceField already contains ownership texture logic, boundary-distance field logic, temporal blending, and vector-border extraction concepts.[^4]
- The current system is best understood as two fundamental families: vector-native geometry and raster/field ownership sampling.[^2]

***

### Output format

Return your answer in these sections:

1. `Recommended contracts`
2. `Architecture mapping`
3. `Migration plan`
4. `File/module plan`
5. `Risks and guardrails`

Use TypeScript code blocks where appropriate. Be decisive rather than exploratory.

***

If you want, I can also produce a **second version of this prompt** that is more forceful and implementation-directed, with less background and more “do this, not that.”

<div align="center">⁂</div>

[^1]: orchestrator_renderMode.txt

[^2]: GEOMETRY_CONSOLIDATION_ANALYSIS.md

[^3]: contract_GeometryContracts.txt

[^4]: renderer_DistanceFieldTerritoryRenderer.txt

[^5]: renderer_ContourTerritoryRenderer.txt

[^6]: renderer_PixelTerritoryRenderer.txt

[^7]: renderer_GraphTerritoryRenderer.txt

[^8]: renderer_LaneTerritoryRenderer.txt

