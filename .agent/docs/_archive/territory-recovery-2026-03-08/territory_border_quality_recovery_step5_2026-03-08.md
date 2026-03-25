# Border Quality Recovery - Step 5 (2026-03-08)

## Scope
- Milestone: Step 5 from `Border Quality Recovery Plan`.
- Goal: add mesh-border morph interpolation and local fallback behavior without regressing fill alignment.

## Implemented
1. Mesh morph interpolation wiring:
- Added previous-position vertex attribute support in `strokeMeshBorders.ts` (`aPrevPosition`).
- Added shader uniform `uMorphMix` and vertex-space interpolation `mix(aPrevPosition, position, uMorphMix)`.
- Exposed `morphMix` in `createStrokeMeshShader(...)` options.

2. Stable correspondence in renderer:
- `DistanceFieldTerritoryRenderer.ts` now stores per-pair mesh records with deterministic pair key and geometry positions.
- On mesh geometry rebuild, the renderer attempts per-pair correspondence by matching owner-pair key and vertex count.
- Matched pairs lerp from previous geometry to current geometry using `uMorphMix`.

3. Local fallback ladder (per-pair, not global pop):
- For owner pairs without reliable correspondence during active morph, mesh visibility is suppressed for that pair only.
- A dedicated fallback graphics overlay draws only those pair polylines during the morph window.
- All other owner pairs remain on the mesh path, preventing full-scene fallback/pop.

4. Shared polyline draw utility:
- Extracted deterministic polyline drawing into `drawVectorPolylines(...)`.
- Reused for legacy vector path and mesh local fallback path, keeping color/width/softness behavior consistent.

## Non-Goals in this step
- No UI panel changes (handled in Step 6).
- No curved/segmented mesh family implementation.

## Validation notes
- Expected behavior: during ownership topology changes, mesh borders morph smoothly where correspondence is stable.
- Expected fallback behavior: only unstable owner-pair segments use fallback overlay; no global border renderer pop.