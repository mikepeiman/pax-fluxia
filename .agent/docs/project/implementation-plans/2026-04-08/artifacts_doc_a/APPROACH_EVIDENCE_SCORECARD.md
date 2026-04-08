# Approach evidence scorecard — Doc A (v1)

**Schema:** `approach | primary implementation | suggested Render Family | transition technique | evidence (H/M/L) | failure pattern | notes`

| Approach | Where in repo | Family | Transition | Evid | Failure pattern | Notes |
|----------|---------------|--------|------------|------|-----------------|-------|
| Power Voronoi V2 monolith | `renderers/PowerVoronoiRenderer.ts`, `RefactoredPVV2Renderer.ts` | VectorPolygon (internal) | OT / mesh rope (mode-dependent) | H | Agent-reported desync vs modular pipeline | PVV2 ref commit is excavation anchor. |
| DY4 Optimal Transport | `PowerVoronoiRenderer_DY4.ts`, territory OT border modes | VectorPolygon | Optimal transport polyline | M | Alignment / pinning vs hybrid | Hybrid mode pinned at ref commit. |
| Distance field GPU | `DistanceFieldTerritoryRenderer.ts` | **DistanceField** | Shader `uMorphFactor` / temporal blend | M | Hard to force through vector `TransitionSnapshot` | **Priority family** post–Impl 0. |
| Metaball grid | `MetaballRenderer.ts` | Metaball | Blur / influence field | L | Visual parity vs vector | Impl 3. |
| Contour / marching squares | `ContourTerritoryRenderer.ts` + worker | Contour | Worker polyline rebuild | L | Cost / seam stability | Impl 3. |
| Unified vector 4-layer | `territory/layers/*` | VectorPolygon | Frontier morph, active front, topology | M | Persistent transition bugs | Facade target for Impl 2. |
| Pixel grid | `PixelTerritoryRenderer.ts` | Pixel (TBD) | Cell ownership lerp | L | Aesthetic / scale | Low priority unless product asks. |

**Legend:** Evidence H = pinned reference or strong human confirmation; M = code exists + partial verification; L = legacy path, weak recent validation.

**Doc B actions:** Add columns for diagnostics used (D1–D13) and link to post-mortems per approach.
