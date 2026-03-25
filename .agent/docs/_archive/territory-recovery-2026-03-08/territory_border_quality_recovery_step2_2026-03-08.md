# Border Quality Recovery - Step 2 (2026-03-08)

## Scope
Commit 2 of the Border Quality Recovery Plan:
- centerline graph extraction module
- deterministic IDs and ordering

## Implemented
1. Added new module:
- `src/lib/renderers/centerlineGraph.ts`

2. Introduced internal centerline graph contracts:
- `CenterlineNode`
- `CenterlineGraphPair`
- deterministic `pairId` and `node.id`

3. Extracted ownership-grid -> centerline graph logic from DF renderer:
- `buildCenterlineGraphsFromOwnerGrid(ownerGrid, gridW, gridH)` now lives in `centerlineGraph.ts`
- module now emits stable structures suitable for future mesh and family fitters

4. Determinism controls added in extraction path:
- owner pairs sorted by pair id
- node ids are stable (`node:pair:a:b:x:y`)
- adjacency neighbor lists sorted by grid position

5. Updated DF renderer to consume extracted graphs:
- imports `buildCenterlineGraphsFromOwnerGrid`
- straight polyline fitting now resolves world coordinates via node map, not string-parsed coordinates
- traversal vertex order is explicitly sorted

## Runtime Behavior
- No intentional visual behavior change in this step.
- This is architecture extraction + deterministic ordering groundwork for the mesh pipeline.

## Verification
- `bun run check` still reports existing project-wide diagnostics not introduced by this step.
- No diagnostics were reported for:
  - `DistanceFieldTerritoryRenderer.ts`
  - `centerlineGraph.ts`

## Next Step
Step 3: introduce straight fitter + stroke-mesh builder + shader path (first clean border backend).
