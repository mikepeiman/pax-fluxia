# Border Quality Recovery - Step 3 (2026-03-08)

## Scope
Commit 3 of the Border Quality Recovery Plan:
- straight fitter module
- stroke-mesh builder
- stroke-mesh shader

## Implemented
1. Added new module:
- `src/lib/renderers/strokeMeshBorders.ts`

2. Added straight fitter contract + implementation:
- `fitStraightPathsFromCenterlineGraphs(graphs, options)`
- deterministic path traversal and stable path IDs (`pair:path:index`)
- bounded simplify/linearize passes with alignment tolerance cap

3. Added stroke mesh geometry builder:
- `buildStrokeMeshGeometryBuffers(paths, options)`
- centered strip geometry with miter-join handling and miter-limit clamp
- outputs typed buffers for positions / side attribute / indices

4. Added PIXI geometry helper:
- `createStrokeMeshGeometry(paths, options)`

5. Added stroke mesh shader pipeline:
- custom shader bit with side-based cross-section AA control
- `createStrokeMeshShader({ color, alpha, width, softness })`
- uses `compileHighShaderGlProgram` + `localUniformBitGl`

## Runtime Behavior
- No runtime routing changes in this step.
- Mesh border backend components are now available for integration in step 4.

## Notes
- Builder currently emits a high-quality centered strip base; explicit round-cap/round-join refinement is tracked for follow-up extension work.

## Verification
- `bun run check` continues to report existing project-wide diagnostics not introduced by this step.
- No diagnostics were reported for:
  - `strokeMeshBorders.ts`
  - `DistanceFieldTerritoryRenderer.ts`
  - `centerlineGraph.ts`

## Next Step
Step 4: integrate mesh mode into DF border routing and add center-stroke alignment contract checks.
