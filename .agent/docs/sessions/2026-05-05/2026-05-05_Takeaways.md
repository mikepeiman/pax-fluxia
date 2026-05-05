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
6. `virtualStars` are not a valid shared PV transition primitive. Their remaining live role is narrow collapse-center lookup, which should be removed from shared transition truth.
7. Region birth is always invalid. Region collapse is only legitimate when the final star set of a region is conquered on that tick.
8. `GameCanvas` manufacturing field-family transition truth is an architectural violation, not a harmless convenience.
9. The existing topology layer already has the right coarse structural unit for transition work: sections between 3-way or world-edge junctions. The deficiency is missing influence attribution, not missing sections.
10. The current DX implementation is midpoint-oriented but still only a virtual-site heuristic. The user's proposed disconnect-zone construction is a stronger explicit geometry-stage concept.
11. The recovery plan needs an explicit casebook gate and more exact shared-truth definitions, otherwise an implementer would still be forced to improvise in the critical transition and DX stages.

## Architectural Read

- One ownership stage should feed one shared stable-geometry stage.
- One transition-truth stage should feed multiple substrates:
  - frontier topology transport
  - perimeter V-sets
  - grid classification / wave timing
- `GameCanvas` should not be inventing transition truth for a subset of render families.
- `borderFrame` should either become truthful shared moving-border output or be removed from the contract. The current "always empty" state is not a good end state.

## Definitions That Must Stay Straight

- `bundle` = in-memory recorder artifact
- `package` = exported diagnostic artifact created from a bundle
- `anchorKey` = stable-anchor pair key
- `change anchors` = local motion endpoints inside an anchor-bounded chain
- `envelope` = transition lifecycle/timing record, not geometry
- `foundational section` = the border section between two structural junctions, especially 3-way and world-edge junctions

## Newly Reaffirmed User Rules

- “Canonical” is not acceptable dialogue or semantic naming.
- A centroid cannot be the region ID.
- Identity must not be derived from boundary shape in a way that guarantees churn during ordinary conquest changes.
- Do not anthropomorphize code in user-facing explanations.
- Versioned plan docs belong in the dated `sessions/` directory when direction changes materially.

## Next Useful Technical Steps

1. Remove centroid-based region identity from the vector geometry compiler.
2. Replace stale `pvv2:` residue from geometry/topology version strings.
3. Expand the diagnostic export pipeline to include:
   - raw frame input
   - full ownership snapshots
   - full transition runtime snapshot
4. Separate semantic IDs from coordinates for topology vertices and sections.
5. Remove field-family truth reconstruction from `GameCanvas` and route all render modes through one shared ownership and geometry pipeline.
6. Rebuild PV active-front planning around explicit stable anchors, explicit change anchors, and explicit split handling at 3-way junctions.
7. Add deterministic per-section/per-point star influence attribution so per-conquest changed-frontier selection can be bounded locally from star ownership and topology, not only from distance heuristics.
8. Rework DX from a pure virtual-site heuristic toward an explicit disconnect-zone construct with tunable depth/width and mode-consistent fill styling.
9. Add a v3 plan that explicitly defines:
   - foundational section
   - eligible frontier envelope for a conquest
   - DX zone descriptor
   - no-motion-before-casebook rule

## Additional Constraint / Diagnostics Lessons

12. `MSR` and `starWeight` must be separated. The current code still treats them as partially conflated, which makes the tuning surface semantically false.
13. `CX` and the contested cross-owner lane-pair path are not the same constraint. They need separate names, separate descriptors, and separate tunables.
14. `DX` is still only a midpoint-oriented virtual-site heuristic in live code. The target model is an explicit disconnect-zone descriptor in shared geometry truth.
15. The current virtual-site generators can remain temporarily as compiler adapters, but they must not remain the primary semantic definition of `CX`, `LP`, `DX`, or `MSR`.
16. Eliminating accidental snap requires a diagnostics mode that freezes on unclassified foundational sections rather than letting classification holes fall through silently.
17. A classified explicit snap and an unclassified boundary failure are not the same thing. Only the latter should trigger the freeze-on-unclassified diagnostics mode.

## Corrections To The Previous Take

18. Snap is not a valid target classification or fallback in this workstream. If snap occurs, it is treated as evidence of an unclassified or otherwise defective boundary/transition case.
19. The current `starMargin` control is not to be thrown away. Its utility remains as the current base site-weight control pending semantic normalization.
20. `MSR` must be defined plainly:
    - it is a keep-out radius around each star
    - boundaries must stay outside it
    - non-origin lane and supplemental geometry samples must stay outside it
