<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# I want your focus purely on the geometry compute now. I appreciate the render ideas feedback, but I favor keeping our prior focus for a number of reasons. I do definitely want to try those different methods.

For now, review this summary from another agent and then provide your conclusions on what should be done to completely refactor, consolidate, synthesize, and clean up all geometry work in the game.

My conclusion is: you should collapse the game’s **vector geometry compute** to one canonical compiler pipeline, keep FG2’s topological ideas but not FG2 as a parallel engine, and delete every alternate vector entrypoint once the canonical output is rich enough. That is the cleanest path supported by the files you shared.[^1][^2][^3]

## Core conclusion

The other agent’s summary is basically right on the important point: for vector territory geometry, you do **not** have several truly different geometry methods; you mostly have one weighted-Voronoi-based compute family expressed through multiple generators, modes, orchestrators, and renderer-side reimplementations. `computeGeometry0319()` is already the strongest current foundation because it fixes world-boundary handling, builds fills from chained frontiers, emits a `frontierMap`, and supports extra/ghost sites without involving rendering concerns.[^2][^3][^1]

So the target should be:

- one **canonical vector compiler**,
- one **rich canonical geometry result type**,
- zero renderer-owned geometry logic,
- zero duplicate vector “modes” that only toggle config booleans.[^4][^1]


## What should be kept

Keep `computeGeometry0319()` as the base compute path, because it is already a superset of the older generator in the areas that matter most: complete owner-world boundary extraction, unified frontier chaining, fill construction from borders, canonical frontier-map emission, and closure diagnostics. Keep the low-level reusable helper functions from `powerVoronoiTerritoryGeometryGenerator` such as shared-edge extraction, chaining, merging, enclave detection, edge keying, and smoothing, but demote that file from “main entrypoint” to “helper library.”[^5][^3][^1][^2]

Also keep the **canonical frontier-map direction** from `canonicalTypes`, because those types are the first credible geometry contract in the codebase that preserves identity-bearing vertices, directed edges, loop structure, and loop validity for downstream systems. And keep the **FG2 conceptual layer**—half-edges, face walks, shell loops, owner shell artifacts, contour correspondences—but absorb those ideas into the unified compiler output instead of preserving FG2 as a separate full-stack geometry engine.[^6][^7][^1]

## What should be removed

You should remove the idea that `PowerVoronoiGeometryMode`, `SeedGraphGeometryMode`, and `BoundaryAwareFrontierGeometryMode` are distinct geometry systems. The files show that the first two are thin wrappers around the older generator, while the third calls the superior pipeline; that means the “mode” split is architectural noise, not meaningful geometry diversity. Replace them with a single vector compiler mode and a single config surface.[^8][^1][^2]

You should also retire vector geometry computation from renderers. `PowerVoronoiRenderer`, `PVV3Renderer`, `ModifiedVoronoiRenderer`, and `VoronoiRenderer` either call geometry generation directly or contain their own geometry derivation logic, which is exactly the duplication you are trying to eliminate. The renderers should consume already-computed geometry only; they should not decide world-border extraction, polygon merge strategy, junction classification, or contour topology.[^9][^10][^11][^2][^4]

Finally, the `legacyGeometryBridge` should be treated as a temporary migration crutch and then deleted. The contract explicitly marks it deprecated, which means the architecture already agrees it should not survive long term.[^4]

## What the unified compiler must produce

Right now your clean contract `GeometrySnapshot` is too thin for where you want to go, because it only exposes `territoryRegions`, `frontierPolylines`, `worldBorderPolylines`, and a `sharedFrontierMap` keyed merely by `ownerPairKey`. That is not enough for serious topology-aware diffing, local patch rewrite, durable anchors, or exact shell reconstruction.[^6][^4]

The canonical vector compiler should therefore emit a single enriched result, conceptually something like `TerritoryGeometryResult`, containing at least:

- cells / sites / ownership provenance,
- merged territories and enclave/hole information,
- shared frontier polylines and owner-world polylines,
- mandatory canonical frontier map,
- decisive/junction vertices,
- directed frontier segments with stable ids,
- owner shell loops and outer/hole relationships,
- half-edge / face-walk metadata,
- indices such as site→cell, cell→owner, owner→shell, edge→source-polyline.[^7][^1][^5][^6]

In other words: the current `TerritoryGeometryData` plus the current `TerritoryFrontierMap` plus the useful FG2 shell/topology artifacts should become **one result object**, not three parallel worlds.[^5][^7][^6]

## What to do with FG2

FG2 should be mined, not preserved whole. The orchestrator FG2 system is the richest topology computation in the project, with seed points, pair topology graphs, half-edges, face walks, region loops, owner shell loops, owner shell artifacts, and shell transition correspondence structures. Those are exactly the structures a serious geometry core wants.[^7]

But keeping FG2 as a parallel engine beside 0319 will keep the codebase split forever. So the right move is:

1. keep `computeGeometry0319()` as the **single compiler entrypoint**,[^3]
2. add a **topology enrichment phase** after frontier chaining/build-frontier-map,[^3][^6]
3. port the useful FG2 algorithms and types into compiler-owned modules,[^7]
4. delete orchestrator-specific FG2 geometry stages once the compiler reproduces the needed artifacts.[^1]

That gives you FG2’s strengths without FG2’s architectural duplication.

## What to do with the old compiler stages

The files around `metricStage`, `frontierStage`, and `regionStage` are conceptually useful, but as currently written they do not look like the production-quality geometry core you should standardize on. `frontierStage` is analytically interesting and deterministic, but it currently builds frontier nodes from lane split points and then links them by centroid-angle sorting, which is not obviously the same quality level as the working 0319 chained-frontier pipeline. `regionStage` in particular uses heuristics like nearest-star owner resolution and convex hull assembly, which is much weaker than your current border-derived fill construction approach.[^12][^13]

So I would **not** make `metric/frontier/regionStage` the new production geometry core. Instead:

- preserve them as experimental or research modules,
- borrow any mathematically valuable pieces,
- but keep the canonical vector pipeline based on the 0319 power-Voronoi → shared-edge → chained-frontier → fill-construction path.[^13][^12][^3]


## Concrete refactor shape

The cleanest final structure is a compiler-centered stack like this:[^5][^6][^3]

1. **Site assembly**

- Real star sites.
- Corridor/disconnect/extra sites.
- Weight overrides.
- Clip computation.

2. **Cell generation**

- Weighted Voronoi only once.
- Convert to canonical `TerritoryCell`.

3. **Frontier extraction**

- Shared inter-owner edges.
- Owner-world boundary edges.
- Junction extraction.
- Chaining into raw and smoothed frontier polylines.

4. **Topology enrichment**

- Build canonical frontier map.
- Build directed edges and decisive vertices.
- Build half-edge graph and face walks.
- Build owner shell loops / shell artifacts.

5. **Region assembly**

- Construct fills strictly from frontiers.
- Detect holes / enclaves.
- Validate loop closure and shell integrity.

6. **Indexes and fingerprint**

- Stable ids, provenance maps, geometry fingerprint, diagnostics.

Everything above belongs in the compiler. Everything below it—transition and presentation—consumes the output and never recomputes geometry policy.[^11][^4]

## Specific cleanup actions

Here is the cleanup I would actually do.


| Action | Decision |
| :-- | :-- |
| `computeGeometry0319()` | Keep as canonical entrypoint.[^3] |
| `generateVoronoiTerritoryGeometry()` | Keep helpers, retire as entrypoint.[^5][^1] |
| `PowerVoronoiGeometryMode` | Delete after migration; fold config into unified mode.[^2] |
| `SeedGraphGeometryMode` | Delete after migration; it is just config variation.[^2][^1] |
| `BoundaryAwareFrontierGeometryMode` | Rename to the single unified vector geometry mode, then simplify.[^8] |
| `FrontierTopologyBuilder` | Replace/upgrade to consume canonical frontier map and shell artifacts, not just ownerPair polylines.[^14][^6] |
| `legacyGeometryBridge` | Remove after consumers migrate.[^4] |
| `PVV3Renderer` vector geometry logic | Delete; renderer should consume canonical output only.[^10][^1] |
| `ModifiedVoronoiRenderer` | Extract any truly valuable smoothing/buffer functions, then retire the renderer-owned geometry path.[^1][^2] |
| `VoronoiRenderer` | Delete.[^1] |
| FG2 orchestrator geometry stages | Port the useful topology logic into compiler modules, then retire the parallel pipeline.[^7][^1] |

## One important correction to the summary

I would slightly refine the other agent’s summary in one place: saying “there are only two geometry methods” is true at a high level, but for your immediate cleanup task you should treat **raster ownership computation as a separate presentation family, not part of geometry-core consolidation**. Since you asked to focus purely on geometry compute, the practical decision is simpler:[^1][^4]

- there should be **one** canonical vector geometry compiler,
- raster systems can remain separate optional render/ownership systems for now,
- but they should no longer influence how vector geometry contracts are designed.[^11][^4]


## Final recommendation

So my recommendation is:

1. **Standardize on one vector compiler:** `computeGeometry0319()` as the only public geometry entrypoint.[^3]
2. **Promote canonical topology to first-class output:** make `frontierMap` mandatory and extend it with FG2-grade shell and half-edge metadata.[^6][^7]
3. **Demote old generators to helper libraries only:** especially `powerVoronoiTerritoryGeometryGenerator`.[^5]
4. **Delete duplicate vector modes and renderer-owned geometry computation:** one compiler, many consumers.[^10][^2][^9]
5. **Port FG2 concepts into compiler modules, not the orchestrator:** preserve the math and topology, remove the parallel stack.[^1][^7]
6. **Tighten contracts:** replace thin `GeometrySnapshot`/`sharedFrontierMap` abstractions with a richer canonical geometry result consumed everywhere.[^4][^6]

If you want, the next best step is for me to turn this into a **proposed file-by-file refactor plan**: what new modules should exist, what each old file maps to, and the exact deletion/migration order.

<div align="center">⁂</div>

[^1]: GEOMETRY_CONSOLIDATION_ANALYSIS.md

[^2]: GEOMETRY_ATLAS.md

[^3]: compiler_Geometry_0319.txt

[^4]: contract_GeometryContracts.txt

[^5]: compiler_powerVoronoiTerritoryGeometryGenerator.txt

[^6]: compiler_canonicalTypes.txt

[^7]: orchestrator_fg2SeedGraph.txt

[^8]: mode_BoundaryAwareFrontierGeometryMode.txt

[^9]: renderer_PowerVoronoiRenderer.txt

[^10]: renderer_PVV3Renderer.txt

[^11]: orchestrator_renderMode.txt

[^12]: compiler_frontierStage.txt

[^13]: compiler_regionStage.txt

[^14]: mode_FrontierTopologyBuilder.txt

