# Territory Canonical Frontier, Border, and Fill Plan

## 1. Problem Statement

The current `mesh` border path is not canonical-quality because it derives centerlines from a rasterized ownership lattice (`ownerGrid`), not from the true ownership frontier in world space.

That means it can only produce the centerline of a staircase approximation, not the true territorial frontier. Mesh rendering on top of that source cannot satisfy the required spec:

- even-width,
- smooth-edged,
- SVG-like,
- centered on the true interface,
- invariant to grid and straighten tuning.

## 2. Canonical Architectural Decisions

1. `ownerGrid` centerline extraction is legacy only.
2. Canonical borders derive from a new `FrontierGraph` in world space.
3. Canonical fills derive from the same frontier geometry as canonical borders.
4. Legacy field and grid engines remain in product as references and fallbacks.
5. Fade-blend conquest remains a separate selectable mode with its own controls.
6. Future boundary-morph is a separate selectable mode, not a replacement for fade-blend.

## 3. Legacy Reclassification

The current file and function are reclassified as legacy:

- `centerlineGraph.ts` becomes legacy-only.
- exported function renamed to:
  - `buildLegacyCenterlineGraphsFromOwnerGrid(...)`
- file rename recommended:
  - `centerlineGraph.ts` -> `ownerGridCenterlineLegacy.ts`
- top-of-file banner must state:
  - this path extracts centerlines from a raster ownership lattice,
  - it is not canonical,
  - it is kept only for debugging, reference, and legacy engine behavior.

Canonical mode must never call the legacy builder.

## 4. Canonical Frontier Types

Create `frontierGraph.ts` with canonical world-space frontier structures.

Required type intent:

- `FrontierNode`
- `FrontierEdge`
- `FrontierGraph`

Refinements required beyond the provided draft:

- owner labels must match renderer owner indices and canonical owner ordering,
- IDs must be structurally stable,
- lane-sourced nodes must carry lane identity and parametric order info,
- field-sourced nodes must carry deterministic region and source metadata.

Recommended metadata:

- `pairId`
- `source: 'lane' | 'field'`
- `sourceRef`
- `sortKey` or `t`
- stable structural ID independent of transient float formatting

## 5. Canonical Frontier Builder

Add:

- `buildFrontierGraphFromGraph(...)`

This builder is the canonical frontier API.

### Stage 2A

- Build lane frontiers analytically from graph distances and lane geometry.
- Do not depend on `ownerGrid`.
- Do not depend on ownership RT.
- Use exact or piecewise-exact root solving for equal-distance points along lanes.
- Do not use a coarse fixed-step scan as the primary canonical method.

Candidate-owner rule:

- canonical implementation must use either:
  - all owners, or
  - a mathematically justified pruning rule.
- Do not rely on endpoint `best/second` pruning unless formally justified.

### Stage 2B

- Extend the frontier graph with field and interstitial frontier sampling from the ownership field using sub-texel interpolation.
- This stage is required for full-plane canonical quality.
- Lane-only frontier is useful and correct as a partial source, but not sufficient as the final full-plane border source.

## 6. Canonical Mesh Pipeline

Canonical mesh mode must route:

- `FrontierGraph` -> ordered owner-pair polylines -> straight-family fitter -> stroke mesh builder

Rules:

- no canonical path may call `buildLegacyCenterlineGraphsFromOwnerGrid`
- no canonical border geometry may depend on vector-grid or vector-straighten settings
- stroke mesh remains centered on the frontier
- AA and softness are shader cross-section properties, not boundary-location hacks

## 7. Canonical Fill Backfill

Canonical visible fills must be generated from the same frontier geometry:

- derive region polygons or equivalent bounded fill geometry from the frontier graph and world bounds,
- render fills from those regions,
- ensure visible fill edge and visible border centerline share one geometric truth.

The ownership RT remains useful for:

- solver substrate,
- field and interstitial sampling,
- diagnostics,
- fade-blend bridge,

but not as the final visible edge truth in canonical mode.

## 8. Morph Modes

The system ships with distinct conquest modes:

- `Fade Blend`
- `Boundary Morph`

### Fade Blend

- preserved from current work,
- user-selectable,
- has its own timing and easing controls.

### Boundary Morph

- future canonical geometry-mode conquest animation,
- uses stable frontier and mesh correspondence IDs,
- local fallback only where correspondence fails.

Optional hybrid layering may exist later, but is not required for this milestone.

## 9. Acceptance Criteria

Canonical mode is correct only when:

- borders are visually even-width and centered on the true interface,
- border quality does not materially change when grid and straighten legacy settings are changed,
- fill and border cannot drift because they share the same frontier geometry,
- legacy and canonical modes are visibly distinct:
  - canonical = clean vector-like frontier,
  - legacy = staircase and lattice-derived frontier,
- lane-only canonical diagnostic mode can show graph-aligned frontiers without RT,
- full canonical mode includes interstitial frontier completion for whole-map correctness.

## 10. Failure Analysis and Guardrails

This failure came from satisfying the word `centerline` using the nearest available structure rather than the correct source of truth.

Guardrails:

- Canonical border code must never derive from ownership-cell transitions.
- Any bridge path reusing sampled ownership geometry must be explicitly labeled legacy or experimental.
- A mesh renderer is not considered canonical merely because it uses triangles; canonical status depends on the frontier source.
- Future math-critical steps must include:
  - source-of-truth definition,
  - forbidden shortcut list,
  - proof or rationale for candidate pruning,
  - acceptance criteria that would expose the nearest wrong implementation.

## 11. Cross-Document Execution Order

1. Execute the liveness and settings recovery document first:
   - restore state trust and renderer liveness.
2. Then execute this document:
   - reclassify legacy path,
   - add canonical frontier graph,
   - build analytic lane frontier,
   - add field and interstitial frontier,
   - route canonical mesh through the new frontier graph,
   - backfill canonical fills from the same geometry.
3. Only after canonical straight-family success:
   - revisit DX, corridors, and MSR against the new canonical frontier.
4. Then add true boundary-morph mode while preserving fade-blend.

## 12. Assumptions and Defaults

- Fade-blend and boundary-morph are separate conquest modes.
- Legacy border engines remain visible and selectable as references.
- The current mesh-grid path is not canonical and must not be treated as the final-quality solution.
- Lane-analytic frontier is mandatory.
- Field and interstitial frontier completion are mandatory before claiming spec-complete canonical borders and fills.