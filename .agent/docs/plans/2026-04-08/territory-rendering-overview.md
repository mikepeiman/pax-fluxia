# Territory rendering overview

**Purpose:** Legacy `renderers/` inventory, shared `renderers/geometry/`, configuration keys, Render Family strategy, tech stack, and non-negotiable requirements.

| Topic | Document |
|-------|----------|
| d3 / Voronoi modes (comparison) | [territory-d3-voronoi-family-analysis.md](./territory-d3-voronoi-family-analysis.md) |
| `territory/` clean architecture | [territory-clean-architecture-map.md](./territory-clean-architecture-map.md) |
| Doc ingestion epic | [territory-documentation-epic.md](./territory-documentation-epic.md) |
| Impl checklist and Parts I–II | [TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md) |
| Assign path + phase | [territory-rendering-jumpstart.md](./territory-rendering-jumpstart.md) §0 |

---

## 1. Legacy renderer implementations

These are the actual runnable renderers in `pax-fluxia/src/lib/renderers/`. Each represents a distinct approach to territory rendering. ALL are still in the codebase. **40 files total.**

### Renderers (root)

| File | Approach |
|------|----------|
| `DistanceFieldTerritoryRenderer.ts` | GPU Dijkstra + fragment shader + temporal blend + stroke mesh (~5100 lines) |
| `MetaballRenderer.ts` | CPU influence grid, PIXI rectangles, blur filter (~390 lines) |
| `ContourTerritoryRenderer.ts` | Host for contour worker (~200 lines) |
| `contourTerritory.worker.ts` | Marching squares > vector polygons, Chaikin, corner rounding (~700 lines) |
| `GraphTerritoryRenderer.ts` | Graph/lane influence renderer |
| `graphTerritory.worker.ts` | Graph distance worker |
| `PowerVoronoiRenderer.ts` | Power Voronoi diagram |
| `ModifiedVoronoiRenderer.ts` | Modified Voronoi |
| `PVV3Renderer.ts` | Power Voronoi V3 |
| `RefactoredPVV2Renderer.ts` | Refactored PVV2 |
| `PowerVoronoiRenderer_DY4.ts` | PVV with DY4 OT border transitions |
| `VoronoiRenderer.ts` | Basic Voronoi |
| `PixelTerritoryRenderer.ts` | Pixel ownership grid |
| `pixelTerritory.worker.ts` | Pixel territory worker |
| `LaneTerritoryRenderer.ts` | Lane-based territory |
| `LaneRenderer.ts` | Lane renderer |
| `laneTerritory.worker.ts` | Lane territory worker |
| `strokeMeshBorders.ts` | Custom GL programs for stroke mesh borders (SDF) |
| `frontierGraph.ts` | Canonical frontier polyline extraction |
| `centerlineGraph.ts` | Centerline graph module |
| `territoryFeatures.ts` | Corridor virtuals, disconnect virtuals |
| `territoryUtils.ts` | Connected cluster detection, shared utilities |
| `colorUtils.ts` | Color utilities |
| `containerFactory.ts` | PIXI container factory |
| `RenderContext.ts` | Render context |
| `ShipRenderer.ts` | Ship rendering |
| `StarRenderer.ts` | Star rendering |
| `StarPowerRenderer.ts` | Star power rendering |
| `orbModes.ts` | Orb mode configuration |
| `index.ts` | Barrel export |

### Geometry Pipeline (`renderers/geometry/` — 10 files)

`borderPipeline.ts`, `borderTransition.ts`, `chaikin.ts`, `frontierLoops.ts`, `geometryModifiers.ts`, `mergeUtils.ts`, `morphUtils.ts`, `polyUtils.ts`, `types.ts`, `index.ts`

---

## 2. Configuration Reference

- `pax-fluxia/src/lib/config/game.config.ts` -- All territory config keys: `TERRITORY_*`, `METABALL_*`, `DF_*`, `CONTOUR_*`, `GRAPH_*`, `LANE_*`
- `pax-fluxia/src/lib/components/ui/settingsDefs.ts` -- UI slider/toggle definitions and panel key mappings
- `pax-fluxia/src/lib/components/ui/panelSync.ts` -- Config-to-panel bridging and localStorage persistence
- `common/resources/settings-live/current-settings.json` -- Live runtime settings

---

## 3. Current Strategic Context (updated 2026-04-08)

### 3.1 Architectural Pivot: Render Family Model

The "universal 4-layer linear pipeline" has been evaluated and found to be optimized for one paradigm (vector polygon → polyline morph → draw commands) while being structurally incompatible with the DistanceField renderer -- which has the strongest track record.

**Decision (2026-04-08):** Replace the universal pipeline with a **Render Family** model:
- **Tier 1 (shared):** Ownership layer + runtime transition clock + VFX event emission
- **Tier 2 (per-family):** Each Render Family owns its geometry, transition, and presentation internally
- The existing 4-layer pipeline becomes VectorPolygonFamily's internal implementation
- **First coding wedge after Impl 0:** **`MetaballFamily`** (thinnest legacy adapter); then Contour → DistanceField → VectorPolygon facade — see [RENDER_FAMILY_SPIKE_ORDER_METABALL_FIRST.md](./RENDER_FAMILY_SPIKE_ORDER_METABALL_FIRST.md)

See: **[TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md](./TERRITORY_RENDER_FAMILY_UNIFIED_PLAN.md)** — **proposed** architecture (Parts I–II), resolved decisions **as of 2026-04-08** (Impl ordering updated **2026-04-09**), and **Impl** phase spine. **Not** the authority on the full **idea** space; **canonical for Impl ordering and handoffs** once the architect locks direction. Cursor-only plan copies are optional; refresh from this file after edits.

### 3.2 Key Decisions Already Made
- **PVV** stays inside VectorPolygonFamily as a transition-mode variant (not its own family)
- **SharedTransitionClock** moves to runtime level; families receive `activeTransition.progress`
- **VFX** triggers fire from runtime based on ownership changes, not from inside families
- **Diagnostics** built incrementally alongside renderer work; `DiagnosticProvider` interface per family

### 3.3 What the Audit Should Verify

The following recollections MUST be verified against the document corpus:
- **Distance field (DF)**: Believed to be the strongest implementation for stability, cleanness, tunability, and performance -- **verify and quantify**
- **Metaballs**: Believed to have worked in principle but never tuned aesthetically -- **verify**
- **Marching squares**: Believed abandoned, never produced clean edges -- **verify or contradict**
- **Polygon morph (per-region)**: Believed to be the most reliably broken approach -- **verify**
- **Active-front topology matching**: Most recent attempt, persistent structural failures -- **verify timeline and specific failure modes**

### 3.4 Audit Lens: Render Family Mapping

When reviewing each document, additionally ask:
1. **Which Render Family does this approach belong to?** (DistanceField, VectorPolygon, Metaball, Contour, or a new family?)
2. **What transition technique does this approach use?** (GPU morph, polyline interpolation, grid lerp, crossfade, none?)
3. **What tunables does this approach use?** (Map to per-family tunable declarations)
4. **What diagnostics were available or requested?** (Map to diagnostics menu items D1-D13)
5. **What failure modes were observed?** (Map to family-level concerns vs shared concerns)

**Approach tally, timeline, contradiction register, architect recommendations, and transcript pointer** live in [territory-documentation-epic.md](./territory-documentation-epic.md) (Sections 9–13).

---

## 4. Project tech stack (quick reference)

- **Client**: SvelteKit 5 + PixiJS 8 + TypeScript (at `pax-fluxia/`)
- **Server**: Colyseus 0.15 + Bun (at `pax-server/`)
- **Shared**: `@pax/common` monorepo package (at `common/`)
- **Build/Shell**: Bun only, PowerShell (Windows), do NOT use `&&` to chain commands
- **Config**: `pax-fluxia/src/lib/config/game.config.ts` — all territory config keys (`TERRITORY_*`, `METABALL_*`, `DF_*`, `CONTOUR_*`, `GRAPH_*`, `LANE_*`)
- **UI Settings**: `settingsDefs.ts`, `panelSync.ts`, `GameSettingsPanel.svelte`

---

## 5. Non-Negotiable Requirements (from specs, updated for Render Family model)

These have been stated repeatedly across multiple documents. Verify them against source docs and flag any that are contradicted:

1. Territory fills must derive from frontier geometry (same point arrays) -- **applies to VectorPolygonFamily; DF achieves this differently via shader**
2. Unchanged borders must NOT jitter during transitions -- **universal across all families**
3. Conquest transitions must be smooth morphing animations (not crossfades, not teleports) -- **universal; each family achieves this its own way**
4. Borders must be clean, vector-quality, joined at corners (not butting) -- **applies to vector families; DF/Metaball achieve border quality differently**
5. Rounding and stroke effects are desired -- **universal aspiration; implementation varies by family**
6. The system must be tunable via runtime sliders -- **universal; per-family `tunableKeys` declarations replace fixed `TerritoryTunables`**
7. Performance must be acceptable (real-time, 60fps target) -- **universal**
8. Architecture must separate ownership from rendering -- **Render Family model: shared ownership + per-family rendering pipeline. The 4-layer internal structure is optional per family.**
9. Birth/death of sections is architecturally invalid; frontiers MOVE, they don't appear/disappear -- **applies to VectorPolygonFamily; verify whether this constraint holds for field-based families**
10. One active front per conquest, bounded by change anchors -- **applies to VectorPolygonFamily topology transitions; DF handles this implicitly via field evolution**
