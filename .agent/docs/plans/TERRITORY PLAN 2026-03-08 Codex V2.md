## Filesystem-Ready Planning Docs for Territory Recovery

### Summary
Prepare two permanent planning documents for the next execution pass:

1. `territory_liveness_and_settings_recovery_2026-03-08.md`
2. `territory_canonical_frontier_border_fill_plan_2026-03-08.md`

Each document must also be mirrored into:
- `.agent/WIP Work-In-Progress/permanent-references/territory/`

These two docs are the authoritative recovery package:
- Doc 1 restores trust in state flow, reactivity, and renderer liveness.
- Doc 2 replaces the wrong canonical border source with a true geometry-first frontier pipeline.

### Document 1
**Title:** Territory Liveness and Settings Recovery Plan  
**Filename:** `.agent/WIP Work-In-Progress/territory_liveness_and_settings_recovery_2026-03-08.md`

**Document content to write:**

#### 1. Problem Statement
The current territory system is not trustworthy in live operation:
- the simulation advances but territory visuals can remain stale,
- territory settings do not reliably update the live render,
- theme/sub-theme synchronization is not guaranteed to keep panel state and runtime state aligned,
- the settings architecture is partially migrated, with both canonical and legacy sync paths active.

#### 2. Current Diagnosis
The settings system is mixed:
- canonical mutation helpers exist in `settingsState.ts`:
  - `setSetting`
  - `setManySettings`
- legacy broad replay/sync helpers still exist and are still used:
  - `applyPanelToConfig`
  - `syncPanelFromConfig`
  - large manual `syncAllFromConfig` in `GameSettingsPanel.svelte`

The renderer already attempts:
- geometry/topology/visual invalidation classification,
- ownership texture ping-pong,
- fill morph blending,
- border-path rebuild throttling.

But the end-to-end chain is not reliable because the state architecture is not singular.

#### 3. Canonical State Contract
The only valid mutation path from UI and theme application is:
- `setSetting(key, value)`
- `setManySettings(patch)`

Rules:
- UI templates read from `panel.*`, never from `GAME_CONFIG`.
- UI events write through `setSetting` only.
- Theme/sub-theme apply writes through `setManySettings` only.
- No territory control may directly call `applyPanelToConfig`.
- No territory theme sync may depend on a manual territory-specific object copy inside `syncAllFromConfig`.
- `GAME_CONFIG` remains the runtime compatibility read target during the bridge, but it is not the source of reactive UI truth.

#### 4. Recovery Work
1. Instrument the full liveness chain:
- panel input value,
- `setSetting` / `setManySettings` application,
- `GAME_CONFIG` applied value,
- renderer `geometry/topology/visual` classification,
- ownership RT rebuild,
- ownership RT reuse,
- border geometry rebuild,
- uniform-only style update,
- morph state transition.

2. Remove mixed territory-state paths:
- territory controls stop using broad replay sync,
- territory theme sync becomes schema-driven through `PANEL_CONFIG_MAP` and `setManySettings`,
- territory reset/default flows use the same canonical path.

3. Reduce theme and sync drift:
- replace manual territory field copies inside `syncAllFromConfig`,
- use schema-driven sync for all territory keys,
- ensure new territory keys cannot be added without schema coverage.

4. Add development guards:
- warn when a territory UI control writes `GAME_CONFIG` outside the canonical setting API,
- warn when a territory key exists in schema but is missing from panel sync coverage.

#### 5. Acceptance Criteria
- Changing any territory slider or toggle updates the territory visuals immediately.
- Territory visuals update when conquest/tick changes occur, without requiring a slider interaction.
- Theme/sub-theme apply updates both panel and runtime territory state atomically.
- No territory control depends on manual direct `GAME_CONFIG` writes from the component layer.
- Telemetry can distinguish:
  - topology rebuild,
  - geometry rebuild,
  - visual-only uniform update,
  - stale/no-op frame.

#### 6. Failure Analysis and Guardrails
This failure was caused by a half-migrated settings architecture.
Guardrails:
- No mixed canonical + legacy mutation path in production territory controls.
- No large manual sync object for territory keys.
- No new territory control ships without schema mapping and canonical mutation coverage.
- No render bug may be diagnosed until the state path is provably singular.

### Document 2
**Title:** Territory Canonical Frontier, Border, and Fill Plan  
**Filename:** `.agent/WIP Work-In-Progress/territory_canonical_frontier_border_fill_plan_2026-03-08.md`

**Document content to write:**

#### 1. Problem Statement
The current “mesh” border path is not canonical-quality because it derives centerlines from a rasterized ownership lattice (`ownerGrid`), not from the true ownership frontier in world space.

That means it can only produce the centerline of a staircase approximation, not the true territorial frontier. Mesh rendering on top of that source cannot satisfy the required spec:
- even-width,
- smooth-edged,
- SVG-like,
- centered on the true interface,
- invariant to grid/straighten tuning.

#### 2. Canonical Architectural Decisions
1. `ownerGrid` centerline extraction is legacy only.
2. Canonical borders derive from a new `FrontierGraph` in world space.
3. Canonical fills derive from the same frontier geometry as canonical borders.
4. Legacy field/grid engines remain in product as references/fallbacks.
5. Fade-blend conquest remains a separate selectable mode with its own controls.
6. Future boundary-morph is a separate selectable mode, not a replacement for fade-blend.

#### 3. Legacy Reclassification
The current file and function are reclassified as legacy:
- `centerlineGraph.ts` becomes legacy-only.
- exported function renamed to:
  - `buildLegacyCenterlineGraphsFromOwnerGrid(...)`
- file rename recommended:
  - `centerlineGraph.ts` -> `ownerGridCenterlineLegacy.ts`
- top-of-file banner must state:
  - this path extracts centerlines from a raster ownership lattice,
  - it is not canonical,
  - it is kept only for debugging/reference/legacy engine behavior.

Canonical mode must never call the legacy builder.

#### 4. Canonical Frontier Types
Create `frontierGraph.ts` with canonical world-space frontier structures.

Required type intent:
- `FrontierNode`
- `FrontierEdge`
- `FrontierGraph`

Refinements required beyond the provided draft:
- owner labels must match renderer owner indices / canonical owner ordering,
- IDs must be structurally stable,
- lane-sourced nodes must carry lane identity and parametric order info,
- field-sourced nodes must carry deterministic region/source metadata.

Recommended metadata:
- `pairId`
- `source: 'lane' | 'field'`
- `sourceRef`
- `sortKey` or `t`
- stable structural ID independent of transient float formatting

#### 5. Canonical Frontier Builder
Add:
- `buildFrontierGraphFromGraph(...)`

This builder is the canonical frontier API.

Stage 2A:
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

Stage 2B:
- Extend the frontier graph with field/interstitial frontier sampling from the ownership field using sub-texel interpolation.
- This stage is required for full-plane canonical quality.
- Lane-only frontier is useful and correct as a partial source, but not sufficient as the final full-plane border source.

#### 6. Canonical Mesh Pipeline
Canonical mesh mode must route:
- `FrontierGraph` -> ordered owner-pair polylines -> straight-family fitter -> stroke mesh builder

Rules:
- no canonical path may call `buildLegacyCenterlineGraphsFromOwnerGrid`
- no canonical border geometry may depend on vector-grid or vector-straighten settings
- stroke mesh remains centered on the frontier
- AA/softness is a shader cross-section property, not a boundary-location hack

#### 7. Canonical Fill Backfill
Canonical visible fills must be generated from the same frontier geometry:
- derive region polygons or equivalent bounded fill geometry from the frontier graph and world bounds,
- render fills from those regions,
- ensure visible fill edge and visible border centerline share one geometric truth.

The ownership RT remains useful for:
- solver substrate,
- field/interstitial sampling,
- diagnostics,
- fade-blend bridge,
but not as the final visible edge truth in canonical mode.

#### 8. Morph Modes
The system ships with distinct conquest modes:
- `Fade Blend`
- `Boundary Morph`

`Fade Blend`:
- preserved from current work,
- user-selectable,
- own timing/easing controls.

`Boundary Morph`:
- future canonical geometry-mode conquest animation,
- uses stable frontier/mesh correspondence IDs,
- local fallback only where correspondence fails.

Optional hybrid layering may exist later, but is not required for this milestone.

#### 9. Acceptance Criteria
Canonical mode is correct only when:
- borders are visually even-width and centered on the true interface,
- border quality does not materially change when grid/straighten legacy settings are changed,
- fill and border cannot drift because they share the same frontier geometry,
- legacy and canonical modes are visibly distinct:
  - canonical = clean vector-like frontier,
  - legacy = staircase/lattice-derived frontier,
- lane-only canonical diagnostic mode can show graph-aligned frontiers without RT,
- full canonical mode includes interstitial/frontier completion for whole-map correctness.

#### 10. Failure Analysis and Guardrails
This failure came from satisfying the word `centerline` using the nearest available structure rather than the correct source of truth.

Guardrails:
- Canonical border code must never derive from ownership-cell transitions.
- Any bridge path reusing sampled ownership geometry must be explicitly labeled legacy/experimental.
- A mesh renderer is not considered canonical merely because it uses triangles; canonical status depends on the frontier source.
- Future math-critical steps must include:
  - source-of-truth definition,
  - forbidden shortcut list,
  - proof or rationale for candidate pruning,
  - acceptance criteria that would expose the nearest wrong implementation.

### Cross-Document Execution Order
1. Execute Document 1 first:
- restore state trust and renderer liveness.
2. Then execute Document 2:
- reclassify legacy path,
- add canonical frontier graph,
- build analytic lane frontier,
- add field/interstitial frontier,
- route canonical mesh through new frontier graph,
- backfill canonical fills from same geometry.
3. Only after canonical straight-family success:
- revisit DX, corridors, MSR against the new canonical frontier.
4. Then add true boundary-morph mode while preserving fade-blend.

### Assumptions and Defaults
- Fade-blend and boundary-morph are separate conquest modes.
- Legacy border engines remain visible/selectable as references.
- The current mesh-grid path is not canonical and must not be treated as the final-quality solution.
- Lane-analytic frontier is mandatory.
- Field/interstitial frontier completion is mandatory before claiming spec-complete canonical borders/fills.
