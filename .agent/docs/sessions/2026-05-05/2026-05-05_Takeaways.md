# 2026-05-05 Takeaways

## Key Lessons

1. The current vector geometry path still uses a centroid-derived region ID heuristic. That is not a cosmetic naming issue; it is a continuity failure.
2. The `pvv2:` tag in geometry/topology versions is stale fingerprint residue. It is misleading and should be removed, but it does not prove the old PVV2 renderer is active.
3. The exported diagnostics stack is too late in the pipeline:
   - it captures normalized truth
   - then compacts it further
   - it does not preserve raw `stars[]`, `lanes[]`, or full frame input
4. Coordinate-composite IDs are active throughout topology and transition diagnostics. They are technically IDs, but they are semantically poor and hinder reasoning.
5. `animated_fronts` is a classifier of planner activity, not a quality judgment.

## Architectural Read

- One ownership stage should feed one shared stable-geometry stage.
- One transition-truth stage should feed multiple substrates:
  - frontier topology transport
  - perimeter V-sets
  - grid classification / wave timing
- `GameCanvas` should not be inventing transition truth for a subset of render families.

## Definitions That Must Stay Straight

- `bundle` = in-memory recorder artifact
- `package` = exported diagnostic artifact created from a bundle
- `anchorKey` = stable-anchor pair key
- `change anchors` = local motion endpoints inside an anchor-bounded chain

## Newly Reaffirmed User Rules

- “Canonical” is not acceptable dialogue or semantic naming.
- A centroid cannot be the region ID.
- Identity must not be derived from boundary shape in a way that guarantees churn during ordinary conquest changes.

## Next Useful Technical Steps

1. Remove centroid-based region identity from the vector geometry compiler.
2. Replace stale `pvv2:` residue from geometry/topology version strings.
3. Expand the diagnostic export pipeline to include:
   - raw frame input
   - full ownership snapshots
   - full transition runtime snapshot
4. Separate semantic IDs from coordinates for topology vertices and sections.
